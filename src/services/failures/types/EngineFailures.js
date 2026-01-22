
const EngineFailures = {
    ENGINE_FAILURE: {
        id: 'engine_failure',
        name: 'Engine Failure',
        category: 'engine',
        condition: (state) => true,
        stages: {
            inactive: { next: 'sputtering' },
            sputtering: {
                duration: 5.0,
                next: 'incipient',
                description: (ctx) => `Intermittent surging noise heard from Engine ${ctx.engineIndex + 1}. N1 needle vibrating.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        eng.state.n1 += (Math.random() - 0.5) * 5; // Jitter
                    }
                }
            },
            incipient: {
                duration: 6.0,
                next: 'active',
                description: (ctx) => `High pitched whine from Engine ${ctx.engineIndex + 1}. Smell of kerosene in cabin.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        // Simulate pre-failure struggle
                        eng.state.egt += 80 * intensity;
                        eng.state.n1 *= (1.0 - (0.2 * intensity * Math.random()));
                    }
                }
            },
            active: {
                description: (ctx) => `Loud bang. Sudden silence from Engine ${ctx.engineIndex + 1}. Aircraft yawing hard.`,
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
            inactive: { next: 'smoke' },
            smoke: {
                duration: 8.0,
                next: 'incipient',
                description: (ctx) => `Acrid smoke smell in cabin. Passengers reporting sparks from Engine ${ctx.engineIndex + 1}.`,
                effect: (sys, intensity, ctx) => {
                    // Visual smoke effect trigger could go here
                }
            },
            incipient: {
                duration: 10.0,
                next: 'active',
                description: (ctx) => `Low frequency rumble felt in airframe. Engine ${ctx.engineIndex + 1} cowl glowing.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) eng.state.n2 += (Math.random() - 0.5) * 10;
                    eng.state.egt += 200;
                }
            },
            active: {
                description: (ctx) => `FIRE BELL. Engine ${ctx.engineIndex + 1} Fire Handle Illuminated. Intense heat reported.`,
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
            inactive: { next: 'fuel_starvation' }, 
            fuel_starvation: {
                duration: 5.0,
                next: 'active',
                description: (ctx) => `Sputtering sound from both engines. Fuel pumps cavitating.`,
                effect: (sys, intensity, ctx) => {
                    sys.engines.forEach(e => {
                        e.state.fuelFlow *= 0.5; // Stutter
                    });
                }
            },
            active: {
                description: (ctx) => `Eerie silence. All engines spun down. Wind noise only. GENERATORS OFFLINE.`,
                effect: (sys, intensity, ctx) => {
                    sys.engines.forEach(e => e.setFailed(true));
                    if (sys.systems && sys.systems.electrical) {
                         sys.systems.electrical.gen1 = false;
                         sys.systems.electrical.gen2 = false;
                    }
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
                description: (ctx) => `Repeated loud bangs (backfire) from Engine ${ctx.engineIndex + 1}. Airframe shuddering.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        // Pop noise (thrust cut and spike)
                        if (Math.random() > 0.6) {
                            eng.thrust *= 0.1; // Sudden loss
                        } else {
                            eng.thrust *= 1.2; // Surge
                        }
                        eng.state.egt += 20;
                    }
                }
            },
            recovered: {
                description: (ctx) => `Engine ${ctx.engineIndex + 1} vibration stabilizing. Bangs ceased.`,
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
                description: (ctx) => `Strong fuel smell. Vapor trail visible from wing. Imbalance increasing.`,
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
                description: (ctx) => `Thud impact sound. Smear on windshield. Burning smell from Engine ${ctx.engineIndex + 1}.`,
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
                description: (ctx) => `EXPLOSION felt on side. Shrapnel impact noises. Decompression fog. Engine ${ctx.engineIndex + 1} Destroyed.`,
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
