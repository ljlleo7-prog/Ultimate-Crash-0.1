import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getManualDefinition } from './manual_failure_definitions.js';
import { applyLogicRules } from './failure_logic_rules.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const INPUT_FILE = path.join(__dirname, 'raw_system_data.json');
const OUTPUT_FILE = path.join(__dirname, 'skylinetragedy_failures.json');

// Helper to normalize names
const normalize = (str) => {
    let s = str.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    // Fix common typos in system names
    if (s === 'PROPELLSION' || s === 'PROPELSION') return 'PROPULSION';
    return s;
};

// Flight State Logic Rules
const FLIGHT_STATE_RULES = {
    'LANDING_GEAR': { var: 'phase', val: ['TAKEOFF', 'LANDING', 'TAXI'] },
    'FLIGHT_CONTROLS': { var: 'airspeed', op: '>', val: 50 },
    'ANTI_ICE': { var: 'icing_conditions', val: true },
    'PRESSURIZATION': { var: 'altitude', op: '>', val: 10000 }
};

// Filter Lists
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
    // Removed dangerous short words: PRESS (matches PRESSURE), GAUGE (matches FUEL GAUGE), LINE (matches FUEL LINE), FILE, LEVEL, etc.
];

// Aircraft Model Definitions
let AIRCRAFT_MODELS = {
    'GENERIC': { tags: ['GENERAL'] }
};

// Load aircraft from database
try {
    const dbPath = path.join(__dirname, '../src/data/aircraftDatabase.json');
    const dbContent = await fs.readFile(dbPath, 'utf8');
    const db = JSON.parse(dbContent);
    
    if (db.aircraft && Array.isArray(db.aircraft)) {
        db.aircraft.forEach(ac => {
            const tags = ['GENERAL']; // Base tag
            
            // Engine Type Logic
            const engineType = (ac.engineType || '').toUpperCase();
            if (engineType.match(/CFM|GE|PW|RR|TRENT|V2500|JET/)) {
                tags.push('JET');
            } else if (engineType.match(/PROP|PISTON|TURBOPROP/)) {
                tags.push('PROP');
            }
            
            // Fly-By-Wire Logic (Heuristic based on known FBW aircraft families)
            // A320+, B777, B787 are FBW. B737, C172 are MECHANICAL.
            const modelUpper = ac.model.toUpperCase();
            const manufacturer = (ac.manufacturer || '').toUpperCase();
            
            if (manufacturer.includes('AIRBUS') && !modelUpper.includes('A300') && !modelUpper.includes('A310')) {
                tags.push('FBW');
            } else if (modelUpper.includes('777') || modelUpper.includes('787')) {
                tags.push('FBW');
            } else {
                tags.push('MECHANICAL');
            }
            
            // B737 Specifics
            if (modelUpper.includes('737')) {
                tags.push('HYDRAULIC_A_B');
            }

            // Map by ICAO code (e.g. B738) and Model Name
            if (ac.icao) AIRCRAFT_MODELS[ac.icao] = { tags };
            if (ac.model) AIRCRAFT_MODELS[ac.model] = { tags };
        });
        console.log(`Loaded ${db.aircraft.length} aircraft models from database.`);
    }
} catch (error) {
    console.warn('Could not load aircraftDatabase.json, using defaults.', error.message);
}

// Select Target Model (can be passed via env or arg, defaulting to GENERIC for now)
const TARGET_MODEL = process.env.TARGET_MODEL || 'GENERIC';
// Fallback to GENERIC if model not found
const targetConfig = AIRCRAFT_MODELS[TARGET_MODEL] || AIRCRAFT_MODELS['GENERIC'];
const TARGET_TAGS = targetConfig.tags;

console.log(`Target Model: ${TARGET_MODEL}`);
console.log(`Allowed Tags: ${TARGET_TAGS.join(', ')}`);

function isValidComponent(comp) {
    if (!comp.system || !comp.component) return false;
    
    const systemUpper = comp.system.toUpperCase();
    if (INVALID_SYSTEMS.some(s => systemUpper.includes(s))) return false;

    const nameUpper = comp.component.toUpperCase();
    if (INVALID_KEYWORDS.some(k => nameUpper.includes(k))) return false;

    // Aircraft Model Filtering
    // If component has applicability tags, check if they match target model
    if (comp.applicability && Array.isArray(comp.applicability) && comp.applicability.length > 0) {
        // Normalize component tags
        const compTags = comp.applicability.map(t => t.toUpperCase());
        
        // If component is explicitly marked as something NOT in our target tags, exclude it.
        // Logic: 
        // 1. If component is 'JET' and target is 'PROP', exclude.
        // 2. If component is 'FBW' and target is 'MECHANICAL' (or lacks FBW), exclude.
        // 3. If component is 'GENERAL', include.
        
        // Heuristic: Check for conflict
        const CONFLICT_PAIRS = [
            ['JET', 'PROP'],
            ['FBW', 'MECHANICAL'], // Simplification
        ];

        for (const [tagA, tagB] of CONFLICT_PAIRS) {
            if (compTags.includes(tagA) && !TARGET_TAGS.includes(tagA) && TARGET_TAGS.includes(tagB)) return false;
            if (compTags.includes(tagB) && !TARGET_TAGS.includes(tagB) && TARGET_TAGS.includes(tagA)) return false;
        }
        
        // If strict filtering is desired:
        // const hasMatch = compTags.some(t => TARGET_TAGS.includes(t) || t === 'GENERAL' || t === 'ALL');
        // if (!hasMatch) return false;
    }

    return true;
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

        // 1. Build Component Map
        // Key: Normalized Component Name
        // Value: Component Object
        const componentMap = new Map();
        
        components.forEach(comp => {
            // Apply filtering
            if (!isValidComponent(comp)) {
                return;
            }

            const id = normalize(comp.component);
            if (!componentMap.has(id)) {
                componentMap.set(id, {
                    ...comp,
                    id,
                    dependents: [] // Components that depend on this one
                });
            } else {
                // Merge if duplicate (simple strategy: union arrays)
                const existing = componentMap.get(id);
                existing.dependencies = [...new Set([...existing.dependencies, ...comp.dependencies])];
                existing.failure_modes = [...new Set([...existing.failure_modes, ...comp.failure_modes])];
            }
        });

        // Similarity Helper
function calculateSimilarity(str1, str2) {
    const normalizeTokens = (s) => s.replace(/_/g, ' ').split(/\s+/).filter(t => t.length > 0);
    const tokens1 = new Set(normalizeTokens(str1));
    const tokens2 = new Set(normalizeTokens(str2));
    
    // Extract numbers
    const nums1 = [...tokens1].filter(t => /\d/.test(t));
    const nums2 = [...tokens2].filter(t => /\d/.test(t));
    
    // If both have numbers, they MUST match exactly
    if (nums1.length > 0 && nums2.length > 0) {
        const nums1Set = new Set(nums1);
        if (!nums2.every(n => nums1Set.has(n)) || nums1.length !== nums2.length) {
            return 0; // Mismatch in numbers (e.g. Engine 1 vs Engine 2)
        }
    }

    // Calculate Word Overlap (Jaccard Index)
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

// 2. Build Dependency Graph (Back-links) with Fuzzy Matching
console.log('Resolving dependencies with fuzzy matching...');
let resolvedCount = 0;
const componentIds = Array.from(componentMap.keys());

for (const [id, comp] of componentMap) {
    if (comp.dependencies && comp.dependencies.length > 0) {
        comp.dependencies.forEach(depName => {
            const normalizedDep = normalize(depName);
            
            // 1. Try Exact Match
            if (componentMap.has(normalizedDep)) {
                componentMap.get(normalizedDep).dependents.push(id);
                resolvedCount++;
                return;
            }

            // 2. Try Fuzzy Match
            let bestMatch = null;
            let maxScore = 0;

            for (const candidateId of componentIds) {
                if (candidateId === id) continue; // Don't depend on self
                
                const score = calculateSimilarity(normalizedDep, candidateId);
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = candidateId;
                }
            }

            // Threshold: 0.6 (Enough for "AC BUS" -> "AC_ELECTRICAL_BUS")
            if (bestMatch && maxScore >= 0.6) {
                componentMap.get(bestMatch).dependents.push(id);
                resolvedCount++;
                if (resolvedCount <= 5) {
                    console.log(`  Example Link: "${depName}" -> "${bestMatch}" (Score: ${maxScore.toFixed(2)})`);
                }
            }
        });
    }
}
console.log(`Resolved ${resolvedCount} dependency links from raw data.`);

// 3. Generate Canonical Failure Nodes
        const failureNodes = [];
        const proposals = [];

        for (const [id, comp] of componentMap) {
            // Validation: Must have valid system and name
            if (!comp.system || !comp.component || comp.system === 'UNKNOWN') {
                proposals.push(comp);
                continue;
            }

            // Default failure modes if none provided
            let modes = (comp.failure_modes && comp.failure_modes.length > 0) 
                ? comp.failure_modes 
                : ['FUNCTIONAL_LOSS'];

            // Ensure FUNCTIONAL_LOSS is always present for cascade targets
            if (!modes.includes('FUNCTIONAL_LOSS')) {
                modes.push('FUNCTIONAL_LOSS');
            }

            modes.forEach(mode => {
                const failureCode = `${id}_${normalize(mode)}`;
                
                // Determine conditions
                const conditions = [];
                const rule = FLIGHT_STATE_RULES[normalize(comp.system)];
                if (rule) conditions.push(rule);

                // Generate Edges (Cascades)
                // If this component fails, its dependents fail
                const edges = comp.dependents.map(depId => {
                    const depComp = componentMap.get(depId);
                    // Assume dependent suffers FUNCTIONAL_LOSS
                    return {
                        effect_failure: `${depId}_FUNCTIONAL_LOSS`,
                        probability: 1.0 // High probability for direct dependency
                    };
                });

                const node = {
                    failure_code: failureCode,
                    system: normalize(comp.system),
                    component: comp.component,
                    failure_mode: normalize(mode),
                    description: comp.description || `${comp.component} failure: ${mode}`,
                    dependencies: comp.dependencies || [],
                    conditions,
                    edges,
                    observed_effects: [], // Can be populated from reports later if needed
                    source: 'FAA_System_Handbook'
                };

                failureNodes.push(node);
            });
        }

        // 4. Save Output
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(failureNodes, null, 2));
        await fs.writeFile(path.join(__dirname, 'skylinetragedy_revision_proposals.json'), JSON.stringify(proposals, null, 2));
        
        console.log(`Pipeline Complete.`);
        console.log(`  Components: ${componentMap.size}`);
        console.log(`  Failure Nodes: ${failureNodes.length}`);
        console.log(`  Proposals: ${proposals.length}`);
        console.log(`  Saved to ${OUTPUT_FILE}`);

        // 4. Push to Supabase
        console.log(`Pushing ${failureNodes.length} nodes to Supabase...`);
        
        // Deduplicate failureNodes based on failure_code
        const uniqueFailureNodes = Array.from(new Map(failureNodes.map(node => [node.failure_code, node])).values());
        console.log(`Deduplicated nodes: ${uniqueFailureNodes.length} (from ${failureNodes.length})`);

        // Prepare Edges and Effects Arrays
        let allEdges = [];
        let allEffects = [];

        // Batch upsert failures to avoid payload limits
        const BATCH_SIZE = 100;
        const validFailureCodes = new Set(uniqueFailureNodes.map(n => n.failure_code));

        // Create lookup map for faster manual edge resolution
        const nodeLookup = new Map();
        uniqueFailureNodes.forEach(n => {
            // Index by System + Component (normalized) + Failure Mode (normalized)
            // This helps but partial matches are still needed
            // For now, we'll just iterate if needed, or rely on failure_code
        });

        for (let i = 0; i < uniqueFailureNodes.length; i += BATCH_SIZE) {
            const batch = uniqueFailureNodes.slice(i, i + BATCH_SIZE).map(node => {
                // Check for Manual Definition
                const manualDef = getManualDefinition(node.system, node.component, node.failure_mode);
                
                // Check for Logic Rules (Scalable Coverage)
                const ruleBasedResults = applyLogicRules(node.system, node.component, node.failure_mode);

                // Collect Edges (Automated + Manual + Rule-Based)
                if (node.edges && node.edges.length > 0) {
                    node.edges.forEach(edge => {
                        if (validFailureCodes.has(edge.effect_failure)) {
                            allEdges.push({
                                source_failure_code: node.failure_code,
                                target_failure_code: edge.effect_failure,
                                probability: edge.probability,
                                time_delay_seconds: 0,
                                condition_logic: {}
                            });
                        }
                    });
                }

                // Process Manual Edges
                if (manualDef && manualDef.edges) {
                    manualDef.edges.forEach(mEdge => {
                        // Resolve generic target to specific failure codes
                        // Search uniqueFailureNodes for matches
                        const targets = uniqueFailureNodes.filter(n => {
                            if (mEdge.target_system && n.system.toUpperCase() !== mEdge.target_system.toUpperCase()) return false;
                            
                            const compUpper = n.component.toUpperCase();
                            if (mEdge.target_component && !compUpper.includes(mEdge.target_component.toUpperCase())) return false;
                            if (mEdge.target_component_type && !compUpper.includes(mEdge.target_component_type.toUpperCase())) return false;
                            
                            if (mEdge.failure_mode && n.failure_mode.toUpperCase() !== mEdge.failure_mode.toUpperCase()) return false;
                            return true;
                        });

                        targets.forEach(target => {
                            allEdges.push({
                                source_failure_code: node.failure_code,
                                target_failure_code: target.failure_code,
                                probability: mEdge.probability || 1.0,
                                time_delay_seconds: mEdge.time_delay || 0,
                                condition_logic: mEdge.condition || {}
                            });
                        });
                    });
                }

                // Process Rule-Based Edges
                if (ruleBasedResults.edges) {
                    ruleBasedResults.edges.forEach(rEdge => {
                         const targets = uniqueFailureNodes.filter(n => {
                            if (rEdge.target_system && n.system.toUpperCase() !== rEdge.target_system.toUpperCase()) return false;
                            
                            const compUpper = n.component.toUpperCase();
                            if (rEdge.target_component && !compUpper.includes(rEdge.target_component.toUpperCase())) return false;
                            if (rEdge.target_component_type && !compUpper.includes(rEdge.target_component_type.toUpperCase())) return false;
                            
                            if (rEdge.failure_mode && n.failure_mode.toUpperCase() !== rEdge.failure_mode.toUpperCase()) return false;
                            return true;
                        });

                        targets.forEach(target => {
                            allEdges.push({
                                source_failure_code: node.failure_code,
                                target_failure_code: target.failure_code,
                                probability: rEdge.probability || 1.0,
                                time_delay_seconds: rEdge.time_delay || 0,
                                condition_logic: rEdge.condition || {}
                            });
                        });
                    });
                }
                
                // Collect Effects (Manual > Rule-Based > Placeholder)
                let effectsAdded = false;
                const nodeEffects = new Map(); // Key: type + logic, Value: { type, logic, params }

                // Helper to process and merge effects
                const addEffect = (sourceEffects, priority) => {
                    if (!sourceEffects) return;
                    sourceEffects.forEach(eff => {
                        const key = `${eff.type}|${eff.simulation_logic}`;
                        
                        // Evaluate parameters if they are functions
                        const evalParams = {};
                        if (eff.parameters) {
                            Object.keys(eff.parameters).forEach(pKey => {
                                const val = eff.parameters[pKey];
                                evalParams[pKey] = typeof val === 'function' ? val() : val;
                            });
                        }

                        if (!nodeEffects.has(key)) {
                            nodeEffects.set(key, {
                                type: eff.type,
                                simulation_logic: eff.simulation_logic,
                                parameters: evalParams
                            });
                            effectsAdded = true;
                        } else {
                            // Merge parameters. If priority is 'high' (Manual), it overwrites.
                            // But here we process Manual FIRST. So existing values are High Priority.
                            // If we process Manual first, we should NOT overwrite existing keys with Rule keys.
                            // Wait, if Manual is first, nodeEffects has Manual values.
                            // When Rule comes, we only add keys that don't exist?
                            // Or should we overwrite?
                            // Manual = Specific Override. Rule = General.
                            // So Manual should win.
                            // Since we process Manual first, we keep existing values.
                            const existing = nodeEffects.get(key);
                            existing.parameters = { ...evalParams, ...existing.parameters }; 
                            // Wait, { ...evalParams, ...existing.parameters } means existing (Manual) overwrites evalParams (Rule). Correct.
                            nodeEffects.set(key, existing);
                        }
                    });
                };

                // 1. Manual Definitions (Highest Priority)
                if (manualDef && manualDef.effects) {
                    addEffect(manualDef.effects, 'manual');
                }

                // 2. Rule-Based Logic (Medium Priority - Additive)
                if (ruleBasedResults.effects) {
                    addEffect(ruleBasedResults.effects, 'rule');
                }

                // 3. Fallback to Placeholder if no effects and relevant system
                if (!effectsAdded && (node.system === 'FLIGHT_CONTROLS' || node.system === 'PROPULSION' || node.system === 'HYDRAULIC')) {
                    if (validFailureCodes.has(node.failure_code)) {
                        addEffect([{
                            type: 'SYSTEM_STATE',
                            parameters: { "status": "FAILED" },
                            simulation_logic: 'standard_failure'
                        }], 'fallback');
                    }
                }

                // Convert map back to array
                nodeEffects.forEach(eff => {
                    allEffects.push({
                        failure_code: node.failure_code,
                        effect_type: eff.type,
                        parameters: eff.parameters,
                        simulation_logic: eff.simulation_logic
                    });
                });

                return {
                    failure_code: node.failure_code,
                    system: node.system,
                    component: node.component,
                    failure_mode: node.failure_mode,
                    description: node.description,
                    dependencies: node.dependencies,
                    conditions: node.conditions,
                    edges: node.edges,
                    observed_effects: node.observed_effects,
                    source: node.source,
                    updated_at: new Date().toISOString()
                };
            });

            const { error } = await supabase
                .from('skylinetragedy_failures')
                .upsert(batch, { onConflict: 'failure_code' });
            
            if (error) {
                console.error('Supabase Upsert Error (Failures):', error);
            } else {
                console.log(`  Uploaded failures batch ${i / BATCH_SIZE + 1}/${Math.ceil(failureNodes.length / BATCH_SIZE)}`);
            }
        }

        // Save Processed Data for verification
        await fs.writeFile(path.join(__dirname, 'skylinetragedy_failures.json'), JSON.stringify(uniqueFailureNodes, null, 2));
        await fs.writeFile(path.join(__dirname, 'skylinetragedy_effects.json'), JSON.stringify(allEffects, null, 2));
        await fs.writeFile(path.join(__dirname, 'skylinetragedy_edges.json'), JSON.stringify(allEdges, null, 2));
        console.log(`Saved to scripts/skylinetragedy_failures.json, effects.json, and edges.json`);

        // Push Edges
        console.log(`Pushing ${allEdges.length} edges to Supabase...`);
        for (let i = 0; i < allEdges.length; i += BATCH_SIZE) {
            const batch = allEdges.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('skylinetragedy_failure_edges')
                .upsert(batch, { onConflict: 'source_failure_code,target_failure_code', ignoreDuplicates: true }); 
             
            if (error) console.error('Supabase Upsert Error (Edges):', error);
        }

        // Push Effects
        console.log(`Pushing ${allEffects.length} effects to Supabase...`);
        for (let i = 0; i < allEffects.length; i += BATCH_SIZE) {
            const batch = allEffects.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('skylinetragedy_failure_effects')
                .upsert(batch, { onConflict: 'failure_code,effect_type', ignoreDuplicates: true });
             
            if (error) console.error('Supabase Upsert Error (Effects):', error);
        }
        
        console.log('Supabase sync complete.');

    } catch (error) {
        console.error('Error in processing pipeline:', error);
    }
}

main();
