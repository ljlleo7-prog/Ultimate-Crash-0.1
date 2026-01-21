
const EnvironmentFailures = {
    RAPID_DEPRESSURIZATION: {
        id: 'rapid_depressurization',
        name: 'Rapid Depressurization',
        category: 'environment',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `CABIN PRESSURE WARNING. HULL INTEGRITY COMPROMISED.`,
                effect: (sys) => {
                    sys.systems.pressurization.breach = true;
                }
            }
        }
    },

    TURBULENCE: {
        id: 'severe_turbulence',
        name: 'Severe Turbulence',
        category: 'environment',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Encountering Severe Turbulence.`,
                effect: (sys, intensity) => {
                    // Inject turbulence into environment
                    sys.setEnvironment({
                        turbulence: 5.0 * intensity // m/s variation
                    });
                }
            }
        }
    },

    BIRD_STRIKE: {
        id: 'bird_strike',
        name: 'Bird Strike',
        category: 'environment',
        stages: {
            inactive: { next: 'impact' },
            impact: {
                next: 'damage',
                duration: 0.5,
                description: (ctx) => `IMPACT DETECTED.`,
                effect: (sys, intensity, ctx) => {
                    // Loud bang? 
                    // Trigger engine failure next
                }
            },
            damage: {
                description: (ctx) => `Bird Ingestion: Engine Damage.`,
                effect: (sys, intensity, ctx) => {
                    // Pick engine if not set
                    const idx = ctx.engineIndex !== undefined ? ctx.engineIndex : 0;
                    if (sys.engines[idx]) sys.engines[idx].setFailed(true);
                }
            }
        }
    }
};

export default EnvironmentFailures;
