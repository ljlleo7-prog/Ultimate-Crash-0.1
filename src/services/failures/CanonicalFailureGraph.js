import EngineFailures from './types/EngineFailures.js';
import SystemFailures from './types/SystemFailures.js';
import ControlFailures from './types/ControlFailures.js';
import EnvironmentFailures from './types/EnvironmentFailures.js';
import SensorFailures from './types/SensorFailures.js';
import { hydrateFailureGraphArtifact } from './FailureGraphArtifact.js';

const FAILURE_GROUPS = [
    EngineFailures,
    SystemFailures,
    ControlFailures,
    EnvironmentFailures,
    SensorFailures
];

export const CANONICAL_FAILURE_STAGES = [
    'inactive',
    'incipient',
    'degraded',
    'active',
    'critical',
    'stabilized',
    'irreversible',
    'recovered'
];

const normalizeFailureCode = (value) => {
    if (!value) return '';
    return String(value)
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_')
        .toUpperCase();
};

const createNodeFromDefinition = (definition) => {
    const runtimeId = definition.id;
    const canonicalCode = normalizeFailureCode(runtimeId);
    const stages = Object.entries(definition.stages || {}).map(([stageName, stage]) => ({
        id: stageName,
        next: stage.next || null,
        duration: typeof stage.duration === 'number' ? stage.duration : null,
        intensityTarget: stage.intensityTarget ?? null,
        intensityRate: stage.intensityRate ?? null,
        hasDynamicDuration: typeof stage.duration === 'function',
        hasEffect: typeof stage.effect === 'function'
    }));

    return {
        runtimeId,
        canonicalCode,
        legacyIds: [runtimeId, canonicalCode],
        name: definition.name,
        subsystem: definition.category || 'systems',
        aircraftApplicability: ['*'],
        initiationConditions: [],
        mitigationHooks: [],
        observableSignals: [],
        stages,
        source: 'runtime_definition'
    };
};

const RUNTIME_ALIAS_MAP = {
    ENG_FLAMEOUT: 'engine_failure',
    ENG_FIRE: 'engine_fire',
    COMPRESSOR_STALL: 'compressor_stall',
    THRUST_REVERSER_DEPLOYMENT: 'reverser_deploy',
    HYD_LEAK_TOTAL: 'major_hydraulic_failure',
    HYD_PUMP_FAILURE: 'hydraulic_failure',
    PITOT_BLOCKAGE: 'pitot_blockage',
    PITOT_STATIC_FAILURE: 'pitot_blockage',
    IRS_DRIFT: 'gps_signal_loss',
    CARGO_DOOR_EXPLOSION: 'hull_breach',
    TAIL_STRIKE_DAMAGE: 'hull_breach',
    DUAL_ENGINE_LOSS: 'dual_engine_failure',
    UNCONTAINED_ENGINE_FAILURE: 'uncontained_engine_failure',
    TOTAL_ELECTRICAL_FAILURE: 'electrical_bus_failure',
    RAPID_DECOMPRESSION: 'rapid_depressurization',
    RAPID_DEPRESSURIZATION: 'rapid_depressurization',
    TOTAL_CONTROL_FAILURE: 'total_flight_control_failure',
    GEAR_EXTENSION_FAILURE: 'landing_gear_extension_issue',
    FIRE_ONBOARD: 'electrical_fire',
    AVIONICS_SYSTEM_OVERHEAT: 'avionics_overheat',
    OVERWEIGHT_LANDING: 'landing_gear_extension_issue',
    BRAKE_OVERHEAT: 'brake_failure',
    TIRE_BURST: 'brake_failure',
    GEAR_COLLAPSE: 'landing_gear_extension_issue',
    ENGINE_STALL: 'compressor_stall',
    STRUCTURAL_STRESS: 'hull_breach',
    FUEL_STARVATION: 'fuel_contamination',
    DUAL_ENGINE_FLAMEOUT: 'dual_engine_failure',
    ELECTRICAL_EMERGENCY: 'electrical_bus_failure',
    LOSS_OF_HYDRAULICS: 'hydraulic_failure'
};

const BASE_CANONICAL_EDGES = [
    {
        id: 'ENGINE_FIRE_TO_HYDRAULIC_FAILURE',
        sourceCode: 'ENGINE_FIRE',
        targetCode: 'HYDRAULIC_FAILURE',
        propagationType: 'PHYSICS',
        probability: 0.005,
        delaySeconds: 0,
        sourceStage: 'active',
        minSourceTimeInStage: 30,
        requiredObservables: [],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'fire_damage', inheritEngineIndex: true }
    },
    {
        id: 'ELECTRICAL_BUS_FAILURE_TO_AVIONICS_OVERHEAT',
        sourceCode: 'ELECTRICAL_BUS_FAILURE',
        targetCode: 'AVIONICS_OVERHEAT',
        propagationType: 'SYSTEM',
        probability: 0.001,
        delaySeconds: 20,
        sourceStage: 'active',
        minSourceTimeInStage: 5,
        requiredObservables: [{ path: 'systems.electrical.dcVolts', operator: '<=', value: 24 }],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'cooling_loss' }
    },
    {
        id: 'CIRCUIT_ARC_TO_ELECTRICAL_FIRE',
        sourceCode: 'CIRCUIT_ARC',
        targetCode: 'ELECTRICAL_FIRE',
        propagationType: 'SYSTEM',
        probability: 0.01,
        delaySeconds: 0,
        sourceStage: 'active',
        minSourceTimeInStage: 15,
        requiredObservables: [],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'arc_damage' }
    },
    {
        id: 'UNCONTAINED_ENGINE_TO_MAJOR_HYDRAULIC',
        sourceCode: 'UNCONTAINED_ENGINE_FAILURE',
        targetCode: 'MAJOR_HYDRAULIC_FAILURE',
        propagationType: 'PHYSICS',
        cascadeClass: 'catastrophic',
        probability: 1,
        delaySeconds: 2,
        sourceStage: 'debris_field',
        minSourceTimeInStage: 1,
        requiredObservables: [],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'debris_damage', inheritEngineIndex: true }
    },
    {
        id: 'ENGINE_FAILURE_TO_ELECTRICAL',
        sourceCode: 'ENGINE_FAILURE',
        targetCode: 'ELECTRICAL_BUS_FAILURE',
        propagationType: 'SYSTEM',
        probability: 0.3,
        delaySeconds: 5,
        sourceStage: 'active',
        minSourceTimeInStage: 0,
        requiredObservables: [],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'generator_loss' }
    },
    {
        id: 'DUAL_ENGINE_TO_TOTAL_ELECTRICAL',
        sourceCode: 'DUAL_ENGINE_FAILURE',
        targetCode: 'ELECTRICAL_BUS_FAILURE',
        propagationType: 'SYSTEM',
        probability: 0.95,
        delaySeconds: 2,
        sourceStage: 'active',
        minSourceTimeInStage: 0,
        requiredObservables: [],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'total_generator_loss' }
    },
    {
        id: 'HYDRAULIC_TO_FLIGHT_CONTROL',
        sourceCode: 'MAJOR_HYDRAULIC_FAILURE',
        targetCode: 'TOTAL_FLIGHT_CONTROL_FAILURE',
        propagationType: 'SYSTEM',
        cascadeClass: 'catastrophic',
        probability: 1,
        delaySeconds: 4,
        sourceStage: 'active',
        minSourceTimeInStage: 2,
        requiredObservables: [
            { path: 'systems.hydraulics.sysA.pressure', operator: '<=', value: 500 }
        ],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'hydraulic_loss' }
    },
    {
        id: 'PITOT_TO_AUTOPILOT_DISCONNECT',
        sourceCode: 'PITOT_BLOCKAGE',
        targetCode: 'AUTOPILOT_DISCONNECT',
        propagationType: 'SYSTEM',
        probability: 0.9,
        delaySeconds: 3,
        sourceStage: 'active',
        minSourceTimeInStage: 0,
        requiredObservables: [],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'unreliable_airspeed' }
    },
    {
        id: 'ELECTRICAL_FIRE_TO_AVIONICS',
        sourceCode: 'ELECTRICAL_FIRE',
        targetCode: 'AVIONICS_OVERHEAT',
        propagationType: 'PHYSICS',
        probability: 0.4,
        delaySeconds: 15,
        sourceStage: 'active',
        minSourceTimeInStage: 10,
        requiredObservables: [],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'fire_damage' }
    },
    {
        id: 'COMPRESSOR_STALL_TO_ENGINE_FIRE',
        sourceCode: 'COMPRESSOR_STALL',
        targetCode: 'ENGINE_FIRE',
        propagationType: 'PHYSICS',
        probability: 0.02,
        delaySeconds: 5,
        sourceStage: 'active',
        minSourceTimeInStage: 20,
        requiredObservables: [],
        inhibitedObservables: [],
        targetContextTemplate: { reason: 'hot_start', inheritEngineIndex: true }
    }
];

const createCanonicalEdge = ([sourceCode, targetCode], index, groupId, options = {}) => ({
    id: `${groupId}_${index + 1}_${sourceCode}_TO_${targetCode}`,
    sourceCode,
    targetCode,
    propagationType: options.propagationType || 'SYSTEM',
    cascadeClass: options.cascadeClass || null,
    probability: options.probability ?? 0.35,
    delaySeconds: options.delaySeconds ?? 6,
    sourceStage: options.sourceStage || 'active',
    minSourceTimeInStage: options.minSourceTimeInStage ?? 0,
    requiredObservables: options.requiredObservables || [],
    inhibitedObservables: options.inhibitedObservables || [],
    targetContextTemplate: options.targetContextTemplate || { reason: groupId.toLowerCase() }
});

const ENGINE_CHAIN_EDGES = [
    ['ENGINE_OIL_LEAK', 'ENGINE_OIL_FILTER_BYPASS'],
    ['ENGINE_OIL_FILTER_BYPASS', 'ENGINE_CORE_OVERHEAT'],
    ['ENGINE_CORE_OVERHEAT', 'ENGINE_FIRE'],
    ['ENGINE_FUEL_NOZZLE_CLOG', 'COMPRESSOR_STALL'],
    ['ENGINE_IGNITION_FAULT', 'ENGINE_STARTER_FAILURE'],
    ['ENGINE_STARTER_FAILURE', 'START_VALVE_OPEN'],
    ['ENGINE_BLEED_LEAK', 'PACK_FAILURE'],
    ['ENGINE_OVERSPEED', 'ENGINE_TURBINE_DAMAGE'],
    ['ENGINE_TURBINE_DAMAGE', 'UNCONTAINED_ENGINE_FAILURE'],
    ['ENGINE_FAN_BLADE_DAMAGE', 'ENGINE_VIBRATION'],
    ['ENGINE_VIBRATION', 'ENGINE_VIBRATION_SENSOR_FAIL'],
    ['ENGINE_FADEC_FAIL', 'ENGINE_THRUST_IMBALANCE'],
    ['ENGINE_THRUST_IMBALANCE', 'RUDDER_HARD_OVER'],
    ['ENGINE_FUEL_METER_FAIL', 'ENGINE_FAILURE'],
    ['REVERSER_DEPLOY', 'ENGINE_THRUST_IMBALANCE'],
    ['DUAL_ENGINE_FAILURE', 'STANDBY_POWER_FAIL'],
    ['ENGINE_FIRE', 'BLEED_LEAK'],
    ['ENGINE_FAILURE', 'BLEED_LEAK']
].map((pair, index) => createCanonicalEdge(pair, index, 'ENGINE_CHAIN', {
    propagationType: 'PHYSICS',
    probability: 0.42,
    delaySeconds: 4,
    targetContextTemplate: { reason: 'engine_secondary', inheritEngineIndex: true }
}));

const ELECTRICAL_CHAIN_EDGES = [
    ['BATTERY_OVERHEAT', 'ELECTRICAL_FIRE'],
    ['ELECTRICAL_FIRE', 'BUS_TIE_STUCK'],
    ['BUS_TIE_STUCK', 'ELECTRICAL_BUS_FAILURE'],
    ['ELECTRICAL_BUS_FAILURE', 'TRANSFORMER_RECTIFIER_FAIL'],
    ['TRANSFORMER_RECTIFIER_FAIL', 'STANDBY_POWER_FAIL'],
    ['STANDBY_POWER_FAIL', 'AVIONICS_OVERHEAT'],
    ['GENERATOR_DRIVE_DISCONNECT', 'ELECTRICAL_BUS_FAILURE'],
    ['CIRCUIT_ARC', 'BUS_TIE_STUCK'],
    ['ELECTRICAL_BUS_FAILURE', 'WEATHER_RADAR_FAIL'],
    ['ELECTRICAL_BUS_FAILURE', 'TCAS_FAIL'],
    ['ELECTRICAL_BUS_FAILURE', 'TRANSPONDER_FAIL'],
    ['ELECTRICAL_BUS_FAILURE', 'MARKER_BEACON_FAIL'],
    ['ELECTRICAL_BUS_FAILURE', 'LOCALIZER_FLAG'],
    ['ELECTRICAL_BUS_FAILURE', 'GLIDESLOPE_FLAG'],
    ['AVIONICS_OVERHEAT', 'AUTOPILOT_DISCONNECT'],
    ['AVIONICS_OVERHEAT', 'ATTITUDE_INDICATOR_FAIL'],
    ['LIGHTNING_STRIKE', 'ELECTRICAL_BUS_FAILURE'],
    ['LIGHTNING_STRIKE', 'RADIO_ALTIMETER_BIAS']
].map((pair, index) => createCanonicalEdge(pair, index, 'ELECTRICAL_CHAIN', {
    probability: 0.48,
    delaySeconds: 5,
    targetContextTemplate: { reason: 'electrical_secondary' }
}));

const HYDRAULIC_CONTROL_EDGES = [
    ['HYDRAULIC_LEAK', 'HYDRAULIC_FAILURE'],
    ['HYDRAULIC_FAILURE', 'BRAKE_ACCUMULATOR_LOW'],
    ['BRAKE_ACCUMULATOR_LOW', 'BRAKE_FAILURE'],
    ['BRAKE_FAILURE', 'NOSEWHEEL_STEERING_FAIL'],
    ['ANTI_SKID_FAIL', 'BRAKE_FAILURE'],
    ['HYDRAULIC_FAILURE', 'SPOILER_FLOAT'],
    ['HYDRAULIC_FAILURE', 'SPOILER_ASYMMETRY'],
    ['HYDRAULIC_FAILURE', 'AILERON_LOCKOUT'],
    ['HYDRAULIC_FAILURE', 'ELEVATOR_REVERSION'],
    ['HYDRAULIC_FAILURE', 'YAW_DAMPER_FAIL'],
    ['HYDRAULIC_FAILURE', 'LANDING_GEAR_EXTENSION_ISSUE'],
    ['MAJOR_HYDRAULIC_FAILURE', 'BRAKE_FAILURE'],
    ['MAJOR_HYDRAULIC_FAILURE', 'NOSEWHEEL_STEERING_FAIL'],
    ['TOTAL_FLIGHT_CONTROL_FAILURE', 'AUTOPILOT_DISCONNECT'],
    ['SPEEDBRAKE_UNCOMMANDED', 'SPOILER_ASYMMETRY'],
    ['FLAP_DRIVE_OVERHEAT', 'FLAP_JAM'],
    ['SLAT_DISAGREE', 'FLAP_JAM'],
    ['RUDDER_TRIM_RUNAWAY', 'RUDDER_HARD_OVER']
].map((pair, index) => createCanonicalEdge(pair, index, 'HYDRAULIC_CONTROL', {
    probability: 0.44,
    delaySeconds: 3,
    targetContextTemplate: { reason: 'control_degradation' }
}));

const PNEUMATIC_ENVIRONMENT_EDGES = [
    ['BLEED_LEAK', 'PACK_FAILURE'],
    ['PACK_FAILURE', 'CABIN_FAN_FAIL'],
    ['CABIN_FAN_FAIL', 'AVIONICS_OVERHEAT'],
    ['PACK_OVERHEAT', 'PACK_FAILURE'],
    ['ISOLATION_VALVE_FAIL', 'PACK_FAILURE'],
    ['PACK_FAILURE', 'CABIN_PRESSURE_CONTROLLER_FAIL'],
    ['CABIN_PRESSURE_CONTROLLER_FAIL', 'RAPID_DEPRESSURIZATION'],
    ['RAPID_DEPRESSURIZATION', 'RADALT_FAILURE'],
    ['CARGO_FIRE', 'CARGO_SMOKE_LOOP_FAIL'],
    ['LAVATORY_SMOKE', 'CABIN_SMOKE'],
    ['CABIN_SMOKE', 'AVIONICS_OVERHEAT'],
    ['APU_FIRE', 'BLEED_LEAK'],
    ['APU_FIRE', 'ELECTRICAL_FIRE'],
    ['HEAVY_PRECIPITATION', 'WINDSHIELD_HEAT_FAIL'],
    ['SEVERE_ICING', 'WING_ANTI_ICE_FAIL'],
    ['VOLCANIC_ASH', 'ENGINE_FAILURE'],
    ['VOLCANIC_ASH', 'PITOT_BLOCKAGE'],
    ['MICROBURST', 'WIND_SHEAR']
].map((pair, index) => createCanonicalEdge(pair, index, 'PNEUMATIC_ENVIRONMENT', {
    probability: 0.38,
    delaySeconds: 7,
    targetContextTemplate: { reason: 'environmental_system_load' }
}));

const SENSOR_CHAIN_EDGES = [
    ['IRS_ALIGNMENT_FAIL', 'GPS_SIGNAL_LOSS'],
    ['ADIRU_FAIL', 'ATTITUDE_INDICATOR_FAIL'],
    ['PITOT_BLOCKAGE', 'STANDBY_AIRSPEED_FAIL'],
    ['STATIC_PORT_BLOCK', 'RADIO_ALTIMETER_BIAS'],
    ['RADIO_ALTIMETER_BIAS', 'AUTOPILOT_DISCONNECT'],
    ['ILS_SIGNAL_GLITCH', 'LOCALIZER_FLAG'],
    ['ILS_SIGNAL_GLITCH', 'GLIDESLOPE_FLAG'],
    ['GLIDESLOPE_FLAG', 'AUTOPILOT_DISCONNECT'],
    ['LOCALIZER_FLAG', 'AUTOPILOT_DISCONNECT'],
    ['TCAS_FAIL', 'TRANSPONDER_FAIL'],
    ['TRANSPONDER_FAIL', 'TCAS_FAIL'],
    ['WEATHER_RADAR_FAIL', 'WINDSHIELD_HEAT_FAIL'],
    ['GPS_SIGNAL_LOSS', 'AUTOPILOT_ANOMALY'],
    ['ATTITUDE_INDICATOR_FAIL', 'AUTOPILOT_DISCONNECT'],
    ['AOA_VANE_STUCK', 'MACH_TRIM_FAIL'],
    ['MARKER_BEACON_FAIL', 'ILS_SIGNAL_GLITCH'],
    ['STANDBY_AIRSPEED_FAIL', 'AUTOPILOT_DISCONNECT'],
    ['RADALT_FAILURE', 'AUTOPILOT_DISCONNECT']
].map((pair, index) => createCanonicalEdge(pair, index, 'SENSOR_CHAIN', {
    probability: 0.41,
    delaySeconds: 2,
    targetContextTemplate: { reason: 'sensor_follow_on' }
}));

const RUNWAY_GROUND_EDGES = [
    ['RUNWAY_CONTAMINATION', 'BRAKE_FAILURE'],
    ['RUNWAY_CONTAMINATION', 'ANTI_SKID_FAIL'],
    ['RUNWAY_CONTAMINATION', 'NOSEWHEEL_STEERING_FAIL'],
    ['HEAVY_PRECIPITATION', 'RUNWAY_CONTAMINATION'],
    ['HAIL_DAMAGE', 'WINDSHIELD_HEAT_FAIL'],
    ['HAIL_DAMAGE', 'PITOT_BLOCKAGE'],
    ['BIRD_STRIKE', 'ENGINE_VIBRATION'],
    ['BIRD_STRIKE', 'ATTITUDE_INDICATOR_FAIL'],
    ['WAKE_TURBULENCE', 'AUTOPILOT_DISCONNECT'],
    ['MOUNTAIN_WAVE', 'SEVERE_TURBULENCE'],
    ['JETBLAST_UPSET', 'NOSEWHEEL_STEERING_FAIL'],
    ['JETBLAST_UPSET', 'RUDDER_HARD_OVER'],
    ['LIGHTNING_STRIKE', 'RADIO_ALTIMETER_BIAS'],
    ['SABOTAGE_EXPLOSION', 'HULL_BREACH'],
    ['SABOTAGE_EXPLOSION', 'CABIN_SMOKE'],
    ['HULL_BREACH', 'RAPID_DEPRESSURIZATION'],
    ['FUEL_CONTAMINATION', 'DUAL_ENGINE_FAILURE'],
    ['SEVERE_TURBULENCE', 'AUTOPILOT_DISCONNECT']
].map((pair, index) => createCanonicalEdge(pair, index, 'RUNWAY_GROUND', {
    propagationType: 'PHYSICS',
    probability: 0.36,
    delaySeconds: 1,
    targetContextTemplate: { reason: 'ground_or_weather_event' }
}));

const CANONICAL_EDGES = [
    ...BASE_CANONICAL_EDGES,
    ...ENGINE_CHAIN_EDGES,
    ...ELECTRICAL_CHAIN_EDGES,
    ...HYDRAULIC_CONTROL_EDGES,
    ...PNEUMATIC_ENVIRONMENT_EDGES,
    ...SENSOR_CHAIN_EDGES,
    ...RUNWAY_GROUND_EDGES
].map((edge) => {
    if (edge.sourceCode === 'COMPRESSOR_STALL') {
        return { ...edge, sourceStage: 'surging' };
    }
    if (edge.sourceCode === 'BIRD_STRIKE') {
        return { ...edge, sourceStage: 'damage' };
    }
    if (edge.sourceCode === 'SEVERE_ICING') {
        return { ...edge, sourceStage: 'critical' };
    }
    return edge;
});

export function createCanonicalFailureGraph() {
    const nodeMap = new Map();
    const aliasToRuntimeId = new Map();

    FAILURE_GROUPS.forEach((group) => {
        Object.values(group || {}).forEach((definition) => {
            const node = createNodeFromDefinition(definition);
            nodeMap.set(node.canonicalCode, node);
            aliasToRuntimeId.set(node.runtimeId, node.runtimeId);
            aliasToRuntimeId.set(node.canonicalCode, node.runtimeId);
        });
    });

    Object.entries(RUNTIME_ALIAS_MAP).forEach(([aliasCode, runtimeId]) => {
        const normalizedAlias = normalizeFailureCode(aliasCode);
        const normalizedRuntime = normalizeFailureCode(runtimeId);
        aliasToRuntimeId.set(normalizedAlias, runtimeId);
        aliasToRuntimeId.set(runtimeId, runtimeId);
        if (nodeMap.has(normalizedRuntime)) {
            const node = nodeMap.get(normalizedRuntime);
            node.legacyIds = Array.from(new Set([...(node.legacyIds || []), normalizedAlias]));
        }
    });

    const edges = CANONICAL_EDGES.map((edge) => {
        const sourceRuntimeId = aliasToRuntimeId.get(edge.sourceCode) || aliasToRuntimeId.get(normalizeFailureCode(edge.sourceCode));
        const targetRuntimeId = aliasToRuntimeId.get(edge.targetCode) || aliasToRuntimeId.get(normalizeFailureCode(edge.targetCode));
        return {
            ...edge,
            sourceRuntimeId,
            targetRuntimeId
        };
    }).filter((edge) => edge.sourceRuntimeId && edge.targetRuntimeId);

    return hydrateFailureGraphArtifact({
        metadata: {
            version: 'canonical-runtime-v1',
            generated_at: '2026-03-16T00:00:00.000Z',
            source_channel: 'runtime',
            provenance: {
                source: 'runtime_definition',
                pipeline_version: 'runtime'
            }
        },
        nodes: Array.from(nodeMap.values()),
        edges
    });
}

export { normalizeFailureCode };
