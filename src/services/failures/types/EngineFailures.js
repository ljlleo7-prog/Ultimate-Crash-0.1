
const isHard = (ctx) => ['advanced', 'pro', 'devil', 'survival'].includes(ctx.difficulty);

const EngineFailures = {
    ENGINE_FAILURE: {
        id: 'engine_failure',
        name: 'Engine Failure (Generic)',
        category: 'engine',
        stages: {
            inactive: { next: 'incipient' },
            incipient: {
                duration: (ctx) => isHard(ctx) ? 12.0 : 3.0,
                next: 'active',
                description: (ctx) => isHard(ctx) 
                    ? `Engine ${ctx.engineIndex + 1} Parameters Fluctuation.` 
                    : `Engine ${ctx.engineIndex + 1} Flameout Imminent.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        // Subtle decay/fluctuation for hard mode
                        if (isHard(ctx)) {
                            // Fluctuation rather than just decay
                            const noise = (Math.random() - 0.5) * 2.0; // +/- 1%
                            eng.state.n2 += noise;
                            eng.state.n1 += noise * 1.5;
                            
                            // Oil Pressure slow drop
                            eng.state.oilPressure *= 0.995;
                            
                            // Fuel Flow Oscillation
                            eng.state.fuelFlow *= (1.0 + (Math.random() - 0.5) * 0.1);
                            
                            // Occasional EGT Spike
                            if (Math.random() > 0.8) {
                                eng.state.egt += 50;
                            }
                        } else {
                             // Obvious warning for easy mode
                            eng.state.n1 = eng.state.n1 * 0.9 + Math.random() * 5.0;
                            eng.state.egt += 100; // Visible heat spike
                            eng.state.vibration = 5.0;
                        }
                    }
                }
            },
            active: {
                description: (ctx) => isHard(ctx) 
                    ? `Engine ${ctx.engineIndex + 1} Failure.` 
                    : `ENGINE ${ctx.engineIndex + 1} FLAMEOUT DETECTED.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        if (!eng.state.failed) {
                            eng.setFailed(true);
                        }
                    }
                }
            }
        }
    },
    
    ENGINE_FIRE: {
        id: 'engine_fire',
        name: 'Engine Fire',
        category: 'engine',
        stages: {
            inactive: { next: 'incipient' },
            incipient: {
                duration: (ctx) => isHard(ctx) ? 5.0 : 10.0,
                intensityTarget: 1.0, // Ramp up intensity
                next: 'active',
                description: (ctx) => isHard(ctx) 
                    ? `Engine ${ctx.engineIndex + 1} Vibration High.` 
                    : `Engine ${ctx.engineIndex + 1} Fire Loop Alert.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        eng.state.vibration = 5.0 + (intensity * 2.0);
                        
                        // Accumulate EGT rise (since physics resets EGT every frame)
                        if (ctx.egtOffset === undefined) ctx.egtOffset = 0;
                        
                        // Initial Spike
                        if (intensity > 0.1 && !ctx.hasSpiked) {
                             ctx.egtOffset += 50;
                             ctx.hasSpiked = true;
                        }

                        // Faster rise rate
                        const riseRate = isHard(ctx) ? 3.0 : 2.0;
                        ctx.egtOffset += riseRate * intensity;
                        
                        eng.state.egtOffset = ctx.egtOffset;
                    }
                }
            },
            active: {
                description: (ctx) => isHard(ctx) 
                    ? `Engine ${ctx.engineIndex + 1} Temp Exceedance.` 
                    : `FIRE ALERT: Engine ${ctx.engineIndex + 1}.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        if (!eng.state.failed) {
                            // If fire burns too hot/long, engine fails
                            // EGT offset > 600 means fire is raging
                            if (eng.state.egtOffset > 600 && Math.random() < 0.05) {
                                eng.setFailed(true, 'fire', 'critical');
                            }
                        }
                        if (sys.systems && sys.systems.fire) {
                            sys.systems.fire[`eng${ctx.engineIndex + 1}`] = true;
                        }
                        
                        // Continue EGT rise
                        if (ctx.egtOffset === undefined) ctx.egtOffset = 0;
                        ctx.egtOffset += 0.5; // Continue rising
                        
                        // Ensure minimum fire temperature (approx 1100C)
                        // If base is ~500-700, we need offset ~400-600
                        if (ctx.egtOffset < 400) ctx.egtOffset = 400;
                        
                        eng.state.egtOffset = ctx.egtOffset;
                        
                        // Cap at melting point
                        // If base is 700, max offset 900 gives 1600
                        if (eng.state.egtOffset > 900) eng.state.egtOffset = 900;
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
                        eng.state.vibration = 8.0 * intensity;
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
                description: (ctx) => isHard(ctx) 
                    ? `Fuel Flow Mismatch Detected.` 
                    : `Fuel Leak: Tank Imbalance increasing.`,
                effect: (sys, intensity, ctx) => {
                    // Leak rate scales with intensity
                    const rate = 2.0 + (intensity * 5.0); // kg/s
                    
                    // Drain from tanks (Left/Right depending on engine index, or random for leak)
                    // Simplify: Leak from the tank feeding this engine (or left/right evenly if unknown)
                    const side = (ctx.engineIndex % 2 === 0) ? 'left' : 'right';
                    
                    if (sys.systems && sys.systems.fuel && sys.systems.fuel.tanks) {
                         const tanks = sys.systems.fuel.tanks;
                         if (tanks[side] > 0) {
                             tanks[side] -= rate * 0.1; 
                         } else {
                             // Tank empty -> Flameout
                             const eng = sys.engines[ctx.engineIndex];
                             if (eng && !eng.state.failed) {
                                 eng.setFailed(true, 'flameout', 'critical');
                             }
                         }
                    }
                }
            }
        }
    },

    BIRD_STRIKE: {
        id: 'bird_strike',
        name: 'Bird Strike',
        category: 'engine',
        stages: {
            inactive: { next: 'impact' },
            impact: {
                duration: 2.0,
                next: 'active',
                description: (ctx) => isHard(ctx) 
                    ? `LOUD BANG detected.` 
                    : `Bird Strike Detected: Engine ${ctx.engineIndex + 1}`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        // Impact shock
                        eng.state.vibration = 10.0;
                        eng.state.n1 = eng.state.n1 * (0.9 + Math.random() * 0.2); // Fluctuations
                        
                        // Hard mode: potential immediate damage without warning
                        if (isHard(ctx) && Math.random() > 0.5) {
                            eng.state.n1 *= 0.5; 
                        }
                    }
                }
            },
            active: {
                description: (ctx) => isHard(ctx) 
                    ? `Engine ${ctx.engineIndex + 1} Unstable.` 
                    : `Engine ${ctx.engineIndex + 1} Severe Damage.`,
                effect: (sys, intensity, ctx) => {
                    const eng = sys.engines[ctx.engineIndex];
                    if (eng) {
                        if (!eng.state.failed) {
                            // High chance of flameout or severe damage
                            const type = Math.random() > 0.3 ? 'damage' : 'flameout';
                            eng.setFailed(true);
                        }
                        
                        // Persistent vibration if rotating
                        if (eng.state.n2 > 10) {
                            eng.state.vibration = 8.0;
                        }
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
