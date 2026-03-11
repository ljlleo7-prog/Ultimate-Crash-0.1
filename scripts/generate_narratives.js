import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';

dotenv.config();

const args = process.argv.slice(2);
const options = {
    inputsPath: 'scripts/narrative_inputs.json',
    ollamaUrl: 'http://localhost:11434/api/generate',
    model: 'llama3'
};

for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--inputs' && args[i + 1]) {
        options.inputsPath = args[i + 1];
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
            console.warn(`Narrative inputs file not found at ${path}. Create it or pass --inputs <path>.`);
            return [];
        }
        throw error;
    }
}

function buildSignature(symptoms) {
    return symptoms
        .map(s => `${s.sensory_type || ''}:${s.description || ''}`.trim())
        .sort()
        .join('|');
}

function buildPrompt(symptoms) {
    const symptomList = symptoms.map(s => `- ${s.sensory_type}: ${s.description}`).join('\n');
    return `You are generating a short pilot sensory narration for a flight simulator.
Rules:
- Describe sensations, not system names or failure codes.
- Do not mention cockpit instruments or UI indicators.
- Do not describe aircraft motion that is already simulated by physics.
- Keep it to one or two sentences.
Symptoms:
${symptomList}
Output only the narration text.`;
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

async function upsertNarrative(entry) {
    const { error } = await supabase
        .from('skylinetragedy_narratives')
        .upsert([entry], { onConflict: 'signature' });
    if (error) throw error;
}

async function generateNarratives() {
    const inputs = await readJson(options.inputsPath);
    if (!Array.isArray(inputs) || inputs.length === 0) {
        console.log('No narrative inputs found.');
        return;
    }

    for (const input of inputs) {
        const symptoms = Array.isArray(input.symptoms) ? input.symptoms : [];
        if (symptoms.length === 0) continue;
        const signature = buildSignature(symptoms);
        const prompt = buildPrompt(symptoms);
        const content = await callOllama(prompt);
        await upsertNarrative({
            signature,
            content,
            symptoms,
            source_document: input.source_document || null
        });
        console.log('Saved narrative for signature', signature);
    }
}

await generateNarratives();
