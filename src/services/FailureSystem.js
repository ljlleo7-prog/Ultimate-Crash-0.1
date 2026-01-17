
import eventBus from './eventBus.js';

export const FailureTypes = {
    ENGINE_FAILURE: 'engine_failure',
    HYDRAULIC_FAILURE: 'hydraulic_failure',
    PITOT_STATIC_FAILURE: 'pitot_static_failure',
    FUEL_LEAK: 'fuel_leak',
    CONTROL_JAM: 'control_jam'
};

export const FailureSeverity = {
    MINOR: 'minor',
    MAJOR: 'major',
    CRITICAL: 'critical'
};

class FailureSystem {
    constructor(config = {}) {
        this.difficulty = config.difficulty || 'intermediate';
        this.forcedFailureType = config.failureType || 'random';
        
        // Active failures map: failureId -> { type, severity, startTime, data }
        this.activeFailures = new Map();
        
        this.time = 0;
        this.nextCheckTime = 5.0; // Check every 5 seconds
        
        // Difficulty settings
        this.settings = this.getDifficultySettings(this.difficulty);
        
        // If a specific failure type is forced (and not random/none), schedule it
        if (this.forcedFailureType && this.forcedFailureType !== 'random' && this.forcedFailureType !== 'none') {
            this.scheduleForcedFailure(this.forcedFailureType);
        }
    }

    getDifficultySettings(difficulty) {
        const settings = {
            rookie: {
                probMultiplier: 0.0, // No random failures
                recoveryChance: 1.0,
                maxFailures: 0
            },
            amateur: {
                probMultiplier: 0.2,
                recoveryChance: 0.8,
                maxFailures: 1
            },
            intermediate: {
                probMultiplier: 0.5,
                recoveryChance: 0.5,
                maxFailures: 2
            },
            advanced: {
                probMultiplier: 1.0,
                recoveryChance: 0.2,
                maxFailures: 3
            },
            pro: {
                probMultiplier: 1.5,
                recoveryChance: 0.1,
                maxFailures: 4
            },
            devil: {
                probMultiplier: 2.5,
                recoveryChance: 0.0,
                maxFailures: 5
            }
        };
        return settings[difficulty] || settings.intermediate;
    }

    scheduleForcedFailure(type) {
        // Schedule forced failure to happen shortly after takeoff or immediately
        this.forcedFailurePending = {
            type: type,
            triggerTime: 30 + Math.random() * 60 // 30-90 seconds in
        };
    }

    update(dt, flightState) {
        this.time += dt;

        // Check pending forced failure
        if (this.forcedFailurePending && this.time > this.forcedFailurePending.triggerTime) {
            this.triggerFailure(this.forcedFailurePending.type, flightState);
            this.forcedFailurePending = null;
        }

        // Periodic random checks
        if (this.time > this.nextCheckTime) {
            this.checkRandomFailures(flightState);
            this.nextCheckTime = this.time + 5.0 + Math.random() * 5.0;
        }
    }

    checkRandomFailures(state) {
        // If max failures reached, don't add more
        if (this.activeFailures.size >= this.settings.maxFailures) return;
        
        // Base probability per check (approx every 7.5s)
        // 0.001 ~ 1 failure every 2 hours
        const baseProb = 0.005 * this.settings.probMultiplier; 
        
        if (Math.random() > baseProb) return;

        // Select candidate
        const candidates = Object.values(FailureTypes);
        const type = candidates[Math.floor(Math.random() * candidates.length)];
        
        // Contextual checks
        if (type === FailureTypes.PITOT_STATIC_FAILURE) {
            // Needs low temp (icing)
            const temp = state.env?.temp || 288;
            if (temp > 275) return; // Too warm
        }
        
        if (type === FailureTypes.ENGINE_FAILURE) {
            // Higher chance at high throttle
            const throttle = state.controls?.throttle || 0;
            if (throttle > 0.9 && Math.random() < 0.5) {
                // High stress increases chance
            } else if (Math.random() > 0.2) {
                return; // 80% chance to skip if not high stress
            }
        }

        this.triggerFailure(type, state);
    }

    triggerFailure(type, state) {
        if (this.activeFailures.has(type)) return;

        const severity = Math.random() > 0.7 ? FailureSeverity.CRITICAL : FailureSeverity.MAJOR;
        
        const failureData = {
            type,
            severity,
            startTime: this.time,
            data: {}
        };

        // Initialize specific data
        switch (type) {
            case FailureTypes.ENGINE_FAILURE:
                // Pick an engine (0 or 1)
                failureData.data.engineIndex = Math.random() > 0.5 ? 1 : 0;
                break;
            case FailureTypes.CONTROL_JAM:
                // Pick surface: elevator, aileron, rudder
                const surfaces = ['elevator', 'aileron', 'rudder'];
                failureData.data.surface = surfaces[Math.floor(Math.random() * surfaces.length)];
                failureData.data.stuckValue = (Math.random() * 0.4) - 0.2; // Small deflection jam
                break;
        }

        this.activeFailures.set(type, failureData);
        
        console.log(`⚠️ FAILURE TRIGGERED: ${type} (${severity})`, failureData);
        
        // Notify System
        eventBus.publish(eventBus.Types.FAILURE_OCCURRED, {
            type,
            severity,
            data: failureData.data
        });
        
        eventBus.publish(eventBus.Types.CRITICAL_MESSAGE, {
            title: 'SYSTEM FAILURE',
            content: `WARNING: ${type.replace(/_/g, ' ').toUpperCase()} DETECTED.`,
            severity: 'critical'
        });
    }

    applyImpact(physicsService) {
        this.activeFailures.forEach(failure => {
            switch (failure.type) {
                case FailureTypes.ENGINE_FAILURE:
                    this.applyEngineFailure(physicsService, failure);
                    break;
                case FailureTypes.HYDRAULIC_FAILURE:
                    this.applyHydraulicFailure(physicsService, failure);
                    break;
                case FailureTypes.FUEL_LEAK:
                    this.applyFuelLeak(physicsService, failure);
                    break;
                case FailureTypes.CONTROL_JAM:
                    this.applyControlJam(physicsService, failure);
                    break;
                case FailureTypes.PITOT_STATIC_FAILURE:
                    // Handled in getAirspeed hook, but we can set a flag
                    physicsService.sensors = physicsService.sensors || {};
                    physicsService.sensors.pitotBlocked = true;
                    break;
            }
        });
    }

    applyEngineFailure(service, failure) {
        const idx = failure.data.engineIndex;
        if (service.engines[idx]) {
            service.engines[idx].setFailed(true);
        }
    }

    applyHydraulicFailure(service, failure) {
        // Reduce control effectiveness
        // We can hack this by modifying the current control inputs towards neutral or limiting rate
        // But better to modify the coefficients if possible.
        // For now, let's limit the input values in the service controls
        
        // Sluggish response: simulated by not allowing controls to reach full deflection
        // or by heavily smoothing them (which is done in processInputs).
        
        // Here we clamp them
        const limit = failure.severity === FailureSeverity.CRITICAL ? 0.2 : 0.5;
        
        service.controls.aileron = Math.max(-limit, Math.min(limit, service.controls.aileron));
        service.controls.elevator = Math.max(-limit, Math.min(limit, service.controls.elevator));
        service.controls.rudder = Math.max(-limit, Math.min(limit, service.controls.rudder));
        
        // Flaps stuck?
        // If we had a target vs actual, we'd freeze actual. 
        // Service has direct control setting. We can't easily freeze it without state history in failure.
    }

    applyFuelLeak(service, failure) {
        // Drain fuel
        const leakRate = failure.severity === FailureSeverity.CRITICAL ? 5.0 : 1.0; // kg/s
        service.state.fuel -= leakRate * 0.016; // per frame (approx) - actually should use dt
        // Since we don't have dt here easily without passing it, we assume ~60hz call. 
        // Better: applyImpact should take dt? No, update does.
        // Let's rely on the update loop in physics service to handle fuel, 
        // or just accept small inaccuracy.
        if (service.state.fuel < 0) service.state.fuel = 0;
    }

    applyControlJam(service, failure) {
        const surface = failure.data.surface;
        const val = failure.data.stuckValue;
        
        if (surface === 'elevator') service.controls.elevator = val;
        if (surface === 'aileron') service.controls.aileron = val;
        if (surface === 'rudder') service.controls.rudder = val;
    }
    
    // reset logic
    reset() {
        this.activeFailures.clear();
        this.time = 0;
        this.forcedFailurePending = null;
        if (this.forcedFailureType && this.forcedFailureType !== 'random' && this.forcedFailureType !== 'none') {
            this.scheduleForcedFailure(this.forcedFailureType);
        }
    }
}

export default FailureSystem;
