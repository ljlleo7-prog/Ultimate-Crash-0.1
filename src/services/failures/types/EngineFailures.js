
const EngineFailures = {
    ENGINE_FAILURE: {
        id: 'engine_failure',
        name: 'Engine Failure',
        category: 'engine',
        condition: (state) => true,
        stages: {
            inactive: { next: 'incipient' },
            incipient: {
                duration: 4.0,
                next: 'active',
                description: (ctx) => `Engine ${ctx.engineIndex + 1} EGT rising abnormally.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        // Simulate pre-failure struggle
                        eng.state.egt += 50 * intensity;
                        eng.state.n1 *= (1.0 - (0.1 * intensity * Math.random()));
                    }
                }
            },
            active: {
                description: (ctx) => `Engine ${ctx.engineIndex + 1} Flameout.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) eng.setFailed(true);
                }
            }
        }
    },
    
    ENGINE_FIRE: {
        id: 'onboard_fire', // Matching ID from list
        name: 'Engine Fire',
        category: 'engine',
        stages: {
            inactive: { next: 'incipient' },
            incipient: {
                duration: 10.0,
                next: 'active',
                description: (ctx) => `Engine ${ctx.engineIndex + 1} Vibration High.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) eng.state.n2 += (Math.random() - 0.5) * 5;
                }
            },
            active: {
                description: (ctx) => `FIRE ALERT: Engine ${ctx.engineIndex + 1}.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        eng.setFailed(true);
                        sys.systems.fire[`eng${ctx.engineIndex + 1}`] = true;
                    }
                }
            }
        }
    },

    DUAL_ENGINE_FAILURE: {
        id: 'dual_engine_failure',
        name: 'Dual Engine Flameout',
        category: 'engine',
        stages: {
            inactive: { next: 'active' }, // Instant
            active: {
                description: (ctx) => `ALL ENGINES FLAMEOUT.`,
                effect: (sys, intensity, ctx) => {
                    sys.engines.forEach(e => e.setFailed(true));
                }
            }
        }
    },

    COMPRESSOR_STALL: {
        id: 'compressor_stall',
        name: 'Compressor Stall',
        category: 'engine',
        stages: {
            inactive: { next: 'surging' },
            surging: {
                duration: 15.0,
                next: 'recovered', // Can recover or fail?
                description: (ctx) => `Engine ${ctx.engineIndex + 1} Compressor Stall (Surging).`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        // Pop noise (thrust cut and spike)
                        if (Math.random() > 0.7) eng.state.thrust *= 0.2; // Use state.thrust directly if needed, or rely on update loop
                        eng.state.egt += 10;
                        eng.setVibration(8.0 * intensity);
                    }
                }
            },
            recovered: {
                description: (ctx) => `Engine ${ctx.engineIndex + 1} Stabilized.`,
                effect: (sys) => { /* No op */ }
            }
        }
    },
    
    FUEL_LEAK: {
        id: 'fuel_leak',
        name: 'Fuel Leak',
        category: 'engine',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `Fuel Imbalance Detected. Leak suspected.`,
                effect: (sys, intensity, ctx) => {
                    // Leak rate scales with intensity
                    const rate = 2.0 + (intensity * 5.0); // kg/s
                    sys.state.fuel -= rate * 0.016; // approx dt
                }
            }
        }
    },

    BIRD_STRIKE: {
        id: 'bird_strike',
        name: 'Bird Strike',
        category: 'engine',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `BIRD STRIKE: Engine ${ctx.engineIndex + 1}.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        // High damage probability
                        eng.setFailed(true);
                        eng.state.n1 = 0;
                        sys.systems.fire[`eng${ctx.engineIndex + 1}`] = Math.random() > 0.5;
                    }
                }
            }
        }
    },

    UNCONTAINED_ENGINE: {
        id: 'uncontained_engine_failure',
        name: 'Uncontained Failure',
        category: 'engine',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => `UNCONTAINED FAILURE: Engine ${ctx.engineIndex + 1}.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        eng.setFailed(true);
                        sys.systems.fire[`eng${ctx.engineIndex + 1}`] = true;
                        // Collateral Damage
                        sys.systems.hydraulics.sysA.pressure = 0;
                        sys.systems.pressurization.breach = true;
                    }
                }
            }
        }
    }
};

export default EngineFailures;
