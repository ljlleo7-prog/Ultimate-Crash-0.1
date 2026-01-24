
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

        // Initialize ADIRS if missing
        if (!systems.adirs) {
            systems.adirs = {
                ir1: 'OFF', // OFF, ALIGN, NAV
                ir2: 'OFF',
                ir3: 'OFF', // Optional (Widebody)
                alignState: 0, // 0 to 100%
                aligned: false,
                onBat: false
            };
        }

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

        // 10. ADIRS Logic
        this.updateADIRS(systems, context, dt);
    }

    updateADIRS(systems, context, dt) {
        if (!systems.adirs) return;
        
        const adirs = systems.adirs;
        const hasPower = systems.electrical.dcVolts > 20; // Need DC for alignment/bat check
        
        // Are IRS switches in NAV or ALIGN?
        const irsActive = (adirs.ir1 === 'NAV' || adirs.ir1 === 'ALIGN') &&
                          (adirs.ir2 === 'NAV' || adirs.ir2 === 'ALIGN');
                          
        if (irsActive && hasPower) {
             // Alignment Process
             if (!adirs.aligned) {
                 // Align rate: ~10 minutes normally. 
                 // Fast Align for Sim: 30 seconds
                 const alignRate = 100 / 30; 
                 
                 adirs.alignState += alignRate * dt;
                 
                 if (adirs.alignState >= 100) {
                     adirs.alignState = 100;
                     adirs.aligned = true;
                 }
             }
        } else {
            // Loss of power or switched OFF
            if (!hasPower && irsActive) {
                adirs.onBat = true;
                // Battery drain would happen here
            } else {
                adirs.onBat = false;
                adirs.alignState = 0;
                adirs.aligned = false;
            }
            
            if (adirs.ir1 === 'OFF' && adirs.ir2 === 'OFF') {
                 adirs.alignState = 0;
                 adirs.aligned = false;
            }
        }
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
        
        // Dynamic hydraulic load
        if (systems.hydraulics) {
            Object.values(systems.hydraulics).forEach(sys => {
                if (sys && sys.elecPump) load += 35;
            });
        }

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

            case 'RUNNING': {
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
            }

            case 'COOLDOWN': {
                apu.running = true; // Still running, just cooling
                apu.n2 = 100;
                let targetEgt = 300;
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
        // APU feeds Left Duct logic (usually check valve)
        if (apuBleedPressure > pneu.ductPressL) pneu.ductPressL = apuBleedPressure;
        
        // Right Duct
        pneu.ductPressR = maxBleedPressureR;
        
        // Isolation Valve Logic (Connects Left and Right)
        // If Isolation Valve is OPEN, pressure equalizes
        // If APU is ON and Bleed is ON, it pressurizes the manifold.
        // On 737: APU feeds Left side of Iso Valve.
        // On 747/Widebodies: APU usually feeds Center or can feed both via Iso.
        // Simplified Logic: If Iso Valve Open, take Max.
        // If Iso Valve Closed, APU feeds Left (Standard 737) OR Both if configured (Widebody).
        
        // Fix for 4-engine start: Ensure APU bleed reaches Right Duct if Iso Valve is Open OR if widebody logic applies
        const isWidebody = engineCount > 2;

        if (pneu.isolationValve) {
            // Equalize (Open Valve)
            const maxP = Math.max(pneu.ductPressL, pneu.ductPressR);
            pneu.ductPressL = maxP;
            pneu.ductPressR = maxP;
        } else if (isWidebody) {
             // For widebodies (e.g. 747), APU feeds a central manifold that distributes to both sides
             // UNLESS specific isolation logic prevents it. 
             // Let's assume APU can feed Right side too if enabled, or at least if Iso is open (handled above).
             // If Iso is CLOSED on 747, APU feeds L and R usually has its own APU logic or crossfeed.
             // But simpler fix: If APU bleed is high, allow it to pressurize R if L is pressurized?
             // Actually, 747 APU feeds the manifold. Let's just say if Iso is closed, APU -> Left.
             // User needs to OPEN Isolation Valve to start Right Engines (3 & 4) with APU!
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
        const hydKeys = Object.keys(systems.hydraulics);
        const engineCount = context.engineN2.length;

        hydKeys.forEach((sysName, sysIdx) => {
            const sys = systems.hydraulics[sysName];
            let supply = false;

            // Engine Pumps Logic
            // 1. Direct Engine Drive (EDP)
            // Determine which engines drive this system
            let drivingEngineIndices = [];
            
            if (sysIdx < engineCount) {
                // Default 1:1 mapping (Sys A -> Eng 1, Sys B -> Eng 2...)
                drivingEngineIndices.push(sysIdx);
            }
            
            // Special Logic for 4-Engine Aircraft with fewer Hydraulic Systems (e.g., A380 has 2 main systems + backups)
            // If we have 4 engines but only 2 hydraulic systems (Sys A/B), map them:
            // Sys A (Left) <- Eng 1 & 2
            // Sys B (Right) <- Eng 3 & 4
            if (engineCount === 4 && hydKeys.length === 2) {
                if (sysIdx === 0) drivingEngineIndices = [0, 1]; // Sys A driven by Eng 1 or 2
                if (sysIdx === 1) drivingEngineIndices = [2, 3]; // Sys B driven by Eng 3 or 4
            }
            
            // Check if ANY driving engine is providing pressure
            const isDriven = drivingEngineIndices.some(idx => {
                const engN2 = context.engineN2[idx];
                return (engN2 > 10);
            });

            if (sys.engPump && isDriven) {
                supply = true;
            } 
            // 2. Redundant/Auxiliary Systems (e.g., Center/Blue on 2-engine planes)
            // Driven by Bleed Air or PTU (Power Transfer Unit) from other engines
            else {
                // If any engine is running, we assume bleed/PTU is available for this backup system
                const anyEngineRunning = context.engineN2.some(n2 => n2 > 10);
                if (sys.engPump && anyEngineRunning) {
                     supply = true;
                }
            }

            // Electric Pump (ACMP)
            const elec = systems.electrical;
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
        
        // APU Feed (Usually Left side)
        // Check for Left Pump pressure or Suction Feed
        // APU usually has its own DC pump or suction, but for simplicity:
        if (systems.apu.running && fuel.tanks.left > 0) {
             fuel.tanks.left -= apuBurn;
        }

        // NOTE: Engine fuel burn is now handled in RealisticFlightPhysicsService.js
        // to ensure synchronization with physics fuel flow and mass.
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
            const fuel = systems.fuel;
            
            // Engine Side Logic (Left vs Right)
            const engineCount = Object.keys(systems.engines).length;
            const splitPoint = Math.ceil(engineCount / 2);
            const isLeft = index < splitPoint;
            
            // Check Fuel Pressure Availability
            let hasFuelPressure = false;
            // Allow Suction Feed on Ground or if Pump Pressure is high
            const suctionAvailable = context.onGround;

            if (fuel.pressC > 10) hasFuelPressure = true;
            else if (isLeft) {
                 if (fuel.pressL > 10 || (suctionAvailable && fuel.tanks.left > 0)) hasFuelPressure = true;
                 else if (fuel.crossfeed && fuel.pressR > 10) hasFuelPressure = true;
            } else {
                 if (fuel.pressR > 10 || (suctionAvailable && fuel.tanks.right > 0)) hasFuelPressure = true;
                 else if (fuel.crossfeed && fuel.pressL > 10) hasFuelPressure = true;
            }
            
            // Pneumatic pressure available for start?
            // Need > 30 PSI (approx)
            // Left side engines (1,2) need ductL, Right side (3,4) need ductR
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
                        if (eng.fuelControl && hasFuelPressure) {
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
                if (eng.fuelControl && eng.n2 > 40 && hasFuelPressure) {
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
                    // Map engines to hydraulic systems using same logic as updateHydraulics
                    const hydKeys = Object.keys(systems.hydraulics);
                    const engineCount = Object.keys(systems.engines).length;
                    
                    hydKeys.forEach((sysName, sysIdx) => {
                        let drivingEngineIndices = [];
                        
                        // Default 1:1 mapping
                        if (sysIdx < engineCount) {
                            drivingEngineIndices.push(sysIdx);
                        }
                        
                        // Special 4-Engine/2-System Logic (A380 style)
                        if (engineCount === 4 && hydKeys.length === 2) {
                            if (sysIdx === 0) drivingEngineIndices = [0, 1]; // Sys A driven by Eng 1 or 2
                            if (sysIdx === 1) drivingEngineIndices = [2, 3]; // Sys B driven by Eng 3 or 4
                        }
                        
                        // If the fire engine drives this system, cut the pump
                        if (drivingEngineIndices.includes(index)) {
                            systems.hydraulics[sysName].engPump = false;
                        }
                    });
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
