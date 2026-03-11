import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const args = process.argv.slice(2);
const options = {
  output: path.join(__dirname, 'atc_phrase_templates.json'),
  model: 'llama3',
  ollamaUrl: 'http://localhost:11434/api/generate',
  chunkSize: 8000,
  overlap: 500,
  maxPages: 80,
  maxLinkedPdfs: 6,
  saveJson: true
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--output' && args[i + 1]) { options.output = args[i + 1]; i += 1; continue; }
  if (arg === '--model' && args[i + 1]) { options.model = args[i + 1]; i += 1; continue; }
  if (arg === '--ollama-url' && args[i + 1]) { options.ollamaUrl = args[i + 1]; i += 1; continue; }
  if (arg === '--chunk-size' && args[i + 1]) { options.chunkSize = Number(args[i + 1]); i += 1; continue; }
  if (arg === '--overlap' && args[i + 1]) { options.overlap = Number(args[i + 1]); i += 1; continue; }
  if (arg === '--max-pages' && args[i + 1]) { options.maxPages = Number(args[i + 1]); i += 1; continue; }
  if (arg === '--max-linked-pdfs' && args[i + 1]) { options.maxLinkedPdfs = Number(args[i + 1]); i += 1; continue; }
  if (arg === '--no-save-json') { options.saveJson = false; }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Service role is required for writes under RLS.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sources = [
  //{ name: 'ICAO_PANS_ATM_INDEX', url: 'https://www.icao.int/airnavigation/Pages/pans-atm.aspx', type: 'html' },
  //{ name: 'ICAO_PANS_ATM_APAC_GUIDANCE', url: 'https://www.icao.int/sites/default/files/APAC/Documents/edocs/ATM/APAC-Guidance-Material-for-the-Implementation-of-Amendment-1-to-15th-Edition-of-the-PANS-ATM-Doc4444.pdf', type: 'pdf' },
  //{ name: 'FAA_JO_7110_65_HTML', url: 'https://www.faa.gov/regulations_policies/orders_notices/index.cfm/go/document.current/documentnumber/7110.65', type: 'html' },
  //{ name: 'FAA_JO_7110_65_PDF', url: 'https://www.faa.gov/documentlibrary/media/order/atc.pdf', type: 'pdf' },
  { name: 'FAA_PCG_HTML', url: 'https://www.faa.gov/air_traffic/publications/atpubs/pcg_html/', type: 'html' },
  { name: 'FAA_PCG_PDF', url: 'https://www.faa.gov/air_traffic/publications/media/PCG_Chg_2_dtd_3-21-24.pdf', type: 'pdf' },
  { name: 'UK_CAP_413_PDF', url: 'https://publicapps.caa.co.uk/docs/33/CAP413.pdf', type: 'pdf' },
  { name: 'CAAC_RADIOTELEPHONY_PDF', url: 'https://www.caac.gov.cn/XXGK/XXGK/BZGF/HYBZ/201511/P020170804579259214829.pdf', type: 'pdf' }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (message) => {
  console.log(`[ATC Pipeline] ${message}`);
};

const stripHtml = (html) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const extractPdfLinks = (html, baseUrl) => {
  const links = new Set();
  const regex = /href=["']([^"']+\.pdf[^"']*)["']/gi;
  let match = regex.exec(html);
  while (match) {
    try {
      const url = new URL(match[1], baseUrl).toString();
      links.add(url);
    } catch (error) {
      null;
    }
    match = regex.exec(html);
  }
  return Array.from(links);
};

const downloadPDF = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
};

const extractTextFromPDF = async (buffer) => {
  const data = await pdf(buffer, { max: options.maxPages });
  return data.text || '';
};

const fetchHtml = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch HTML: ${response.status} ${response.statusText}`);
  }
  return response.text();
};

const chunkText = (text, size, overlap) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  return chunks;
};

const callOllama = async (prompt, meta = {}) => {
  if (meta.chunkIndex !== undefined && meta.chunkTotal !== undefined) {
    log(`Ollama batch ${meta.chunkIndex + 1}/${meta.chunkTotal} (${meta.chunkLength} chars, model=${options.model})`);
  }
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
};

const extractJsonArray = (text) => {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    return null;
  }
};

const normalizeTemplate = (template, source) => {
  if (!template || !template.phrase_template) return null;
  const phrase = String(template.phrase_template).trim();
  if (!phrase) return null;
  const intent = String(template.intent || '').trim().toLowerCase();
  const speaker = String(template.speaker || '').trim().toUpperCase();
  const speakerRoleRaw = String(template.speaker_role || '').trim().toLowerCase();
  if (!intent || !speaker) return null;
  const params = Array.from(new Set((phrase.match(/\[([A-Z_]+)\]/g) || []).map(token => token.replace(/\[|\]/g, ''))));
  const speakerRole = speakerRoleRaw || (speaker === 'PILOT' ? 'pilot' : 'atc');
  const language = String(template.language || '').trim().toUpperCase() || (String(source).includes('CAAC') ? 'CN' : 'EN');
  const sourceNamespace = language === 'CN' ? `CN:${source}` : source;
  return {
    intent,
    speaker,
    speaker_role: speakerRole,
    phrase_template: phrase,
    parameters: Array.isArray(template.parameters) && template.parameters.length > 0 ? template.parameters : params,
    phase_of_flight: String(template.phase_of_flight || '').trim().toLowerCase() || null,
    language,
    source: sourceNamespace || template.source || null
  };
};

const buildPrompt = (chunk, sourceName) => {
  return `Extract standard aviation radiotelephony phraseology from ${sourceName}.
Rules:
- Return ONLY standard phraseology instructions or clearances, no explanations.
- Convert each phrase into a parameterized template.
- Use square-bracket placeholders like [CALLSIGN], [ALTITUDE], [RUNWAY], [WAYPOINT], [HEADING], [SPEED], [FREQUENCY], [QNH], [DIRECTION], [AIRCRAFT_TYPE], [APPROACH_TYPE].
- Keep wording canonical and concise.
- Classify intent and phase of flight.
- Speaker is ATC or PILOT.
- Speaker role must be one of: center, ground, delivery, tower, departure, approach, emergency, atis, unicom, pilot.
Intents: clearance, taxi, takeoff, climb, descent, vector, speed_control, approach, landing, handoff, information, emergency, checkin.
Phases: preflight, taxi, takeoff, climb, cruise, descent, approach, landing, ground, enroute.
Output JSON array with:
[{ "intent": "...", "speaker": "...", "speaker_role": "...", "language": "...", "phrase_template": "...", "parameters": ["..."], "phase_of_flight": "...", "source": "${sourceName}" }]
Text:
${chunk}
JSON:`;
};

const processChunk = async (chunk, sourceName, meta = {}) => {
  const prompt = buildPrompt(chunk, sourceName);
  const response = await callOllama(prompt, meta);
  const parsed = extractJsonArray(response);
  if (!parsed) return [];
  const normalized = parsed.map(item => normalizeTemplate(item, sourceName)).filter(Boolean);
  return normalized;
};

const upsertTemplates = async (templates) => {
  if (!templates.length) return 0;
  const { error } = await supabase
    .from('skylinetragedy_atc_phrase_templates')
    .upsert(templates, {
      onConflict: 'intent,speaker,speaker_role,language,phrase_template,phase_of_flight,source'
    });
  if (error) throw error;
  return templates.length;
};

const ensurePhraseologyTable = async () => {
  const { error } = await supabase
    .from('skylinetragedy_atc_phrase_templates')
    .select('id')
    .limit(1);
  if (error) {
    log('Supabase table check failed for skylinetragedy_atc_phrase_templates.');
    log('Apply the SQL in src/services/skylinetragedy/supabase_schema.sql and refresh schema cache.');
    throw error;
  }
  log('Supabase table skylinetragedy_atc_phrase_templates is available.');
};

const fetchSourceTexts = async (source) => {
  log(`Fetching source ${source.name}: ${source.url} (${source.type})`);
  if (source.type === 'pdf') {
    const buffer = await downloadPDF(source.url);
    const text = await extractTextFromPDF(buffer);
    return [{ text, label: source.name, sourceUrl: source.url }];
  }

  const html = await fetchHtml(source.url);
  const plainText = stripHtml(html);
  const texts = [{ text: plainText, label: source.name, sourceUrl: source.url }];

  const pdfLinks = extractPdfLinks(html, source.url).slice(0, options.maxLinkedPdfs);
  log(`Discovered ${pdfLinks.length} linked PDFs for ${source.name}`);
  for (const pdfUrl of pdfLinks) {
    try {
      const buffer = await downloadPDF(pdfUrl);
      const text = await extractTextFromPDF(buffer);
      texts.push({ text, label: `${source.name}_PDF`, sourceUrl: pdfUrl });
    } catch (error) {
      null;
    }
  }

  return texts;
};

const main = async () => {
  log(`Env file: ${envPath}`);
  log(`Using service role key for Supabase writes.`);
  log(`Model: ${options.model}`);
  log(`Ollama URL: ${options.ollamaUrl}`);
  log(`Chunk size: ${options.chunkSize}, overlap: ${options.overlap}, max pages: ${options.maxPages}`);
  log(`Sources: ${sources.length}`);
  await ensurePhraseologyTable();
  const allTemplates = [];
  for (const source of sources) {
    let texts;
    try {
      texts = await fetchSourceTexts(source);
    } catch (error) {
      log(`Failed to fetch ${source.name}: ${error.message}`);
      continue;
    }

    for (const entry of texts) {
      if (!entry.text) continue;
      log(`Parsing ${entry.label} (${entry.sourceUrl})`);
      log(`Text size: ${entry.text.length} chars`);
      const chunks = chunkText(entry.text, options.chunkSize, options.overlap);
      log(`Chunks: ${chunks.length}`);
      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        try {
          log(`Chunk ${i + 1}/${chunks.length} for ${entry.label} (${chunk.length} chars)`);
          const extracted = await processChunk(chunk, entry.label, {
            chunkIndex: i,
            chunkTotal: chunks.length,
            chunkLength: chunk.length
          });
          if (extracted.length) {
            allTemplates.push(...extracted);
            await upsertTemplates(extracted);
            log(`Stored ${extracted.length} templates (total: ${allTemplates.length})`);
            if (options.saveJson) {
              await fs.writeFile(options.output, JSON.stringify(allTemplates, null, 2));
            }
          } else {
            log(`No templates extracted for chunk ${i + 1}/${chunks.length}`);
          }
        } catch (error) {
          log(`Chunk ${i + 1}/${chunks.length} failed: ${error.message}`);
          null;
        }
        await delay(350);
      }
    }
  }
  log(`Pipeline complete. Total templates: ${allTemplates.length}`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
