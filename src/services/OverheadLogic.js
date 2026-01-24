
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

        // 8. Engines (Start Sequence)
        this.updateEngines(systems, context, dt);

        // 9. Fire Protection
        this.updateFireProtection(systems, context, dt);
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
        let generatorsOn = false;
        
        // Generators (Engine Driven)
        // Check all potential generators (1-4)
        let genPowerAvailable = false;
        let activeGens = 0;

        // Iterate through all keys in electrical that start with 'gen' and end with a number
        Object.keys(elec).forEach(key => {
            if (key.match(/^gen\d+$/)) {
                const index = parseInt(key.replace('gen', '')) - 1; // 0-based index
                const genOn = elec[key];
                const n2 = context.engineN2[index] || 0;
                const genReady = n2 > 55;
                
                if (genOn && genReady) {
                    genPowerAvailable = true;
                    activeGens++;
                    elec[`sourceOff${index + 1}`] = false;
                    generatorsOn = true;
                } else {
                    elec[`sourceOff${index + 1}`] = true;
                }
            }
        });

        const apuGenReady = systems.apu.running && systems.apu.n2 > 95;
        if (elec.apuGen && apuGenReady) {
            genPowerAvailable = true;
            elec.apuGenOff = false;
            generatorsOn = true;
        } else {
            elec.apuGenOff = true;
        }

        // Battery Logic
        if (elec.battery) {
            // Simple drain simulation
            if (!generatorsOn) {
                elec.batteryCharge = Math.max(0, (elec.batteryCharge || 100) - (0.05 * dt));
            } else {
                elec.batteryCharge = Math.min(100, (elec.batteryCharge || 100) + (0.1 * dt));
            }
            elec.dcVolts = (elec.batteryCharge / 100) * 24 + (Math.random() * 0.5); // Fluctuation
        } else {
            elec.dcVolts = 0;
        }

        // --- Buses ---
        // Simplified Bus Logic for Multi-Engine:
        // If ANY generator is online, we assume buses are powered (with Bus Tie)
        // In a deeper sim, we would model split/isolated buses.
        let mainBusPowered = false;

        if (genPowerAvailable && elec.busTie) {
            mainBusPowered = true;
        } else if (activeGens > 0) {
            // Even without bus tie, if we have gens, some bus is powered.
            // For simplicity, we'll say yes.
            mainBusPowered = true;
        }

        // --- Outputs ---
        // AC Volts / Freq
        if (mainBusPowered) {
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
        
        elec.acAmps = mainBusPowered ? load : 0;
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
        // Engines - Iterate dynamic bleeds
        let maxBleedPressureL = 0;
        let maxBleedPressureR = 0;
        
        // Count engines
        const engineCount = context.engineN2.length;
        
        // Assign engines to ducts (Left: 1, 2... Right: 3, 4...) or Split (1->L, 2->R)
        // Standard logic:
        // 2 Engines: 1->L, 2->R
        // 4 Engines: 1,2->L, 3,4->R
        
        const splitPoint = Math.ceil(engineCount / 2);

        for (let i = 0; i < engineCount; i++) {
            const bleedSw = pneu[`bleed${i+1}`];
            const n2 = context.engineN2[i];
            
            if (bleedSw && n2 > 15) {
                const pressure = 30 + (n2/100)*15;
                
                if (i < splitPoint) {
                    // Left Side
                    if (pressure > maxBleedPressureL) maxBleedPressureL = pressure;
                } else {
                    // Right Side
                    if (pressure > maxBleedPressureR) maxBleedPressureR = pressure;
                }
            }
        }
        
        // APU
        const apuBleedPressure = (apu.bleed && apu.running) ? 40 : 0;
        
        // 2. Duct Pressure
        // Left Duct
        pneu.ductPressL = maxBleedPressureL;
        if (apuBleedPressure > pneu.ductPressL) pneu.ductPressL = apuBleedPressure; // APU check valve logic simplified
        
        // Right Duct
        pneu.ductPressR = maxBleedPressureR;
        
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
        ['sysA', 'sysB'].forEach((sysName, sysIdx) => {
            const sys = systems.hydraulics[sysName];
            let supply = false;

            // Engine Pumps (Dynamic Mapping for 2-4 Engines)
            // Sys A (idx 0) <- Eng 1 (idx 0) + Eng 3 (idx 2)
            // Sys B (idx 1) <- Eng 2 (idx 1) + Eng 4 (idx 3)
            const engineCount = context.engineN2.length;
            
            for (let i = 0; i < engineCount; i++) {
                // Determine if this engine feeds this system
                // Sys A (0): Engines 0, 2
                // Sys B (1): Engines 1, 3
                const feedsThisSystem = (sysIdx === 0 && (i === 0 || i === 2)) || 
                                      (sysIdx === 1 && (i === 1 || i === 3));
                
                if (feedsThisSystem) {
                    const engN2 = context.engineN2[i];
                    // Note: shared pump switch for the system in this simplified model
                    if (sys.engPump && engN2 > 10) {
                        supply = true;
                    }
                }
            }

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
        // Pressure drops if tank is empty (cavitation/air)
        fuel.pressL = (fuel.leftPumps && systems.electrical.acVolts > 100 && fuel.tanks.left > 0) ? 35 : 0;
        fuel.pressR = (fuel.rightPumps && systems.electrical.acVolts > 100 && fuel.tanks.right > 0) ? 35 : 0;
        fuel.pressC = (fuel.centerPumps && systems.electrical.acVolts > 100 && fuel.tanks.center > 0) ? 35 : 0;

        // Consumption Logic (Drain from tanks based on pump config)
        const apuBurn = (systems.apu.running) ? 0.2 * dt : 0;
        
        // Engine Count
        const engineCount = context.engineN2.length;
        const splitPoint = Math.ceil(engineCount / 2);

        for (let i = 0; i < engineCount; i++) {
            const n2 = context.engineN2[i];
            const burn = (n2 > 10) ? 1.2 * dt : 0;
            
            if (burn > 0) {
                // Determine feed logic
                // Left engines (0 to splitPoint-1) feed from Left/Center
                // Right engines (splitPoint to end) feed from Right/Center
                const isLeft = i < splitPoint;
                
                if (fuel.pressC > 10 && fuel.tanks.center > 0) {
                    fuel.tanks.center -= burn;
                } else if (isLeft) {
                    if (fuel.pressL > 10 && fuel.tanks.left > 0) {
                        fuel.tanks.left -= burn;
                    } else if (fuel.crossfeed && fuel.pressR > 10 && fuel.tanks.right > 0) {
                        fuel.tanks.right -= burn; // Crossfeed
                    } else if (n2 > 50) {
                         // Starvation
                         // In future, set a starvation flag per engine
                    }
                } else {
                    // Right Side
                    if (fuel.pressR > 10 && fuel.tanks.right > 0) {
                        fuel.tanks.right -= burn;
                    } else if (fuel.crossfeed && fuel.pressL > 10 && fuel.tanks.left > 0) {
                        fuel.tanks.left -= burn; // Crossfeed
                    } else if (n2 > 50) {
                         // Starvation
                    }
                }
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

    /**
     * ENGINE START SYSTEM
     * Simulates N2 spool up, EGT rise, and starter cutout.
     */
    updateEngines(systems, context, dt) {
        if (!systems.engines) return;

        Object.keys(systems.engines).forEach((engId) => {
            // Extract index from 'eng1', 'eng2', etc.
            const index = parseInt(engId.replace('eng', '')) - 1;
            const eng = systems.engines[engId];
            const pneu = systems.pressurization;
            
            // Pneumatic pressure available for start?
            // Need > 30 PSI (approx)
            // Left side engines (1,2) need ductL, Right side (3,4) need ductR
            // Split based on engine count
            const engineCount = Object.keys(systems.engines).length;
            const splitPoint = Math.ceil(engineCount / 2);
            
            const ductPress = (index < splitPoint) ? pneu.ductPressL : pneu.ductPressR;
            const pressureAvailable = ductPress > 20;

            // State Machine for Start
            if (eng.startSwitch === 'GRD') {
                if (pressureAvailable) {
                    // Spool up
                    if (eng.n2 < 20) {
                        eng.n2 += 2.0 * dt; // Starter torque
                    } else {
                        // Lightoff region
                        if (eng.fuelControl) {
                            eng.n2 += 5.0 * dt; // Combustion accel
                            eng.egt += 50 * dt; // Rapid EGT rise
                        }
                    }
                }
            } else if (eng.startSwitch === 'CONT' || eng.startSwitch === 'FLT') {
                 // Ignition always on
            }

            // Running Logic
            if (eng.n2 > 50) {
                // Starter Cutout
                if (eng.startSwitch === 'GRD') eng.startSwitch = 'OFF';
            } else if (eng.startSwitch === 'OFF' && eng.n2 > 0) {
                // Spool down
                if (eng.fuelControl && eng.n2 > 40) {
                     // Engine is running self-sustaining
                     const targetN2 = 60;
                     const targetEgt = 400;
                     eng.n2 = eng.n2 + (targetN2 - eng.n2) * 0.1 * dt;
                     eng.egt = eng.egt + (targetEgt - eng.egt) * 0.05 * dt;
                } else {
                    // Shutdown / Spool down
                    eng.n2 -= 2.0 * dt;
                    eng.egt -= 10.0 * dt;
                }
                
                if (eng.n2 < 0) eng.n2 = 0;
                if (eng.egt < 20) eng.egt = 20;
            }
        });
    }

    /**
     * FIRE PROTECTION SYSTEM
     * Handles, Bottles, and System Cutoffs.
     */
    updateFireProtection(systems, context, dt) {
        if (!systems.fire) return;

        // Iterate through fire handles
        Object.keys(systems.fire).forEach(key => {
            if (key.match(/^eng\d+Handle$/)) {
                if (systems.fire[key]) {
                    // Handle Pulled
                    const engId = key.replace('Handle', ''); // eng1, eng2...
                    const index = parseInt(engId.replace('eng', '')) - 1;
                    
                    // Cutoff Systems
                    systems.engines[engId].fuelControl = false;
                    systems.electrical[`gen${index+1}`] = false;
                    
                    // Cutoff Hydraulics?
                    // Map engines to hydraulic systems roughly
                    if (index === 0) systems.hydraulics.sysA.engPump = false;
                    if (index === 1) systems.hydraulics.sysB.engPump = false;
                    // For 4 engines (simplified mapping):
                    if (index === 2) systems.hydraulics.sysA.engPump = false; // Backup/redundant mapping
                    if (index === 3) systems.hydraulics.sysB.engPump = false;
                }
            }
        });

        // APU
        if (systems.fire.apuHandle) {
            systems.apu.master = false;
            systems.apu.bleed = false;
            systems.electrical.apuGen = false;
        }

        const dischargeRate = 50 * dt; // Empty in 2 seconds
        
        // Helper to extinguish fires if handle is pulled
        const extinguishEngines = () => {
             Object.keys(systems.fire).forEach(key => {
                if (key.match(/^eng\d+Handle$/) && systems.fire[key]) {
                    const engId = key.replace('Handle', '');
                    systems.fire[engId] = false;
                }
             });
        };

        if (systems.fire.bottle1_discharge) {
            if (systems.fire.bottle1 > 0) {
                systems.fire.bottle1 -= dischargeRate;
                extinguishEngines();
            } else {
                systems.fire.bottle1 = 0;
                systems.fire.bottle1_discharge = false; // Reset trigger
            }
        }

        if (systems.fire.bottle2_discharge) {
            if (systems.fire.bottle2 > 0) {
                systems.fire.bottle2 -= dischargeRate;
                extinguishEngines();
            } else {
                systems.fire.bottle2 = 0;
                systems.fire.bottle2_discharge = false;
            }
        }
        
        // APU Bottle
        if (systems.fire.apuHandle && (systems.fire.bottle1_discharge || systems.fire.bottle2_discharge)) {
             systems.fire.apu = false;
        }
    }
}

export default new OverheadLogic();
