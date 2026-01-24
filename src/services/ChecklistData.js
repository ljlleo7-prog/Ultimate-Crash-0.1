
/**
 * ChecklistData.js
 * 
 * Defines the interactive checklists for the aircraft.
 * Each item contains a label and an optional validation function.
 * If validation function returns true, the item is auto-checked.
 */

export const ChecklistCategories = {
    STARTUP: 'START-UP',
    TAKEOFF: 'TAKEOFF',
    DESCENT: 'DESCENT',
    LANDING: 'LANDING'
};

export const Checklists = {
    [ChecklistCategories.STARTUP]: [
        { 
            id: 'bat', 
            label: 'Battery Switch', 
            validate: (systems) => systems?.electrical?.battery === true 
        },
        { 
            id: 'apu_start', 
            label: 'APU Master / Start', 
            validate: (systems) => systems?.apu?.running === true && systems?.apu?.n2 > 90 
        },
        { 
            id: 'apu_gen', 
            label: 'APU Generator', 
            validate: (systems) => systems?.electrical?.apuGen === true 
        },
        { 
            id: 'apu_bleed', 
            label: 'APU Bleed', 
            validate: (systems) => systems?.apu?.bleed === true 
        },
        { 
            id: 'hyd_pumps', 
            label: 'Hydraulic Pumps', 
            validate: (systems) => systems?.hydraulics?.sysA?.engPump === true && systems?.hydraulics?.sysB?.engPump === true
        },
        { 
            id: 'fuel_pumps', 
            label: 'Fuel Pumps', 
            validate: (systems) => {
                const f = systems?.fuel;
                return f && ((f.leftPumps || f.centerPumps) && (f.rightPumps || f.centerPumps));
            }
        },
        { 
            id: 'beacon', 
            label: 'Anti-Collision Light', 
            validate: (systems) => systems?.lighting?.beacon === true 
        },
        { 
            id: 'trim', 
            label: 'Trim Set (4-5 Units)', 
            // Often trim is in flightState, not systems. We might need a separate context object.
            // For now, assume we can access it if passed, or user manual check.
            validate: (systems, flightState) => flightState?.trimValue >= 0.1 && flightState?.trimValue <= 0.3 // approx 10-30%
        }
    ],
    [ChecklistCategories.TAKEOFF]: [
        { 
            id: 'flaps', 
            label: 'Flaps (5-15)', 
            validate: (systems, flightState) => flightState?.flapsValue >= 1 && flightState?.flapsValue <= 3 // Index 1-3 usually corresponds to 1-15 range depending on mapping
        },
        { 
            id: 'autobrake', 
            label: 'Autobrake RTO', 
            validate: (systems) => systems?.brakes?.autobrake === 'RTO' 
        },
        { 
            id: 'lights_land', 
            label: 'Landing Lights', 
            validate: (systems) => systems?.lighting?.landing === true 
        },
        { 
            id: 'lights_strobe', 
            label: 'Strobe Lights', 
            validate: (systems) => systems?.lighting?.strobe === true 
        },
        { 
            id: 'transponder', 
            label: 'Transponder TA/RA', 
            validate: (systems) => systems?.transponder?.mode === 'TA/RA'
        },
        { 
            id: 'parking_brake', 
            label: 'Parking Brake OFF', 
            validate: (systems) => systems?.brakes?.parkingBrake === false 
        }
    ],
    [ChecklistCategories.DESCENT]: [
        { 
            id: 'pressurization', 
            label: 'Pressurization Land Alt', 
            validate: null // Manual
        },
        { 
            id: 'altimeters', 
            label: 'Altimeters Set', 
            validate: null // Manual
        },
        { 
            id: 'autobrake_land', 
            label: 'Autobrake (1, 2, 3, or MAX)', 
            validate: (systems) => ['1', '2', '3', 'MAX'].includes(systems?.brakes?.autobrake)
        },
        { 
            id: 'approach_brief', 
            label: 'Approach Briefing', 
            validate: null // Manual
        }
    ],
    [ChecklistCategories.LANDING]: [
        { 
            id: 'gear', 
            label: 'Landing Gear DOWN', 
            validate: (systems, flightState) => flightState?.gearValue === 1 // 1 is down
        },
        { 
            id: 'flaps_land', 
            label: 'Flaps (30 or 40)', 
            validate: (systems, flightState) => flightState?.flapsValue >= 3 // Assuming higher index is more flaps
        },
        { 
            id: 'speedbrake', 
            label: 'Speedbrake ARMED', 
            validate: (systems, flightState) => flightState?.airBrakesValue === -1 || systems?.flightControls?.speedbrake === 'ARMED' // -1 convention for armed? Check code.
        },
        { 
            id: 'cabin', 
            label: 'Cabin Ready', 
            validate: null // Manual
        }
    ]
};
