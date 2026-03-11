
import fs from 'fs';

// Valid parameter keys (inferred from common usage)
const KNOWN_PARAMS = new Set([
    'pressure', 'flow_rate', 'pressure_decay_rate', 'fluid_loss_rate', 'efficiency',
    'voltage', 'source_id', 'capacity', 'bus_status', 'power_available',
    'thrust', 'thrust_efficiency', 'fuel_flow', 'fuel_flow_efficiency', 'fuel_quantity_rate',
    'egt_rate', 'n1_decel', 'n1_decel_rate', 'vibration_level',
    'temp_zone_increase', 'structural_integrity_decay', 'structural_health', 'stress_limit_reduction',
    'control_surface_effectiveness', 'control_sensitivity', 'movement_restricted',
    'drag_coefficient', 'lift_efficiency', 'aerodynamic_efficiency', 'braking_efficiency', 'friction_coeff', 'friction_increase',
    'quantity_rate', 'reservoir_quantity_rate',
    'oxygen_level', 'hypoxia_risk', 'data_integrity',
    'temperature', 'temperature_rate', 'pressure_output', 'pneumatic_pressure',
    'gear_warning', 'gear_unsafe',
    'prop_efficiency', 'rotor_efficiency',
    'fuel_system_status', 'component_integrity', 'mechanical_resistance',
    'maintenance_error', 'fire_detection_active',
    'nav_accuracy', 'signal_valid', 'data_validity', 'error_magnitude',
    'comms_available', 'engine_sputter', 'electrical_fault',
    'control_authority', 'surface_float',
    'safety_equipment_status', 'resource_level',
    'structural_integrity', 'structural_stress',
    'surface_deflection_locked', 'rotor_rpm', 'catastrophic_lift_loss',
    'attitude_valid', 'heading_valid', 'fire_suppression_available',
    'frozen', 'control_mode', 'protection_lost', 'stopping_distance_factor',
    'fuel_pressure',
    'status', 'warning_light', 'audio',
    'roll_authority_limit', 'pitch_authority'
]);

function runTest() {
    console.log("Starting Physics Compatibility Test...");

    const effects = JSON.parse(fs.readFileSync('scripts/skylinetragedy_effects.json'));
    const failures = JSON.parse(fs.readFileSync('scripts/skylinetragedy_failures.json'));
    
    const failureMap = new Map(failures.map(f => [f.failure_code, f]));
    
    let totalChecked = 0;
    let errors = [];
    let warnings = [];
    let unknownParams = new Map();
    let randomizedCount = 0;

    effects.forEach(eff => {
        totalChecked++;
        const node = failureMap.get(eff.failure_code);
        
        // 1. Check for Unknown Parameters
        if (eff.parameters) {
            Object.keys(eff.parameters).forEach(p => {
                if (!KNOWN_PARAMS.has(p)) {
                    warnings.push(`[UNKNOWN_PARAM] ${eff.failure_code}: '${p}' not in KNOWN_PARAMS list`);
                    unknownParams.set(p, (unknownParams.get(p) || 0) + 1);
                }
                
                // Check if value is a number (randomized values should be evaluated to numbers)
                const val = eff.parameters[p];
                if (typeof val === 'number') {
                    // Check if it's "suspiciously" integer-like for things that should be randomized?
                    // Hard to tell without knowing the rule.
                }
            });
        }

        // 2. Check for Randomized Effects (visual check)
        // Since we evaluate them in process_failure_graph.js, we just see the result here.
        // Let's check a few known randomized ones (Hydraulic Leak)
        if (node && node.system === 'HYDRAULIC' && node.failure_mode.includes('LEAK')) {
            if (eff.parameters.pressure_decay_rate !== 50.0) {
                randomizedCount++;
            }
        }
    });

    // 3. Conflict Check: Look for nodes with multiple effects of same type/logic
    const nodeEffectCount = {};
    effects.forEach(eff => {
        const key = `${eff.failure_code}|${eff.effect_type}|${eff.simulation_logic}`;
        nodeEffectCount[key] = (nodeEffectCount[key] || 0) + 1;
        if (nodeEffectCount[key] > 1) {
            errors.push(`[CONFLICT] ${eff.failure_code} has duplicate effect ${eff.effect_type}/${eff.simulation_logic}`);
        }
    });

    console.log(`\nResults:`);
    console.log(`Total Effects Checked: ${totalChecked}`);
    console.log(`Randomized Values Detected: ${randomizedCount} (sample check)`);
    console.log(`Errors (Conflicts): ${errors.length}`);
    console.log(`Warnings (Unknown Params): ${warnings.length}`);

    if (unknownParams.size > 0) {
        console.log("\nMost Common Unknown Parameters:");
        const sortedParams = Array.from(unknownParams.entries()).sort((a, b) => b[1] - a[1]);
        sortedParams.slice(0, 20).forEach(([p, count]) => console.log(`  ${p}: ${count}`));
    }

    if (errors.length > 0) {
        console.log("\nConflict Details (First 5):");
        errors.slice(0, 5).forEach(e => console.log(e));
    }

    if (warnings.length > 0) {
        console.log("\nWarning Details (First 5):");
        warnings.slice(0, 5).forEach(w => console.log(w));
    }

    if (errors.length === 0) {
        console.log("\nPASSED: No conflicting effects found.");
    } else {
        console.log("\nFAILED: Conflicts detected.");
        process.exit(1);
    }
}

runTest();
