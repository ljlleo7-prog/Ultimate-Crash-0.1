
/**
 * Failure Logic Rules
 * 
 * Defines comprehensive rules for mapping failure modes to physical effects and cascade logic.
 * Priorities:
 * 1. Manual Definitions (Exact match)
 * 2. Logic Rules (Pattern match on System + Component + Mode)
 * 3. Default Fallback
 */

const LOGIC_RULES = [
    // ==================================================================================
    // HYDRAULIC SYSTEM
    // ==================================================================================
    {
        system: 'HYDRAULIC',
        match: (c, m) => (m.includes('LEAK') || m.includes('RUPTURE') || m.includes('LOSS') || m.includes('LOW_PRESSURE')),
        effects: [
            {
                type: 'SYSTEM_STATE',
                parameters: { 
                    pressure_decay_rate: () => 40.0 + Math.random() * 20.0, // 40-60 PSI/s
                    fluid_loss_rate: () => 0.8 + Math.random() * 0.4 // 0.8-1.2 units/s
                },
                simulation_logic: 'hydraulic_fluid_loss'
            }
        ],
        edges: [
            { target_system: 'FLIGHT_CONTROLS', target_component_type: 'ACTUATOR', failure_mode: 'LOSS_OF_POWER', probability: 1.0, time_delay: 10.0 },
            { target_system: 'LANDING_GEAR', target_component_type: 'ACTUATOR', failure_mode: 'LOSS_OF_POWER', probability: 1.0, time_delay: 15.0 },
            { target_system: 'LANDING_GEAR', target_component_type: 'BRAKE', failure_mode: 'LOSS_OF_PRESSURE', probability: 1.0, time_delay: 12.0 }
        ]
    },
    {
        system: 'HYDRAULIC',
        match: (c, m) => (c.includes('PUMP') && (m.includes('FAIL') || m.includes('LOSS') || m.includes('OVERHEAT') || m.includes('FUNCTIONAL_LOSS'))),
        effects: [{ type: 'SYSTEM_STATE', parameters: { pressure: 0, flow_rate: 0 }, simulation_logic: 'hydraulic_pressure_loss' }]
    },
    {
        system: 'HYDRAULIC',
        match: (c, m) => (c.includes('ACTUATOR') || c.includes('VALVE')) && (m.includes('JAM') || m.includes('STUCK')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { control_surface_effectiveness: 0.0 }, simulation_logic: 'actuator_jam' }]
    },
    // Catch-all for Hydraulic
    {
        system: 'HYDRAULIC',
        match: (c, m) => true, // Fallback for any hydraulic failure
        effects: [{ type: 'SYSTEM_STATE', parameters: { efficiency: () => 0.3 + Math.random() * 0.4, status: 'DEGRADED' }, simulation_logic: 'hydraulic_degradation' }]
    },

    // ==================================================================================
    // ELECTRICAL SYSTEM
    // ==================================================================================
    {
        system: 'ELECTRICAL',
        match: (c, m) => (c.includes('GENERATOR') || c.includes('ALTERNATOR')) && (m.includes('FAIL') || m.includes('OFFLINE') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { voltage: 0, source_id: 'gen_main' }, simulation_logic: 'electrical_source_loss' }],
        edges: [
            { target_system: 'AVIONICS', target_component_type: 'BUS', failure_mode: 'LOSS_OF_INPUT', probability: 1.0 },
            { target_system: 'HYDRAULIC', target_component_type: 'PUMP', failure_mode: 'LOSS_OF_POWER', probability: 0.8 }
        ]
    },
    {
        system: 'ELECTRICAL',
        match: (c, m) => c.includes('BATTERY') && (m.includes('DRAIN') || m.includes('FAIL') || m.includes('OVERHEAT') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { voltage: 0, capacity: 0 }, simulation_logic: 'battery_depletion' }]
    },
    {
        system: 'ELECTRICAL',
        match: (c, m) => (c.includes('BUS') || c.includes('CIRCUIT_BREAKER')) && (m.includes('FAIL') || m.includes('OPEN') || m.includes('SHORT') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { voltage: 0, bus_status: 'isolated' }, simulation_logic: 'bus_failure' }],
        edges: [
            { target_system: 'AVIONICS', target_component_type: 'DISPLAY', failure_mode: 'BLANK', probability: 1.0 },
            { target_system: 'AVIONICS', target_component_type: 'COMPUTER', failure_mode: 'OFFLINE', probability: 1.0 }
        ]
    },
    // Catch-all for Electrical
    {
        system: 'ELECTRICAL',
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { power_available: false, status: 'FAULT' }, simulation_logic: 'electrical_fault' }]
    },

    // ==================================================================================
    // PROPULSION / PROPELLER / ENGINE
    // ==================================================================================
    {
        system: 'PROPULSION',
        match: (c, m) => (c.includes('ENGINE') || c.includes('TURBINE')) && (m.includes('FLAMEOUT') || m.includes('STOP') || m.includes('FAIL') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { thrust: 0, egt_rate: () => -4.0 - Math.random() * 2.0, n1_decel: () => -1.5 - Math.random() * 1.0 }, simulation_logic: 'engine_shutdown' }],
        edges: [
            { target_system: 'ELECTRICAL', target_component_type: 'GENERATOR', failure_mode: 'OFFLINE', probability: 1.0 },
            { target_system: 'HYDRAULIC', target_component_type: 'PUMP', failure_mode: 'LOSS_OF_INPUT', probability: 1.0 },
            { target_system: 'PNEUMATIC', target_component_type: 'BLEED', failure_mode: 'LOSS_OF_PRESSURE', probability: 1.0 }
        ]
    },
    {
        system: 'PROPULSION',
        match: (c, m) => (c.includes('ENGINE') || c.includes('FUEL')) && m.includes('FIRE'),
        effects: [
            { type: 'PHYSICS_MOD', parameters: { temp_zone_increase: () => 400 + Math.random() * 300, structural_integrity_decay: () => 0.05 + Math.random() * 0.1 }, simulation_logic: 'fire_propagation' },
            { type: 'COCKPIT_INDICATION', parameters: { warning_light: 'FIRE', audio: 'ALARM' }, simulation_logic: 'cockpit_warnings' }
        ]
    },
    {
        system: 'PROPELLER',
        match: (c, m) => (c.includes('GOVERNOR') || c.includes('PITCH')) && (m.includes('FAIL') || m.includes('STUCK') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { prop_rpm_locked: true, thrust_efficiency: 0.5 }, simulation_logic: 'prop_governor_fail' }]
    },
    {
        system: 'PROPELLER',
        match: (c, m) => c.includes('PROPELLER') && (m.includes('IMBALANCE') || m.includes('VIBRATION')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { vibration_level: 0.8, structural_stress: 0.2 }, simulation_logic: 'severe_vibration' }]
    },
    // Catch-all for Propulsion
    {
        system: 'PROPULSION',
        match: (c, m) => true,
        effects: [{ type: 'PHYSICS_MOD', parameters: { thrust_efficiency: 0.8, status: 'DEGRADED' }, simulation_logic: 'propulsion_degradation' }]
    },
    {
        system: 'PROPELLER',
        match: (c, m) => true,
        effects: [{ type: 'PHYSICS_MOD', parameters: { prop_efficiency: 0.8, status: 'DEGRADED' }, simulation_logic: 'propeller_degradation' }]
    },

    // ==================================================================================
    // FLIGHT CONTROLS
    // ==================================================================================
    {
        system: 'FLIGHT_CONTROLS',
        match: (c, m) => (c.includes('AILERON') || c.includes('ELEVATOR') || c.includes('RUDDER')) && (m.includes('JAM') || m.includes('STUCK')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { surface_deflection_locked: true }, simulation_logic: 'surface_jam' }]
    },
    {
        system: 'FLIGHT_CONTROLS',
        match: (c, m) => c.includes('FLAP') && (m.includes('ASYMMETRY') || m.includes('SPLIT')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { lift_asymmetry: () => 0.2 + Math.random() * 0.4, roll_moment: () => 0.1 + Math.random() * 0.2, drag_increase: () => 0.15 + Math.random() * 0.25 }, simulation_logic: 'flap_asymmetry' }]
    },
    {
        system: 'FLIGHT_CONTROLS',
        match: (c, m) => (c.includes('ACTUATOR') || c.includes('SERVO')) && (m.includes('LOSS') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { control_authority: 0.0, surface_float: true }, simulation_logic: 'actuator_loss' }]
    },
    {
        system: 'FLIGHT_CONTROLS',
        match: (c, m) => (c.includes('COMPUTER') || c.includes('FCC')) && (m.includes('FAIL') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { control_mode: 'DIRECT', protection_lost: true }, simulation_logic: 'fcc_failure' }]
    },
    // Catch-all for Flight Controls
    {
        system: 'FLIGHT_CONTROLS',
        match: (c, m) => true,
        effects: [{ type: 'PHYSICS_MOD', parameters: { control_sensitivity: 0.5, status: 'SLUGGISH' }, simulation_logic: 'control_degradation' }]
    },

    // ==================================================================================
    // LANDING GEAR
    // ==================================================================================
    {
        system: 'LANDING_GEAR',
        match: (c, m) => (c.includes('GEAR') || c.includes('RETRACT')) && (m.includes('STUCK') || m.includes('FAIL') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { drag_coefficient: 0.05, gear_unsafe: true }, simulation_logic: 'gear_failure' }]
    },
    {
        system: 'LANDING_GEAR',
        match: (c, m) => (c.includes('BRAKE') || c.includes('ANTI-SKID')) && (m.includes('FAIL') || m.includes('LOSS') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { braking_efficiency: 0.1, stopping_distance_factor: 3.0 }, simulation_logic: 'brake_failure' }]
    },
    {
        system: 'LANDING_GEAR',
        match: (c, m) => (c.includes('TIRE') || c.includes('WHEEL')) && (m.includes('BURST') || m.includes('FLAT')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { friction_coeff: 0.8, vibration: 0.4 }, simulation_logic: 'tire_burst' }]
    },
    // Catch-all for Landing Gear
    {
        system: 'LANDING_GEAR',
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { gear_warning: true }, simulation_logic: 'gear_anomaly' }]
    },

    // ==================================================================================
    // AVIONICS / INSTRUMENTS
    // ==================================================================================
    {
        system: 'AVIONICS',
        match: (c, m) => (c.includes('AIR_DATA') || c.includes('ADC') || c.includes('PITOT') || c.includes('STATIC')) && (m.includes('FAIL') || m.includes('BLOCK') || m.includes('FUNCTIONAL_LOSS')),
        effects: [
            { type: 'SYSTEM_STATE', parameters: { airspeed_valid: false, altitude_valid: false }, simulation_logic: 'air_data_invalid' },
            { type: 'COCKPIT_INDICATION', parameters: { warning_flag: 'SPD/ALT', audio: 'CAUTION' }, simulation_logic: 'cockpit_warnings' }
        ],
        edges: [{ target_system: 'FLIGHT_CONTROLS', target_component_type: 'COMPUTER', failure_mode: 'DEGRADED_MODE', probability: 1.0 }]
    },
    {
        system: 'AVIONICS',
        match: (c, m) => (c.includes('IRS') || c.includes('INERTIAL') || c.includes('AHRS')) && (m.includes('FAIL') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { attitude_valid: false, heading_valid: false }, simulation_logic: 'attitude_data_invalid' }]
    },
    {
        system: 'AVIONICS',
        match: (c, m) => (c.includes('DISPLAY') || c.includes('PFD') || c.includes('MFD') || c.includes('SCREEN')) && (m.includes('BLANK') || m.includes('FAIL') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'COCKPIT_INDICATION', parameters: { screen_state: 'BLACK' }, simulation_logic: 'display_loss' }]
    },
    {
        system: 'AVIONICS',
        match: (c, m) => (c.includes('RADIO') || c.includes('COMM') || c.includes('TRANSCEIVER')) && (m.includes('FAIL') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { comms_available: false }, simulation_logic: 'comms_loss' }]
    },
    {
        system: 'AVIONICS',
        match: (c, m) => (c.includes('NAV') || c.includes('GPS') || c.includes('VOR') || c.includes('ILS')) && (m.includes('FAIL') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { nav_accuracy: 0.0, signal_valid: false }, simulation_logic: 'nav_loss' }]
    },
    // Catch-all for Avionics
    {
        system: 'AVIONICS',
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { status: 'FAULT', data_integrity: 'SUSPECT' }, simulation_logic: 'avionics_fault' }]
    },

    // ==================================================================================
    // PNEUMATIC / ENVIRONMENTAL
    // ==================================================================================
    {
        system: 'PNEUMATIC',
        match: (c, m) => (m.includes('LEAK') || m.includes('RUPTURE') || m.includes('LOSS') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { pneumatic_pressure: 0 }, simulation_logic: 'pneumatic_loss' }],
        edges: [
            { target_system: 'AIR_CONDITIONING', target_component_type: 'PACK', failure_mode: 'FAIL', probability: 1.0 },
            { target_system: 'ICE_PROTECTION', target_component_type: 'WING_ANTI_ICE', failure_mode: 'FAIL', probability: 1.0 }
        ]
    },
    {
        system: 'PNEUMATIC',
        match: (c, m) => (c.includes('BLEED') || c.includes('VALVE')) && (m.includes('FAIL') || m.includes('CLOSE')),
        effects: [{ type: 'SYSTEM_STATE', parameters: { bleed_supply: 0 }, simulation_logic: 'bleed_failure' }]
    },
    // Catch-all for Pneumatic
    {
        system: 'PNEUMATIC',
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { pressure_output: 0.5, status: 'LOW' }, simulation_logic: 'pneumatic_degradation' }]
    },

    // ==================================================================================
    // AIRFRAME / STRUCTURE
    // ==================================================================================
    {
        system: 'AIRFRAME',
        match: (c, m) => (c.includes('WING') || c.includes('STABILIZER')) && (m.includes('DAMAGE') || m.includes('STRUCTURAL') || m.includes('FUNCTIONAL_LOSS')),
        effects: [{ type: 'PHYSICS_MOD', parameters: { lift_efficiency: 0.8, drag_coefficient: 1.2, structural_integrity: 0.7 }, simulation_logic: 'structural_damage' }]
    },
    {
        system: 'AIRFRAME',
        match: (c, m) => (c.includes('FUSELAGE') || c.includes('SKIN')) && (m.includes('HOLE') || m.includes('RUPTURE') || m.includes('DECOMPRESSION')),
        effects: [
            { type: 'PHYSICS_MOD', parameters: { cabin_pressure_rate: -5000.0, drag_coefficient: 1.05 }, simulation_logic: 'decompression' },
            { type: 'COCKPIT_INDICATION', parameters: { warning_light: 'CABIN ALT', audio: 'ALARM' }, simulation_logic: 'cockpit_warnings' }
        ]
    },
    // Catch-all for Airframe
    {
        system: 'AIRFRAME',
        match: (c, m) => true,
        effects: [{ type: 'PHYSICS_MOD', parameters: { drag_coefficient: 1.01, structural_health: 0.95 }, simulation_logic: 'minor_structural_damage' }]
    },

    // ==================================================================================
    // FUEL SYSTEM
    // ==================================================================================
    {
        system: 'FUEL',
        match: (c, m) => m.includes('LEAK') || m.includes('RUPTURE') || m.includes('LOSS'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { fuel_flow: 0, fuel_quantity_rate: () => -0.5 - Math.random() * 1.5 }, simulation_logic: 'fuel_leak' }],
        edges: [
            { target_system: 'PROPULSION', target_component_type: 'ENGINE', failure_mode: 'FLAMEOUT', probability: 0.8, time_delay: 60.0 }
        ]
    },
    {
        system: 'FUEL',
        match: (c, m) => m.includes('CLOG') || m.includes('BLOCK') || m.includes('RESTRICT') || m.includes('CONTAMINAT'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { fuel_flow_efficiency: () => 0.3 + Math.random() * 0.4, engine_sputter: true }, simulation_logic: 'fuel_clog' }],
        edges: [
            { target_system: 'PROPULSION', target_component_type: 'ENGINE', failure_mode: 'POWER_LOSS', probability: 0.5, time_delay: 30.0 }
        ]
    },
    {
        system: 'FUEL',
        match: (c, m) => (c.includes('PUMP') && (m.includes('FAIL') || m.includes('LOSS') || m.includes('FUNCTIONAL_LOSS'))),
        effects: [{ type: 'SYSTEM_STATE', parameters: { fuel_pressure: 0 }, simulation_logic: 'fuel_pump_fail' }],
        edges: [
            { target_system: 'PROPULSION', target_component_type: 'ENGINE', failure_mode: 'FLAMEOUT', probability: 0.9, time_delay: 10.0 }
        ]
    },
    // Catch-all for Fuel
    {
        system: 'FUEL',
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { fuel_system_status: 'DEGRADED' }, simulation_logic: 'fuel_system_fault' }]
    },

    // ==================================================================================
    // FIRE PROTECTION
    // ==================================================================================
    {
        system: 'FIRE_PROTECTION',
        match: (c, m) => m.includes('DISCHARGE') || m.includes('DEPLETED') || m.includes('EMPTY'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { fire_suppression_available: false }, simulation_logic: 'fire_bottle_empty' }],
        edges: [
            { target_system: 'PROPULSION', target_component_type: 'ENGINE', failure_mode: 'UNCONTAINED_FIRE', probability: 0.2, condition: { var: 'fire_active', val: true } }
        ]
    },
    {
        system: 'FIRE_PROTECTION',
        match: (c, m) => m.includes('FAIL') || m.includes('FAULT'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { fire_detection_active: false }, simulation_logic: 'fire_detection_fail' }]
    },

    // ==================================================================================
    // ROTARY WING / HELICOPTER
    // ==================================================================================
    {
        system: 'ROTARY_WING',
        match: (c, m) => m.includes('SEIZED') || m.includes('JAM'),
        effects: [{ type: 'PHYSICS_MOD', parameters: { rotor_rpm: 0, catastrophic_lift_loss: true }, simulation_logic: 'rotor_seizure' }]
    },
    {
        system: 'ROTARY_WING',
        match: (c, m) => true,
        effects: [{ type: 'PHYSICS_MOD', parameters: { rotor_efficiency: 0.8 }, simulation_logic: 'rotor_degradation' }]
    },

    // ==================================================================================
    // LUBRICATION
    // ==================================================================================
    {
        system: 'LUBRICATION',
        match: (c, m) => true,
        effects: [{ type: 'PHYSICS_MOD', parameters: { friction_increase: 0.2, temperature_rate: 5.0 }, simulation_logic: 'lubrication_failure' }]
    },

    // ==================================================================================
    // STRUCTURAL / AIRFRAME EXPANSION
    // ==================================================================================
    {
        system: 'ALL', // Apply to any system with structural keywords
        match: (c, m) => m.includes('FATIGUE') || m.includes('CRACK') || m.includes('CORROSION') || m.includes('POROSITY') || m.includes('DELAMINATION') || m.includes('BUCKLING') || m.includes('GRAIN') || m.includes('INCLUSION'),
        effects: [{ type: 'PHYSICS_MOD', parameters: { structural_integrity_decay: 0.05, stress_limit_reduction: 0.2 }, simulation_logic: 'structural_fatigue' }]
    },
    {
        system: 'ALL',
        match: (c, m) => m.includes('SEIZED') || m.includes('BINDING'),
        effects: [{ type: 'PHYSICS_MOD', parameters: { movement_restricted: true, frozen: true }, simulation_logic: 'generic_mechanical_seizure' }]
    },
    {
        system: 'ALL',
        match: (c, m) => m.includes('DEPLETED') || m.includes('EMPTY') || m.includes('EXHAUSTED'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { resource_level: 0 }, simulation_logic: 'resource_depletion' }]
    },
    {
        system: 'ALL',
        match: (c, m) => m.includes('INACCURATE') || m.includes('ERRONEOUS') || m.includes('INVALID') || m.includes('CALIBRATION'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { data_validity: 0.5, error_magnitude: 0.2 }, simulation_logic: 'sensor_error' }]
    },
    {
        system: 'ALL',
        match: (c, m) => m.includes('BEND') || m.includes('DEFORM') || m.includes('WARP'),
        effects: [{ type: 'PHYSICS_MOD', parameters: { aerodynamic_efficiency: 0.9, mechanical_resistance: 0.1 }, simulation_logic: 'structural_deformation' }]
    },
    {
        system: 'ALL',
        match: (c, m) => m.includes('LOOSE') || m.includes('DETACH') || m.includes('SEPARATION'),
        effects: [{ type: 'PHYSICS_MOD', parameters: { vibration_level: 0.5, component_integrity: 0.5 }, simulation_logic: 'mechanical_separation' }]
    },

    // ==================================================================================
    // OXYGEN SYSTEM
    // ==================================================================================
    {
        system: 'OXYGEN',
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { oxygen_level: 0, hypoxia_risk: true }, simulation_logic: 'oxygen_failure' }],
        edges: [
            { target_system: 'PHYSIOLOGICAL_SAFETY', target_component_type: 'CREW', failure_mode: 'INCAPACITATION', probability: 1.0, time_delay: 120.0 }
        ]
    },

    // ==================================================================================
    // PHYSIOLOGICAL / SAFETY
    // ==================================================================================
    {
        system: 'PHYSIOLOGICAL_SAFETY',
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { safety_equipment_status: 'COMPROMISED' }, simulation_logic: 'safety_equipment_fail' }]
    },

    // ==================================================================================
    // TYPO HANDLING & MISC
    // ==================================================================================
    {
        system: 'LNDG_GEAR', // Handle typo
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { gear_warning: true }, simulation_logic: 'gear_anomaly' }]
    },
    {
        system: 'PROPELLSION', // Handle typo
        match: (c, m) => true,
        effects: [{ type: 'PHYSICS_MOD', parameters: { thrust_efficiency: 0.8 }, simulation_logic: 'propulsion_degradation' }]
    },
    {
        system: 'GAS_WELDING', // Likely maintenance tool, but if in graph, give it an effect
        match: (c, m) => true,
        effects: [{ type: 'SYSTEM_STATE', parameters: { maintenance_error: true }, simulation_logic: 'maintenance_incident' }]
    },

    // ==================================================================================
    // GENERIC FALLBACKS (Last Resort)
    // ==================================================================================
    {
        system: 'ALL',
        match: (c, m) => m.includes('OVERHEAT'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { temperature: 200, status: 'OVERHEAT' }, simulation_logic: 'generic_overheat' }]
    },
    {
        system: 'ALL',
        match: (c, m) => m.includes('LEAK'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { quantity_rate: -1.0 }, simulation_logic: 'generic_leak' }]
    },
    {
        system: 'ALL',
        match: (c, m) => m.includes('SHORT') || m.includes('ARC'),
        effects: [{ type: 'SYSTEM_STATE', parameters: { electrical_fault: true }, simulation_logic: 'generic_short' }]
    },
    {
        system: 'ALL',
        match: (c, m) => m.includes('JAM') || m.includes('STUCK'),
        effects: [{ type: 'PHYSICS_MOD', parameters: { movement_restricted: true }, simulation_logic: 'generic_mechanical_jam' }]
    },
    {
        system: 'ALL',
        match: (c, m) => true, // Ultimate fallback for any system not matched above
        effects: [{ type: 'SYSTEM_STATE', parameters: { status: 'DEGRADED' }, simulation_logic: 'generic_degradation' }]
    }
];

/**
 * applyLogicRules
 * 
 * Applies generalized logic rules to a specific component failure.
 * 
 * @param {string} system 
 * @param {string} component 
 * @param {string} failureMode 
 * @returns {object} { effects: [], edges: [] }
 */
function applyLogicRules(system, component, failureMode) {
    const s = system ? system.toUpperCase() : '';
    const c = component ? component.toUpperCase() : '';
    const f = failureMode ? failureMode.toUpperCase() : '';

    let results = {
        effects: [],
        edges: []
    };

    for (const rule of LOGIC_RULES) {
        // Check System Match
        if (rule.system && rule.system !== 'ALL' && !s.includes(rule.system)) continue;

        // Check Logic Match
        if (rule.match(c, f)) {
            if (rule.effects) results.effects.push(...rule.effects);
            if (rule.edges) results.edges.push(...rule.edges);
            
            // Optimization: If we find a system-specific match, we can stop?
            // Or do we allow multiple rules to stack? Stacking is better for coverage.
            // But generic rules should be lower priority?
            // The current loop applies ALL matches. The order in the array matters if we want to prioritize specific over generic.
            // But we just append all effects. That's fine.
        }
    }

    return results;
}

export {
    applyLogicRules
};
