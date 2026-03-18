import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
    FAILURE_GRAPH_ARTIFACT_FILE,
    FAILURE_GRAPH_EDGES_FILE,
    FAILURE_GRAPH_EFFECTS_FILE,
    FAILURE_GRAPH_FAILURES_FILE,
    buildArtifactFromCompatibilityRows,
    createValidationReport,
    fetchPublishedArtifact,
    readJson
} from './failure_graph_artifact_pipeline.js';
import { validateFailureGraphArtifact } from '../src/services/failures/FailureGraphArtifact.js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function summarizeRowset(failures, edges, effects) {
    const nodeCount = failures.length;
    const edgeCount = edges.length;
    const connectedNodes = new Set([
        ...edges.map((edge) => edge.source_failure_code),
        ...edges.map((edge) => edge.target_failure_code)
    ].filter(Boolean));
    const criticalSystems = ['HYDRAULIC', 'ELECTRICAL', 'PROPULSION', 'FLIGHT_CONTROLS'];
    const criticalNodes = failures.filter((node) => criticalSystems.includes(node.system));
    const criticalOrphans = criticalNodes.filter((node) => !connectedNodes.has(node.failure_code)).length;
    const nodesWithEffects = new Set(effects.map((effect) => effect.failure_code));

    return {
        nodeCount,
        edgeCount,
        connectedNodes: connectedNodes.size,
        orphanRate: nodeCount === 0 ? 0 : Number((((nodeCount - connectedNodes.size) / nodeCount) * 100).toFixed(2)),
        criticalNodeCount: criticalNodes.length,
        criticalOrphans,
        criticalConnectivity: criticalNodes.length === 0 ? 0 : Number((((criticalNodes.length - criticalOrphans) / criticalNodes.length) * 100).toFixed(2)),
        effectCoverage: nodeCount === 0 ? 0 : Number(((nodesWithEffects.size / nodeCount) * 100).toFixed(2))
    };
}

function inspectArtifact(artifact) {
    const validation = validateFailureGraphArtifact(artifact);
    const duplicates = new Set();
    const duplicateEdges = [];
    const seenPairs = new Set();

    validation.artifact.edges.forEach((edge) => {
        const key = `${edge.sourceId}->${edge.targetId}->${edge.propagationType}`;
        if (seenPairs.has(key)) {
            duplicates.add(key);
            duplicateEdges.push(edge.id);
        }
        seenPairs.add(key);
    });

    return {
        validation,
        duplicateEdges,
        duplicatePairCount: duplicates.size
    };
}

async function verifyLocalArtifact() {
    const artifact = await readJson(FAILURE_GRAPH_ARTIFACT_FILE, null);
    if (artifact) {
        const report = inspectArtifact(artifact);
        return { source: 'local-artifact', artifact, report };
    }

    const failures = await readJson(FAILURE_GRAPH_FAILURES_FILE, []);
    const edges = await readJson(FAILURE_GRAPH_EDGES_FILE, []);
    const effects = await readJson(FAILURE_GRAPH_EFFECTS_FILE, []);
    const artifactFromRows = buildArtifactFromCompatibilityRows({
        failures,
        edges,
        effects,
        version: 'local-compatibility',
        generatedAt: new Date().toISOString(),
        provenance: {
            source: 'verify_graph_integrity'
        }
    });
    return {
        source: 'compatibility-files',
        artifact: artifactFromRows,
        report: inspectArtifact(artifactFromRows),
        rowsetSummary: summarizeRowset(failures, edges, effects)
    };
}

async function verifyPublishedArtifact() {
    try {
        const published = await fetchPublishedArtifact(supabase, 'runtime');
        if (!published.artifact) {
            return { source: 'supabase', missing: true };
        }
        return {
            source: 'supabase',
            artifact: published.artifact,
            report: inspectArtifact(published.artifact),
            validationReport: published.validationReport,
            version: published.version
        };
    } catch (error) {
        return {
            source: 'supabase',
            error: error.message
        };
    }
}

async function verifyGraph() {
    console.log('Starting Graph Integrity Verification...');

    const local = await verifyLocalArtifact();
    const localValidationReport = createValidationReport(local.artifact);
    console.log(`Local source: ${local.source}`);
    console.log(`Local artifact version: ${localValidationReport.version}`);
    console.log(`Local artifact hash: ${localValidationReport.recomputedHash}`);
    console.log(`Local artifact valid: ${localValidationReport.valid}`);
    console.log(`Local nodes: ${localValidationReport.nodeCount}`);
    console.log(`Local edges: ${localValidationReport.edgeCount}`);
    console.log(`Local warnings: ${localValidationReport.warnings.length}`);
    console.log(`Local errors: ${localValidationReport.errors.length}`);
    if (local.rowsetSummary) {
        console.log(`Legacy orphan rate: ${local.rowsetSummary.orphanRate}%`);
        console.log(`Legacy critical connectivity: ${local.rowsetSummary.criticalConnectivity}%`);
        console.log(`Legacy effect coverage: ${local.rowsetSummary.effectCoverage}%`);
    }
    console.log(`Duplicate edge pairs: ${local.report.duplicatePairCount}`);

    const published = await verifyPublishedArtifact();
    if (published.error) {
        console.log(`Supabase artifact check failed: ${published.error}`);
        return;
    }
    if (published.missing) {
        console.log('No published runtime artifact found in Supabase.');
        return;
    }

    const publishedValidation = createValidationReport(published.artifact);
    console.log(`Published artifact version: ${published.version?.version || publishedValidation.version}`);
    console.log(`Published artifact hash: ${publishedValidation.recomputedHash}`);
    console.log(`Published artifact valid: ${publishedValidation.valid}`);
    console.log(`Published warnings: ${publishedValidation.warnings.length}`);
    console.log(`Published errors: ${publishedValidation.errors.length}`);
    console.log(`Stored hash matches recomputed: ${published.version?.artifact_hash === publishedValidation.recomputedHash}`);
    console.log(`Validation report attached: ${Boolean(published.validationReport)}`);
}

verifyGraph().catch(console.error);
