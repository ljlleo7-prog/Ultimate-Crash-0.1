const EnvironmentFailures = {
    RAPID_DEPRESSURIZATION: {
        id: 'rapid_depressurization',
        name: 'Rapid Depressurization',
        category: 'environment',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "CABIN ALTITUDE UNCONTROLLABLE. OXYGEN MASKS DROPPED.",
                    system_alert: "CABIN ALTITUDE",
                    sound: "hissing_loud",
                    visual: "fog_cockpit"
                }),
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
                description: (ctx) => ({
                    text: "EXPLOSIVE DECOMPRESSION. STRUCTURAL FAILURE DETECTED.",
                    system_alert: "DOOR OPEN",
                    sound: "explosion_dull",
                    visual: "shake_violent"
                }),
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
                description: (ctx) => ({
                    text: "Encountering Severe Turbulence.",
                    visual: "shake_heavy"
                }),
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
                description: (ctx) => ({
                    text: "WINDSHEAR AHEAD.",
                    system_alert: "WINDSHEAR",
                    sound: "windshear_alert",
                    visual: "shake_medium"
                }),
                effect: (sys, intensity) => {
                    if (typeof sys.applyWindShear === 'function') {
                        sys.applyWindShear(intensity);
                    }
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
                description: (ctx) => ({
                    text: "Ice accumulation detected on airframe.",
                    visual: "ice_buildup_window"
                }),
                effect: (sys, intensity) => {
                    // Reduce lift slightly
                }
            },
            critical: {
                description: (ctx) => ({
                    text: "Severe Icing. Aerodynamic stall risk high.",
                    system_alert: "STALL WARN",
                    visual: "ice_heavy"
                }),
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
                description: (ctx) => ({
                    text: "Engine roughness detected. Fuel filter bypass.",
                    system_alert: "FUEL FILTER",
                    sound: "engine_roughness"
                }),
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
                description: (ctx) => ({
                    text: "LOUD BANG. IMPACT DETECTED.",
                    sound: "bang_loud",
                    visual: "shake_jolt"
                }),
                effect: (sys, intensity, ctx) => {
                    // Loud bang
                }
            },
            damage: {
                description: (ctx) => ({
                    text: "Multiple bird ingestion. Engine damage.",
                    system_alert: "ENG VIB HIGH"
                }),
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
            inactive: { next: 'impact' },
            impact: {
                duration: 1.5,
                next: 'debris_field',
                description: (ctx) => ({
                    text: `EXPLOSION ENGINE ${ctx.engineIndex + 1}. SHOCKWAVE AND DEBRIS IMPACT.`,
                    system_alert: `ENG ${ctx.engineIndex + 1} FAIL`,
                    sound: 'explosion_loud',
                    visual: 'shake_violent'
                }),
                effect: (sys, intensity, ctx) => {
                    const idx = ctx.engineIndex !== undefined ? ctx.engineIndex : 0;
                    if (sys.engines[idx]) {
                        sys.engines[idx].setFailed(true);
                        sys.engines[idx].state.vibration = 10;
                        sys.engines[idx].state.n1 = Math.min(sys.engines[idx].state.n1, 55);
                    }
                    if (sys.systems?.fire) {
                        sys.systems.fire[`eng${idx + 1}`] = true;
                    }
                    if (sys.systems?.hydraulics?.sysA) {
                        sys.systems.hydraulics.sysA.pressure = Math.min(sys.systems.hydraulics.sysA.pressure, 1200);
                    }
                    if (sys.systems?.hydraulics?.sysB) {
                        sys.systems.hydraulics.sysB.pressure = Math.min(sys.systems.hydraulics.sysB.pressure, 1800);
                    }
                    ctx.structuralDamage = true;
                }
            },
            debris_field: {
                duration: 4.0,
                next: 'active',
                description: (ctx) => ({
                    text: `Engine ${ctx.engineIndex + 1} fragments strike nearby systems. Hydraulic lines compromised.`,
                    system_alert: 'SECONDARY DAMAGE',
                    sound: 'metal_impact',
                    visual: 'buffet_minor'
                }),
                effect: (sys, intensity, ctx) => {
                    if (sys.systems?.hydraulics?.sysA) {
                        sys.systems.hydraulics.sysA.pressure = Math.max(0, sys.systems.hydraulics.sysA.pressure - 1200);
                    }
                    if (sys.systems?.hydraulics?.sysB) {
                        sys.systems.hydraulics.sysB.pressure = Math.max(0, sys.systems.hydraulics.sysB.pressure - 800);
                    }
                    ctx.hydraulicDamage = true;
                }
            },
            active: {
                description: (ctx) => ({
                    text: `Engine ${ctx.engineIndex + 1} destroyed. Debris damage spreading through adjacent systems.`,
                    system_alert: 'STRUCTURAL DAMAGE',
                    sound: 'master_caution',
                    visual: 'shake_medium'
                }),
                effect: (sys, intensity, ctx) => {
                    const idx = ctx.engineIndex !== undefined ? ctx.engineIndex : 0;
                    if (sys.engines[idx]) {
                        sys.engines[idx].setFailed(true);
                    }
                    if (sys.systems?.hydraulics?.sysA) {
                        sys.systems.hydraulics.sysA.pressure = Math.min(sys.systems.hydraulics.sysA.pressure, 300);
                    }
                    if (sys.systems?.hydraulics?.sysB) {
                        sys.systems.hydraulics.sysB.pressure = Math.min(sys.systems.hydraulics.sysB.pressure, 1200);
                    }
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
                description: (ctx) => ({
                    text: "BOMB DETONATION DETECTED.",
                    system_alert: "HULL BREACH",
                    sound: "explosion_massive",
                    visual: "flash_white"
                }),
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
