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

const CANONICAL_EDGES = [
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
        probability: 0.8,
        delaySeconds: 1,
        sourceStage: 'active',
        minSourceTimeInStage: 0,
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
        probability: 0.6,
        delaySeconds: 10,
        sourceStage: 'active',
        minSourceTimeInStage: 0,
        requiredObservables: [],
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
