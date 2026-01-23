
/**
 * Advanced Overhead Logic Service
 * Simulates aircraft systems with high fidelity:
 * - Electrical: Bus-based distribution, load shedding, source isolation.
 * - Pneumatics: Bleed air pressures, isolation valves, pack logic.
 * - Fuel: Tank-to-engine flow, crossfeed, pump pressure logic.
 * - Hydraulics: Reservoir quantities, PTU/Electric/Engine pump logic.
 * - APU: Detailed start/stop cycle with N2/EGT simulation.
 */

class OverheadLogic {
    constructor() {
        this.CONSTANTS = {
            // Electrical
            BATTERY_VOLTAGE: 24.0,
            GEN_VOLTAGE: 115.0, // AC
            TR_VOLTAGE: 28.0,   // DC
            BATTERY_DRAIN_RATE: 0.01, // Volts per second under load

            // APU
            APU_START_TIME: 25.0,
            APU_COOLDOWN_TIME: 60.0,
            
            // Hydraulics
            HYD_MAX_PRESSURE: 3000,
            HYD_BUILD_RATE: 800,
            HYD_DECAY_RATE: 150,
            
            // Pneumatics
            BLEED_PRESSURE_IDLE: 30,
            BLEED_PRESSURE_THRUST: 45,
            
            // Environment
            STD_PRESSURE: 29.92
        };
    }

    /**
     * Main update loop for all systems
     */
    update(systems, context, dt) {
        if (!systems) return;

        // 1. Electrical System (Power distribution foundation)
        this.updateElectrical(systems, context, dt);

        // 2. APU (Dependent on Battery)
        this.updateAPU(systems, context, dt);

        // 3. Pneumatics (Dependent on Engines/APU)
        this.updatePneumatics(systems, context, dt);

        // 4. Hydraulics (Dependent on Elec/Engines)
        this.updateHydraulics(systems, context, dt);

        // 5. Fuel (Dependent on Elec)
        this.updateFuel(systems, context, dt);

        // 6. Pressurization (Dependent on Pneumatics)
        this.updatePressurization(systems, context, dt);

        // 7. Lighting (Dependent on Elec)
        this.updateLighting(systems, context, dt);
    }

    /**
     * ELECTRICAL SYSTEM
     * Simulates AC and DC Buses.
     * Logic: Gen -> Transfer Bus -> Main Bus -> TR -> DC Bus
     */
    updateElectrical(systems, context, dt) {
        const elec = systems.electrical;
        
        // --- Sources ---
        // Battery
        if (elec.battery) {
            // Simple drain simulation
            if (!elec.gen1On && !elec.gen2On && !elec.apuGenOn) {
                elec.batteryCharge = Math.max(0, (elec.batteryCharge || 100) - (0.05 * dt));
            } else {
                elec.batteryCharge = Math.min(100, (elec.batteryCharge || 100) + (0.1 * dt));
            }
            elec.dcVolts = (elec.batteryCharge / 100) * 24 + (Math.random() * 0.5); // Fluctuation
        } else {
            elec.dcVolts = 0;
        }

        // Generators (Engine Driven)
        // Require Engine N2 > 55% and IDG Connected (Assumed connected)
        const gen1Ready = context.engineN2[0] > 55;
        const gen2Ready = context.engineN2[1] > 55;
        const apuGenReady = systems.apu.running && systems.apu.n2 > 95;

        // --- Buses ---
        // Transfer Buses (The main AC arteries)
        let acBus1Powered = false;
        let acBus2Powered = false;

        // Gen 1 Logic
        if (elec.gen1 && gen1Ready) {
            acBus1Powered = true;
            elec.sourceOff1 = false;
        } else {
            elec.sourceOff1 = true;
        }

        // Gen 2 Logic
        if (elec.gen2 && gen2Ready) {
            acBus2Powered = true;
            elec.sourceOff2 = false;
        } else {
            elec.sourceOff2 = true;
        }

        // APU Gen Logic (Can power both if Bus Tie is closed - simplified to auto-tie)
        if (elec.apuGen && apuGenReady) {
            if (!acBus1Powered) acBus1Powered = true;
            if (!acBus2Powered) acBus2Powered = true;
            elec.apuGenOff = false;
        } else {
            elec.apuGenOff = true;
        }

        // Bus Transfer (If one gen fails, other picks up - simplified)
        if (elec.busTie) {
            if (acBus1Powered && !acBus2Powered) acBus2Powered = true;
            if (!acBus1Powered && acBus2Powered) acBus1Powered = true;
        }

        // --- Outputs ---
        // AC Volts / Freq
        if (acBus1Powered || acBus2Powered) {
            elec.acVolts = 115 + (Math.random() * 2 - 1);
            elec.acFreq = 400 + (Math.random() * 4 - 2);
            
            // TR Units (AC -> DC)
            elec.dcVolts = 28.0 + (Math.random() * 0.5);
            elec.standbyPower = true;
        } else if (elec.battery && elec.stbyPower) {
            // Inverter logic
            elec.acVolts = 0; // Main AC is dead
            elec.acFreq = 0;
            elec.standbyPower = true; // Essential bus only
        } else {
            elec.acVolts = 0;
            elec.acFreq = 0;
            elec.standbyPower = false;
        }

        // Update Amperage based on load (Approximate)
        let load = 0;
        if (systems.fuel.leftPumps) load += 10;
        if (systems.fuel.rightPumps) load += 10;
        if (systems.hydraulics.sysA.elecPump) load += 35;
        if (systems.hydraulics.sysB.elecPump) load += 35;
        if (systems.lighting.landing) load += 40;
        if (systems.pressurization.packL) load += 20;
        
        elec.acAmps = (acBus1Powered || acBus2Powered) ? load : 0;
    }

    /**
     * APU SYSTEM
     * Detailed state machine: OFF -> START -> RUN -> COOL -> OFF
     */
    updateAPU(systems, context, dt) {
        const apu = systems.apu;
        
        // Ensure state variables exist
        if (apu.n2 === undefined) apu.n2 = 0;
        if (apu.state === undefined) apu.state = 'OFF'; // OFF, DOOR_OPEN, CRANK, IGNITION, RUNNING, COOLDOWN

        // Inputs
        const hasBat = systems.electrical.battery;
        const masterSw = apu.master;
        const startSw = apu.start;

        if (!hasBat) {
            apu.state = 'OFF';
            apu.running = false;
            apu.n2 = 0;
            apu.egt = 0;
            return;
        }

        switch (apu.state) {
            case 'OFF':
                apu.running = false;
                if (apu.n2 > 0) apu.n2 -= 5 * dt; // Spin down
                if (apu.egt > 20) apu.egt -= 10 * dt; // Cool down
                
                if (masterSw) {
                    apu.state = 'DOOR_OPEN';
                }
                break;

            case 'DOOR_OPEN':
                // Simulate inlet door opening time (3s)
                if (!apu.doorTimer) apu.doorTimer = 0;
                apu.doorTimer += dt;
                
                if (!masterSw) apu.state = 'OFF';
                else if (startSw) apu.state = 'CRANK'; // User hits start
                // Auto-transition if start switch was momentary
                else if (apu.starting) apu.state = 'CRANK';
                break;

            case 'CRANK':
                apu.starting = true;
                apu.n2 += 10 * dt; // Starter motor
                
                if (!masterSw) apu.state = 'OFF';
                else if (apu.n2 >= 20) apu.state = 'IGNITION';
                break;

            case 'IGNITION':
                apu.n2 += 15 * dt; // Combustion assist
                apu.egt += 120 * dt; // Rapid EGT rise
                
                if (apu.egt > 700) apu.egt = 700; // Peak
                if (apu.n2 >= 95) apu.state = 'RUNNING';
                if (!masterSw) apu.state = 'OFF';
                break;

            case 'RUNNING':
                apu.running = true;
                apu.starting = false;
                apu.n2 = 100;
                // Stabilize EGT based on load
                let targetEgt = 350;
                if (systems.electrical.apuGenOn) targetEgt += 50;
                if (systems.apu.bleed) targetEgt += 100;
                
                // Smooth move to target
                apu.egt = apu.egt + (targetEgt - apu.egt) * 0.1;
                
                if (!masterSw) apu.state = 'COOLDOWN';
                break;

            case 'COOLDOWN':
                apu.running = true; // Still running, just cooling
                apu.n2 = 100;
                targetEgt = 300;
                apu.egt = apu.egt + (targetEgt - apu.egt) * 0.1;
                
                if (!apu.cooldownTimer) apu.cooldownTimer = 0;
                apu.cooldownTimer += dt;
                
                if (apu.cooldownTimer > this.CONSTANTS.APU_COOLDOWN_TIME || !systems.electrical.battery) {
                    apu.state = 'OFF';
                    apu.cooldownTimer = 0;
                }
                if (masterSw) apu.state = 'RUNNING'; // Abort shutdown
                break;
        }
    }

    /**
     * PNEUMATICS SYSTEM
     * Bleed Air -> Packs -> Mix Manifold
     */
    updatePneumatics(systems, context, dt) {
        const pneu = systems.pressurization; // Using existing structure but expanding logic
        const apu = systems.apu;
        
        // 1. Bleed Sources
        // Engines
        const eng1N2 = context.engineN2[0];
        const eng2N2 = context.engineN2[1];
        
        const bleed1Pressure = (pneu.bleed1 && eng1N2 > 15) ? (30 + (eng1N2/100)*15) : 0;
        const bleed2Pressure = (pneu.bleed2 && eng2N2 > 15) ? (30 + (eng2N2/100)*15) : 0;
        
        // APU
        const apuBleedPressure = (apu.bleed && apu.running) ? 40 : 0;
        
        // 2. Duct Pressure
        // Left Duct
        pneu.ductPressL = bleed1Pressure;
        if (apuBleedPressure > pneu.ductPressL) pneu.ductPressL = apuBleedPressure; // APU check valve logic simplified
        
        // Right Duct
        pneu.ductPressR = bleed2Pressure;
        
        // Isolation Valve
        if (pneu.isolationValve) {
            // Equalize
            const maxP = Math.max(pneu.ductPressL, pneu.ductPressR);
            pneu.ductPressL = maxP;
            pneu.ductPressR = maxP;
        }

        // 3. Packs
        // Packs need duct pressure to work
        pneu.packLFlow = (pneu.packL && pneu.ductPressL > 15);
        pneu.packRFlow = (pneu.packR && pneu.ductPressR > 15);
    }

    /**
     * HYDRAULICS SYSTEM
     * Sys A/B, Standby, Pressure building
     */
    updateHydraulics(systems, context, dt) {
        ['sysA', 'sysB'].forEach((sysName, idx) => {
            const sys = systems.hydraulics[sysName];
            let supply = false;

            // Engine Pump
            const engN2 = context.engineN2[idx];
            if (sys.engPump && engN2 > 10) supply = true;

            // Electric Pump
            const elec = systems.electrical;
            // Simplified bus check - just generic AC available
            const acAvail = elec.acVolts > 100;
            if (sys.elecPump && acAvail) supply = true;

            // Pressure Logic
            const target = supply ? this.CONSTANTS.HYD_MAX_PRESSURE : 0;
            
            if (sys.pressure < target) {
                sys.pressure += this.CONSTANTS.HYD_BUILD_RATE * dt;
            } else if (sys.pressure > target) {
                sys.pressure -= this.CONSTANTS.HYD_DECAY_RATE * dt;
            }
            
            // Quantity (Leak simulation placeholder)
            if (!sys.qty) sys.qty = 100;
        });
    }

    /**
     * FUEL SYSTEM
     * Tank quantities, Pumps, Crossfeed
     */
    updateFuel(systems, context, dt) {
        const fuel = systems.fuel;
        
        // Initialize if missing
        if (!fuel.tanks) {
            fuel.tanks = {
                left: 5000,
                right: 5000,
                center: 2000
            };
        }

        // Pumps Output Pressure
        fuel.pressL = (fuel.leftPumps && systems.electrical.acVolts > 100) ? 35 : 0;
        fuel.pressR = (fuel.rightPumps && systems.electrical.acVolts > 100) ? 35 : 0;
        fuel.pressC = (fuel.centerPumps && systems.electrical.acVolts > 100) ? 35 : 0;

        // Consumption Logic (Drain from tanks based on pump config)
        // Engines consume ~1kg/s (simplified)
        const eng1Burn = (context.engineN2[0] > 10) ? 1.2 * dt : 0;
        const eng2Burn = (context.engineN2[1] > 10) ? 1.2 * dt : 0;
        const apuBurn = (systems.apu.running) ? 0.2 * dt : 0;

        // Engine 1 Feed
        // Priority: Center > Left (if crossfeed) > Left
        if (fuel.pressC > 10 && fuel.tanks.center > 0) {
            fuel.tanks.center -= eng1Burn;
        } else if (fuel.pressL > 10 && fuel.tanks.left > 0) {
            fuel.tanks.left -= eng1Burn;
        } else if (fuel.crossfeed && fuel.pressR > 10 && fuel.tanks.right > 0) {
            fuel.tanks.right -= eng1Burn; // Crossfeed from Right
        } else {
            // Starvation Logic could trigger here (Engine flameout)
            if (context.engineN2[0] > 50) {
                // Inform context of starvation? 
                // Currently context is input-only, so we'd need to set a flag in systems
                systems.starvation1 = true;
            }
        }

        // Engine 2 Feed
        if (fuel.pressC > 10 && fuel.tanks.center > 0) {
            fuel.tanks.center -= eng2Burn;
        } else if (fuel.pressR > 10 && fuel.tanks.right > 0) {
            fuel.tanks.right -= eng2Burn;
        } else if (fuel.crossfeed && fuel.pressL > 10 && fuel.tanks.left > 0) {
            fuel.tanks.left -= eng2Burn; // Crossfeed from Left
        } else {
             if (context.engineN2[1] > 50) {
                systems.starvation2 = true;
            }
        }
        
        // APU Feed (Usually Left side)
        if (fuel.tanks.left > 0) fuel.tanks.left -= apuBurn;
    }

    /**
     * PRESSURIZATION & ENV
     */
    updatePressurization(systems, context, dt) {
        const pneu = systems.pressurization;
        
        // Flow available?
        const flow = pneu.packLFlow || pneu.packRFlow;
        
        const aircraftAlt = context.altitude;
        const targetAlt = pneu.targetAlt || 35000;
        const landingAlt = 0; // Simplified
        
        // Calculate Target Cabin Alt (Schedule)
        // Rule of thumb: diff limit 8.6 psi
        // If flow exists, we control pressure.
        
        if (flow) {
            // Normal Auto Logic
            // Aim for Landing Alt until Diff Limit reached
            // Simplified: Aim for 6000ft
            let desired = 6000;
            if (aircraftAlt < 6000) desired = aircraftAlt;
            
            // Rate limit
            const rate = 500 * dt / 60; // 500 fpm
            if (pneu.cabinAlt < desired) pneu.cabinAlt += rate;
            else if (pneu.cabinAlt > desired) pneu.cabinAlt -= rate;
            
        } else {
            // Leak to outside
            const leakRate = 1000 * dt / 60;
            if (Math.abs(pneu.cabinAlt - aircraftAlt) < leakRate) pneu.cabinAlt = aircraftAlt;
            else if (pneu.cabinAlt < aircraftAlt) pneu.cabinAlt += leakRate;
            else pneu.cabinAlt -= leakRate;
        }
        
        // Calculate Diff Pressure (PSI)
        // 1 PSI ~ 2000ft approx at sea level, but let's use standard atmos formula roughly
        // Diff = Cabin Pressure - Ambient Pressure
        // Using simplified linear approx for display
        const cabinP = 14.7 - (pneu.cabinAlt * 0.0003); // Rough approx
        const ambP = 14.7 - (aircraftAlt * 0.0003);
        pneu.diffPressure = Math.max(0, cabinP - ambP);
    }

    updateLighting(systems, context, dt) {
        // Just power check
        const hasPower = systems.electrical.dcVolts > 20;
        systems.lighting.powered = hasPower;
    }
}

export default new OverheadLogic();
