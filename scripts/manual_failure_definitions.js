/**
 * Manual Failure Definitions
 * 
 * This file contains hardcoded failure logic for critical aircraft systems where 
 * automated extraction might be insufficient or inaccurate.
 * 
 * It maps specific failure modes to:
 * 1. Precise simulation effects (physics parameters)
 * 2. Deterministic cascade edges (logical consequences)
 */

const MANUAL_DEFINITIONS = {
    // HYDRAULIC SYSTEM
    'HYDRAULIC_PUMP_FAILURE': {
        effects: [
            {
                type: 'SYSTEM_STATE',
                parameters: { pressure: 0, flow_rate: 0 },
                simulation_logic: 'hydraulic_pressure_loss'
            }
        ],
        edges: [
            // Loss of pump leads to loss of system pressure, which affects actuators
            {
                target_system: 'FLIGHT_CONTROLS',
                target_component_type: 'ACTUATOR',
                failure_mode: 'LOSS_OF_POWER',
                probability: 1.0,
                time_delay: 2.0 // Pressure bleed-off time
            }
        ]
    },
    'HYDRAULIC_LEAK': {
        effects: [
            {
                type: 'SYSTEM_STATE',
                parameters: { reservoir_quantity_rate: -0.5 }, // 0.5 units per second
                simulation_logic: 'hydraulic_fluid_loss'
            }
        ]
    },

    // PROPULSION SYSTEM
    'ENGINE_FLAMEOUT': {
        effects: [
            {
                type: 'PHYSICS_MOD',
                parameters: { thrust: 0, egt_rate: -5.0, n1_decel_rate: -1.0 },
                simulation_logic: 'engine_shutdown'
            }
        ],
        edges: [
            {
                target_system: 'ELECTRICAL',
                target_component: 'GENERATOR', // Generic target, will match specific generators
                failure_mode: 'OFFLINE',
                probability: 1.0,
                time_delay: 0.5
            },
            {
                target_system: 'HYDRAULIC',
                target_component: 'ENGINE_DRIVEN_PUMP',
                failure_mode: 'LOSS_OF_INPUT',
                probability: 1.0,
                time_delay: 0.5
            }
        ]
    },
    'ENGINE_FIRE': {
        effects: [
            {
                type: 'PHYSICS_MOD',
                parameters: { temp_zone_increase: 500 },
                simulation_logic: 'fire_propagation'
            },
            {
                type: 'COCKPIT_INDICATION',
                parameters: { warning_light: 'FIRE_HANDLE', audio: 'FIRE_BELL' },
                simulation_logic: 'cockpit_warnings'
            }
        ]
    },

    // ELECTRICAL SYSTEM
    'GENERATOR_FAILURE': {
        effects: [
            {
                type: 'SYSTEM_STATE',
                parameters: { voltage: 0, load: 0 },
                simulation_logic: 'electrical_source_loss'
            }
        ],
        edges: [
            {
                target_system: 'AVIONICS',
                target_component_type: 'DISPLAY',
                failure_mode: 'BLANK',
                probability: 1.0,
                condition: { var: 'battery_backup', op: '==', val: false }
            }
        ]
    },

    // FLIGHT CONTROLS
    'AILERON_JAM': {
        effects: [
            {
                type: 'PHYSICS_MOD',
                parameters: { roll_authority_limit: 0.1 }, // Restricted movement
                simulation_logic: 'surface_jam'
            }
        ]
    },
    'ELEVATOR_LOSS': {
        effects: [
            {
                type: 'PHYSICS_MOD',
                parameters: { pitch_authority: 0 },
                simulation_logic: 'surface_loss'
            }
        ]
    }
};

/**
 * matchesManualDefinition
 * 
 * Checks if a given component/failure mode matches a hardcoded definition.
 * 
 * @param {string} system 
 * @param {string} component 
 * @param {string} failureMode 
 * @returns {object|null} The manual definition or null
 */
function getManualDefinition(system, component, failureMode) {
    // Normalize inputs
    const s = system ? system.toUpperCase() : '';
    const c = component ? component.toUpperCase() : '';
    const f = failureMode ? failureMode.toUpperCase() : '';

    // Direct Key Match (e.g., 'ENGINE_FLAMEOUT')
    // We try to construct keys from the input to see if they match our manual definitions
    
    // 1. Try Component + Failure Mode (e.g. HYDRAULIC_PUMP + FAILURE)
    // This is fuzzy. Let's iterate through definitions and check for keyword inclusion.
    
    for (const [key, def] of Object.entries(MANUAL_DEFINITIONS)) {
        const parts = key.split('_');
        
        // Simple heuristic: If the key words appear in the component or failure mode
        // e.g. "HYDRAULIC_PUMP_FAILURE" -> looks for "HYDRAULIC" & "PUMP" in component, "FAILURE" in mode
        
        let match = true;
        for (const part of parts) {
            if (!c.includes(part) && !f.includes(part) && !s.includes(part)) {
                match = false;
                break;
            }
        }
        
        if (match) return def;
    }

    return null;
}

export {
    getManualDefinition
};
