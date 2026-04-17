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

const createSupplementalSensorFailure = (id, name, systemAlert) => ({
    id,
    name,
    category: 'sensors',
    stages: {
        inactive: { next: 'active' },
        active: {
            description: () => ({
                text: name,
                system_alert: systemAlert
            }),
            effect: () => {}
        }
    }
});

const SupplementalSensorFailures = {
    IRS_ALIGNMENT_FAIL: createSupplementalSensorFailure('irs_alignment_fail', 'IRS Alignment Failure', 'IRS ALIGN'),
    ADIRU_FAIL: createSupplementalSensorFailure('adiru_fail', 'ADIRU Failure', 'ADIRU'),
    RADIO_ALTIMETER_BIAS: createSupplementalSensorFailure('radio_altimeter_bias', 'Radio Altimeter Bias', 'RAD ALT'),
    MARKER_BEACON_FAIL: createSupplementalSensorFailure('marker_beacon_fail', 'Marker Beacon Failure', 'MKR BCN'),
    GLIDESLOPE_FLAG: createSupplementalSensorFailure('glideslope_flag', 'Glideslope Flag', 'GS FLAG'),
    LOCALIZER_FLAG: createSupplementalSensorFailure('localizer_flag', 'Localizer Flag', 'LOC FLAG'),
    WEATHER_RADAR_FAIL: createSupplementalSensorFailure('weather_radar_fail', 'Weather Radar Failure', 'WXR FAIL'),
    TCAS_FAIL: createSupplementalSensorFailure('tcas_fail', 'TCAS Failure', 'TCAS FAIL'),
    TRANSPONDER_FAIL: createSupplementalSensorFailure('transponder_fail', 'Transponder Failure', 'XPDR FAIL'),
    STANDBY_AIRSPEED_FAIL: createSupplementalSensorFailure('standby_airspeed_fail', 'Standby Airspeed Failure', 'STBY IAS'),
    ATTITUDE_INDICATOR_FAIL: createSupplementalSensorFailure('attitude_indicator_fail', 'Attitude Indicator Failure', 'ATT FAIL')
};

export default {
    ...SensorFailures,
    ...SupplementalSensorFailures
};
