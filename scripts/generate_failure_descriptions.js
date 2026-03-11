import fs from 'fs';
import path from 'path';
import EngineFailures from '../src/services/failures/types/EngineFailures.js';
import ControlFailures from '../src/services/failures/types/ControlFailures.js';
import SystemFailures from '../src/services/failures/types/SystemFailures.js';
import EnvironmentFailures from '../src/services/failures/types/EnvironmentFailures.js';
import SensorFailures from '../src/services/failures/types/SensorFailures.js';

const args = process.argv.slice(2);
const options = {
    model: 'llama3',
    count: 10,
    out: 'src/data/failureDescriptions.generated.json',
    host: 'http://localhost:11434'
};

for (const arg of args) {
    if (arg.startsWith('--model=')) options.model = arg.split('=')[1];
    else if (arg.startsWith('--count=')) options.count = Number(arg.split('=')[1]);
    else if (arg.startsWith('--out=')) options.out = arg.split('=')[1];
    else if (arg.startsWith('--host=')) options.host = arg.split('=')[1];
}

if (!Number.isFinite(options.count) || options.count < 10) {
    console.error('count must be >= 10');
    process.exit(1);
}

const defaultContext = {
    engineIndex: 0,
    surface: 'elevator',
    difficulty: 'pro'
};

const failureGroups = [
    EngineFailures,
    ControlFailures,
    SystemFailures,
    EnvironmentFailures,
    SensorFailures
];

const normalizeDescription = (desc) => {
    if (!desc) return {};
    if (typeof desc === 'string') return { text: desc };
    return { ...desc };
};

const resolveDescription = (stage, context) => {
    if (!stage || !stage.description) return {};
    if (typeof stage.description === 'function') {
        return normalizeDescription(stage.description(context));
    }
    return normalizeDescription(stage.description);
};

const buildPrompt = ({ failure, stageName, baseDesc, count }) => {
    const baseText = baseDesc.text || '';
    const systemAlert = baseDesc.system_alert || '';
    const sound = baseDesc.sound || '';
    const visual = baseDesc.visual || '';
    const smell = baseDesc.smell || '';
    return [
        'Generate nuanced flight-sim failure stage descriptions.',
        `Return JSON only: {"variants":[{"text":"..."}]}.`,
        `Provide exactly ${count} variants.`,
        'Constraints:',
        '- Each text is 60-140 characters.',
        '- Preserve meaning, stage intent, and level of urgency.',
        '- Avoid profanity and avoid mentioning specific aircraft model.',
        '- If the base has system alert text, avoid repeating the alert verbatim.',
        `Failure id: ${failure.id}`,
        `Failure name: ${failure.name}`,
        `Category: ${failure.category}`,
        `Stage: ${stageName}`,
        `Base text: ${baseText}`,
        `System alert: ${systemAlert}`,
        `Sound: ${sound}`,
        `Visual: ${visual}`,
        `Smell: ${smell}`
    ].join('\n');
};

const parseVariants = (responseText) => {
    const trimmed = responseText.trim();
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.variants)) return parsed.variants;
    } catch (err) {
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed.variants)) return parsed.variants;
        }
        throw err;
    }
    return [];
};

const generateVariants = async ({ prompt, model, host }) => {
    const res = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
            format: 'json',
            options: { temperature: 0.9, top_p: 0.9 }
        })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return parseVariants(data.response || '');
};

const buildFailureIndex = () => {
    const failures = {};
    failureGroups.forEach(group => {
        Object.values(group).forEach(def => {
            failures[def.id] = def;
        });
    });
    return failures;
};

const main = async () => {
    const failures = buildFailureIndex();
    const output = {
        generatedAt: new Date().toISOString(),
        model: options.model,
        count: options.count,
        failures: {}
    };

    for (const failure of Object.values(failures)) {
        const failureEntry = {
            id: failure.id,
            name: failure.name,
            category: failure.category,
            stages: {}
        };
        const stages = failure.stages || {};
        for (const stageName of Object.keys(stages)) {
            const baseDesc = resolveDescription(stages[stageName], defaultContext);
            const prompt = buildPrompt({ failure, stageName, baseDesc, count: options.count });
            console.log(`Generating: ${failure.id} / ${stageName}`);
            const variants = await generateVariants({
                prompt,
                model: options.model,
                host: options.host
            });
            failureEntry.stages[stageName] = {
                base: baseDesc,
                variants
            };
        }
        output.failures[failure.id] = failureEntry;
    }

    const outPath = path.resolve(process.cwd(), options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Wrote ${outPath}`);
};

main().catch(err => {
    console.error(err);
    process.exit(1);
});
