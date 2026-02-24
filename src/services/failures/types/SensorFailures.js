const SensorFailures = {
    PITOT_BLOCKAGE: {
        id: 'pitot_blockage',
        name: 'Pitot Tube Blockage',
        category: 'sensors',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Airspeed indication unreliable.",
                    visual: "flicker_pfd",
                    system_alert: "IAS DISAGREE"
                }),
                effect: (sys, intensity) => {
                    sys.sensors.pitotBlocked = true;
                    // Fluctuating airspeed logic in physics
                }
            }
        }
    },
    
    STATIC_PORT_BLOCK: {
        id: 'static_port_block',
        name: 'Static Port Blockage',
        category: 'sensors',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Altimeter and VSI frozen or erroneous.",
                    system_alert: "ALT DISAGREE"
                }),
                effect: (sys) => {
                    sys.sensors.staticBlocked = true;
                }
            }
        }
    },
    
    RADALT_FAIL: {
        id: 'radalt_failure',
        name: 'Radio Altimeter Failure',
        category: 'sensors',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Radio Altimeter Fault. GPWS Inoperative.",
                    sound: "chime_single",
                    system_alert: "RAD ALT FAIL"
                }),
                effect: (sys) => {
                    sys.sensors.radAlt = -1; // Flag as invalid
                }
            }
        }
    },
    
    AOA_VANE_STUCK: {
        id: 'aoa_vane_stuck',
        name: 'AOA Vane Stuck',
        category: 'sensors',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "Angle of Attack sensor stuck. Stall warning unreliable.",
                    visual: "stick_shaker_false_positive",
                    system_alert: "AOA FAIL"
                }),
                effect: (sys) => {
                    sys.sensors.aoaFrozen = true;
                    // Potential for false stick shaker
                }
            }
        }
    },
    
    ILS_GLITCH: {
        id: 'ils_signal_glitch',
        name: 'ILS Signal Interference',
        category: 'sensors',
        stages: {
            inactive: { next: 'intermittent' },
            intermittent: {
                duration: 20.0,
                next: 'active',
                description: (ctx) => ({
                    text: "ILS Glideslope deviation.",
                    visual: "pfd_glitch",
                    sound: "static_noise"
                }),
                effect: (sys) => {
                    sys.sensors.ilsDeviation = (Math.random() - 0.5) * 2.0; // Dots
                }
            },
            active: {
                description: (ctx) => ({
                    text: "ILS Signal Lost.",
                    system_alert: "NO AUTOLAND"
                }),
                effect: (sys) => {
                    sys.sensors.ilsSignal = false;
                }
            }
        }
    },
    
    GPS_LOSS: {
        id: 'gps_signal_loss',
        name: 'GPS Signal Loss',
        category: 'sensors',
        stages: {
            inactive: { next: 'active' },
            active: {
                description: (ctx) => ({
                    text: "GPS Primary Lost. Reverting to IRS.",
                    system_alert: "GPS PRIMARY LOST"
                }),
                effect: (sys) => {
                    sys.sensors.gpsActive = false;
                    // Drift logic in navigation
                }
            }
        }
    }
};

export default SensorFailures;
