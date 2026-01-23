
/**
 * Engine Physics Service
 * 
 * Simulates a Turbofan engine's performance characteristics.
 * Handles N1/N2 spool-up dynamics, EGT, Fuel Flow, and Thrust generation
 * based on altitude, Mach number, and throttle input.
 */
class EnginePhysicsService {
    constructor(config = {}) {
        this.config = {
            maxThrust: config.maxThrust || 120000, // Newtons
            bypassRatio: config.bypassRatio || 5.0,
            tsfc: config.specificFuelConsumption || 0.000011, // kg/(N*s) base at SL
            idleN1: 20, // %
            maxN1: 102, // %
            spoolUpRate: 15, // % per second
            spoolDownRate: 20, // % per second
            responsiveness: config.responsiveness || 1.0, // Multiplier for spool rate (0.95-1.05)
            ...config
        };
        
        // Correct TSFC if it's likely in the wrong units (e.g., kg/N/h instead of kg/N/s)
        // Typical TSFC is around 0.3-0.6 lb/lbf/hr or ~1.1e-5 to 1.7e-5 kg/N/s
        if (this.config.tsfc > 0.001) {
            this.config.tsfc /= 3600;
        }

        this.state = {
            n1: 20, // Fan Speed % (Idle)
            n2: 22, // Core Speed %
            egt: 400, // Exhaust Gas Temp (C) - Idle
            thrust: 0, // Newtons
            fuelFlow: 0, // kg/s
            oilPressure: 45, // psi
            running: true, // Default to running for immediate gameplay
            failed: false,
            throttleCommand: 0, // Last commanded throttle
            isReverse: false
        };
        
        this._prevFuelFlow = 0;
    }

    /**
     * Set target throttle for this engine
     * @param {number} val - Throttle value (-1.0 to 1.0)
     */
    setThrottle(val) {
        this.state.throttleCommand = val;
    }

    update(dt, throttleInput, mach, altitude, airDensityRatio, ambientTemp) {
        if (this.state.failed) {
            this.spoolDown(dt);
            return this.getOutput();
        }

        // Use passed throttle input if provided (legacy/direct drive), otherwise use internal state
        // This supports both direct update(dt, throttle...) calls and setThrottle() -> update(dt...) patterns
        const throttle = (throttleInput !== undefined) ? throttleInput : this.state.throttleCommand;
        this.state.throttleCommand = throttle;

        // Target N1 based on throttle
        // Idle at 0 throttle is not 0 RPM if engine is running
        let targetN1 = 0;
        let isReverse = false;

        if (this.state.running) {
            if (throttle >= 0) {
                // Forward Thrust: 0% to 100% Throttle -> 20% to 102% N1
                targetN1 = this.config.idleN1 + throttle * (this.config.maxN1 - this.config.idleN1);
            } else {
                // Reverse Thrust: -0.7 (or less) to 0% Throttle
                // User requirement: N1 20% to 75%
                isReverse = true;
                const maxReverseN1 = 75;
                const reverseRatio = Math.min(1, Math.abs(throttle) / 0.7); // Clamp ratio to 1
                targetN1 = this.config.idleN1 + reverseRatio * (maxReverseN1 - this.config.idleN1);
            }
        } else if (throttle > 0.1) {
            // Autostart logic simplified: if throttle > 10%, start engine
            this.state.running = true; 
        }

        this.state.isReverse = isReverse;

        // N1 Dynamics (Lag)
        const n1Diff = targetN1 - this.state.n1;
        const rate = n1Diff > 0 ? this.config.spoolUpRate : this.config.spoolDownRate;
        
        // Acceleration decays near max N1 (inertia)
        // And acceleration is slower at low N1 (inertia)
        // Apply responsiveness factor (uncertainty)
        this.state.n1 += n1Diff * rate * dt * 0.05 * this.config.responsiveness; 

        // Clamp N1
        if (this.state.n1 < 0) this.state.n1 = 0;

        // N2 Dynamics (Core Speed)
        // Core responds slightly differently than fan
        // N2 target is roughly N1 * 1.1 but with its own lag
        const targetN2 = this.state.n1 * 1.1;
        const n2Diff = targetN2 - this.state.n2;
        // Core is lighter but follows N1 aerodynamics
        this.state.n2 += n2Diff * dt * 2.0; // Simple lag towards target

        // Thrust Calculation
        // Thrust = MaxThrust * (N1_ratio)^2 * (Density_ratio)^0.7 * (1 - 0.2 * Mach)
        // High bypass engines lose thrust with speed and altitude
        const n1Ratio = this.state.n1 / this.config.maxN1;
        
        // Thrust is negligible below idle
        let thrustFactor = 0;
        if (this.state.n1 > 10) {
            thrustFactor = Math.pow(n1Ratio, 2.5); // Thrust ~ RPM^2.5 approx
        }

        // Apply Reverse Thrust Logic
        if (isReverse && throttle < -0.01) { // Threshold to avoid flickering at 0
             // User requirement: -70% Thrust at Max Reverse (75% N1)
             // At 75% N1, thrustFactor is roughly (75/102)^2.5 ~= 0.45
             // We want -0.70 total thrust factor.
             // So we need to scale the physical thrust produced by N1 to match the reverse effectiveness.
             // Scalar = 0.70 / 0.45 ~= 1.55
             // Also apply negative sign.
             const reverseScalar = 1.55; 
             thrustFactor = -1 * thrustFactor * reverseScalar;
        }

        const altitudeFactor = Math.pow(airDensityRatio, 0.7);
        const machFactor = Math.max(0, 1 - 0.2 * mach); // Ram drag effect simplified

        this.state.thrust = this.config.maxThrust * thrustFactor * altitudeFactor * machFactor;

        // Fuel Flow (environment-aware, N1-informed, always positive)
        const tsfcEff = this.computeTSFC(this.config.tsfc, airDensityRatio, mach, this.state.n1);
        const idleFlow = this.computeIdleFuelFlow(this.config.tsfc, airDensityRatio, this.state.n1);
        
        const thrustDemandAbs = Math.abs(this.state.thrust);
        const rawFuelFlow = idleFlow + tsfcEff * thrustDemandAbs;
        
        const alpha = 0.35; // smoothing factor
        const smoothed = this._prevFuelFlow * (1 - alpha) + rawFuelFlow * alpha;
        this.state.fuelFlow = Math.max(idleFlow, smoothed);
        this._prevFuelFlow = this.state.fuelFlow;

        // EGT
        // Increases with N1 and Mach
        const baseEGT = ambientTemp; // Ambient
        const runningEGT = 400 + (this.state.n1 * 4);
        this.state.egt = this.state.running ? runningEGT : baseEGT + (this.state.egt - baseEGT) * 0.99;

        return this.getOutput();
    }
    
    computeTSFC(tsfc0, densityRatio, mach, n1) {
        const f_alt = 0.6 + 0.4 * Math.max(0, Math.min(1, densityRatio));
        const f_mach = 1 + 0.06 * Math.max(0, mach - 0.25);
        const f_n1 = 0.8 + 0.25 * Math.max(0, Math.min(1, n1 / this.config.maxN1));
        return tsfc0 * f_alt * f_mach * f_n1;
    }
    
    computeIdleFuelFlow(tsfc0, densityRatio, n1) {
        const idleRatio = Math.max(0.15, Math.min(0.4, n1 / this.config.maxN1));
        const c_idle = 0.7;
        return c_idle * tsfc0 * this.config.maxThrust * Math.pow(idleRatio, 1.8) * Math.max(0.5, densityRatio);
    }

    spoolDown(dt) {
        this.state.n1 *= (1 - 0.1 * dt);
        this.state.n2 *= (1 - 0.1 * dt);
        this.state.thrust = 0;
        this.state.fuelFlow = 0;
        this.state.running = false;
    }

    getOutput() {
        return { ...this.state };
    }
    
    setFailed(failed) {
        this.state.failed = failed;
    }
}

export default EnginePhysicsService;
