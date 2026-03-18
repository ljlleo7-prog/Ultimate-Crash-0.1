import { normalizeFailureCode } from './CanonicalFailureGraph.js';

export const FAILURE_GRAPH_ARTIFACT_SCHEMA = 'failure-graph-artifact-v1';
export const FAILURE_GRAPH_OPERATORS = ['<', '<=', '>', '>=', '!=', '=', '==', 'includes', 'truthy', 'falsy'];
const DEFAULT_CHANNEL = 'runtime';

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const sortArray = (value) => {
    if (!Array.isArray(value)) return [];
    return [...value].sort((left, right) => {
        const leftKey = typeof left === 'string' ? left : stableStringify(left);
        const rightKey = typeof right === 'string' ? right : stableStringify(right);
        return leftKey.localeCompare(rightKey);
    });
};

const normalizeObservable = (observable = {}) => ({
    path: observable.path || '',
    operator: observable.operator || '==',
    value: observable.value ?? null
});

const normalizeStage = (stage = {}) => ({
    id: stage.id || stage.name || 'active',
    next: stage.next ?? null,
    duration: typeof stage.duration === 'number' ? stage.duration : null,
    intensityTarget: stage.intensityTarget ?? null,
    intensityRate: stage.intensityRate ?? null,
    transitionMetadata: stage.transitionMetadata ?? null,
    hasDynamicDuration: Boolean(stage.hasDynamicDuration),
    hasEffect: Boolean(stage.hasEffect)
});

const normalizeNode = (node = {}) => {
    const canonicalCode = normalizeFailureCode(node.id || node.canonicalCode || node.failure_code || node.runtimeId || node.runtime_id);
    const runtimeId = node.runtimeId || node.runtime_id || node.id || node.failure_code || canonicalCode.toLowerCase();
    const aliases = sortArray(Array.from(new Set([
        ...(Array.isArray(node.aliases) ? node.aliases : []),
        ...(Array.isArray(node.legacyIds) ? node.legacyIds : []),
        canonicalCode,
        runtimeId
    ].filter(Boolean).map((value) => String(value)))));

    return {
        id: canonicalCode,
        canonicalCode,
        runtimeId,
        aliases,
        name: node.name || node.description || canonicalCode,
        subsystem: node.subsystem || node.system || node.category || 'systems',
        category: node.category || node.subsystem || node.system || 'systems',
        applicability: sortArray(node.applicability || node.aircraftApplicability || ['*']),
        observables: sortArray((node.observables || node.observableSignals || []).map(normalizeObservable)),
        mitigationHooks: sortArray(node.mitigationHooks || []),
        stages: sortArray((node.stages || []).map(normalizeStage)),
        narrativeHookIds: sortArray(node.narrativeHookIds || []),
        evidenceRefs: sortArray(node.evidenceRefs || []),
        symptomTemplates: sortArray(node.symptomTemplates || []),
        metadata: isPlainObject(node.metadata) ? normalizeForHash(node.metadata) : {},
        source: node.source || 'unknown'
    };
};

const normalizeEdge = (edge = {}) => ({
    id: edge.id || `${normalizeFailureCode(edge.sourceId || edge.sourceCode || edge.source_failure_code || edge.sourceRuntimeId)}_TO_${normalizeFailureCode(edge.targetId || edge.targetCode || edge.target_failure_code || edge.targetRuntimeId)}`,
    sourceId: normalizeFailureCode(edge.sourceId || edge.sourceCode || edge.source_failure_code || edge.sourceRuntimeId),
    targetId: normalizeFailureCode(edge.targetId || edge.targetCode || edge.target_failure_code || edge.targetRuntimeId),
    probability: typeof edge.probability === 'number' ? edge.probability : 1,
    delaySeconds: typeof edge.delaySeconds === 'number' ? edge.delaySeconds : (typeof edge.delay_seconds === 'number' ? edge.delay_seconds : (typeof edge.time_delay_seconds === 'number' ? edge.time_delay_seconds : 0)),
    propagationType: edge.propagationType || edge.propagation_type || 'SYSTEM',
    sourceStage: edge.sourceStage || edge.source_stage || null,
    minSourceTimeInStage: typeof edge.minSourceTimeInStage === 'number' ? edge.minSourceTimeInStage : 0,
    requiredObservables: sortArray((edge.requiredObservables || edge.required_observables || []).map(normalizeObservable)),
    inhibitedObservables: sortArray((edge.inhibitedObservables || edge.inhibited_observables || []).map(normalizeObservable)),
    guards: sortArray(edge.guards || []),
    stageGate: edge.stageGate || edge.stage_gate || null,
    requiredStages: sortArray(edge.requiredStages || []),
    targetContextTemplate: isPlainObject(edge.targetContextTemplate) ? normalizeForHash(edge.targetContextTemplate) : {},
    narrativeHookIds: sortArray(edge.narrativeHookIds || []),
    evidenceRefs: sortArray(edge.evidenceRefs || []),
    metadata: isPlainObject(edge.metadata) ? normalizeForHash(edge.metadata) : {}
});

export function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
    }
    if (isPlainObject(value)) {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

export function normalizeForHash(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeForHash(entry));
    }
    if (isPlainObject(value)) {
        return Object.keys(value).sort().reduce((result, key) => {
            const normalized = normalizeForHash(value[key]);
            if (normalized !== undefined) {
                result[key] = normalized;
            }
            return result;
        }, {});
    }
    return value;
}

export function computeDeterministicHash(value) {
    const input = typeof value === 'string' ? value : stableStringify(value);
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;

    for (let index = 0; index < input.length; index += 1) {
        hash ^= BigInt(input.charCodeAt(index));
        hash = BigInt.asUintN(64, hash * prime);
    }

    return hash.toString(16).padStart(16, '0');
}

const createHashPayload = (artifact) => ({
    metadata: {
        artifact_schema: artifact.metadata.artifact_schema,
        version: artifact.metadata.version,
        schema_version: artifact.metadata.schema_version,
        source_channel: artifact.metadata.source_channel,
        provenance: normalizeForHash(artifact.metadata.provenance || {})
    },
    nodes: artifact.nodes,
    edges: artifact.edges,
    lookup: normalizeForHash(artifact.lookup || {}),
    hooks: normalizeForHash(artifact.hooks || {})
});

export function finalizeFailureGraphArtifact(artifact = {}) {
    const normalizedNodes = sortArray((artifact.nodes || []).map(normalizeNode));
    const normalizedEdges = sortArray((artifact.edges || []).map(normalizeEdge));
    const metadata = {
        artifact_schema: artifact.metadata?.artifact_schema || FAILURE_GRAPH_ARTIFACT_SCHEMA,
        version: artifact.metadata?.version || artifact.version || 'draft',
        schema_version: artifact.metadata?.schema_version || 1,
        generated_at: artifact.metadata?.generated_at || artifact.generatedAt || new Date().toISOString(),
        source_channel: artifact.metadata?.source_channel || DEFAULT_CHANNEL,
        provenance: normalizeForHash(artifact.metadata?.provenance || artifact.provenance || {})
    };

    const envelope = {
        metadata,
        nodes: normalizedNodes,
        edges: normalizedEdges,
        lookup: normalizeForHash(artifact.lookup || {}),
        hooks: normalizeForHash(artifact.hooks || {})
    };

    const hash = computeDeterministicHash(createHashPayload(envelope));
    const finalArtifact = {
        ...envelope,
        metadata: {
            ...envelope.metadata,
            hash
        },
        version: metadata.version,
        artifactHash: hash,
        publishedAt: metadata.generated_at
    };

    return finalArtifact;
}

export function hydrateFailureGraphArtifact(artifact = {}) {
    const finalArtifact = finalizeFailureGraphArtifact(artifact);
    const aliasToRuntimeId = new Map();
    const runtimeIdToCode = new Map();

    finalArtifact.nodes.forEach((node) => {
        aliasToRuntimeId.set(node.id, node.runtimeId);
        aliasToRuntimeId.set(node.runtimeId, node.runtimeId);
        node.aliases.forEach((alias) => aliasToRuntimeId.set(normalizeFailureCode(alias), node.runtimeId));
        runtimeIdToCode.set(node.runtimeId, node.id);
    });

    const hydratedEdges = finalArtifact.edges.map((edge) => ({
        ...edge,
        sourceCode: edge.sourceId,
        targetCode: edge.targetId,
        sourceRuntimeId: aliasToRuntimeId.get(edge.sourceId) || edge.sourceId,
        targetRuntimeId: aliasToRuntimeId.get(edge.targetId) || edge.targetId
    }));

    return {
        ...finalArtifact,
        edges: hydratedEdges,
        aliasToRuntimeId,
        runtimeIdToCode
    };
}

export function validateFailureGraphArtifact(artifact = {}) {
    const normalized = finalizeFailureGraphArtifact(artifact);
    const errors = [];
    const warnings = [];
    const nodeIds = new Set();
    const edgeIds = new Set();
    const stageMap = new Map();

    if (normalized.metadata.artifact_schema !== FAILURE_GRAPH_ARTIFACT_SCHEMA) {
        errors.push(`Unsupported artifact schema: ${normalized.metadata.artifact_schema}`);
    }

    normalized.nodes.forEach((node) => {
        if (!node.id) {
            errors.push('Node missing id.');
            return;
        }
        if (nodeIds.has(node.id)) {
            errors.push(`Duplicate node id: ${node.id}`);
        }
        nodeIds.add(node.id);
        stageMap.set(node.id, new Set(node.stages.map((stage) => stage.id)));
        if (node.stages.length === 0) {
            warnings.push(`Node has no stages: ${node.id}`);
        }
    });

    normalized.edges.forEach((edge) => {
        if (edgeIds.has(edge.id)) {
            errors.push(`Duplicate edge id: ${edge.id}`);
        }
        edgeIds.add(edge.id);
        if (!nodeIds.has(edge.sourceId)) {
            errors.push(`Edge source missing node: ${edge.id} -> ${edge.sourceId}`);
        }
        if (!nodeIds.has(edge.targetId)) {
            errors.push(`Edge target missing node: ${edge.id} -> ${edge.targetId}`);
        }
        if (typeof edge.probability !== 'number' || edge.probability < 0 || edge.probability > 1) {
            errors.push(`Edge probability out of range: ${edge.id}`);
        }
        if (edge.sourceStage && !stageMap.get(edge.sourceId)?.has(edge.sourceStage)) {
            errors.push(`Edge references unknown source stage: ${edge.id} -> ${edge.sourceStage}`);
        }

        [...edge.requiredObservables, ...edge.inhibitedObservables].forEach((observable) => {
            if (!FAILURE_GRAPH_OPERATORS.includes(observable.operator)) {
                errors.push(`Invalid observable operator on edge ${edge.id}: ${observable.operator}`);
            }
        });
    });

    const recomputedHash = computeDeterministicHash(createHashPayload(normalized));
    if (artifact.metadata?.hash && artifact.metadata.hash !== recomputedHash) {
        errors.push(`Artifact hash mismatch: expected ${artifact.metadata.hash}, recomputed ${recomputedHash}`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        artifact: normalized,
        recomputedHash
    };
}
