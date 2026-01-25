
import eventBus from './eventBus.js';

export const FailureTypes = {
    // Original
    ENGINE_FAILURE: 'engine_failure',
    HYDRAULIC_FAILURE: 'hydraulic_failure',
    PITOT_STATIC_FAILURE: 'pitot_static_failure',
    FUEL_LEAK: 'fuel_leak',
    CONTROL_JAM: 'control_jam',
    
    // Expanded from failure-list.csv
    MINOR_INSTRUMENT: 'minor_instrument_failure',
    CIRCUIT_BREAKER: 'circuit_breaker_trip',
    SENSOR_ANOMALY: 'non_critical_sensor_anomaly',
    NAV_RADIO_GLITCH: 'navigation_radio_glitch',
    COMM_RADIO_FAILURE: 'communication_radio_failure',
    GEAR_EXTENSION_FAILURE: 'landing_gear_extension_issue',
    BRAKE_FAILURE: 'brake_failure',
    PARTIAL_ELECTRICAL: 'partial_electrical_failure',
    SINGLE_ENGINE_LOSS: 'single_engine_loss', // Similar to ENGINE_FAILURE but specific context
    SEVERE_ICING: 'severe_icing',
    TURBULENCE_ENCOUNTER: 'severe_turbulence',
    WIND_SHEAR: 'wind_shear',
    FUEL_CONTAMINATION: 'fuel_contamination',
    COMPRESSOR_STALL: 'compressor_stall',
    SPATIAL_DISORIENTATION: 'spatial_disorientation', // Simulated via HUD/Controls?
    AUTOPILOT_ANOMALY: 'autopilot_anomaly',
    AUTOTHROTTLE_MISCOMMAND: 'autothrottle_miscommand',
    BIRD_STRIKE: 'bird_strike',
    MAJOR_HYDRAULIC: 'major_hydraulic_failure', // Total loss
    STRUCTURAL_JAM: 'structural_control_surface_jam',
    RUNWAY_EXCURSION: 'runway_excursion', // Physics state
    SEVERE_WEATHER: 'severe_weather_convective',
    ELECTRICAL_BUS_FAILURE: 'electrical_bus_failure',
    DUAL_ENGINE_FAILURE: 'dual_engine_failure',
    RAPID_DEPRESSURIZATION: 'rapid_depressurization',
    TOTAL_CONTROL_FAILURE: 'total_flight_control_failure',
    UNCONTAINED_ENGINE: 'uncontained_engine_failure',
    HULL_BREACH: 'hull_breach',
    FIRE_ONBOARD: 'onboard_fire',
    SABOTAGE_EXPLOSION: 'sabotage_explosion'
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
        return; // DISABLED: User requested to disable failures for now
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
            case FailureTypes.SINGLE_ENGINE_LOSS:
            case FailureTypes.COMPRESSOR_STALL:
            case FailureTypes.UNCONTAINED_ENGINE:
            case FailureTypes.FIRE_ONBOARD:
                // Pick an engine (0 or 1)
                failureData.data.engineIndex = Math.random() > 0.5 ? 1 : 0;
                break;
            case FailureTypes.DUAL_ENGINE_FAILURE:
            case FailureTypes.FUEL_CONTAMINATION:
                // Affects both, no index needed or index -1
                failureData.data.engineIndex = -1; 
                break;
            case FailureTypes.CONTROL_JAM:
            case FailureTypes.STRUCTURAL_JAM:
                // Pick surface: elevator, aileron, rudder
                const surfaces = ['elevator', 'aileron', 'rudder'];
                failureData.data.surface = surfaces[Math.floor(Math.random() * surfaces.length)];
                failureData.data.stuckValue = (Math.random() * 0.4) - 0.2; // Small deflection jam
                break;
            case FailureTypes.GEAR_EXTENSION_FAILURE:
                failureData.data.gear = Math.random() > 0.5 ? 'nose' : 'main';
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
                case FailureTypes.SINGLE_ENGINE_LOSS:
                case FailureTypes.COMPRESSOR_STALL:
                case FailureTypes.UNCONTAINED_ENGINE:
                case FailureTypes.FIRE_ONBOARD:
                    this.applyEngineFailure(physicsService, failure);
                    break;
                case FailureTypes.DUAL_ENGINE_FAILURE:
                case FailureTypes.FUEL_CONTAMINATION:
                    this.applyDualEngineFailure(physicsService, failure);
                    break;
                case FailureTypes.HYDRAULIC_FAILURE:
                case FailureTypes.MAJOR_HYDRAULIC:
                    this.applyHydraulicFailure(physicsService, failure);
                    break;
                case FailureTypes.FUEL_LEAK:
                    this.applyFuelLeak(physicsService, failure);
                    break;
                case FailureTypes.CONTROL_JAM:
                case FailureTypes.STRUCTURAL_JAM:
                    this.applyControlJam(physicsService, failure);
                    break;
                case FailureTypes.PITOT_STATIC_FAILURE:
                case FailureTypes.SEVERE_ICING: // Icing often blocks pitot
                    physicsService.sensors = physicsService.sensors || {};
                    physicsService.sensors.pitotBlocked = true;
                    break;
                case FailureTypes.RAPID_DEPRESSURIZATION:
                case FailureTypes.HULL_BREACH:
                    // Set flag for overhead logic
                    physicsService.systems.pressurization.breach = true;
                    break;
                case FailureTypes.ELECTRICAL_BUS_FAILURE:
                    // Kill electrical buses
                    physicsService.systems.electrical.gen1 = false;
                    physicsService.systems.electrical.gen2 = false;
                    physicsService.systems.electrical.apuGen = false;
                    physicsService.systems.electrical.stbyPower = false;
                    break;
                case FailureTypes.PARTIAL_ELECTRICAL:
                case FailureTypes.CIRCUIT_BREAKER:
                     // Kill one generator randomly if not already done
                     if (Math.random() > 0.5) physicsService.systems.electrical.gen1 = false;
                     else physicsService.systems.electrical.gen2 = false;
                     break;
                case FailureTypes.GEAR_EXTENSION_FAILURE:
                    // Force gear to specific state or jam it
                    // physicsService.controls.gear = 0.5; // Stuck halfway? 
                    // Physics service expects 0 or 1 usually, but maybe we can simulate Stuck.
                    // For now, prevent it from matching target.
                    // If target is down (1), force up (0).
                    if (physicsService.controls.gear > 0.5) physicsService.controls.gear = 0;
                    break;
                case FailureTypes.AUTOPILOT_ANOMALY:
                    // Disengage or random inputs
                    if (physicsService.autopilot.engaged) {
                        if (Math.random() < 0.05) physicsService.autopilot.setEngaged(false);
                        else {
                            // Add noise to targets
                            physicsService.autopilot.targets.heading += (Math.random() - 0.5);
                        }
                    }
                    break;
            }
        });
    }

    applyDualEngineFailure(service, failure) {
        service.engines.forEach(e => e.setFailed(true));
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
