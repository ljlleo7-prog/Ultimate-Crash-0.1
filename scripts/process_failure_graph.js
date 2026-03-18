import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getManualDefinition } from './manual_failure_definitions.js';
import { applyLogicRules } from './failure_logic_rules.js';
import {
    FAILURE_GRAPH_ARTIFACT_FILE,
    FAILURE_GRAPH_EDGES_FILE,
    FAILURE_GRAPH_EFFECTS_FILE,
    FAILURE_GRAPH_FAILURES_FILE,
    buildArtifactFromCompatibilityRows,
    createArtifactVersion,
    createValidationReport,
    writeJson
} from './failure_graph_artifact_pipeline.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const INPUT_FILE = path.join(__dirname, 'raw_system_data.json');
const OUTPUT_FILE = FAILURE_GRAPH_FAILURES_FILE;
const EFFECTS_FILE = FAILURE_GRAPH_EFFECTS_FILE;
const EDGES_FILE = FAILURE_GRAPH_EDGES_FILE;
const PROPOSALS_FILE = path.join(__dirname, 'skylinetragedy_revision_proposals.json');
const BATCH_SIZE = 100;

const normalize = (str) => {
    let s = str.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (s === 'PROPELLSION' || s === 'PROPELSION') return 'PROPULSION';
    return s;
};

const FLIGHT_STATE_RULES = {
    LANDING_GEAR: { var: 'phase', val: ['TAKEOFF', 'LANDING', 'TAXI'] },
    FLIGHT_CONTROLS: { var: 'airspeed', op: '>', val: 50 },
    ANTI_ICE: { var: 'icing_conditions', val: true },
    PRESSURIZATION: { var: 'altitude', op: '>', val: 10000 }
};

const INVALID_SYSTEMS = [
    'TOOLS', 'GROUND_SUPPORT', 'MAINTENANCE', 'TEST_EQUIPMENT', 'CONSUMABLES',
    'UNKNOWN', 'GROUND_HANDLING', 'EXTERNAL_POWER'
];

const INVALID_KEYWORDS = [
    'WRENCH', 'SCREWDRIVER', 'PLIER', 'HAMMER', 'MALLET', 'JACK', 'STAND',
    'DOLLY', 'CART', 'TESTER', 'MULTIMETER', 'BORESCOPE', 'PROTRACTOR',
    'SCALE', 'CALIPER', 'GAUGE_BLOCK', 'MICROMETER', 'TORQUE_WRENCH',
    'LADDER', 'PLATFORM', 'CHOCK', 'CONE', 'TOW_BAR', 'GPU', 'ASU',
    'ACU', 'LAVATORY_SERVICE', 'POTABLE_WATER_SERVICE', 'DEICING_TRUCK',
    'OIL', 'GREASE', 'SEALANT', 'PAINT', 'PRIMER', 'SOLVENT', 'CLEANER',
    'RIVET', 'BOLT', 'NUT', 'WASHER', 'SCREW', 'PIN', 'CLIP', 'CLAMP',
    'SHOP', 'TOOL_BOX', 'WORKBENCH', 'SHEAR', 'DRILL', 'GRINDER', 'SANDER',
    'WELDER', 'CUTTER', 'BENDER', 'FORMER', 'LATHE', 'MILLING',
    'SAW', 'PLANER', 'ROUTER', 'SHAPER', 'REAMER',
    'CHISEL', 'PUNCH', 'SCRIBER', 'DIVIDER', 'TRAMMEL', 'CALIPER',
    'PLUMB', 'DRILL_PRESS', 'ARBOR_PRESS'
];

let AIRCRAFT_MODELS = {
    GENERIC: { tags: ['GENERAL'] }
};

try {
    const dbPath = path.join(__dirname, '../src/data/aircraftDatabase.json');
    const dbContent = await fs.readFile(dbPath, 'utf8');
    const db = JSON.parse(dbContent);

    if (db.aircraft && Array.isArray(db.aircraft)) {
        db.aircraft.forEach((ac) => {
            const tags = ['GENERAL'];
            const engineType = (ac.engineType || '').toUpperCase();
            if (engineType.match(/CFM|GE|PW|RR|TRENT|V2500|JET/)) {
                tags.push('JET');
            } else if (engineType.match(/PROP|PISTON|TURBOPROP/)) {
                tags.push('PROP');
            }

            const modelUpper = ac.model.toUpperCase();
            const manufacturer = (ac.manufacturer || '').toUpperCase();
            if (manufacturer.includes('AIRBUS') && !modelUpper.includes('A300') && !modelUpper.includes('A310')) {
                tags.push('FBW');
            } else if (modelUpper.includes('777') || modelUpper.includes('787')) {
                tags.push('FBW');
            } else {
                tags.push('MECHANICAL');
            }

            if (modelUpper.includes('737')) {
                tags.push('HYDRAULIC_A_B');
            }

            if (ac.icao) AIRCRAFT_MODELS[ac.icao] = { tags };
            if (ac.model) AIRCRAFT_MODELS[ac.model] = { tags };
        });
        console.log(`Loaded ${db.aircraft.length} aircraft models from database.`);
    }
} catch (error) {
    console.warn('Could not load aircraftDatabase.json, using defaults.', error.message);
}

const TARGET_MODEL = process.env.TARGET_MODEL || 'GENERIC';
const targetConfig = AIRCRAFT_MODELS[TARGET_MODEL] || AIRCRAFT_MODELS.GENERIC;
const TARGET_TAGS = targetConfig.tags;

console.log(`Target Model: ${TARGET_MODEL}`);
console.log(`Allowed Tags: ${TARGET_TAGS.join(', ')}`);

function isValidComponent(comp) {
    if (!comp.system || !comp.component) return false;

    const systemUpper = comp.system.toUpperCase();
    if (INVALID_SYSTEMS.some((system) => systemUpper.includes(system))) return false;

    const nameUpper = comp.component.toUpperCase();
    if (INVALID_KEYWORDS.some((keyword) => nameUpper.includes(keyword))) return false;

    if (comp.applicability && Array.isArray(comp.applicability) && comp.applicability.length > 0) {
        const compTags = comp.applicability.map((tag) => tag.toUpperCase());
        const CONFLICT_PAIRS = [
            ['JET', 'PROP'],
            ['FBW', 'MECHANICAL']
        ];

        for (const [tagA, tagB] of CONFLICT_PAIRS) {
            if (compTags.includes(tagA) && !TARGET_TAGS.includes(tagA) && TARGET_TAGS.includes(tagB)) return false;
            if (compTags.includes(tagB) && !TARGET_TAGS.includes(tagB) && TARGET_TAGS.includes(tagA)) return false;
        }
    }

    return true;
}

function calculateSimilarity(str1, str2) {
    const normalizeTokens = (value) => value.replace(/_/g, ' ').split(/\s+/).filter((token) => token.length > 0);
    const tokens1 = new Set(normalizeTokens(str1));
    const tokens2 = new Set(normalizeTokens(str2));
    const nums1 = [...tokens1].filter((token) => /\d/.test(token));
    const nums2 = [...tokens2].filter((token) => /\d/.test(token));

    if (nums1.length > 0 && nums2.length > 0) {
        const nums1Set = new Set(nums1);
        if (!nums2.every((num) => nums1Set.has(num)) || nums1.length !== nums2.length) {
            return 0;
        }
    }

    const intersection = new Set([...tokens1].filter((token) => tokens2.has(token)));
    const union = new Set([...tokens1, ...tokens2]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

function buildComponentMap(components) {
    const componentMap = new Map();

    components.forEach((comp) => {
        if (!isValidComponent(comp)) return;

        const id = normalize(comp.component);
        if (!componentMap.has(id)) {
            componentMap.set(id, {
                ...comp,
                id,
                dependents: []
            });
            return;
        }

        const existing = componentMap.get(id);
        existing.dependencies = [...new Set([...(existing.dependencies || []), ...(comp.dependencies || [])])];
        existing.failure_modes = [...new Set([...(existing.failure_modes || []), ...(comp.failure_modes || [])])];
    });

    const componentIds = Array.from(componentMap.keys());
    let resolvedCount = 0;
    console.log('Resolving dependencies with fuzzy matching...');

    for (const [id, comp] of componentMap) {
        if (!comp.dependencies || comp.dependencies.length === 0) continue;

        comp.dependencies.forEach((depName) => {
            const normalizedDep = normalize(depName);
            if (componentMap.has(normalizedDep)) {
                componentMap.get(normalizedDep).dependents.push(id);
                resolvedCount += 1;
                return;
            }

            let bestMatch = null;
            let maxScore = 0;
            for (const candidateId of componentIds) {
                if (candidateId === id) continue;
                const score = calculateSimilarity(normalizedDep, candidateId);
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = candidateId;
                }
            }

            if (bestMatch && maxScore >= 0.6) {
                componentMap.get(bestMatch).dependents.push(id);
                resolvedCount += 1;
                if (resolvedCount <= 5) {
                    console.log(`  Example Link: "${depName}" -> "${bestMatch}" (Score: ${maxScore.toFixed(2)})`);
                }
            }
        });
    }

    console.log(`Resolved ${resolvedCount} dependency links from raw data.`);
    return componentMap;
}

function buildFailureDataset(componentMap) {
    const failureNodes = [];
    const proposals = [];

    for (const [id, comp] of componentMap) {
        if (!comp.system || !comp.component || comp.system === 'UNKNOWN') {
            proposals.push(comp);
            continue;
        }

        const modes = comp.failure_modes && comp.failure_modes.length > 0
            ? [...comp.failure_modes]
            : ['FUNCTIONAL_LOSS'];
        if (!modes.includes('FUNCTIONAL_LOSS')) {
            modes.push('FUNCTIONAL_LOSS');
        }

        modes.forEach((mode) => {
            const failureCode = `${id}_${normalize(mode)}`;
            const conditions = [];
            const rule = FLIGHT_STATE_RULES[normalize(comp.system)];
            if (rule) conditions.push(rule);

            const edges = comp.dependents.map((depId) => ({
                effect_failure: `${depId}_FUNCTIONAL_LOSS`,
                probability: 1.0
            }));

            failureNodes.push({
                failure_code: failureCode,
                runtime_id: failureCode.toLowerCase(),
                system: normalize(comp.system),
                component: comp.component,
                failure_mode: normalize(mode),
                description: comp.description || `${comp.component} failure: ${mode}`,
                dependencies: comp.dependencies || [],
                conditions,
                edges,
                observed_effects: [],
                source: 'FAA_System_Handbook',
                applicability: Array.isArray(comp.applicability) && comp.applicability.length > 0 ? comp.applicability : ['GENERAL'],
                observables: [],
                mitigation_hooks: [],
                stages: [{ id: 'active', next: null, duration: null, intensityTarget: null, intensityRate: null, transitionMetadata: null, hasDynamicDuration: false, hasEffect: false }],
                narrative_hook_ids: [],
                evidence_refs: []
            });
        });
    }

    return { failureNodes, proposals };
}

function buildEdgeAndEffectCollections(uniqueFailureNodes) {
    const validFailureCodes = new Set(uniqueFailureNodes.map((node) => node.failure_code));
    const allEdges = [];
    const allEffects = [];

    uniqueFailureNodes.forEach((node) => {
        const manualDef = getManualDefinition(node.system, node.component, node.failure_mode);
        const ruleBasedResults = applyLogicRules(node.system, node.component, node.failure_mode);

        if (node.edges && node.edges.length > 0) {
            node.edges.forEach((edge) => {
                if (validFailureCodes.has(edge.effect_failure)) {
                    allEdges.push({
                        source_failure_code: node.failure_code,
                        target_failure_code: edge.effect_failure,
                        probability: edge.probability,
                        time_delay_seconds: 0,
                        condition_logic: {},
                        required_observables: [],
                        inhibited_observables: [],
                        guards: [],
                        narrative_hook_ids: [],
                        evidence_refs: []
                    });
                }
            });
        }

        const resolveTargets = (descriptor) => uniqueFailureNodes.filter((candidate) => {
            if (descriptor.target_system && candidate.system.toUpperCase() !== descriptor.target_system.toUpperCase()) return false;
            const compUpper = candidate.component.toUpperCase();
            if (descriptor.target_component && !compUpper.includes(descriptor.target_component.toUpperCase())) return false;
            if (descriptor.target_component_type && !compUpper.includes(descriptor.target_component_type.toUpperCase())) return false;
            if (descriptor.failure_mode && candidate.failure_mode.toUpperCase() !== descriptor.failure_mode.toUpperCase()) return false;
            return true;
        });

        [manualDef?.edges || [], ruleBasedResults.edges || []].forEach((edgeList) => {
            edgeList.forEach((edgeDescriptor) => {
                resolveTargets(edgeDescriptor).forEach((target) => {
                    allEdges.push({
                        source_failure_code: node.failure_code,
                        target_failure_code: target.failure_code,
                        probability: edgeDescriptor.probability || 1.0,
                        time_delay_seconds: edgeDescriptor.time_delay || 0,
                        condition_logic: edgeDescriptor.condition || {},
                        required_observables: [],
                        inhibited_observables: [],
                        guards: [],
                        narrative_hook_ids: [],
                        evidence_refs: []
                    });
                });
            });
        });

        const nodeEffects = new Map();
        const addEffect = (sourceEffects) => {
            if (!sourceEffects) return;
            sourceEffects.forEach((effect) => {
                const key = `${effect.type}|${effect.simulation_logic}`;
                const evalParams = {};
                if (effect.parameters) {
                    Object.keys(effect.parameters).forEach((paramKey) => {
                        const value = effect.parameters[paramKey];
                        evalParams[paramKey] = typeof value === 'function' ? value() : value;
                    });
                }
                if (!nodeEffects.has(key)) {
                    nodeEffects.set(key, {
                        type: effect.type,
                        simulation_logic: effect.simulation_logic,
                        parameters: evalParams
                    });
                    return;
                }
                const existing = nodeEffects.get(key);
                existing.parameters = { ...evalParams, ...existing.parameters };
                nodeEffects.set(key, existing);
            });
        };

        addEffect(manualDef?.effects);
        addEffect(ruleBasedResults.effects);

        if (nodeEffects.size === 0 && ['FLIGHT_CONTROLS', 'PROPULSION', 'HYDRAULIC'].includes(node.system)) {
            addEffect([{
                type: 'SYSTEM_STATE',
                parameters: { status: 'FAILED' },
                simulation_logic: 'standard_failure'
            }]);
        }

        nodeEffects.forEach((effect) => {
            allEffects.push({
                failure_code: node.failure_code,
                effect_type: effect.type,
                parameters: effect.parameters,
                simulation_logic: effect.simulation_logic
            });
        });
    });

    return { allEdges, allEffects };
}

async function uploadLegacyRows(uniqueFailureNodes, allEdges, allEffects) {
    for (let i = 0; i < uniqueFailureNodes.length; i += BATCH_SIZE) {
        const batch = uniqueFailureNodes.slice(i, i + BATCH_SIZE).map((node) => ({
            failure_code: node.failure_code,
            runtime_id: node.runtime_id,
            system: node.system,
            component: node.component,
            failure_mode: node.failure_mode,
            description: node.description,
            applicability: node.applicability,
            observables: node.observables,
            mitigation_hooks: node.mitigation_hooks,
            stages: node.stages,
            narrative_hook_ids: node.narrative_hook_ids,
            evidence_refs: node.evidence_refs,
            source: node.source,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('skylinetragedy_failures')
            .upsert(batch, { onConflict: 'failure_code' });
        if (error) {
            console.error('Supabase Upsert Error (Failures):', error);
        } else {
            console.log(`  Uploaded failures batch ${i / BATCH_SIZE + 1}/${Math.ceil(uniqueFailureNodes.length / BATCH_SIZE)}`);
        }
    }

    for (let i = 0; i < allEdges.length; i += BATCH_SIZE) {
        const batch = allEdges.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from('skylinetragedy_failure_edges')
            .upsert(batch, { onConflict: 'source_failure_code,target_failure_code,propagation_type', ignoreDuplicates: true });
        if (error) console.error('Supabase Upsert Error (Edges):', error);
    }

    for (let i = 0; i < allEffects.length; i += BATCH_SIZE) {
        const batch = allEffects.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from('skylinetragedy_failure_effects')
            .upsert(batch, { onConflict: 'failure_code,effect_type,simulation_logic', ignoreDuplicates: true });
        if (error) console.error('Supabase Upsert Error (Effects):', error);
    }
}

async function main() {
    try {
        console.log(`Reading system data from ${INPUT_FILE}...`);
        try {
            await fs.access(INPUT_FILE);
        } catch {
            console.error(`Input file ${INPUT_FILE} not found. Run fetch:authoritative-sources first.`);
            process.exit(1);
        }

        const rawData = await fs.readFile(INPUT_FILE, 'utf8');
        const components = JSON.parse(rawData);
        console.log(`Processing ${components.length} components...`);

        const componentMap = buildComponentMap(components);
        const { failureNodes, proposals } = buildFailureDataset(componentMap);
        const uniqueFailureNodes = Array.from(new Map(failureNodes.map((node) => [node.failure_code, node])).values());
        const { allEdges, allEffects } = buildEdgeAndEffectCollections(uniqueFailureNodes);

        await writeJson(OUTPUT_FILE, uniqueFailureNodes);
        await writeJson(EFFECTS_FILE, allEffects);
        await writeJson(EDGES_FILE, allEdges);
        await writeJson(PROPOSALS_FILE, proposals);

        const generatedAt = new Date().toISOString();
        const artifact = buildArtifactFromCompatibilityRows({
            failures: uniqueFailureNodes,
            edges: allEdges,
            effects: allEffects,
            version: `draft-${generatedAt}`,
            generatedAt,
            provenance: {
                source: 'process_failure_graph',
                target_model: TARGET_MODEL,
                component_count: componentMap.size,
                compatibility_files: [
                    path.basename(OUTPUT_FILE),
                    path.basename(EDGES_FILE),
                    path.basename(EFFECTS_FILE)
                ]
            }
        });
        const validationReport = createValidationReport(artifact);
        if (!validationReport.valid) {
            console.error('Artifact validation failed.', validationReport.errors);
            process.exit(1);
        }

        await writeJson(FAILURE_GRAPH_ARTIFACT_FILE, artifact);

        console.log('Pipeline Complete.');
        console.log(`  Components: ${componentMap.size}`);
        console.log(`  Failure Nodes: ${uniqueFailureNodes.length}`);
        console.log(`  Proposals: ${proposals.length}`);
        console.log(`  Artifact Hash: ${artifact.metadata.hash}`);
        console.log(`  Saved artifact to ${FAILURE_GRAPH_ARTIFACT_FILE}`);

        await uploadLegacyRows(uniqueFailureNodes, allEdges, allEffects);

        try {
            const result = await createArtifactVersion(supabase, artifact, {
                version: artifact.metadata.version,
                status: 'validated',
                channel: 'runtime',
                provenance: artifact.metadata.provenance,
                validationReport
            });
            console.log(`Published artifact version ${result.versionRow.version} (${result.versionRow.id})`);
        } catch (error) {
            console.warn('Artifact persistence skipped or failed.', error.message);
        }

        console.log('Supabase sync complete.');
    } catch (error) {
        console.error('Error in processing pipeline:', error);
        process.exit(1);
    }
}

main();
