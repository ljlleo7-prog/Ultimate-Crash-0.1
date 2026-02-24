const SystemFailures = {
    // --- HYDRAULICS ---
    HYDRAULIC_FAILURE: {
        id: 'hydraulic_failure',
        name: 'Hydraulic System Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Hydraulic pressure loss detected.",
                    system_alert: "HYD SYS PRESS",
                    sound: "master_caution"
                }),
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

    HYDRAULIC_LEAK: {
        id: 'hydraulic_leak',
        name: 'Hydraulic Leak',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Hydraulic quantity decreasing rapidly.",
                    system_alert: "HYD LOW QTY",
                    visual: "shake_minor"
                }),
                effect: (sys, intensity) => {
                    // Gradual pressure loss
                    sys.systems.hydraulics.sysA.qty -= 0.1 * intensity;
                    if (sys.systems.hydraulics.sysA.qty < 10) {
                         sys.systems.hydraulics.sysA.pressure *= 0.9;
                    }
                }
            }
        }
    },

    // --- ELECTRICAL ---
    ELECTRICAL_BUS_FAILURE: {
        id: 'electrical_bus_failure',
        name: 'Electrical Bus Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Main AC Bus Lost. Multiple systems offline.",
                    visual: "cockpit_lights_flicker",
                    sound: "electrical_snap",
                    system_alert: "ELEC BUS 1 OFF"
                }),
                effect: (sys) => {
                    sys.systems.electrical.gen1 = false;
                    sys.systems.electrical.gen2 = false;
                    sys.systems.electrical.dcVolts = 0;
                }
            }
        }
    },

    GENERATOR_DRIVE_DISCONNECT: {
        id: 'generator_drive_disconnect',
        name: 'IDG Disconnect',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Integrated Drive Generator disconnected. Oil temp high.",
                    system_alert: "IDG 1 DISC",
                    sound: "thump"
                }),
                effect: (sys) => {
                    sys.systems.electrical.gen1 = false;
                    // Cannot be reset in flight
                }
            }
        }
    },

    CIRCUIT_ARC: {
        id: 'circuit_arc',
        name: 'Circuit Arcing',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Sparks and smoke from overhead panel.",
                    smell: "burning_ozone",
                    visual: "smoke_cockpit",
                    sound: "electrical_spark"
                }),
                effect: (sys) => {
                    // Random breaker pop
                    // Potential fire trigger
                    if (Math.random() < 0.05) sys.triggerFailure('cockpit_fire');
                }
            }
        }
    },
    
    BATTERY_OVERHEAT: {
        id: 'battery_overheat',
        name: 'Battery Thermal Runaway',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Battery temperature critical. Smoke in electronics bay.",
                    system_alert: "BAT TEMP",
                    smell: "chemical_fumes"
                }),
                effect: (sys) => {
                    sys.systems.electrical.battery = false;
                }
            }
        }
    },

    // --- PNEUMATICS / AIR ---
    PACK_FAIL: {
        id: 'pack_failure',
        name: 'Air Conditioning Pack Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Pack 1 Overheat/Trip.",
                    system_alert: "PACK L TRIP",
                    sound: "hissing_stop"
                }),
                effect: (sys) => {
                    sys.systems.pressurization.packL = false;
                    // Cabin altitude climbs slowly
                }
            }
        }
    },

    CABIN_ALT_AUTO_FAIL: {
        id: 'cabin_pressure_controller_fail',
        name: 'Cabin Pressure Controller Fail',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Pressurization Auto Mode Failed. Switch to Manual.",
                    system_alert: "AUTO FAIL",
                    sound: "horn_intermittent"
                }),
                effect: (sys) => {
                    // Manual control only
                }
            }
        }
    },

    // --- ICE & RAIN ---
    WINDSHIELD_HEAT_FAIL: {
        id: 'windshield_heat_fail',
        name: 'Window Heat Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Window heat controller fault. Icing risk.",
                    system_alert: "WINDOW HEAT L",
                    visual: "window_fog"
                }),
                effect: (sys) => {
                    // Visual obstruction logic
                }
            }
        }
    },

    DEICING_FAIL: {
        id: 'wing_anti_ice_fail',
        name: 'Wing Anti-Ice Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Wing Anti-Ice Valve stuck closed.",
                    system_alert: "WING A-ICE VALVE",
                    visual: "ice_buildup_wing"
                }),
                effect: (sys) => {
                    // Drag increase in icing conditions
                }
            }
        }
    },

    // --- FUEL ---
    FUEL_PUMP_FAIL: {
        id: 'fuel_pump_fail',
        name: 'Fuel Pump Low Pressure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Fuel pump output pressure low.",
                    system_alert: "FUEL PUMP L AFT",
                    sound: "chime_single"
                }),
                effect: (sys) => {
                    sys.systems.fuel.pressL *= 0.5;
                }
            }
        }
    },

    FUEL_HEAT_FAIL: {
        id: 'fuel_heat_fail',
        name: 'Fuel Heater Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Fuel filter icing detected.",
                    system_alert: "FUEL FILTER BYPASS",
                    sound: "engine_roughness"
                }),
                effect: (sys) => {
                    // Potential engine hesitation
                }
            }
        }
    },

    // --- FIRE ---
    CARGO_FIRE: {
        id: 'cargo_fire',
        name: 'Cargo Bay Fire',
        category: 'systems',
        stages: {
            inactive: { next: 'incipient' },
            incipient: {
                duration: 10.0,
                next: 'active',
                description: (ctx) => ({
                    text: "Smoke detector activation in FWD Cargo.",
                    system_alert: "FWD CARGO SMOKE",
                    sound: "fire_bell",
                    visual: "red_light_flash"
                }),
                effect: (sys) => {
                    sys.systems.fire.cargo = true;
                }
            },
            active: {
                description: (ctx) => ({
                    text: "Fire suppressing agent discharging.",
                    system_alert: "BOTTLE DISCH"
                }),
                effect: (sys) => {
                    // If bottle not discharged, fire grows
                }
            }
        }
    },

    APU_FIRE: {
        id: 'apu_fire',
        name: 'APU Fire',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "APU Fire Loop Alert. Auto-shutdown initiated.",
                    system_alert: "APU FIRE",
                    sound: "fire_bell",
                    visual: "red_light_flash"
                }),
                effect: (sys) => {
                    sys.systems.fire.apu = true;
                    sys.systems.apu.running = false;
                }
            }
        }
    },

    AVIONICS_OVERHEAT: {
        id: 'avionics_overheat',
        name: 'Avionics Cooling Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Equipment cooling airflow low. Display units overheating.",
                    system_alert: "EQUIP COOLING",
                    sound: "fan_noise_stop",
                    smell: "hot_dust"
                }),
                effect: (sys) => {
                    // Screen failures eventually
                }
            }
        }
    },
    
    // Legacy mapping support
    MAJOR_HYDRAULIC: {
        id: 'major_hydraulic_failure',
        name: 'Major Hydraulic Failure',
        category: 'systems',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "TOTAL HYDRAULIC LOSS.",
                    system_alert: "HYD ALL FAIL",
                    visual: "controls_stiff"
                }),
                effect: (sys) => {
                    if (sys.systems.hydraulics) {
                        sys.systems.hydraulics.sysA.pressure = 0;
                        sys.systems.hydraulics.sysB.pressure = 0;
                        if (sys.systems.hydraulics.sysC) sys.systems.hydraulics.sysC.pressure = 0;
                    }
                    sys.controlEffectiveness.aileron = 0.0;
                    sys.controlEffectiveness.elevator = 0.0;
                    sys.controlEffectiveness.rudder = 0.0;
                }
            }
        }
    }
};

export default SystemFailures;
