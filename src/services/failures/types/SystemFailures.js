
const SystemFailures = {
    HYDRAULIC_FAILURE: {
        id: 'hydraulic_failure',
        name: 'Hydraulic System Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'leak' },
            leak: {
                duration: 15.0,
                next: 'active',
                description: (ctx) => `Whining noise from hydraulic pumps. Fluid visible on strut.`,
                effect: (sys, intensity) => {
                    // Nothing yet, just warning
                }
            },
            active: {
                description: (ctx) => `Controls feel mushy. Low Pressure Light illuminated.`,
                effect: (sys, intensity) => {
                    const limit = 1.0 - (intensity * 0.8);
                    sys.controls.aileron *= limit;
                    sys.controls.elevator *= limit;
                    sys.controls.rudder *= limit;
                    if (sys.systems.hydraulics) {
                        sys.systems.hydraulics.sysA.pressure = 0;
                        sys.systems.hydraulics.sysB.pressure = 0;
                    }
                }
            }
        }
    },

    MAJOR_HYDRAULIC: {
        id: 'major_hydraulic_failure',
        name: 'Major Hydraulic Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'burst' },
            burst: {
                duration: 2.0,
                next: 'active',
                description: (ctx) => `Loud popping sound. Hissing noise from floorboards.`,
                effect: (sys) => {
                     // Fast drop
                }
            },
            active: {
                description: (ctx) => `Controls completely limp. Zero resistance. 'HYD PRESS' warning.`,
                effect: (sys) => {
                    // Severe control restriction
                    sys.controls.aileron *= 0.1;
                    sys.controls.elevator *= 0.1;
                    sys.controls.rudder *= 0.1;
                    sys.controls.gear = sys.controls.gear; // Stuck
                    if (sys.systems.hydraulics) {
                        sys.systems.hydraulics.sysA.pressure = 0;
                        sys.systems.hydraulics.sysB.pressure = 0;
                        sys.systems.hydraulics.sysC.pressure = 0; // If modeled
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
                description: (ctx) => `Cockpit lights flickering then out. Hum of avionics fans stops.`,
                effect: (sys) => {
                    sys.systems.electrical.gen1 = false;
                    sys.systems.electrical.gen2 = false;
                    sys.systems.electrical.dcVolts = 0;
                }
            }
        }
    },

    PARTIAL_ELECTRICAL: {
        id: 'partial_electrical_failure',
        name: 'Partial Electrical Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Utility Bus Off. Galley power lost.`,
                effect: (sys) => {
                    // Just a flag or minor annoyance
                }
            }
        }
    },

    CIRCUIT_BREAKER: {
        id: 'circuit_breaker_trip',
        name: 'Circuit Breaker Trip',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Loud 'POP' sound. Smell of ozone. Breaker collared.`,
                effect: (sys) => {
                    // Temporary loss of specific instrument
                }
            }
        }
    },

    PITOT_BLOCKAGE: {
        id: 'pitot_static_failure',
        name: 'Pitot Tube Blockage',
        category: 'systems',
        stages: {
            inactive: { next: 'fluctuating' },
            fluctuating: {
                duration: 10.0,
                next: 'active',
                description: (ctx) => `Airspeed needle jumping erratically. Wind noise constant.`,
                effect: (sys) => {
                    // Nothing, just confusion
                }
            },
            active: {
                description: (ctx) => `Airspeed zero/frozen. Stick shaker intermittent. Pitot Heat Fail.`,
                effect: (sys) => {
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
                description: (ctx) => `VOR needle swinging wildy. Static on audio ID.`,
                effect: (sys) => {
                     // Could jitter CDI
                }
            },
            active: {
                description: (ctx) => `Nav Radio Failure. Signal Lost. Red flag on CDI.`,
                effect: (sys) => {}
            }
        }
    },

    COMM_RADIO_FAILURE: {
        id: 'communication_radio_failure',
        name: 'Comm Radio Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Dead silence on COM 1. Sidetone lost.`,
                effect: (sys) => {}
            }
        }
    },

    SENSOR_ANOMALY: {
        id: 'non_critical_sensor_anomaly',
        name: 'Sensor Anomaly',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `AOA Vane stuck. Stall Warning unreliable.`,
                effect: (sys) => {}
            }
        }
    },

    MINOR_INSTRUMENT: {
        id: 'minor_instrument_failure',
        name: 'Minor Instrument Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `PFD flickering. Display artifacts visible.`,
                effect: (sys) => {}
            }
        }
    },

    BRAKE_FAILURE: {
        id: 'brake_failure',
        name: 'Brake Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Brake pedals go to floor. No deceleration felt.`,
                effect: (sys) => {
                    sys.controls.brakes = 0;
                }
            }
        }
    },

    SENSOR_MISREAD: {
        id: 'sensor_misread_approach',
        name: 'Sensor Misread (Approach)',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Altimeter/Speed Mismatch. Check Instruments.`,
                effect: (sys) => {
                    // Critical phase error
                }
            }
        }
    },
    
    SABOTAGE: {
        id: 'sabotage_explosion',
        name: 'Sabotage / Explosion',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `DEAFENING EXPLOSION. Decompression fog. Smoke filling cabin.`,
                effect: (sys) => {
                    sys.systems.electrical.gen1 = false;
                    sys.systems.electrical.gen2 = false;
                    sys.systems.hydraulics.sysA.pressure = 0;
                    sys.systems.pressurization.breach = true;
                    // Fire
                    sys.systems.fire.cargo = true;
                }
            }
        }
    }
};

export default SystemFailures;
