
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

    HULL_BREACH: {
        id: 'hull_breach',
        name: 'Hull Breach',
        category: 'environment',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `STRUCTURAL DAMAGE. DECOMPRESSION.`,
                effect: (sys) => {
                    sys.systems.pressurization.breach = true;
                    // Drag increase?
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
                    sys.setEnvironment({
                        turbulence: 5.0 * intensity
                    });
                }
            }
        }
    },

    WIND_SHEAR: {
        id: 'wind_shear',
        name: 'Wind Shear',
        category: 'environment',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `WINDSHEAR AHEAD.`,
                effect: (sys, intensity) => {
                    // Sudden airspeed loss/gain logic in physics
                    // sys.applyWindShear(intensity);
                }
            }
        }
    },

    SEVERE_ICING: {
        id: 'severe_icing',
        name: 'Severe Icing',
        category: 'environment',
        stages: {
            inactive: { next: 'accumulating' },
            accumulating: {
                duration: 30.0,
                next: 'critical',
                description: (ctx) => `Ice Accumulation Detected.`,
                effect: (sys, intensity) => {
                    // Reduce lift slightly
                }
            },
            critical: {
                description: (ctx) => `Severe Icing. Stall Speed Increased.`,
                effect: (sys) => {
                    // Degrade aerodynamic coeffs
                }
            }
        }
    },

    FUEL_CONTAMINATION: {
        id: 'fuel_contamination',
        name: 'Fuel Contamination',
        category: 'environment',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Fuel Filter Bypass. Engine Roughness.`,
                effect: (sys) => {
                    // Random thrust fluctuations
                    sys.engines.forEach(e => {
                        e.thrust *= 0.8 + (Math.random() * 0.2);
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
                    // Loud bang
                }
            },
            damage: {
                description: (ctx) => `Bird Ingestion: Engine Damage.`,
                effect: (sys, intensity, ctx) => {
                    const idx = ctx.engineIndex !== undefined ? ctx.engineIndex : 0;
                    if (sys.engines[idx]) sys.engines[idx].setFailed(true);
                }
            }
        }
    },

    UNCONTAINED_ENGINE: {
        id: 'uncontained_engine_failure',
        name: 'Uncontained Engine Failure',
        category: 'environment',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `EXPLOSION ENGINE ${ctx.engineIndex + 1}. STRUCTURAL DAMAGE.`,
                effect: (sys, intensity, ctx) => {
                    const idx = ctx.engineIndex !== undefined ? ctx.engineIndex : 0;
                    if (sys.engines[idx]) sys.engines[idx].setFailed(true);
                    sys.systems.hydraulics.sysA.pressure = 0; // Collateral damage
                }
            }
        }
    },
    
    SABOTAGE: {
        id: 'sabotage_explosion',
        name: 'Sabotage/IED',
        category: 'environment',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `CATASTROPHIC FAILURE.`,
                effect: (sys) => {
                    sys.engines.forEach(e => e.setFailed(true));
                    sys.systems.pressurization.breach = true;
                    // Chaos
                }
            }
        }
    }
};

export default EnvironmentFailures;
