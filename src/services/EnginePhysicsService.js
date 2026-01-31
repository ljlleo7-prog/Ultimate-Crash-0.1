
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
            vibration: 0, // 0 to 10 scale
            running: true, // Default to running for immediate gameplay
            failed: false,
            throttleCommand: 0, // Last commanded throttle
            isReverse: false,
            starterEngaged: false,
            pneumaticPressure: false,
            fuelAvailable: false,
            ignition: false,
            egtOffset: 0 // External offset for failures/fires
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

    /**
     * Set Startup Configuration
     */
    setStartupState(starterEngaged, pneumaticPressure, fuelAvailable, ignition) {
        this.state.starterEngaged = starterEngaged;
        this.state.pneumaticPressure = pneumaticPressure;
        this.state.fuelAvailable = fuelAvailable;
        this.state.ignition = ignition;
    }

    update(dt, throttleInput, mach, altitude, airDensityRatio, ambientTemp) {
        if (this.state.failed) {
            this.spoolDown(dt);
            return this.getOutput();
        }

        // Use passed throttle input if provided (legacy/direct drive), otherwise use internal state
        const throttle = (throttleInput !== undefined) ? throttleInput : this.state.throttleCommand;
        this.state.throttleCommand = throttle;

        // Auto-Start Logic (Transition from Cranking to Running)
        // Requirements: N2 > 20%, Fuel Available, Ignition (or Cont)
        if (!this.state.running && this.state.fuelAvailable && this.state.n2 > 15) {
             // In a real jet, you need ignition. 
             // We'll assume ignition is auto/on if we are in this state (simplified) or passed in.
             // If we have fuel and rotation, LIGHTOFF!
             this.state.running = true;
             this.state.egt += 100; // Initial spike
        }

        // Shutdown Logic: If fuel is cut, engine stops running (flameout)
        if (this.state.running && !this.state.fuelAvailable) {
            this.state.running = false;
        }

        // Target N2 based on throttle (Core Speed drives the engine)
        // User Reference:
        // Start-Up: ~20-30% N2
        // Taxi: ~50-60% N2
        // Takeoff: ~90-100% N2
        
        let targetN2 = 0;
        let isReverse = false;

        if (this.state.running) {
            if (throttle >= 0) {
                // Forward Thrust
                // Idle (0 throttle) -> 20% N2
                // Max (1 throttle) -> 100% N2
                // Linear map for core speed control
                const idleN2 = 30; // Increased from 20 to 30 for better idle stability
                const maxN2 = 102; // Allow slight overspeed
                targetN2 = idleN2 + throttle * (maxN2 - idleN2);
            } else {
                // Reverse Thrust
                // Throttle -1 -> N2 ~ 75%
                isReverse = true;
                const idleN2 = 30;
                const maxReverseN2 = 75;
                const reverseRatio = Math.min(1, Math.abs(throttle) / 0.7);
                targetN2 = idleN2 + reverseRatio * (maxReverseN2 - idleN2);
            }
        } else {
            // Not running
            if (this.state.starterEngaged && this.state.pneumaticPressure) {
                // Starter Motoring Speed (Max ~25%)
                targetN2 = 25;
            } else {
                // Spool down
                targetN2 = 0;
            }
        }
        
        this.state.isReverse = isReverse;

        // N2 Dynamics (Core Lag)
        // Core speed follows throttle command with inertia
        const n2Diff = targetN2 - this.state.n2;
        
        // Asymmetric rates: Spool Up is slower than Spool Down (usually)
        // UNLESS it's the starter, which is quite slow to spool up
        let n2Rate = this.config.spoolUpRate;
        
        if (!this.state.running && this.state.starterEngaged) {
            // Starter torque is weaker than combustion
            n2Rate = 5.0; // 5% per second roughly
        } else if (n2Diff < 0) {
            n2Rate = this.config.spoolDownRate;
        }

        // Apply responsiveness factor
        // N2 is the heavy core, takes time to spool
        this.state.n2 += n2Diff * n2Rate * dt * 0.04 * this.config.responsiveness;

        // Clamp N2
        if (this.state.n2 < 0) this.state.n2 = 0;

        // Calculate Target N1 from Current N2 (Non-linear relationship)
        // N1 (Fan) responds to N2 (Core)
        const targetN1 = this.calculateN1FromN2(this.state.n2);

        // N1 Dynamics (Fan Lag)
        // Fan has inertia but follows core airflow
        const n1Diff = targetN1 - this.state.n1;
        // Fan responds faster to core changes than core responds to fuel
        this.state.n1 += n1Diff * dt * 2.0; 

        // Clamp N1
        if (this.state.n1 < 0) this.state.n1 = 0;

        // Thrust Calculation
        // Thrust = MaxThrust * (N1_ratio)^2 * (Density_ratio)^0.7 * (1 - 0.2 * Mach)
        const n1Ratio = this.state.n1 / this.config.maxN1;
        
        // Thrust is negligible below idle N1
        // At Start-Up (N2=25%), N1 is ~5%.
        // We want almost zero thrust at 5% N1.
        let thrustFactor = 0;
        const thrustThresholdN1 = 5.0; // Start generating meaningful thrust above 5% N1
        
        if (this.state.n1 > thrustThresholdN1) {
            // Smooth ramp up from threshold
            const effectiveRatio = (this.state.n1 - thrustThresholdN1) / (this.config.maxN1 - thrustThresholdN1);
            thrustFactor = Math.pow(Math.max(0, effectiveRatio), 2.5); 
        }

        // Apply Reverse Thrust Logic
        if (isReverse && throttle < -0.01) { 
             // User requirement: -70% Thrust at Max Reverse (75% N1)
             const reverseScalar = 1.55; 
             thrustFactor = -1 * thrustFactor * reverseScalar;
        }

        const altitudeFactor = Math.pow(airDensityRatio, 0.7);
        const machFactor = Math.max(0, 1 - 0.2 * mach); 

        this.state.thrust = this.config.maxThrust * thrustFactor * altitudeFactor * machFactor;

        // Fuel Flow (N2 based mostly for core, but N1 is good proxy)
        // Using N1 for consistency with existing TSFC methods
        const tsfcEff = this.computeTSFC(this.config.tsfc, airDensityRatio, mach, this.state.n1);
        const idleFlow = this.computeIdleFuelFlow(this.config.tsfc, airDensityRatio, this.state.n1);
        
        const thrustDemandAbs = Math.abs(this.state.thrust);
        const rawFuelFlow = idleFlow + tsfcEff * thrustDemandAbs;
        
        const alpha = 0.35; 
        const smoothed = this._prevFuelFlow * (1 - alpha) + rawFuelFlow * alpha;
        this.state.fuelFlow = Math.max(idleFlow, smoothed);
        this._prevFuelFlow = this.state.fuelFlow;

        // EGT
        const baseEGT = ambientTemp; 
        const runningEGT = 400 + (this.state.n2 * 4); // EGT correlates well with N2 (Core)
        const totalEGT = runningEGT + (this.state.egtOffset || 0);
        this.state.egt = this.state.running ? totalEGT : baseEGT + (this.state.egt - baseEGT) * 0.99;

        return this.getOutput();
    }

    calculateN1FromN2(n2) {
        // Quadratic approximation: N1 = N2^2 / 100
        // Fits user reference:
        // Start-Up: 20% N2 -> 4% N1 (Ref: ~5-10%)
        // Taxi: 60% N2 -> 36% N1 (Ref: ~20-30% N1 from 50-60% N2)
        // Takeoff: 100% N2 -> 100% N1
        
        if (n2 <= 0) return 0;
        
        // Use a simple quadratic curve as requested
        let n1 = (n2 * n2) / 100;
        
        return n1;
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
