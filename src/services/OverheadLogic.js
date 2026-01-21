
/**
 * Overhead Logic Service
 * Handles the internal logic and state transitions for aircraft systems.
 * Simulates dependencies (e.g., APU needs battery), startup sequences, and physical properties (pressure, temp).
 */

class OverheadLogic {
    constructor() {
        // Constants for simulation
        this.CONSTANTS = {
            APU_START_TIME: 15.0, // Seconds to start APU
            HYD_PRESSURE_BUILD_RATE: 500, // PSI per second
            HYD_PRESSURE_DECAY_RATE: 100, // PSI per second
            FUEL_PUMP_PRESSURE: 35, // PSI
        };
    }

    /**
     * Updates system states based on time delta and inputs
     * @param {Object} systems - The current systems state object
     * @param {Object} context - External context (engines running, air/ground, etc.)
     * @param {number} dt - Time delta in seconds
     * @returns {Object} - Updated systems state (mutates in place usually, but returning for clarity)
     */
    update(systems, context, dt) {
        if (!systems) return;

        this.updateElectrical(systems, context, dt);
        this.updateAPU(systems, context, dt);
        this.updateFuel(systems, context, dt);
        this.updateHydraulics(systems, context, dt);
        this.updatePressurization(systems, context, dt);
        this.updateLighting(systems, context, dt);
    }

    updateElectrical(systems, context, dt) {
        // Battery Logic
        // If battery is OFF, most DC buses are dead unless TRs are working from AC
        const batteryOn = systems.electrical.battery;
        
        // Generator Logic
        // Generators only produce power if engine N2 > 50%
        const gen1Available = context.engineN2[0] > 50;
        const gen2Available = context.engineN2[1] > 50;
        const apuGenAvailable = systems.apu.running;

        // Bus Logic (Simplified)
        systems.electrical.dcVolts = batteryOn ? 24.0 : 0;
        if (systems.electrical.gen1 && gen1Available) systems.electrical.dcVolts = 28.0;
        if (systems.electrical.gen2 && gen2Available) systems.electrical.dcVolts = 28.0;
        if (systems.electrical.apuGen && apuGenAvailable) systems.electrical.dcVolts = 28.0;

        // Load Shedding / Battery Drain could go here
    }

    updateAPU(systems, context, dt) {
        // APU Start Logic
        // Requires Battery
        if (!systems.electrical.battery) {
            systems.apu.running = false;
            systems.apu.starting = false;
            return;
        }

        if (systems.apu.master) {
            if (systems.apu.start) {
                // User triggers start
                if (!systems.apu.running && !systems.apu.starting) {
                    systems.apu.starting = true;
                    systems.apu.egt = 200; // Initial bump
                }
                // Toggle switch back usually handled by UI, but if not:
                // We leave it true until running? Or assume momentary.
                // Let's leave it, but logic below handles 'starting' state.
            }

            if (systems.apu.starting) {
                // Spool up sequence
                systems.apu.egt += 80 * dt; // EGT rises
                
                // Simulate N2 rise (not stored in systems.apu but implied by time/egt)
                
                if (systems.apu.egt >= 600) { // Stabilized
                    systems.apu.running = true;
                    systems.apu.starting = false;
                    systems.apu.start = false; // Kick switch off
                    systems.apu.egt = 400; // Stabilize normal EGT
                }
            } else if (systems.apu.running) {
                // Normal Ops
                systems.apu.egt = 400 + (Math.random() * 5); 
                
                // Bleed load increases EGT
                if (systems.apu.bleed) systems.apu.egt += 50;
                // Gen load increases EGT
                if (systems.apuGen) systems.apu.egt += 30;
                
            } else {
                // Cool down (Master On but not running/starting)
                if (systems.apu.egt > 20) systems.apu.egt -= 15 * dt;
            }
        } else {
            // Shutdown
            systems.apu.running = false;
            systems.apu.starting = false;
            if (systems.apu.egt > 20) systems.apu.egt -= 25 * dt;
        }
    }

    updateFuel(systems, context, dt) {
        // Crossfeed logic could go here
        // Pump pressure logic
    }

    updateHydraulics(systems, context, dt) {
        ['sysA', 'sysB'].forEach(sysName => {
            const sys = systems.hydraulics[sysName];
            let targetPressure = 0;

            // Engine Pumps
            const engIndex = sysName === 'sysA' ? 0 : 1;
            if (sys.engPump && context.engineN2[engIndex] > 10) {
                targetPressure = 3000;
            }

            // Electric Pumps
            // Elec pumps need AC power
            const acPowerAvailable = systems.electrical.gen1 || systems.electrical.gen2 || systems.electrical.apuGen || (systems.electrical.battery && systems.electrical.stbyPower); 
            // Simplified AC check
            if (sys.elecPump && acPowerAvailable) {
                targetPressure = 3000;
            }

            // Pressure transition
            if (sys.pressure < targetPressure) {
                sys.pressure += this.CONSTANTS.HYD_PRESSURE_BUILD_RATE * dt;
                if (sys.pressure > targetPressure) sys.pressure = targetPressure;
            } else if (sys.pressure > targetPressure) {
                sys.pressure -= this.CONSTANTS.HYD_PRESSURE_DECAY_RATE * dt;
                if (sys.pressure < targetPressure) sys.pressure = targetPressure;
            }
        });
    }

    updatePressurization(systems, context, dt) {
        // Simple cabin altitude logic
        const target = systems.pressurization.targetAlt;
        const current = systems.pressurization.cabinAlt;
        const aircraftAlt = context.altitude;

        // If packs are on and bleed is available
        const bleedAvailable = (systems.pressurization.bleed1 && context.engineN2[0] > 50) || 
                               (systems.pressurization.bleed2 && context.engineN2[1] > 50) ||
                               (systems.apu.bleed && systems.apu.running);
        
        const packsOn = systems.pressurization.packL || systems.pressurization.packR;
        const hasBreach = systems.pressurization.breach === true;

        if (hasBreach) {
            // Rapid Depressurization
            // Equalize to aircraft altitude very fast
            const rate = 10000 * dt / 60; // 10,000 fpm
            if (current < aircraftAlt) systems.pressurization.cabinAlt += rate;
            else if (current > aircraftAlt) systems.pressurization.cabinAlt -= rate;
        }
        else if (bleedAvailable && packsOn) {
            // Pressurizing to target
            // Rate ~500fpm
            const rate = 500 * dt / 60; // ft per frame
            
            // Auto Schedule Logic
            // Cabin Altitude Target is usually computed based on Landing Altitude + differential
            // Simplified: Maintain 8000ft or Aircraft Altitude (whichever is lower)
            
            let desiredCabinAlt = aircraftAlt;
            if (aircraftAlt > 8000) desiredCabinAlt = 8000;
            
            // Move towards desired
            if (Math.abs(current - desiredCabinAlt) < rate) {
                systems.pressurization.cabinAlt = desiredCabinAlt;
            } else if (current < desiredCabinAlt) {
                systems.pressurization.cabinAlt += rate;
            } else if (current > desiredCabinAlt) {
                systems.pressurization.cabinAlt -= rate;
            }
            
        } else {
            // Depressurizing to outside altitude (leak rate)
            // Should equalize to aircraft altitude (whether Up or Down)
            // Natural leak rate ~500 fpm typically if sealed, but let's say 3000fpm if valve open
            const leakRate = 500 * dt / 60; 
            
            if (Math.abs(current - aircraftAlt) < leakRate) {
                systems.pressurization.cabinAlt = aircraftAlt;
            } else if (current < aircraftAlt) {
                systems.pressurization.cabinAlt += leakRate; // Climbing cabin (losing pressure)
            } else if (current > aircraftAlt) {
                systems.pressurization.cabinAlt -= leakRate; // Descending cabin (gaining pressure - rare unless diving fast)
            }
        }
    }
    
    updateLighting(systems, context, dt) {
        // Logic for auto-off or power dependency
        if (!systems.electrical.dcVolts) {
            // If no power, lights go off? Or just don't render?
            // Usually switch stays on, but light output is 0. 
            // We'll leave state as is, renderer handles effect.
        }
    }
}

export default new OverheadLogic();
