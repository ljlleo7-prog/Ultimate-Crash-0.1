import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeFailureGraphArtifact, validateFailureGraphArtifact } from '../src/services/failures/FailureGraphArtifact.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FAILURE_GRAPH_ARTIFACT_FILE = path.join(__dirname, 'failure_graph_artifact.json');
export const FAILURE_GRAPH_FAILURES_FILE = path.join(__dirname, 'skylinetragedy_failures.json');
export const FAILURE_GRAPH_EDGES_FILE = path.join(__dirname, 'skylinetragedy_edges.json');
export const FAILURE_GRAPH_EFFECTS_FILE = path.join(__dirname, 'skylinetragedy_effects.json');

export async function readJson(filePath, fallback = null) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error?.code === 'ENOENT') {
            return fallback;
        }
        throw error;
    }
}

export async function writeJson(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export function buildArtifactFromCompatibilityRows({ failures = [], edges = [], effects = [], version = 'draft', generatedAt = new Date().toISOString(), provenance = {} }) {
    const effectsByFailure = new Map();
    (effects || []).forEach((effect) => {
        const failureCode = effect.failure_code;
        if (!failureCode) return;
        if (!effectsByFailure.has(failureCode)) {
            effectsByFailure.set(failureCode, []);
        }
        effectsByFailure.get(failureCode).push({
            type: effect.effect_type,
            simulationLogic: effect.simulation_logic,
            parameters: effect.parameters || {}
        });
    });

    const nodes = (failures || []).map((failure) => ({
        id: failure.failure_code,
        runtimeId: failure.runtime_id || failure.failure_code.toLowerCase(),
        aliases: [failure.failure_code, failure.runtime_id].filter(Boolean),
        name: failure.description || failure.component || failure.failure_code,
        subsystem: failure.system || 'systems',
        category: failure.system || 'systems',
        applicability: failure.applicability || ['*'],
        observables: failure.observables || [],
        mitigationHooks: failure.mitigation_hooks || [],
        stages: Array.isArray(failure.stages) && failure.stages.length > 0
            ? failure.stages
            : [{ id: 'active', next: null, duration: null, intensityTarget: null, intensityRate: null, transitionMetadata: null, hasDynamicDuration: false, hasEffect: false }],
        narrativeHookIds: failure.narrative_hook_ids || [],
        evidenceRefs: failure.evidence_refs || [],
        symptomTemplates: failure.symptom_templates || [],
        metadata: {
            component: failure.component || null,
            failure_mode: failure.failure_mode || null,
            severity: failure.severity ?? null,
            time_scale: failure.time_scale || null,
            source_confidence: failure.source_confidence ?? null,
            observed_effects: effectsByFailure.get(failure.failure_code) || []
        },
        source: failure.source || 'compatibility_json'
    }));

    const artifactEdges = (edges || []).map((edge) => ({
        id: edge.id || `${edge.source_failure_code}_TO_${edge.target_failure_code}`,
        sourceId: edge.source_failure_code,
        targetId: edge.target_failure_code,
        probability: edge.probability ?? 1,
        delaySeconds: edge.delay_seconds ?? edge.time_delay_seconds ?? 0,
        propagationType: edge.propagation_type || 'SYSTEM',
        sourceStage: edge.source_stage || null,
        minSourceTimeInStage: edge.min_source_time_in_stage || 0,
        requiredObservables: edge.required_observables || [],
        inhibitedObservables: edge.inhibited_observables || [],
        guards: edge.guards || [],
        stageGate: edge.stage_gate || null,
        targetContextTemplate: edge.target_context_template || {},
        narrativeHookIds: edge.narrative_hook_ids || [],
        evidenceRefs: edge.evidence_refs || [],
        metadata: {
            condition_logic: edge.condition_logic || {}
        }
    }));

    return finalizeFailureGraphArtifact({
        metadata: {
            version,
            generated_at: generatedAt,
            source_channel: 'pipeline',
            provenance
        },
        nodes,
        edges: artifactEdges,
        hooks: {
            effectsByFailure: Object.fromEntries(Array.from(effectsByFailure.entries()))
        }
    });
}

export function createValidationReport(artifact) {
    const validation = validateFailureGraphArtifact(artifact);
    return {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        recomputedHash: validation.recomputedHash,
        nodeCount: validation.artifact.nodes.length,
        edgeCount: validation.artifact.edges.length,
        generatedAt: validation.artifact.metadata.generated_at,
        schema: validation.artifact.metadata.artifact_schema,
        version: validation.artifact.metadata.version
    };
}

export async function fetchPublishedArtifact(supabase, channel = 'runtime') {
    const { data, error } = await supabase
        .from('failure_graph_publications')
        .select(`
            channel,
            version_id,
            failure_graph_versions (
                id,
                version,
                status,
                artifact_hash,
                schema_version,
                generated_at,
                provenance,
                failure_graph_artifacts (
                    artifact_json,
                    validation_report,
                    artifact_size_bytes
                )
            )
        `)
        .eq('channel', channel)
        .single();

    if (error) throw error;
    const versionRow = data?.failure_graph_versions;
    const artifactRow = Array.isArray(versionRow?.failure_graph_artifacts)
        ? versionRow.failure_graph_artifacts[0]
        : versionRow?.failure_graph_artifacts;

    return {
        publication: data,
        version: versionRow,
        artifact: artifactRow?.artifact_json || null,
        validationReport: artifactRow?.validation_report || null
    };
}

export async function createArtifactVersion(supabase, artifact, { version, status = 'validated', channel = null, provenance = {}, validationReport = null } = {}) {
    const finalArtifact = finalizeFailureGraphArtifact({
        ...artifact,
        metadata: {
            ...(artifact.metadata || {}),
            version: version || artifact.metadata?.version || 'draft',
            provenance: {
                ...(artifact.metadata?.provenance || {}),
                ...provenance
            }
        }
    });
    const report = validationReport || createValidationReport(finalArtifact);
    if (!report.valid) {
        throw new Error(`Artifact validation failed: ${report.errors.join('; ')}`);
    }

    const { data: versionRow, error: versionError } = await supabase
        .from('failure_graph_versions')
        .insert({
            version: finalArtifact.metadata.version,
            status,
            artifact_hash: finalArtifact.metadata.hash,
            schema_version: finalArtifact.metadata.schema_version,
            generated_at: finalArtifact.metadata.generated_at,
            provenance: finalArtifact.metadata.provenance
        })
        .select()
        .single();
    if (versionError) throw versionError;

    const serialized = JSON.stringify(finalArtifact);
    const { error: artifactError } = await supabase
        .from('failure_graph_artifacts')
        .insert({
            version_id: versionRow.id,
            artifact_json: finalArtifact,
            validation_report: report,
            artifact_size_bytes: Buffer.byteLength(serialized)
        });
    if (artifactError) throw artifactError;

    const { error: validationError } = await supabase
        .from('failure_graph_validation_runs')
        .insert({
            version_id: versionRow.id,
            validator_version: 'artifact-v1',
            passed: true,
            warnings: report.warnings,
            errors: report.errors,
            report_json: report
        });
    if (validationError) throw validationError;

    if (channel) {
        const { error: publicationError } = await supabase
            .from('failure_graph_publications')
            .upsert({
                channel,
                version_id: versionRow.id,
                published_at: new Date().toISOString()
            }, { onConflict: 'channel' });
        if (publicationError) throw publicationError;
    }

    return { versionRow, artifact: finalArtifact, validationReport: report };
}
