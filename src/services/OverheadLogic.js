
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
        if (systems.apu.master) {
            if (systems.apu.start) {
                // User held start switch (momentary usually, but we might track state)
                // In this sim, let's say 'start' triggers the sequence
                if (!systems.apu.running && systems.apu.egt < 100) {
                    systems.apu.starting = true;
                }
                // Reset switch to neutral/on if it's momentary (handled in UI or here)
                // For now, assume 'start' is a persistent state until engine running? 
                // Usually it's spring-loaded. We'll handle 'starting' flag.
            }

            if (systems.apu.starting) {
                systems.apu.egt += 50 * dt; // EGT rises
                if (systems.apu.egt > 400 && systems.apu.egt < 800) {
                    // Spool up
                }
                if (systems.apu.egt >= 600) { // Stabilized
                    systems.apu.running = true;
                    systems.apu.starting = false;
                    systems.apu.start = false; // Reset switch
                }
            } else if (systems.apu.running) {
                systems.apu.egt = 650 + Math.random() * 10; // Stable
            } else {
                // Cool down
                if (systems.apu.egt > 0) systems.apu.egt -= 10 * dt;
            }
        } else {
            // Shutdown
            systems.apu.running = false;
            systems.apu.starting = false;
            if (systems.apu.egt > 0) systems.apu.egt -= 15 * dt;
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

        if (bleedAvailable && packsOn) {
            // Pressurizing to target
            // Rate ~500fpm
            const rate = 500 * dt / 60; // ft per frame
            if (current < target) systems.pressurization.cabinAlt += rate; // shouldn't happen usually unless target > current
            // Actually, we want cabin alt to be lower than aircraft alt (higher pressure)
            // But usually we set Landing Alt or Cruise Alt. 
            // Let's assume auto mode maintains 8000ft max cabin alt
            
            let desiredCabinAlt = aircraftAlt;
            if (aircraftAlt > 8000) desiredCabinAlt = 8000;
            
            // Move towards desired
            if (current < desiredCabinAlt) systems.pressurization.cabinAlt += rate;
            else if (current > desiredCabinAlt) systems.pressurization.cabinAlt -= rate;
            
        } else {
            // Depressurizing to outside altitude (leak rate)
            if (current < aircraftAlt) {
                systems.pressurization.cabinAlt += 100 * dt; // Leak
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
