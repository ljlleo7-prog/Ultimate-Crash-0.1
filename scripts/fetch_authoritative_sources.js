import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const options = {
    output: path.join(__dirname, 'raw_system_data.json'),
    model: 'llama3',
    ollamaUrl: 'http://localhost:11434/api/generate',
    chunkSize: 8000,
    overlap: 500,
    maxPages: 50, // Limit pages for testing/performance
    targetSystems: ['HYDRAULIC', 'ELECTRICAL', 'PNEUMATIC', 'FLIGHT_CONTROLS', 'LANDING_GEAR', 'AVIONICS', 'PROPULSION']
};

// Parse args
for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--output' && args[i + 1]) { options.output = args[i + 1]; i++; continue; }
    if (arg === '--model' && args[i + 1]) { options.model = args[i + 1]; i++; continue; }
    if (arg === '--ollama-url' && args[i + 1]) { options.ollamaUrl = args[i + 1]; i++; continue; }
    if (arg === '--chunk-size' && args[i + 1]) { options.chunkSize = Number(args[i + 1]); i++; continue; }
    if (arg === '--max-pages' && args[i + 1]) { options.maxPages = Number(args[i + 1]); i++; continue; }
}

const sources = [
    {
        name: 'FAA_Airframe_Handbook',
        url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-31B_Aviation_Maintenance_Technician_Handbook.pdf',
        type: 'pdf'
    },
    {
        name: 'FAA_Powerplant_Handbook',
        url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/amt_powerplant_handbook.pdf',
        type: 'pdf'
    },
    {
        name: 'FAA_General_Handbook',
        url: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/amtg_handbook.pdf',
        type: 'pdf'
    },
    {
        name: 'B737_NG_FCTM',
        url: 'https://aviation-is.better-than.tv/B737NG_FCTM_(31-10-05).pdf',
        type: 'pdf'
    }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadPDF(url) {
    console.log(`Downloading PDF from ${url}...`);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
    } catch (error) {
        console.error(`Error downloading PDF ${url}:`, error);
        return null;
    }
}

async function extractTextFromPDF(buffer) {
    console.log(`Extracting text from PDF (${buffer.length} bytes)...`);
    try {
        const data = await pdf(buffer, {
            max: options.maxPages // Limit pages to avoid huge processing time
        });
        return data.text;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        return '';
    }
}

function chunkText(text, size, overlap) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        chunks.push(text.slice(start, end));
        start += size - overlap;
    }
    return chunks;
}

async function callOllama(prompt) {
    try {
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
            const text = await response.text();
            throw new Error(`Ollama error ${response.status}: ${text}`);
        }
        const data = await response.json();
        return String(data.response || '').trim();
    } catch (error) {
        console.error('Ollama call failed:', error.message);
        return null;
    }
}

function extractJson(text) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }
    try {
        return JSON.parse(text.slice(start, end + 1));
    } catch (e) {
        console.warn('JSON parse error:', e.message);
        return null;
    }
}

async function processChunk(chunk, sourceName) {
    const prompt = `You are an expert aviation systems engineer extracting system architecture for a failure simulation.
    
    Analyze the following text from ${sourceName}. Identify specific AIRCRAFT COMPONENTS, their SYSTEM category, FUNCTIONAL DEPENDENCIES (what they need to work), and FAILURE MODES.
    Also identify the APPLICABILITY of the component (e.g. JET, PROPELLER, FBW, MECHANICAL, GENERAL).

    Target Systems: ${options.targetSystems.join(', ')}
    
    Ignore general descriptions, aerodynamic theory, tools, ground support equipment, test sets, and consumables (e.g. oil, grease, rivets, wrenches, jacks). Focus ONLY on installed aircraft components.
    
    Return a JSON ARRAY of objects with this schema:
    [
      {
        "component": "Component Name (e.g. Hydraulic Pump A, Flap Actuator)",
        "system": "System Name (e.g. HYDRAULIC, FLIGHT_CONTROLS)",
        "dependencies": ["List of components this component DEPENDS on (e.g. Engine 1, AC Bus 1)"],
        "failure_modes": ["List of failure modes (e.g. LEAK, JAMMED, OVERHEAT)"],
        "description": "Brief description of function",
        "applicability": ["List of tags: JET, PROP, FBW, MECH, GENERAL"]
      }
    ]
    
    Text Chunk:
${chunk}

JSON Output:`;

    const response = await callOllama(prompt);
    if (!response) return [];
    
    const data = extractJson(response);
    return data || [];
}

async function main() {
    console.log('Starting Authoritative System Source Fetch...');
    console.log(`Targeting ${sources.length} manuals.`);
    console.log(`Options: Max Pages=${options.maxPages}, Chunk Size=${options.chunkSize}`);

    let allComponents = [];
    
    // Load existing data if any
    try {
        const existing = await fs.readFile(options.output, 'utf8');
        allComponents = JSON.parse(existing);
        console.log(`Loaded ${allComponents.length} existing components.`);
    } catch (e) {
        // File doesn't exist, start fresh
    }

    for (const source of sources) {
        console.log(`Processing ${source.name}...`);
        
        const pdfBuffer = await downloadPDF(source.url);
        if (!pdfBuffer) continue;

        const text = await extractTextFromPDF(pdfBuffer);
        if (!text) continue;

        console.log(`Extracted ${text.length} characters.`);
        const chunks = chunkText(text, options.chunkSize, options.overlap);
        console.log(`Split into ${chunks.length} chunks.`);

        for (let i = 0; i < chunks.length; i++) {
            console.log(`  Processing chunk ${i + 1}/${chunks.length}...`);
            const components = await processChunk(chunks[i], source.name);
            
            if (components.length > 0) {
                console.log(`    Found ${components.length} components.`);
                allComponents.push(...components);
                
                // Incremental save
                await fs.writeFile(options.output, JSON.stringify(allComponents, null, 2));
            }
            
            await delay(500); // Politeness/Throttle
        }
    }

    console.log(`Fetch Complete. Total components: ${allComponents.length}`);
    console.log(`Saved to ${options.output}`);
}

main().catch(console.error);
