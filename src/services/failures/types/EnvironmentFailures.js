
const EnvironmentFailures = {
    RAPID_DEPRESSURIZATION: {
        id: 'rapid_depressurization',
        name: 'Rapid Depressurization',
        category: 'environment',
        stages: {
            inactive: { next: 'warning' },
            warning: {
                duration: 3.0,
                next: 'active',
                description: (ctx) => `Loud hissing sound from door seal. Ears popping.`,
                effect: (sys) => {
                    // Nothing
                }
            },
            active: {
                description: (ctx) => `CABIN ALTITUDE HORN. Oxygen masks drop. Fog in cabin.`,
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
            inactive: { next: 'explosion' },
            explosion: {
                duration: 2.0,
                next: 'active',
                description: (ctx) => `Loud bang. Wind noise deafening. Debris flying in cabin.`,
                effect: (sys) => {
                    // Maybe tilt aircraft
                    sys.state.rates.x += 0.2; // Roll jerk
                }
            },
            active: {
                description: (ctx) => `Cold air rushing in. Papers blowing around cockpit. Drag increased.`,
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
            inactive: { next: 'chop' },
            chop: {
                duration: 10.0,
                next: 'active',
                description: (ctx) => `Coffee shaking in cup. Seatbelt sign audible.`,
                effect: (sys) => {
                    sys.setEnvironment({ turbulence: 1.0 });
                }
            },
            active: {
                description: (ctx) => `Violent jolts. Loose items hitting ceiling. Passengers screaming.`,
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
                description: (ctx) => `Roaring rain sound. Sudden sink sensation. Airspeed fluctuations.`,
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
                description: (ctx) => `Ice building on wiper blades. Windshield opaque. Wing leading edge white.`,
                effect: (sys, intensity) => {
                    // Reduce lift slightly
                }
            },
            critical: {
                description: (ctx) => `Buffet felt through airframe. Controls feel sluggish/heavy.`,
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
            inactive: { next: 'clogging' },
            clogging: {
                duration: 20.0,
                next: 'active',
                description: (ctx) => `Engine RPM needle wavering slightly.`,
                effect: (sys) => {
                    // warning
                }
            },
            active: {
                description: (ctx) => `Engines sputtering. Thrust surges. Fuel flow erratic.`,
                effect: (sys) => {
                    // Random thrust fluctuations
                    sys.engines.forEach(e => {
                        e.state.fuelFlow *= 0.8;
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
                description: (ctx) => `Loud THUDs on nose/windshield. Blood smear visible.`,
                effect: (sys, intensity, ctx) => {
                    // Loud bang
                }
            },
            damage: {
                description: (ctx) => `Burning smell. Vibration from engines.`,
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
