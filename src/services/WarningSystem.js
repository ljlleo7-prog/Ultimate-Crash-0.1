
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

import { terrainRadarService } from './TerrainRadarService.js';

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
        this.checkSystems(systems, fuel, engineParams, altitudeAGL, controls);
        
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

    checkGPWS(agl, vs, gear, flaps, airspeed, groundStatus, physicsState) {
        // Disable GPWS if in Airport Region (Runway or Grass below)
        // OR if in Landing Configuration (Gear Down + Flaps) - as per user request to avoid nuisance
        const isLandingConfig = gear > 0.9 && flaps > 0.5;
        
        if ((groundStatus && (groundStatus.status === 'RUNWAY' || groundStatus.status === 'GRASS')) || isLandingConfig) {
            return;
        }

        const PREDICTION_TIME_WARN = 20; // Seconds
        const PREDICTION_TIME_PULL_UP = 10; // Seconds

        // --- Mode 1: Excessive Sink Rate & Collision Prediction (Vertical) ---
        // User Request: "descending with an estimated 20s before collision based on sinkrate"
        
        // vs is negative ft/min when descending. 
        if (vs < -100 && agl > 0) { 
             const sinkRateFtSec = -vs / 60; // Convert to ft/sec positive value
             const ttiSink = agl / sinkRateFtSec; // Seconds to impact
             
             if (ttiSink < PREDICTION_TIME_PULL_UP) {
                  this.addWarning('GPWS_PULL_UP', 'warnings.gpws.pull_up', 'CRITICAL', true);
             } else if (ttiSink < PREDICTION_TIME_WARN) {
                  this.addWarning('GPWS_TERRAIN', 'warnings.gpws.terrain', 'CRITICAL', true);
             }
        }
        
        // --- Mode 2: Terrain Ahead Prediction (Horizontal Lookahead) ---
        // User Request: "terrain higher than me in front of me... within 20s reach... at any airspeed"
        
        if (physicsState && physicsState.derived && physicsState.position) {
             const validGS = physicsState.derived.groundSpeed || 0; // Knots
             const validHeading = physicsState.derived.heading || 0; // Degrees
             const lat = physicsState.position.latitude || 0;
             const lon = physicsState.position.longitude || 0;
             const altAMSL = physicsState.derived.altitude_ft || 0;
             
             // Calculate future positions
             const headingRad = validHeading * Math.PI / 180;
             const nmPerSec = validGS / 3600;
             
             // Check 10s (PULL UP)
             const distNm10 = nmPerSec * PREDICTION_TIME_PULL_UP;
             const distDeg10 = distNm10 / 60;
             const dLat10 = distDeg10 * Math.cos(headingRad);
             const dLon10 = distDeg10 * Math.sin(headingRad) / Math.cos(lat * Math.PI / 180);
             
             const futureTerrainFt10 = terrainRadarService.getTerrainHeight(lat + dLat10, lon + dLon10);
             
             if (futureTerrainFt10 !== null && futureTerrainFt10 > altAMSL) {
                  this.addWarning('GPWS_PULL_UP', 'warnings.gpws.pull_up', 'CRITICAL', true);
             } else {
                  // Check 20s (TERRAIN)
                  const distNm20 = nmPerSec * PREDICTION_TIME_WARN;
                  const distDeg20 = distNm20 / 60;
                  const dLat20 = distDeg20 * Math.cos(headingRad);
                  const dLon20 = distDeg20 * Math.sin(headingRad) / Math.cos(lat * Math.PI / 180);
                  
                  const futureTerrainFt20 = terrainRadarService.getTerrainHeight(lat + dLat20, lon + dLon20);
                  
                  if (futureTerrainFt20 !== null && futureTerrainFt20 > altAMSL) {
                       this.addWarning('GPWS_TERRAIN', 'warnings.gpws.terrain', 'CRITICAL', true);
                  }
             }
        }

        // Mode 4: Unsafe Terrain Clearance (Legacy Checks)
        if (agl < this.thresholds.gearWarningAlt && !gear && airspeed < 180) {
            this.addWarning('GPWS_TOO_LOW_GEAR', 'warnings.gpws.too_low_gear', 'WARNING');
        }
        if (agl < this.thresholds.flapsWarningAlt && flaps < 0.1 && gear && airspeed < 160) {
            this.addWarning('GPWS_TOO_LOW_FLAPS', 'warnings.gpws.too_low_flaps', 'WARNING');
        }
    }

    checkEnvelope(alpha, airspeed, roll, pitch, flaps, gear, groundStatus) {
        const onGround = groundStatus && (groundStatus.status === 'RUNWAY' || groundStatus.status === 'GRASS');

        // Stall Warning (Disabled on Ground)
        if (!onGround && alpha > this.thresholds.stallAlpha) {
            this.addWarning('STALL', 'warnings.stall', 'CRITICAL', true);
        }

        // Overspeed
        if (airspeed > this.thresholds.overspeedKnots) {
            this.addWarning('OVERSPEED', 'warnings.overspeed', 'CRITICAL', true);
        }

        // Bank Angle
        // Only trigger if AIRBORNE (not on ground) to prevent nuisance alarms during taxi/pushback
        if (!onGround && Math.abs(roll) > this.thresholds.bankAngleWarn) {
            this.addWarning('BANK_ANGLE', 'warnings.bank_angle', 'WARNING', true);
        }
    }

    checkSystems(systems, fuel, engines, agl, controls) {
        if (!systems) return;

        // Fire
        if (systems.fire.eng1) this.addWarning('FIRE_ENG1', 'warnings.fire.eng1', 'CRITICAL', true);
        if (systems.fire.eng2) this.addWarning('FIRE_ENG2', 'warnings.fire.eng2', 'CRITICAL', true);
        if (systems.fire.apu) this.addWarning('FIRE_APU', 'warnings.fire.apu', 'CRITICAL', true);

        // Hydraulics
        if (systems.hydraulics.sysA.pressure < 1000) this.addWarning('HYD_A_LOW', 'warnings.hydraulics.a_low', 'ADVISORY');
        if (systems.hydraulics.sysB.pressure < 1000) this.addWarning('HYD_B_LOW', 'warnings.hydraulics.b_low', 'ADVISORY');

        // Electrical
        if (!systems.electrical.gen1 && !systems.electrical.gen2 && !systems.electrical.apuGen) {
             // If on battery only in air
             this.addWarning('ELEC_EMER', 'warnings.elec.emer_config', 'WARNING');
        }

        // Pressurization
        if (systems.pressurization.cabinAlt > 10000) {
            this.addWarning('CABIN_ALT', 'warnings.cabin_alt', 'CRITICAL', true);
        }
        
        // Fuel
        if (fuel < 500) { // Arbitrary low fuel mass
             this.addWarning('FUEL_LOW', 'warnings.fuel_low', 'WARNING');
        }

        // Engine Failure (In Air)
        // Check engineParams structure (arrays of values)
        const throttleDemand = typeof controls?.throttle === 'number' ? controls.throttle : 0;
        const fuelControls = systems.engines ? Object.values(systems.engines).map(eng => eng?.fuelControl !== false) : [];

        if (agl > 500 && engines && throttleDemand > 0.2) {
            if (Array.isArray(engines.n1)) {
                 engines.n1.forEach((n1Val, i) => {
                    const n2Val = Array.isArray(engines.n2) ? engines.n2[i] : undefined;
                    const fuelOn = fuelControls[i] !== false;
                    if (fuelOn && n1Val < 10 && (n2Val === undefined || n2Val < 25)) { 
                        this.addWarning(`ENG_${i+1}_FAIL`, { key: 'warnings.engine_fail', params: { index: i+1 } }, 'CRITICAL', true);
                    }
                });
            } else if (Array.isArray(engines)) {
                // Fallback for legacy format if any
                 engines.forEach((eng, i) => {
                    const fuelOn = fuelControls[i] !== false;
                    if (fuelOn && eng.n1 < 10 && (eng.n2 === undefined || eng.n2 < 25)) {
                        this.addWarning(`ENG_${i+1}_FAIL`, { key: 'warnings.engine_fail', params: { index: i+1 } }, 'CRITICAL', true);
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
                this.addWarning('CONFIG_FLAPS', 'warnings.config.flaps', 'WARNING', true);
            }
            if (airBrakes > 0.1) {
                this.addWarning('CONFIG_SPOILERS', 'warnings.config.spoilers', 'WARNING', true);
            }
            if (brakes > 0.1) {
                this.addWarning('CONFIG_BRAKES', 'warnings.config.brakes', 'WARNING', true);
            }
        }

        // 2. Landing Configuration
        // If in air, low altitude, gear not down
        // (Covered partially by GPWS, but specific config warning here)

        // 3. Tail Strike Risk
        if (altitudeAGL <= 50 && pitch > this.thresholds.tailStrikePitch) {
            this.addWarning('TAIL_STRIKE', 'warnings.tail_strike', 'CRITICAL', true);
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
