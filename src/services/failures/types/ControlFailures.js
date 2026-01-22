
const ControlFailures = {
    CONTROL_JAM: {
        id: 'control_jam',
        name: 'Control Surface Jam',
        category: 'controls',
        stages: {
            inactive: { next: 'stiffening' },
            stiffening: {
                duration: 8.0,
                next: 'active',
                description: (ctx) => `${ctx.surface ? ctx.surface.toUpperCase() : 'CONTROL'} control feels extremely heavy. Resistance increasing.`,
                effect: (sys, intensity, ctx) => {
                    // Reduce responsiveness?
                    // Not easy to do directly without modifying physics constants, 
                    // but we can add some 'lag' or resistance if physics supports it.
                    // For now, no-op, just narrative.
                }
            },
            active: {
                description: (ctx) => `Loud hydraulic knock. ${ctx.surface ? ctx.surface.toUpperCase() : 'CONTROL'} stuck. Unable to move.`,
                effect: (sys, intensity, ctx) => {
                    if (!ctx.surface) ctx.surface = 'elevator';
                    if (ctx.stuckValue === undefined) ctx.stuckValue = 0;
                    sys.controls[ctx.surface] = ctx.stuckValue;
                }
            }
        }
    },
    
    STRUCTURAL_JAM: {
        id: 'structural_control_surface_jam',
        name: 'Structural Jam',
        category: 'controls',
        stages: {
            inactive: { next: 'vibration' },
            vibration: {
                duration: 5.0,
                next: 'active',
                description: (ctx) => `Violent shaking from tail section. Loose items thrown about.`,
                effect: (sys) => {
                    // Shake camera?
                }
            },
            active: {
                description: (ctx) => `Loud tearing metal sound. ${ctx.surface ? ctx.surface.toUpperCase() : 'RUDDER'} disconnected. Pedals/Yoke limp.`,
                effect: (sys, intensity, ctx) => {
                    // Hard lock
                    if (!ctx.surface) ctx.surface = 'rudder';
                    sys.controls[ctx.surface] = 0.2; // Stuck offset
                }
            }
        }
    },

    TOTAL_CONTROL_FAILURE: {
        id: 'total_flight_control_failure',
        name: 'Total Control Loss',
        category: 'controls',
        stages: {
            inactive: { next: 'degrading' },
            degrading: {
                duration: 10.0,
                next: 'active',
                description: (ctx) => `Flight computers clicking offline. Stick shaker active. Controls lagging.`,
                effect: (sys, intensity) => {
                     // Partial loss
                     sys.controls.aileron *= 0.5;
                     sys.controls.elevator *= 0.5;
                }
            },
            active: {
                description: (ctx) => `ALL HYDRAULICS LOST. Controls dead. Stick falling forward.`,
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
            inactive: { next: 'cycling' },
            cycling: {
                duration: 12.0,
                next: 'active',
                description: (ctx) => `Grinding noise from wheel well. Gear unsafe light flashing.`,
                effect: (sys) => {
                    // maybe gear sound plays
                }
            },
            active: {
                description: (ctx) => `Loud clunk. Gear handle stuck. Red 'UNSAFE' light steady. Manual Release Required.`,
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
            inactive: { next: 'fighting' },
            fighting: {
                duration: 6.0,
                next: 'active',
                description: (ctx) => `Yoke moving uncommanded. Trim wheel spinning rapidly.`,
                effect: (sys) => {
                    sys.controls.trim += 0.001; // Slow runaway
                }
            },
            active: {
                description: (ctx) => `Autopilot disconnect wail. Yoke hardover. Fight against controls.`,
                effect: (sys) => {
                    // Disable AP
                    // Random input jerk
                    sys.controls.elevator += (Math.random() - 0.5) * 0.3; // Stronger jerk
                }
            }
        }
    },

    AUTOTHROTTLE_MISCOMMAND: {
        id: 'autothrottle_miscommand',
        name: 'Autothrottle Miscommand',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Throttles moving uncommanded. Engines spooling up asymmetrically.`,
                effect: (sys) => {
                    // Set thrust to max or min unexpectedly
                    sys.engines.forEach((e, i) => {
                        // Asymmetric
                        e.thrustTarget = i % 2 === 0 ? 1.0 : 0.2;
                    });
                }
            }
        }
    },

    RUNWAY_EXCURSION: {
        id: 'runway_excursion',
        name: 'Runway Excursion',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Wheels skidding. Lateral drift uncontrollable.`,
                effect: (sys) => {
                    // Reduce friction coefficient (handled in physics)
                }
            }
        }
    }
};

export default ControlFailures;
