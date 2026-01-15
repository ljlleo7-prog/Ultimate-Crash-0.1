
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
            tsfc: config.specificFuelConsumption || 0.000018, // kg/(N*s)
            idleN1: 20, // %
            maxN1: 102, // %
            spoolUpRate: 15, // % per second
            spoolDownRate: 20, // % per second
            ...config
        };

        this.state = {
            n1: 0, // Fan Speed %
            n2: 0, // Core Speed %
            egt: 15, // Exhaust Gas Temp (C) - ambient start
            thrust: 0, // Newtons
            fuelFlow: 0, // kg/s
            oilPressure: 0, // psi
            running: false,
            failed: false
        };
    }

    update(dt, throttle, mach, altitude, airDensityRatio, ambientTemp) {
        if (this.state.failed) {
            this.spoolDown(dt);
            return this.getOutput();
        }

        // Target N1 based on throttle
        // Idle at 0 throttle is not 0 RPM if engine is running
        let targetN1 = 0;
        if (this.state.running) {
            targetN1 = this.config.idleN1 + throttle * (this.config.maxN1 - this.config.idleN1);
        } else if (throttle > 0.1) {
            // Autostart logic simplified: if throttle > 10%, start engine
            this.state.running = true; 
        }

        // N1 Dynamics (Lag)
        const n1Diff = targetN1 - this.state.n1;
        const rate = n1Diff > 0 ? this.config.spoolUpRate : this.config.spoolDownRate;
        
        // Acceleration decays near max N1 (inertia)
        // And acceleration is slower at low N1 (inertia)
        // Simplified exponential approach
        this.state.n1 += n1Diff * rate * dt * 0.05; // 0.05 is a tuning factor for response time

        // Clamp N1
        if (this.state.n1 < 0) this.state.n1 = 0;

        // N2 follows N1 roughly (2-spool)
        this.state.n2 = this.state.n1 * 1.1; // Simplified relationship

        // Thrust Calculation
        // Thrust = MaxThrust * (N1_ratio)^2 * (Density_ratio)^0.7 * (1 - 0.2 * Mach)
        // High bypass engines lose thrust with speed and altitude
        const n1Ratio = this.state.n1 / this.config.maxN1;
        
        // Thrust is negligible below idle
        let thrustFactor = 0;
        if (this.state.n1 > 10) {
            thrustFactor = Math.pow(n1Ratio, 2.5); // Thrust ~ RPM^2.5 approx
        }

        const altitudeFactor = Math.pow(airDensityRatio, 0.7);
        const machFactor = Math.max(0, 1 - 0.2 * mach); // Ram drag effect simplified

        this.state.thrust = this.config.maxThrust * thrustFactor * altitudeFactor * machFactor;

        // Fuel Flow
        // FF = TSFC * Thrust (approx)
        // But engines burn fuel at idle too
        const idleFuel = this.config.maxThrust * 0.05 * this.config.tsfc; 
        this.state.fuelFlow = (this.state.thrust * this.config.tsfc) + (this.state.running ? idleFuel : 0);

        // EGT
        // Increases with N1 and Mach
        const baseEGT = ambientTemp; // Ambient
        const runningEGT = 400 + (this.state.n1 * 4);
        this.state.egt = this.state.running ? runningEGT : baseEGT + (this.state.egt - baseEGT) * 0.99;

        return this.getOutput();
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
