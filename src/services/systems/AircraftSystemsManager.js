import OverheadLogic from '../OverheadLogic.js';

/**
 * Manages the state and logic of aircraft systems (Electrical, Fuel, Hydraulics, etc.)
 */
class AircraftSystemsManager {
    constructor() {
        // Initial Systems State
        this.systems = {
            electrical: {
                battery: true,
                batteryCharge: 100, // %
                stbyPower: true,
                gen1: true,
                gen2: true,
                apuGen: false,
                busTie: true, // Auto
                dcVolts: 28.0,
                acVolts: 115,
                acFreq: 400,
                acAmps: 50,
                sourceOff1: false,
                sourceOff2: false,
                apuGenOff: true
            },
            fuel: {
                leftPumps: true,
                rightPumps: true,
                centerPumps: false,
                crossfeed: false,
                tanks: {
                    left: 5000,
                    right: 5000,
                    center: 2000
                },
                pressL: 35,
                pressR: 35,
                pressC: 0
            },
            apu: {
                master: false,
                start: false,
                running: false,
                starting: false,
                bleed: false,
                egt: 0,
                n2: 0,
                state: 'OFF'
            },
            hydraulics: {
                sysA: { pressure: 3000, engPump: true, elecPump: false, qty: 100 },
                sysB: { pressure: 3000, engPump: true, elecPump: false, qty: 100 }
            },
            transponder: {
                code: 2000,
                mode: 'STBY', // STBY, ALT, TA/RA
                ident: false
            },
            pressurization: {
                packL: true,
                packR: true,
                bleed1: true,
                bleed2: true,
                isolationValve: true, // Auto/Open
                cabinAlt: 0,
                diffPressure: 0,
                targetAlt: 35000,
                ductPressL: 30,
                ductPressR: 30,
                mode: 'AUTO'
            },
            oxygen: {
                masks: false,
                crewPressure: 1800,
                paxPressure: 1500
            },
            lighting: {
                landing: false,
                taxi: false,
                nav: true,
                beacon: true,
                strobe: true,
                logo: false,
                wing: false,
                powered: true
            },
            nav: {
                irsL: true,
                irsR: true
            },
            fire: {
                eng1: false,
                eng2: false,
                apu: false,
                cargo: false
            },
            starters: {
                engine1: false,
                engine2: false
            },
            signs: {
                seatBelts: true,
                noSmoking: true
            },
            wipers: {
                left: false,
                right: false
            },
            failures: {
                gen1: false,
                gen2: false,
                apuGen: false,
                battery: false,
                packL: false,
                packR: false,
                bleed1: false,
                bleed2: false,
                hydSysA: false, // Total loss
                hydSysB: false,
                hydPumpEng1: false,
                hydPumpEng2: false,
                hydPumpElec1: false,
                hydPumpElec2: false,
                fuelPumpL: false,
                fuelPumpR: false,
                fuelPumpC: false,
                fuelLeak: false
            }
        };
    }

    /**
     * Update systems logic based on aircraft state
     * @param {number} dt - Time step
     * @param {Object} context - Aircraft state context { engineN2, altitude, onGround, airspeed }
     */
    update(dt, context) {
        // Delegate logic to OverheadLogic service
        OverheadLogic.update(this.systems, context, dt);
    }

    performAction(system, action, value) {
        if (!this.systems[system]) {
            console.warn(`System ${system} not found`);
            return;
        }

        // Handle Toggle Logic (if value is undefined)
        const toggle = (current) => {
            if (value !== undefined) return value;
            if (typeof current === 'boolean') return !current;
            return current; // No change if not boolean and no value
        };

        // Special System Handling
        if (system === 'hydraulics') {
            if (action === 'eng1Pump') this.systems.hydraulics.sysA.engPump = toggle(this.systems.hydraulics.sysA.engPump);
            else if (action === 'elec1Pump') this.systems.hydraulics.sysA.elecPump = toggle(this.systems.hydraulics.sysA.elecPump);
            else if (action === 'eng2Pump') this.systems.hydraulics.sysB.engPump = toggle(this.systems.hydraulics.sysB.engPump);
            else if (action === 'elec2Pump') this.systems.hydraulics.sysB.elecPump = toggle(this.systems.hydraulics.sysB.elecPump);
            else console.warn(`Hydraulics action ${action} not found`);
        } 
        else if (system === 'transponder') {
            // Transponder has specific fields
            if (action === 'code') this.systems.transponder.code = value;
            else if (action === 'mode') this.systems.transponder.mode = value;
            else if (action === 'ident') this.systems.transponder.ident = value;
        }
        else {
            // Generic Handling
            if (this.systems[system][action] !== undefined) {
                this.systems[system][action] = toggle(this.systems[system][action]);
            } else {
                console.warn(`Action ${action} not found on system ${system}`);
            }
        }

        console.log(`Systems Manager: Action ${system}.${action} -> ${value === undefined ? 'TOGGLE' : value}`);
    }

    /**
     * Set systems to Cold & Dark state
     * @param {Array} engines - Reference to engine objects to reset them
     */
    setColdStart(engines = []) {
        console.log("❄️ Systems Manager: Applying Cold & Dark Configuration");
        
        // Electrical
        this.systems.electrical = {
            ...this.systems.electrical,
            battery: false,
            stbyPower: false,
            gen1: false,
            gen2: false,
            apuGen: false,
            busTie: true,
            dcVolts: 0,
            acVolts: 0,
            acFreq: 0,
            acAmps: 0,
            sourceOff1: true,
            sourceOff2: true,
            apuGenOff: true
        };

        // Fuel (Pumps Off)
        this.systems.fuel = {
            ...this.systems.fuel,
            leftPumps: false,
            rightPumps: false,
            centerPumps: false,
            crossfeed: false,
            pressL: 0,
            pressR: 0,
            pressC: 0
        };

        // APU Off
        this.systems.apu = {
            ...this.systems.apu,
            master: false,
            start: false,
            running: false,
            starting: false,
            bleed: false,
            egt: 0,
            n2: 0,
            state: 'OFF'
        };

        // Hydraulics Off
        this.systems.hydraulics.sysA.engPump = true; // Switches usually stay ON but no pressure
        this.systems.hydraulics.sysA.elecPump = false;
        this.systems.hydraulics.sysB.engPump = true;
        this.systems.hydraulics.sysB.elecPump = false;
        this.systems.hydraulics.sysA.pressure = 0;
        this.systems.hydraulics.sysB.pressure = 0;

        // Pressurization / Packs Off
        this.systems.pressurization = {
            ...this.systems.pressurization,
            packL: false,
            packR: false,
            bleed1: false,
            bleed2: false,
            isolationValve: true,
            ductPressL: 0,
            ductPressR: 0
        };

        // Lighting Off
        this.systems.lighting = {
            landing: false,
            taxi: false,
            nav: false,
            beacon: false,
            strobe: false,
            logo: false,
            wing: false,
            powered: false
        };
        
        // Reset Engines (Helper)
        engines.forEach(e => {
            if (e && e.state) {
                e.state.n1 = 0;
                e.state.n2 = 0;
                e.state.egt = 0; // Cold EGT
                e.state.fuelFlow = 0;
                e.state.oilPressure = 0;
                e.state.running = false;
            }
        });
    }

    reset() {
        // Reset Critical System States (Flags that might be stuck)
        if (this.systems.pressurization) this.systems.pressurization.breach = false;
        
        // Restore Electrical
        if (this.systems.electrical) {
            this.systems.electrical.gen1 = true;
            this.systems.electrical.gen2 = true;
            this.systems.electrical.stbyPower = true;
        }
        
        // Reset APU
        if (this.systems.apu) {
            this.systems.apu.running = false;
            this.systems.apu.starting = false;
            this.systems.apu.egt = 0;
        }
    }
}

export default AircraftSystemsManager;
