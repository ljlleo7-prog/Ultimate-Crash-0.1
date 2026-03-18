import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import {
    FAILURE_GRAPH_ARTIFACT_FILE,
    buildArtifactFromCompatibilityRows,
    createArtifactVersion,
    readJson,
    writeJson
} from './failure_graph_artifact_pipeline.js';

dotenv.config();

const args = process.argv.slice(2);
const defaultSourceSites = [
    'ntsb.gov',
    'bea.aero',
    'faa.gov',
    'asrs.arc.nasa.gov',
    'aaib.gov.uk',
    'atsb.gov.au',
    'easa.europa.eu',
    'aviation-safety.net'
];
const options = {
    gapsPath: 'scripts/gap_logs.json',
    applyApproved: false,
    autoSources: true,
    sourceSites: defaultSourceSites,
    perSiteLimit: 2,
    sourceLimit: 6,
    ollamaUrl: 'http://localhost:11434/api/generate',
    model: 'llama3',
    publishChannel: null
};

for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--gaps' && args[i + 1]) {
        options.gapsPath = args[i + 1];
        i += 1;
        continue;
    }
    if (arg === '--apply-approved') {
        options.applyApproved = true;
        continue;
    }
    if (arg === '--publish-channel' && args[i + 1]) {
        options.publishChannel = args[i + 1];
        i += 1;
        continue;
    }
    if (arg === '--auto-sources') {
        options.autoSources = true;
        continue;
    }
    if (arg === '--no-auto-sources') {
        options.autoSources = false;
        continue;
    }
    if (arg === '--source-sites' && args[i + 1]) {
        options.sourceSites = args[i + 1].split(',').map((site) => site.trim()).filter(Boolean);
        i += 1;
        continue;
    }
    if (arg === '--source-limit' && args[i + 1]) {
        options.sourceLimit = Number(args[i + 1]) || options.sourceLimit;
        i += 1;
        continue;
    }
    if (arg === '--ollama-url' && args[i + 1]) {
        options.ollamaUrl = args[i + 1];
        i += 1;
        continue;
    }
    if (arg === '--model' && args[i + 1]) {
        options.model = args[i + 1];
        i += 1;
        continue;
    }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_KEY (or ANON).');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function writeProposal(proposal) {
    const canonicalPatch = {
        addNodes: proposal.proposed_node ? [proposal.proposed_node] : [],
        addEdges: Array.isArray(proposal.proposed_edges) ? proposal.proposed_edges : []
    };

    const { error: legacyError } = await supabase
        .from('skylinetragedy_revision_proposals')
        .insert({
            proposed_node: proposal.proposed_node,
            proposed_edges: proposal.proposed_edges,
            source_document: proposal.source_document,
            status: 'pending'
        });
    if (legacyError) throw legacyError;

    const { error: artifactProposalError } = await supabase
        .from('failure_graph_proposals')
        .insert({
            title: proposal.proposed_node?.failure_code || 'failure-graph-proposal',
            patch_payload: canonicalPatch,
            source_document: proposal.source_document,
            status: 'pending'
        });
    if (artifactProposalError) {
        console.warn('Artifact proposal write failed.', artifactProposalError.message);
    }
}

function extractUrlFromDuckDuckGoLink(link) {
    const match = link.match(/uddg=([^&]+)/);
    if (!match) return link;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return link;
    }
}

function dedupe(list) {
    return Array.from(new Set(list));
}

async function fetchSearchResults(site, query, limit) {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(`site:${site} ${query}`)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const html = await response.text();
        const links = [];
        const regex = /href="([^"]+)"/g;
        let match = regex.exec(html);
        while (match && links.length < limit) {
            const raw = match[1];
            if (raw.startsWith('https://duckduckgo.com/l/?')) {
                const resolved = extractUrlFromDuckDuckGoLink(raw);
                if (resolved.includes(site)) {
                    links.push(resolved);
                }
            } else if (raw.startsWith('http') && raw.includes(site)) {
                links.push(raw);
            }
            match = regex.exec(html);
        }
        return links;
    } catch {
        return [];
    }
}

async function fetchSourcesForLog(log) {
    const query = `${log.failure_triggered} ${log.observed_effect} aircraft`;
    const sources = [];
    for (const site of options.sourceSites) {
        if (sources.length >= options.sourceLimit) break;
        const results = await fetchSearchResults(site, query, options.perSiteLimit);
        sources.push(...results);
    }
    return dedupe(sources).slice(0, options.sourceLimit);
}

function buildPrompt(log) {
    const sources = Array.isArray(log.sources) ? log.sources.join('\n') : '';
    return `You are an expert aviation safety systems engineer.
Use authoritative sources for validation (NTSB, ASRS, FAA, EASA, Aviation Safety Network).
Observed Event:
- Triggered Failure: ${log.failure_triggered}
- Observed Effect: ${log.observed_effect}
- Existing Cascade: ${log.existing_cascade}
Sources:
${sources}

Task:
1. Determine whether the observed cascade is supported by sources.
2. Propose nodes and edges strictly about aircraft system logic (no physics effects).
3. Output strictly valid JSON with the following structure:
{
  "proposed_node": {
    "failure_code": "NEW_CODE",
    "system": "SYSTEM_NAME",
    "description": "Description",
    "severity": 1-10,
    "time_scale": "immediate/slow",
    "source_confidence": 0.0-1.0
  },
  "proposed_edges": [
    {
      "cause_failure": "PARENT_CODE",
      "effect_failure": "NEW_CODE",
      "probability": 0.0-1.0,
      "delay_seconds": 0,
      "propagation_type": "SYSTEM/PROCEDURAL/HUMAN_FACTOR/PHYSICS"
    }
  ],
  "source_document": "Citation or Report ID"
}
Do not include any text outside the JSON.`;
}

async function callOllama(prompt) {
    const response = await fetch(options.ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: options.model,
            prompt,
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
    }

    const result = await response.json();
    return String(result.response || '').trim();
}

function extractJson(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('No JSON object found in LLM response.');
    }
    return text.slice(start, end + 1);
}

async function processGaps() {
    const logs = await readJson(options.gapsPath, []);
    if (!Array.isArray(logs) || logs.length === 0) {
        console.log('No gap logs found.');
        return;
    }

    for (const log of logs) {
        if (options.autoSources && (!Array.isArray(log.sources) || log.sources.length === 0)) {
            const fetchedSources = await fetchSourcesForLog(log);
            if (fetchedSources.length > 0) {
                log.sources = fetchedSources;
            }
        }
        const prompt = buildPrompt(log);
        let saved = false;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                const raw = await callOllama(prompt);
                const jsonText = extractJson(raw);
                const proposal = JSON.parse(jsonText);
                await writeProposal(proposal);
                console.log('Saved proposal for', log.failure_triggered);
                saved = true;
                break;
            } catch {
                console.warn(`Failed to parse proposal for ${log.failure_triggered} (attempt ${attempt}/3).`);
            }
        }
        if (!saved) {
            console.warn(`Skipping ${log.failure_triggered} after 3 failed attempts.`);
        }
    }
}

async function fetchCurrentDraftArtifact() {
    const localArtifact = await readJson(FAILURE_GRAPH_ARTIFACT_FILE, null);
    if (localArtifact) {
        return localArtifact;
    }

    const failures = await readJson('scripts/skylinetragedy_failures.json', []);
    const edges = await readJson('scripts/skylinetragedy_edges.json', []);
    const effects = await readJson('scripts/skylinetragedy_effects.json', []);
    return buildArtifactFromCompatibilityRows({
        failures,
        edges,
        effects,
        version: `draft-${new Date().toISOString()}`,
        generatedAt: new Date().toISOString(),
        provenance: {
            source: 'update_failure_graph_fallback'
        }
    });
}

function applyPatch(artifact, patchPayload) {
    const nodeMap = new Map((artifact.nodes || []).map((node) => [node.id, node]));
    const edgeMap = new Map((artifact.edges || []).map((edge) => [edge.id, edge]));

    (patchPayload.addNodes || []).forEach((node) => {
        nodeMap.set(node.failure_code || node.id, {
            id: node.failure_code || node.id,
            runtimeId: node.runtime_id || node.failure_code || node.id,
            aliases: [node.failure_code || node.id].filter(Boolean),
            name: node.description || node.failure_code || node.id,
            subsystem: node.system || 'systems',
            category: node.system || 'systems',
            applicability: node.applicability || ['*'],
            observables: node.observables || [],
            mitigationHooks: node.mitigation_hooks || [],
            stages: node.stages || [{ id: 'active', next: null, duration: null, intensityTarget: null, intensityRate: null, transitionMetadata: null, hasDynamicDuration: false, hasEffect: false }],
            narrativeHookIds: node.narrative_hook_ids || [],
            evidenceRefs: node.evidence_refs || [],
            symptomTemplates: node.symptom_templates || [],
            metadata: {
                severity: node.severity ?? null,
                time_scale: node.time_scale || null,
                source_confidence: node.source_confidence ?? null
            },
            source: node.source || 'proposal'
        });
    });

    (patchPayload.addEdges || []).forEach((edge) => {
        const sourceId = edge.cause_failure || edge.source_failure_code || edge.sourceId;
        const targetId = edge.effect_failure || edge.target_failure_code || edge.targetId;
        const edgeId = edge.id || `${sourceId}_TO_${targetId}_${edge.propagation_type || edge.propagationType || 'SYSTEM'}`;
        edgeMap.set(edgeId, {
            id: edgeId,
            sourceId,
            targetId,
            probability: edge.probability ?? 1,
            delaySeconds: edge.delay_seconds ?? edge.delaySeconds ?? 0,
            propagationType: edge.propagation_type || edge.propagationType || 'SYSTEM',
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
                patch_source: 'approved_proposal'
            }
        });
    });

    return {
        ...artifact,
        nodes: Array.from(nodeMap.values()),
        edges: Array.from(edgeMap.values())
    };
}

async function applyApprovedProposals() {
    const { data: proposals, error } = await supabase
        .from('failure_graph_proposals')
        .select('*')
        .eq('status', 'approved');
    if (error) throw error;
    if (!proposals || proposals.length === 0) {
        console.log('No approved proposals found.');
        return;
    }

    let artifact = await fetchCurrentDraftArtifact();
    for (const proposal of proposals) {
        artifact = applyPatch(artifact, proposal.patch_payload || {});
    }

    const version = `proposal-${new Date().toISOString()}`;
    const result = await createArtifactVersion(supabase, artifact, {
        version,
        status: options.publishChannel ? 'published' : 'validated',
        channel: options.publishChannel,
        provenance: {
            source: 'update_failure_graph',
            applied_proposal_ids: proposals.map((proposal) => proposal.id)
        }
    });

    await writeJson(FAILURE_GRAPH_ARTIFACT_FILE, result.artifact);

    const { error: markAppliedError } = await supabase
        .from('failure_graph_proposals')
        .update({ status: 'applied' })
        .in('id', proposals.map((proposal) => proposal.id));
    if (markAppliedError) throw markAppliedError;

    console.log(`Applied approved proposals into artifact version ${result.versionRow.version}.`);
}

if (options.applyApproved) {
    await applyApprovedProposals();
} else {
    await processGaps();
}
