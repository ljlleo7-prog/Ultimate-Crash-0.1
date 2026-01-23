
/**
 * Warning System Service
 * 
 * Monitors aircraft state and triggers warnings for:
 * - GPWS (Ground Proximity Warning System)
 * - Stall
 * - Overspeed
 * - Bank Angle
 * - System Failures (Engine, Hydraulics, etc.)
 */
class WarningSystem {
    constructor() {
        this.activeWarnings = [];
        this.lastUpdate = 0;
        
        // Configuration Thresholds
        this.thresholds = {
            stallAlpha: 15, // Degrees
            bankAngleWarn: 40, // Degrees
            overspeedKnots: 340, // Knots (Vmo generic)
            sinkRateWarn: 2500, // ft/min
            sinkRatePullUp: 4000, // ft/min
            terrainClosureWarn: 2000, // ft/min closure rate
            gearWarningAlt: 500, // ft RA (Radio Altitude)
            flapsWarningAlt: 200, // ft RA
            
            // New Thresholds
            vle: 270, // Max Gear Extended Speed
            vlo: 250, // Max Gear Operation Speed
            vfe: [ // Max Flap Extended Speeds (Index 0 = Flaps 1, etc. - Simplified)
                250, // Flaps 1
                230, // Flaps 5
                210, // Flaps 15
                190, // Flaps 20
                180, // Flaps 25
                170  // Flaps 30
            ],
            tailStrikePitch: 10, // Degrees
            altitudeAlertDiff: 300 // ft
        };
        
        this.prevApEngaged = false;
    }

    /**
     * Update warnings based on current flight state
     * @param {Object} physicsState - The full state object from RealisticFlightPhysicsService
     * @param {number} dt - Time delta
     */
    update(physicsState, dt) {
        this.activeWarnings = [];

        if (!physicsState) return this.activeWarnings;

        // Extract necessary data
        const {
            derived,
            controls,
            systems,
            debugPhysics,
            controls: { gear, flaps, throttle, airBrakes, brakes },
            verticalSpeed, // ft/min
            fuel,
            engineParams,
            groundStatus,
            autopilot,
            autopilotTargets
        } = physicsState;

        const altitudeAGL = derived.altitude_agl_ft;
        const altitudeMSL = derived.altitude_ft;
        const airspeed = derived.indicatedAirspeed || derived.airspeed; // Use IAS for structural limits
        
        // Roll is available in debugPhysics.phi (radians)
        const rollRad = physicsState.debugPhysics.phi || 0;
        const pitchRad = physicsState.debugPhysics.theta || 0;
        
        const rollDeg = rollRad * 180 / Math.PI;
        const pitchDeg = pitchRad * 180 / Math.PI;
        const alpha = debugPhysics.alpha * 180 / Math.PI;
        
        // --- GPWS Checks ---
        this.checkGPWS(altitudeAGL, verticalSpeed, gear, flaps, airspeed, groundStatus);

        // --- Flight Envelope Checks ---
        this.checkEnvelope(alpha, airspeed, rollDeg, pitchDeg, flaps, gear, groundStatus);

        // --- Configuration Checks ---
        this.checkConfiguration(flaps, gear, airBrakes, throttle, groundStatus, pitchDeg, brakes, altitudeAGL);

        // --- System Checks ---
        this.checkSystems(systems, fuel, engineParams, altitudeAGL);
        
        // --- Autopilot/Nav Checks ---
        this.checkAutomation(autopilot, autopilotTargets, altitudeMSL);

        // Sort by priority (Critical first)
        this.activeWarnings.sort((a, b) => {
            const priorityOrder = { 'CRITICAL': 0, 'WARNING': 1, 'ADVISORY': 2 };
            return priorityOrder[a.level] - priorityOrder[b.level];
        });

        return this.activeWarnings;
    }

    addWarning(id, message, level, isFlashing = false) {
        // Prevent duplicates
        if (!this.activeWarnings.find(w => w.id === id)) {
            this.activeWarnings.push({ id, message, level, isFlashing });
        }
    }

    checkGPWS(agl, vs, gear, flaps, airspeed, groundStatus) {
        // Disable GPWS if on runway or ground
        if (groundStatus && (groundStatus.status === 'RUNWAY' || groundStatus.status === 'GRASS')) {
            return;
        }

        // Mode 1: Excessive Sink Rate
        // Don't warn if on ground or very low (landing flare)
        if (agl > 50 && agl < 2500) {
            if (vs < -this.thresholds.sinkRatePullUp) {
                this.addWarning('GPWS_PULL_UP', 'PULL UP', 'CRITICAL', true);
            } else if (vs < -this.thresholds.sinkRateWarn) {
                this.addWarning('GPWS_SINK_RATE', 'SINK RATE', 'WARNING', true);
            }
        }

        // Mode 2: Terrain
        // Disabled if in landing configuration (Gear Down + Flaps) which implies "Airport Region" intent
        const isLandingConfig = gear > 0.9 && flaps > 0.5;

        if (!isLandingConfig && agl < 500 && airspeed > 250 && vs < -1000) {
            this.addWarning('GPWS_TERRAIN', 'TERRAIN', 'CRITICAL', true);
        }

        // Mode 3: Altitude Loss After Takeoff (Don't Sink)
        // Requires tracking takeoff phase, simplified here:
        // If low altitude, high power, but sinking
        // (Skipping complex state machine for now)

        // Mode 4: Unsafe Terrain Clearance
        if (agl < this.thresholds.gearWarningAlt && !gear && airspeed < 180) {
            this.addWarning('GPWS_TOO_LOW_GEAR', 'TOO LOW GEAR', 'WARNING');
        }
        if (agl < this.thresholds.flapsWarningAlt && flaps < 0.1 && gear && airspeed < 160) {
            this.addWarning('GPWS_TOO_LOW_FLAPS', 'TOO LOW FLAPS', 'WARNING');
        }
    }

    checkEnvelope(alpha, airspeed, roll, pitch, flaps, gear, groundStatus) {
        const onGround = groundStatus && (groundStatus.status === 'RUNWAY' || groundStatus.status === 'GRASS');

        // Stall Warning (Disabled on Ground)
        if (!onGround && alpha > this.thresholds.stallAlpha) {
            this.addWarning('STALL', 'STALL', 'CRITICAL', true);
        }

        // Overspeed
        if (airspeed > this.thresholds.overspeedKnots) {
            this.addWarning('OVERSPEED', 'OVERSPEED', 'CRITICAL', true);
        }

        // Bank Angle
        if (Math.abs(roll) > this.thresholds.bankAngleWarn) {
            this.addWarning('BANK_ANGLE', 'BANK ANGLE', 'WARNING', true);
        }
    }

    checkSystems(systems, fuel, engines, agl) {
        if (!systems) return;

        // Fire
        if (systems.fire.eng1) this.addWarning('FIRE_ENG1', 'ENGINE 1 FIRE', 'CRITICAL', true);
        if (systems.fire.eng2) this.addWarning('FIRE_ENG2', 'ENGINE 2 FIRE', 'CRITICAL', true);
        if (systems.fire.apu) this.addWarning('FIRE_APU', 'APU FIRE', 'CRITICAL', true);

        // Hydraulics
        if (systems.hydraulics.sysA.pressure < 1000) this.addWarning('HYD_A_LOW', 'HYD A PRESS LOW', 'ADVISORY');
        if (systems.hydraulics.sysB.pressure < 1000) this.addWarning('HYD_B_LOW', 'HYD B PRESS LOW', 'ADVISORY');

        // Electrical
        if (!systems.electrical.gen1 && !systems.electrical.gen2 && !systems.electrical.apuGen) {
             // If on battery only in air
             this.addWarning('ELEC_EMER', 'ELEC EMER CONFIG', 'WARNING');
        }

        // Pressurization
        if (systems.pressurization.cabinAlt > 10000) {
            this.addWarning('CABIN_ALT', 'CABIN ALTITUDE', 'CRITICAL', true);
        }
        
        // Fuel
        if (fuel < 500) { // Arbitrary low fuel mass
             this.addWarning('FUEL_LOW', 'LOW FUEL', 'WARNING');
        }

        // Engine Failure (In Air)
        // Check engineParams structure (arrays of values)
        if (agl > 500 && engines) {
            if (Array.isArray(engines.n1)) {
                 engines.n1.forEach((n1Val, i) => {
                    if (n1Val < 10) { 
                        this.addWarning(`ENG_${i+1}_FAIL`, `ENGINE ${i+1} FAIL`, 'CRITICAL', true);
                    }
                });
            } else if (Array.isArray(engines)) {
                // Fallback for legacy format if any
                 engines.forEach((eng, i) => {
                    if (eng.n1 < 10) {
                        this.addWarning(`ENG_${i+1}_FAIL`, `ENGINE ${i+1} FAIL`, 'CRITICAL', true);
                    }
                });
            }
        }
    }

    checkConfiguration(flaps, gear, airBrakes, throttle, groundStatus, pitch, brakes, altitudeAGL) {
        // 1. Takeoff Configuration
        // If on ground, high throttle, and flaps not set or brakes on
        const onGround = groundStatus && (groundStatus.status === 'RUNWAY' || groundStatus.status === 'GRASS');
        if (onGround && throttle > 0.7) {
            if (flaps < 0.1) {
                this.addWarning('CONFIG_FLAPS', 'CONFIG FLAPS', 'WARNING', true);
            }
            if (airBrakes > 0.1) {
                this.addWarning('CONFIG_SPOILERS', 'CONFIG SPOILERS', 'WARNING', true);
            }
            if (brakes > 0.1) {
                this.addWarning('CONFIG_BRAKES', 'CONFIG BRAKES', 'WARNING', true);
            }
        }

        // 2. Landing Configuration
        // If in air, low altitude, gear not down
        // (Covered partially by GPWS, but specific config warning here)

        // 3. Tail Strike Risk
        if (altitudeAGL <= 50 && pitch > this.thresholds.tailStrikePitch) {
            this.addWarning('TAIL_STRIKE', 'TAIL STRIKE RISK', 'CRITICAL', true);
        }
    }

    checkAutomation(autopilot, autopilotTargets, altitudeMSL) {
        if (!autopilot) return;

        // Altitude Alert
        if (autopilotTargets && typeof autopilotTargets.altitude === 'number') {
            const diff = Math.abs(altitudeMSL - autopilotTargets.altitude);
            
            // Approaching target? (Not implemented statefully yet)
            
            // Deviation alert (if we were supposed to be there)
            // For now, just a simple check if we are significantly off while in ALT HOLD mode? 
            // Simplified: If diff > 300ft and AP is engaged, maybe just advisory if it persists?
            // Leaving out for now to avoid nuisance warnings during climb/descent
        }
    }
}

export default WarningSystem;
