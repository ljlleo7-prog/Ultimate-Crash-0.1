
const SystemFailures = {
    HYDRAULIC_FAILURE: {
        id: 'hydraulic_failure',
        name: 'Hydraulic System Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Hydraulic Pressure Loss.`,
                effect: (sys, intensity) => {
                    // Reduce control authority
                    const limit = 1.0 - (intensity * 0.8); // down to 20%
                    sys.controls.aileron *= limit;
                    sys.controls.elevator *= limit;
                    sys.controls.rudder *= limit;
                    
                    // System indication
                    if (sys.systems.hydraulics) {
                        sys.systems.hydraulics.sysA.pressure = 0;
                        sys.systems.hydraulics.sysB.pressure = 0;
                    }
                }
            }
        }
    },

    ELECTRICAL_BUS_FAILURE: {
        id: 'electrical_bus_failure',
        name: 'Electrical Bus Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Electrical Bus Failure. Main AC Bus Lost.`,
                effect: (sys) => {
                    sys.systems.electrical.gen1 = false;
                    sys.systems.electrical.gen2 = false;
                    sys.systems.electrical.dcVolts = 0; // Battery only?
                }
            }
        }
    },

    PITOT_BLOCKAGE: {
        id: 'pitot_static_failure',
        name: 'Pitot Tube Blockage',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Airspeed Indication Unreliable.`,
                effect: (sys) => {
                    if (!sys.sensors) sys.sensors = {};
                    sys.sensors.pitotBlocked = true;
                }
            }
        }
    },

    NAV_GLITCH: {
        id: 'navigation_radio_glitch',
        name: 'Nav Radio Glitch',
        category: 'systems',
        stages: {
            inactive: { next: 'intermittent' },
            intermittent: {
                duration: 20.0,
                next: 'active',
                description: (ctx) => `Nav Radio Signal Intermittent.`,
                effect: (sys) => {
                    // Need to implement effect on VOR/ILS in physics service
                    // For now, maybe just log?
                }
            },
            active: {
                description: (ctx) => `Nav Radio Failure.`,
                effect: (sys) => {
                     // Flag for UI to hide needles
                }
            }
        }
    }
};

export default SystemFailures;
