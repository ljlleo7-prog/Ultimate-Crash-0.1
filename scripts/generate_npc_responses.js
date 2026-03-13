
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3';
const BATCH_SIZE = 5; // Responses per scenario

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Scenarios Definition
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
    { 
        id: 'rookie', 
        prompt: 'You are a calm, competent, and helpful professional. Your response should be accurate, clear, and follow standard procedure. You are not stressed.' 
    },
    { 
        id: 'intermediate', 
        prompt: 'You are somewhat stressed. Your response might be slightly delayed or less formal. You are mostly accurate but might miss a detail.' 
    },
    { 
        id: 'devil', 
        prompt: 'You are extremely stressed, panicked, or incompetent. Your response should be vague, unhelpful, or slightly inaccurate. You might scream or mutter. You are overwhelmed.' 
    }
];

// Helper: Call Ollama
async function generateResponses(scenario, role, difficulty) {
    const prompt = `
    Role: ${role === 'FO' ? 'First Officer (Co-Pilot)' : 'Cabin Crew Member'}
    Scenario: ${scenario.description}
    Condition: ${difficulty.prompt}
    
    Task: Generate ${BATCH_SIZE} unique, short spoken responses (1-2 sentences max) that this character would say to the Captain in this situation.
    Format: Return ONLY a JSON array of strings. Example: ["Response 1", "Response 2"]
    Do not include any other text.
    `;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false,
                format: "json" 
            })
        });

        if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
        
        const data = await response.json();
        // Parse the JSON response from Ollama (it might be wrapped in text)
        // Since we requested format: json, it should be clean, but let's be safe
        let responses = [];
        try {
            const parsed = JSON.parse(data.response);
            if (Array.isArray(parsed)) responses = parsed;
            else if (parsed.responses && Array.isArray(parsed.responses)) responses = parsed.responses;
        } catch (e) {
            console.warn('Failed to parse JSON from Ollama, trying regex fallback');
            const matches = data.response.match(/"([^"]+)"/g);
            if (matches) responses = matches.map(m => m.replace(/"/g, ''));
        }

        return responses.slice(0, BATCH_SIZE);
    } catch (error) {
        console.error(`Generation failed for ${scenario.id}/${role}/${difficulty.id}:`, error);
        return [];
    }
}

// Main Loop
async function main() {
    console.log('Starting NPC Response Generation...');
    
    let totalInserted = 0;

    for (const scenario of SCENARIOS) {
        for (const role of scenario.roles) {
            for (const diff of DIFFICULTIES) {
                console.log(`Generating: ${scenario.id} | ${role} | ${diff.id}`);
                
                const responses = await generateResponses(scenario, role, diff);
                
                if (responses.length === 0) continue;

                const records = responses.map(content => ({
                    scenario_id: scenario.id,
                    role: role,
                    difficulty: diff.id,
                    content: content,
                    vagueness: diff.id === 'devil' ? 90 : (diff.id === 'intermediate' ? 40 : 10),
                    stress_level: diff.id === 'devil' ? 95 : (diff.id === 'intermediate' ? 50 : 10),
                    accuracy_level: diff.id === 'devil' ? 'low' : (diff.id === 'intermediate' ? 'medium' : 'high')
                }));

                const { error } = await supabase
                    .from('skylinetragedy_npc_responses')
                    .insert(records);

                if (error) {
                    console.error('Supabase Insert Error:', error);
                } else {
                    totalInserted += records.length;
                    console.log(`Saved ${records.length} responses.`);
                }
            }
        }
    }

    console.log(`Generation Complete. Total records: ${totalInserted}`);
}

main().catch(console.error);
