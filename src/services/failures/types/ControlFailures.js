
const ControlFailures = {
    CONTROL_JAM: {
        id: 'control_jam',
        name: 'Control Surface Jam',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `${ctx.surface.toUpperCase()} Jammed.`,
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
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Control Mechanism Severed/Jammed.`,
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
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `FLIGHT CONTROLS UNRESPONSIVE.`,
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
                description: (ctx) => `Landing Gear Extension Fault.`,
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
                description: (ctx) => `Autopilot Disconnect / Uncommanded Motion.`,
                effect: (sys) => {
                    // Disable AP
                    // Random input jerk
                    sys.controls.elevator += (Math.random() - 0.5) * 0.1;
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
                description: (ctx) => `Autothrottle Surge.`,
                effect: (sys) => {
                    // Set thrust to max or min unexpectedly
                    sys.engines.forEach(e => {
                        e.thrustTarget = Math.random() > 0.5 ? 1.0 : 0.0;
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
                description: (ctx) => `Runway Excursion Risk. Braking Compromised.`,
                effect: (sys) => {
                    // Reduce friction coefficient (handled in physics)
                }
            }
        }
    }
};

export default ControlFailures;
