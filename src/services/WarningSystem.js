
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
            flapsWarningAlt: 200 // ft RA
        };
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
            controls: { gear, flaps },
            verticalSpeed // ft/min
        } = physicsState;

        const altitudeAGL = derived.altitude_agl_ft;
        const airspeed = derived.airspeed;
        const roll = Math.abs(physicsState.debugPhysics.theta * 180 / Math.PI); // Assuming theta is pitch? Wait, check rotation order.
        // Physics Service: euler.phi is roll, euler.theta is pitch. 
        // physicsState.debugPhysics.theta is passed as pitch.
        // Let's use the raw euler angles if available, or rely on what's passed.
        // Looking at RealisticFlightPhysicsService:
        // const euler = this.state.quat.toEuler();
        // apState = { ..., pitch: euler.theta, roll: euler.phi, ... }
        // getOutputState returns: derived.heading, debugPhysics.theta (pitch).
        // It seems 'roll' might not be directly in debugPhysics.
        // But 'autopilot' state has pitch and roll.
        // Let's check where we can get Roll. 
        // 'autopilot' object in output state has 'roll' (radians).
        
        const rollDeg = (physicsState.autopilot?.roll || 0) * 180 / Math.PI;
        const pitchDeg = (physicsState.autopilot?.pitch || 0) * 180 / Math.PI;
        const alpha = debugPhysics.alpha * 180 / Math.PI;
        
        // --- GPWS Checks ---
        this.checkGPWS(altitudeAGL, verticalSpeed, gear, flaps, airspeed);

        // --- Flight Envelope Checks ---
        this.checkEnvelope(alpha, airspeed, rollDeg, pitchDeg);

        // --- System Checks ---
        this.checkSystems(systems);

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

    checkGPWS(agl, vs, gear, flaps, airspeed) {
        // Mode 1: Excessive Sink Rate
        // Don't warn if on ground or very low (landing flare)
        if (agl > 50 && agl < 2500) {
            if (vs < -this.thresholds.sinkRatePullUp) {
                this.addWarning('GPWS_PULL_UP', 'PULL UP', 'CRITICAL', true);
            } else if (vs < -this.thresholds.sinkRateWarn) {
                this.addWarning('GPWS_SINK_RATE', 'SINK RATE', 'WARNING', true);
            }
        }

        // Mode 2: Terrain (Simplified - just low alt + high speed + descent)
        if (agl < 500 && airspeed > 250 && vs < -1000) {
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

    checkEnvelope(alpha, airspeed, roll, pitch) {
        // Stall Warning
        if (alpha > this.thresholds.stallAlpha) {
            this.addWarning('STALL', 'STALL', 'CRITICAL', true);
        }

        // Overspeed
        if (airspeed > this.thresholds.overspeedKnots) {
            this.addWarning('OVERSPEED', 'OVERSPEED', 'CRITICAL', true);
        }

        // Bank Angle
        if (Math.abs(roll) > this.thresholds.bankAngleWarn) {
            this.addWarning('BANK_ANGLE', 'BANK ANGLE', 'WARNING');
        }
    }

    checkSystems(systems) {
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
    }
}

export default WarningSystem;
