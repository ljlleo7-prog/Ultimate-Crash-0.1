
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_HEALTH_URL = 'http://localhost:11434/api/tags';
const MODEL = 'llama3';
const BATCH_SIZE = 5;
const INSERT_BATCH_SIZE = 20;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SCENARIOS = [
    // Normal Operations
    { id: 'taxi', description: 'Taxiing to runway', roles: ['FO'] },
    { id: 'takeoff_roll', description: 'Takeoff roll, speed increasing', roles: ['FO'] },
    { id: 'climb', description: 'Climbing to cruise altitude', roles: ['FO'] },
    { id: 'cruise', description: 'Cruising at steady altitude', roles: ['FO', 'CABIN_CREW'] },
    { id: 'descent', description: 'Descending for approach', roles: ['FO', 'CABIN_CREW'] },
    { id: 'approach', description: 'Final approach to runway', roles: ['FO'] },
    { id: 'landing', description: 'Touchdown and rollout', roles: ['FO'] },
    
    // Interactions
    { id: 'summon', description: 'Captain calls for attention', roles: ['FO', 'CABIN_CREW'] },
    { id: 'status_check', description: 'Captain asks for status report', roles: ['FO'] },

    // Failures (Engine)
    { id: 'engine_failure', description: 'Engine failure detected', roles: ['FO'] },
    { id: 'engine_fire', description: 'Engine fire detected', roles: ['FO', 'CABIN_CREW'] },
    { id: 'compressor_stall', description: 'Engine compressor stall (loud bangs)', roles: ['FO', 'CABIN_CREW'] },
    { id: 'dual_engine_failure', description: 'Both engines failed', roles: ['FO', 'CABIN_CREW'] },
    
    // Failures (System)
    { id: 'hydraulic_failure', description: 'Hydraulic system failure', roles: ['FO'] },
    { id: 'electrical_failure', description: 'Electrical system failure', roles: ['FO'] },
    { id: 'cabin_pressure', description: 'Cabin depressurization', roles: ['FO', 'CABIN_CREW'] },
    { id: 'gear_failure', description: 'Landing gear failed to extend', roles: ['FO'] }
];

const DIFFICULTIES = [
    { id: 'rookie', prompt: 'You are calm, precise, and fully accurate. You are not stressed.' },
    { id: 'amateur', prompt: 'You are mostly calm but slightly unsure. You are accurate but may be brief.' },
    { id: 'intermediate', prompt: 'You are somewhat stressed. You are mostly accurate but might miss a detail.' },
    { id: 'advanced', prompt: 'You are stressed and task-saturated. You can be assertive and still wrong.' },
    { id: 'pro', prompt: 'You are highly stressed and impatient. You are assertive but can be wrong.' },
    { id: 'devil', prompt: 'You are extremely stressed and overwhelmed. You are assertive but unreliable.' }
];

const SPECIFIC_DATA_TEMPLATES = [
    '[ALTITUDE]',
    '[AIRSPEED]',
    '[HEADING]',
    '[RUNWAY]',
    '[FREQUENCY]',
    '[FUEL]',
    '[PRESSURE]',
    '[TEMP]',
    '[VOLTAGE]',
    '[AMP]',
    '[TIME]',
    '[DISTANCE]',
    '[CB_PANEL]',
    '[CB_LABEL]',
    '[ALARM_NAME]'
];

const SPECIFIC_DATA_POLICY = `
Specific data policy:
- Do not use real numbers or exact values.
- Use ONLY placeholders for specific data: ${SPECIFIC_DATA_TEMPLATES.join(', ')}.
- All circuit breaker and alarm info counts as specific data and must use [CB_PANEL], [CB_LABEL], [ALARM_NAME].
`;

function extractJsonArray(text) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.responses)) return parsed.responses;
    } catch {
        const arrayStart = trimmed.indexOf('[');
        const arrayEnd = trimmed.lastIndexOf(']');
        if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
            const slice = trimmed.slice(arrayStart, arrayEnd + 1);
            try {
                const parsed = JSON.parse(slice);
                if (Array.isArray(parsed)) return parsed;
            } catch {}
        }
        const objStart = trimmed.indexOf('{');
        const objEnd = trimmed.lastIndexOf('}');
        if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
            const slice = trimmed.slice(objStart, objEnd + 1);
            try {
                const parsed = JSON.parse(slice);
                if (parsed && Array.isArray(parsed.responses)) return parsed.responses;
            } catch {}
        }
    }
    const matches = trimmed.match(/"([^"]+)"/g);
    if (matches) return matches.map(m => m.replace(/"/g, ''));
    return [];
}

function getGenerationGuidance(difficultyId) {
    const profile = getDifficultyProfile(difficultyId);
    let faultinessLevel = 0;
    if (profile.stress >= 90) faultinessLevel = 3;
    else if (profile.stress >= 70) faultinessLevel = 2;
    else if (profile.stress >= 45) faultinessLevel = 1;

    let stylePrompt = 'Be calm and accurate.';
    if (faultinessLevel === 1) {
        stylePrompt = 'Slightly stressed; mostly accurate with minor omissions.';
    } else if (faultinessLevel === 2) {
        stylePrompt = 'Stressed and task-saturated; be assertive even when wrong. Include short self-corrections like "left... no, right".';
    } else if (faultinessLevel === 3) {
        stylePrompt = 'Highly stressed; be assertive but unreliable. Include confident wrong calls and quick self-corrections.';
    }

    return { stylePrompt, faultinessLevel };
}

function sanitizeSpecificData(text) {
    let output = text;
    output = output.replace(/\b(RWY|RUNWAY)\s*[0-9]{1,2}[A-Z]?\b/gi, 'Runway [RUNWAY]');
    output = output.replace(/\b(heading|hdg)\s*\d+(\.\d+)?\b/gi, 'heading [HEADING]');
    output = output.replace(/\b(altitude|alt)\s*\d+(\.\d+)?\b/gi, 'altitude [ALTITUDE]');
    output = output.replace(/\b(airspeed|speed|ias)\s*\d+(\.\d+)?\b/gi, 'airspeed [AIRSPEED]');
    output = output.replace(/\b(fuel|fuel qty|fuel quantity)\s*\d+(\.\d+)?\b/gi, 'fuel [FUEL]');
    output = output.replace(/\b(pressure|psi)\s*\d+(\.\d+)?\b/gi, 'pressure [PRESSURE]');
    output = output.replace(/\b(temp|temperature)\s*\d+(\.\d+)?\b/gi, 'temperature [TEMP]');
    output = output.replace(/\b\d+(\.\d+)?\s*(volts|v)\b/gi, '[VOLTAGE]');
    output = output.replace(/\b\d+(\.\d+)?\s*(amps|a)\b/gi, '[AMP]');
    output = output.replace(/\b\d+(\.\d+)?\b/g, '[NUM]');

    if (/\b(circuit breaker|breaker)\b/i.test(output) && !/\[CB_LABEL\]|\[CB_PANEL\]/i.test(output)) {
        output = output.replace(/\b(circuit breaker|breaker)\b/gi, '$1 [CB_LABEL] on [CB_PANEL]');
    }
    if (/\b(alarm|warning|caution)\b/i.test(output) && !/\[ALARM_NAME\]/i.test(output)) {
        output = output.replace(/\b(alarm|warning|caution)\b/gi, '$1 [ALARM_NAME]');
    }

    return output.replace(/\s+/g, ' ').trim();
}

function applyFaultySpecificData(text, faultinessLevel) {
    if (faultinessLevel <= 1) return text;
    if (/no,|wait|actually/i.test(text)) return text;

    if (faultinessLevel === 2) {
        return `${text} Left side... no, right side [CB_PANEL].`;
    }
    return `${text} It's the [ALARM_NAME]—no, the [ALARM_NAME] warning.`;
}

function normalizeResponse(text, faultinessLevel) {
    if (!text || typeof text !== 'string') return '';
    const sanitized = sanitizeSpecificData(text);
    return applyFaultySpecificData(sanitized, faultinessLevel);
}

async function generateResponses(scenario, role, difficulty) {
    const collected = new Set();
    const maxAttempts = 4;
    let attempt = 0;
    const guidance = getGenerationGuidance(difficulty.id);

    while (collected.size < BATCH_SIZE && attempt < maxAttempts) {
        const remaining = BATCH_SIZE - collected.size;
        const exclude = collected.size > 0
            ? `Avoid repeating any of these exact responses: ${JSON.stringify(Array.from(collected))}`
            : '';

        const prompt = `
        Role: ${role === 'FO' ? 'First Officer (Co-Pilot)' : 'Cabin Crew Member'}
        Scenario: ${scenario.description}
        Condition: ${difficulty.prompt}
        Style: ${guidance.stylePrompt}
        ${SPECIFIC_DATA_POLICY}

        Task: Generate ${remaining} unique, short spoken responses (1-2 sentences max) that this character would say to the Captain in this situation.
        Format: Return ONLY a JSON array of strings. Example: ["Response 1", "Response 2"]
        Do not include any other text, markdown, or explanations.
        ${exclude}
        `;

        try {
            const response = await fetchWithRetry(OLLAMA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: MODEL,
                    prompt: prompt,
                    stream: false,
                    format: "json",
                    options: {
                        temperature: 0.8,
                        top_p: 0.9
                    }
                })
            });

            const data = await response.json();
            const raw = typeof data.response === 'string' ? data.response : '';
            const extracted = extractJsonArray(raw);
            if (extracted.length === 0) {
                console.warn(`Failed to parse JSON from Ollama on attempt ${attempt + 1}. Raw: ${raw.slice(0, 200)}`);
            }
            extracted.forEach(item => {
                const normalized = normalizeResponse(item, guidance.faultinessLevel);
                if (normalized) {
                    collected.add(normalized);
                }
            });
        } catch (error) {
            console.error(`Generation failed for ${scenario.id}/${role}/${difficulty.id} on attempt ${attempt + 1}:`, error);
        }

        attempt += 1;
    }

    return Array.from(collected).slice(0, BATCH_SIZE);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = 3) {
    if (typeof fetch !== 'function') {
        throw new Error('Global fetch is not available. Use Node 18+ or add a fetch polyfill.');
    }
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            return response;
        } catch (error) {
            clearTimeout(timeout);
            lastError = error;
            if (attempt < retries) {
                await sleep(500 * attempt);
            }
        }
    }
    throw lastError;
}

async function preflightOllama() {
    try {
        const response = await fetchWithRetry(OLLAMA_HEALTH_URL, { method: 'GET' }, 2);
        const data = await response.json();
        const models = Array.isArray(data.models) ? data.models.map(m => m.name) : [];
        const hasModel = models.some(name => name.includes(MODEL));
        if (!hasModel) {
            console.error(`Ollama is running but model "${MODEL}" is not available. Run: ollama pull ${MODEL}`);
            process.exit(1);
        }
        console.log(`Ollama ready. Models: ${models.join(', ') || 'none reported'}`);
    } catch (error) {
        console.error('Ollama preflight failed. Is Ollama running at http://localhost:11434?');
        console.error(error);
        process.exit(1);
    }
}

function getDifficultyProfile(difficultyId) {
    switch (difficultyId) {
        case 'rookie':
            return { vagueness: 5, stress: 5, accuracy: 'high' };
        case 'amateur':
            return { vagueness: 15, stress: 20, accuracy: 'high' };
        case 'intermediate':
            return { vagueness: 35, stress: 45, accuracy: 'medium' };
        case 'advanced':
            return { vagueness: 55, stress: 65, accuracy: 'medium' };
        case 'pro':
            return { vagueness: 75, stress: 80, accuracy: 'low' };
        case 'devil':
            return { vagueness: 90, stress: 95, accuracy: 'misleading' };
        default:
            return { vagueness: 40, stress: 50, accuracy: 'medium' };
    }
}

async function insertInBatches(records) {
    let inserted = 0;
    for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
        const batch = records.slice(i, i + INSERT_BATCH_SIZE);
        const { error } = await supabase
            .from('skylinetragedy_npc_responses')
            .insert(batch);
        if (error) {
            console.error('Supabase Insert Error:', error);
        } else {
            inserted += batch.length;
            console.log(`Inserted batch: ${batch.length}`);
        }
    }
    return inserted;
}

async function clearExistingResponses() {
    const { error } = await supabase
        .from('skylinetragedy_npc_responses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
        console.error('Supabase Clear Error:', error);
        process.exit(1);
    }
    console.log('Cleared existing NPC responses.');
}

async function main() {
    console.log('Starting NPC Response Generation...');
    await preflightOllama();
    await clearExistingResponses();
    
    let totalInserted = 0;
    const allRecords = [];

    for (const scenario of SCENARIOS) {
        for (const role of scenario.roles) {
            for (const diff of DIFFICULTIES) {
                console.log(`Generating: ${scenario.id} | ${role} | ${diff.id}`);
                
                const responses = await generateResponses(scenario, role, diff);
                
                if (responses.length === 0) {
                    console.log(`Generated 0 responses for ${scenario.id} | ${role} | ${diff.id}`);
                    continue;
                }

                const sample = responses[0];
                console.log(`Sample: ${sample}`);
                console.log(`Generated ${responses.length} responses for ${scenario.id} | ${role} | ${diff.id}`);
                const profile = getDifficultyProfile(diff.id);
                const records = responses.map(content => ({
                    scenario_id: scenario.id,
                    role: role,
                    difficulty: diff.id,
                    content: content,
                    vagueness: profile.vagueness,
                    stress_level: profile.stress,
                    accuracy_level: profile.accuracy
                }));

                allRecords.push(...records);
            }
        }
    }

    if (allRecords.length > 0) {
        const inserted = await insertInBatches(allRecords);
        totalInserted += inserted;
    }

    console.log(`Generation Complete. Total records: ${totalInserted}`);
}

main().catch(console.error);
