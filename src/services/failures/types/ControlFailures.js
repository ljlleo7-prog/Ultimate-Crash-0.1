const ControlFailures = {
    CONTROL_JAM: {
        id: 'control_jam',
        name: 'Control Surface Jam',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: `${ctx.surface ? ctx.surface.toUpperCase() : 'ELEVATOR'} control restricted.`,
                    system_alert: "FLT CTL JAM",
                    visual: "controls_stiff"
                }),
                effect: (sys, intensity, ctx) => {
                    if (!ctx.surface) ctx.surface = 'elevator';
                    if (ctx.stuckValue === undefined) ctx.stuckValue = 0;
                    sys.controls[ctx.surface] = ctx.stuckValue;
                }
            }
        }
    },
    
    RUDDER_HARD_OVER: {
        id: 'rudder_hard_over',
        name: 'Rudder Hardover',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Uncommanded Rudder deflection.",
                    system_alert: "RUDDER CTL",
                    visual: "shake_jolt"
                }),
                effect: (sys) => {
                    sys.controls.rudder = 1.0; // Full deflection
                }
            }
        }
    },
    
    TRIM_RUNAWAY: {
        id: 'stabilizer_runaway',
        name: 'Stabilizer Trim Runaway',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Stabilizer trim moving uncommanded.",
                    system_alert: "STAB OUT OF TRIM",
                    sound: "trim_wheel_noise"
                }),
                effect: (sys) => {
                    sys.controls.elevatorTrim += 0.05; // Continual movement
                }
            }
        }
    },
    
    FLAP_JAM: {
        id: 'flap_jam',
        name: 'Flap Asymmetry/Jam',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Flap movement arrested. Asymmetry detected.",
                    system_alert: "FLAPS DRIVE",
                    visual: "roll_uncommanded"
                }),
                effect: (sys) => {
                    // Lock flaps
                    // Add roll tendency
                }
            }
        }
    },
    
    SPOILER_FLOAT: {
        id: 'spoiler_float',
        name: 'Spoiler Float',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Spoiler panel floating due to hydraulic loss.",
                    system_alert: "SPOILERS",
                    visual: "buffet_minor"
                }),
                effect: (sys) => {
                    // Drag increase
                }
            }
        }
    },
    
    MACH_TRIM_FAIL: {
        id: 'mach_trim_fail',
        name: 'Mach Trim Failure',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Mach Trim Inoperative. Tuck under tendency.",
                    system_alert: "MACH TRIM FAIL"
                }),
                effect: (sys) => {
                    // Physics stability reduced at high mach
                }
            }
        }
    },

    TOTAL_CONTROL_FAILURE: {
        id: 'total_flight_control_failure',
        name: 'Total Control Loss',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "FLIGHT CONTROLS UNRESPONSIVE.",
                    system_alert: "FLT CTL ALL FAIL",
                    sound: "cavalry_charge_warning"
                }),
                effect: (sys) => {
                    sys.controls.aileron = 0;
                    sys.controls.elevator = 0;
                    sys.controls.rudder = 0;
                }
            }
        }
    },

    GEAR_FAILURE: {
        id: 'landing_gear_extension_issue',
        name: 'Gear Extension Failure',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Landing Gear Extension Fault.",
                    system_alert: "GEAR DISAGREE",
                    sound: "gear_warning_horn"
                }),
                effect: (sys, intensity, ctx) => {
                    if (sys.controls.gear > 0.1) sys.controls.gear = 0;
                }
            }
        }
    },
    
    AUTOPILOT_ANOMALY: {
        id: 'autopilot_anomaly',
        name: 'Autopilot Anomaly',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Autopilot Disconnect / Uncommanded Motion.",
                    system_alert: "A/P PITCH TRIM FAIL",
                    sound: "ap_disconnect"
                }),
                effect: (sys) => {
                    sys.controls.elevator += (Math.random() - 0.5) * 0.1;
                }
            }
        }
    }
};

export default ControlFailures;
