import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const options = {
  input: path.join(__dirname, 'autopilot_metrics.json'),
  output: path.join(__dirname, 'autopilot_param_proposals.json'),
  model: 'llama3',
  ollamaUrl: 'http://localhost:11434/api/generate'
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--input' && args[i + 1]) { options.input = args[i + 1]; i += 1; continue; }
  if (arg === '--output' && args[i + 1]) { options.output = args[i + 1]; i += 1; continue; }
  if (arg === '--model' && args[i + 1]) { options.model = args[i + 1]; i += 1; continue; }
  if (arg === '--ollama-url' && args[i + 1]) { options.ollamaUrl = args[i + 1]; i += 1; continue; }
}

const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => {
      const value = values[idx];
      const num = Number(value);
      row[h] = Number.isFinite(num) ? num : value;
    });
    return row;
  });
};

const computeStats = (rows) => {
  const stats = {};
  rows.forEach(row => {
    Object.entries(row).forEach(([key, value]) => {
      if (!Number.isFinite(value)) return;
      if (!stats[key]) {
        stats[key] = { min: value, max: value, sum: 0, sumSq: 0, count: 0 };
      }
      const s = stats[key];
      s.min = Math.min(s.min, value);
      s.max = Math.max(s.max, value);
      s.sum += value;
      s.sumSq += value * value;
      s.count += 1;
    });
  });
  const result = {};
  Object.entries(stats).forEach(([key, s]) => {
    const mean = s.sum / s.count;
    const variance = Math.max(0, (s.sumSq / s.count) - mean * mean);
    result[key] = {
      min: s.min,
      max: s.max,
      mean,
      stdev: Math.sqrt(variance)
    };
  });
  return result;
};

const buildPrompt = (summary, lastSample) => {
  return `You are tuning an aircraft autopilot for smoothness and accuracy.
Output JSON only with keys: speedPID, vsPID, altitudePID, pitchPID, rollPID, headingPID, glideslopePID, localizerPID.
Each PID value should be an object with kp, ki, kd, min, max, smoothing.
Use conservative adjustments and avoid over-aggressive gains.
Metrics summary:
${JSON.stringify(summary)}
Last sample:
${JSON.stringify(lastSample)}
Return only JSON.`;
};

const extractJson = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

const callOllama = async (prompt) => {
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

const main = async () => {
  const inputText = await fs.readFile(options.input, 'utf8');
  const ext = path.extname(options.input).toLowerCase();
  const rows = ext === '.csv' ? parseCsv(inputText) : JSON.parse(inputText);
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    throw new Error('Input data is empty or invalid.');
  }
  const summary = computeStats(list);
  const lastSample = list[list.length - 1];
  const prompt = buildPrompt(summary, lastSample);
  const response = await callOllama(prompt);
  const parsed = extractJson(response) || { raw: response };
  await fs.writeFile(options.output, JSON.stringify(parsed, null, 2));
  console.log(`Saved proposal to ${options.output}`);
};

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
