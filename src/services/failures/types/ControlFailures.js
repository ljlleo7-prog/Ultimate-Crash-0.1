
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
    
    TOTAL_CONTROL_FAILURE: {
        id: 'total_flight_control_failure',
        name: 'Total Control Loss',
        category: 'controls',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `FLIGHT CONTROLS UNRESPONSIVE.`,
                effect: (sys) => {
                    // Freeze all controls at current or neutral
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
                    // Force gear up if trying to extend
                    if (sys.controls.gear > 0.1) sys.controls.gear = 0;
                }
            }
        }
    }
};

export default ControlFailures;
