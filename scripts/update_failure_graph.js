import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';

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
    model: 'llama3'
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
    if (arg === '--auto-sources') {
        options.autoSources = true;
        continue;
    }
    if (arg === '--no-auto-sources') {
        options.autoSources = false;
        continue;
    }
    if (arg === '--source-sites' && args[i + 1]) {
        options.sourceSites = args[i + 1].split(',').map(site => site.trim()).filter(Boolean);
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

async function readJson(path) {
    try {
        const raw = await fs.readFile(path, 'utf-8');
        return JSON.parse(raw);
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            console.warn(`Gap log file not found at ${path}. Create it or pass --gaps <path>.`);
            return [];
        }
        throw error;
    }
}

async function writeProposal(proposal) {
    const { error } = await supabase
        .from('skylinetragedy_revision_proposals')
        .insert({
            proposed_node: proposal.proposed_node,
            proposed_edges: proposal.proposed_edges,
            source_document: proposal.source_document,
            status: 'pending'
        });

    if (error) throw error;
}

function extractUrlFromDuckDuckGoLink(link) {
    const match = link.match(/uddg=([^&]+)/);
    if (!match) return link;
    try {
        return decodeURIComponent(match[1]);
    } catch (error) {
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
            } else if (raw.startsWith('http')) {
                if (raw.includes(site)) {
                    links.push(raw);
                }
            }
            match = regex.exec(html);
        }
        return links;
    } catch (error) {
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
    const candidate = text.slice(start, end + 1);
    return candidate;
}

async function processGaps() {
    const logs = await readJson(options.gapsPath);
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
            } catch (error) {
                console.warn(`Failed to parse proposal for ${log.failure_triggered} (attempt ${attempt}/3).`);
            }
        }
        if (!saved) {
            console.warn(`Skipping ${log.failure_triggered} after 3 failed attempts.`);
        }
    }
}

async function loadFailureMap() {
    const { data, error } = await supabase.from('skylinetragedy_failures').select('*');
    if (error) throw error;
    const map = new Map();
    (data || []).forEach(f => map.set(f.failure_code, f));
    return map;
}

async function ensureFailure(failure, failureMap) {
    if (!failure || !failure.failure_code) return null;
    const existing = failureMap.get(failure.failure_code);
    if (existing) return existing;

    const { data, error } = await supabase
        .from('skylinetragedy_failures')
        .upsert([failure], { onConflict: 'failure_code' })
        .select()
        .single();
    if (error) throw error;
    failureMap.set(data.failure_code, data);
    return data;
}

async function applyApprovedProposals() {
    const { data: proposals, error } = await supabase
        .from('skylinetragedy_revision_proposals')
        .select('*')
        .eq('status', 'approved');
    if (error) throw error;
    if (!proposals || proposals.length === 0) {
        console.log('No approved proposals found.');
        return;
    }

    const failureMap = await loadFailureMap();

    for (const proposal of proposals) {
        const node = proposal.proposed_node;
        const edges = Array.isArray(proposal.proposed_edges) ? proposal.proposed_edges : [];
        const nodeRecord = await ensureFailure(node, failureMap);
        if (!nodeRecord) continue;

        for (const edge of edges) {
            const cause = failureMap.get(edge.cause_failure);
            const effect = failureMap.get(edge.effect_failure) || nodeRecord;
            if (!cause || !effect) continue;

            const { data: existingEdges, error: edgeQueryError } = await supabase
                .from('skylinetragedy_failure_edges')
                .select('id')
                .eq('cause_failure', cause.id)
                .eq('effect_failure', effect.id)
                .eq('propagation_type', edge.propagation_type);

            if (edgeQueryError) throw edgeQueryError;

            if (!existingEdges || existingEdges.length === 0) {
                const { error: edgeInsertError } = await supabase
                    .from('skylinetragedy_failure_edges')
                    .insert({
                        cause_failure: cause.id,
                        effect_failure: effect.id,
                        probability: edge.probability,
                        delay_seconds: edge.delay_seconds,
                        propagation_type: edge.propagation_type
                    });
                if (edgeInsertError) throw edgeInsertError;
            }
        }
    }

    console.log('Applied approved proposals.');
}

if (options.applyApproved) {
    await applyApprovedProposals();
} else {
    await processGaps();
}
