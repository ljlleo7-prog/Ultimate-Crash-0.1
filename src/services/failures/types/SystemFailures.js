
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
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `TOTAL HYDRAULIC LOSS.`,
                effect: (sys) => {
                    if (sys.systems.hydraulics) {
                        sys.systems.hydraulics.sysA.pressure = 0;
                        sys.systems.hydraulics.sysB.pressure = 0;
                        if (sys.systems.hydraulics.sysC) sys.systems.hydraulics.sysC.pressure = 0;
                    }

                    const is737 = (sys.aircraft.id || '').toLowerCase().includes('737') || (sys.aircraft.name || '').toLowerCase().includes('737');

                    if (is737) {
                        // 737 Manual Reversion: Extreme Lag
                        sys.controlLag.aileron = 10.0;
                        sys.controlLag.elevator = 10.0;
                        sys.controlLag.rudder = 10.0;
                        
                        sys.controlEffectiveness.aileron = 0.3; // Barely controllable
                        sys.controlEffectiveness.elevator = 0.3;
                        sys.controlEffectiveness.rudder = 0.3;
                    } else {
                        // Modern FBW: Total Loss (Inoperative)
                        sys.controlEffectiveness.aileron = 0.0;
                        sys.controlEffectiveness.elevator = 0.0;
                        sys.controlEffectiveness.rudder = 0.0;
                    }
                    
                    // Gear stuck or extremely slow
                    sys.controlLag.gear = 20.0;
                    // sys.controls.gear = sys.controls.gear; // Stuck logic handled by lag/inputs
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
                description: (ctx) => `Utility Bus Off. Non-essential systems lost.`,
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
                description: (ctx) => `Circuit Breaker Pop: Avionics.`,
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
                effect: (sys) => {}
            },
            active: {
                description: (ctx) => `Nav Radio Failure.`,
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
                description: (ctx) => `COM 1 Transmit Failure.`,
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
                description: (ctx) => `AOA Sensor Disagree.`,
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
                description: (ctx) => `PFD Symbol Generator Fault.`,
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
                description: (ctx) => `Autobrake Fault. Manual Braking Required.`,
                effect: (sys) => {
                    // Disable autobrake logic if implemented
                }
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
                description: (ctx) => `Instrument Display Flicker/Loss.`,
                effect: (sys) => {
                    // Cosmetic: flicker screens?
                }
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
                description: (ctx) => `Sensor Reading Anomaly.`,
                effect: (sys) => {
                    // Minor jitter in readings
                }
            }
        }
    },

    NAV_RADIO_GLITCH: {
        id: 'navigation_radio_glitch',
        name: 'Nav Radio Glitch',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `NAV Radio Signal Lost.`,
                effect: (sys) => {
                    // Disable NAV updates
                }
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
                description: (ctx) => `COMMS LOST.`,
                effect: (sys) => {
                    // Block ATC
                }
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
                description: (ctx) => `Brake System Malfunction.`,
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
                description: (ctx) => `Altimeter/Speed Mismatch.`,
                effect: (sys) => {
                    // Critical phase error
                    // sys.sensors.altimeterError = 500;
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
                description: (ctx) => `EXPLOSION DETECTED. CRITICAL DAMAGE.`,
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
