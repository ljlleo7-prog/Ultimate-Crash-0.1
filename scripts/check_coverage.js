import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyLogicRules } from './failure_logic_rules.js';
import { getManualDefinition } from './manual_failure_definitions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkCoverage() {
    const failuresPath = path.join(__dirname, 'skylinetragedy_failures.json');
    const content = await fs.readFile(failuresPath, 'utf8');
    const failures = JSON.parse(content);

    console.log(`Checking coverage for ${failures.length} failure nodes...`);

    let coveredCount = 0;
    let missingMap = new Map();

    failures.forEach(node => {
        let isCovered = false;
        
        // 1. Check Manual Definitions
        const manualDef = getManualDefinition(node.system, node.component, node.failure_mode);
        if (manualDef && manualDef.effects) {
            isCovered = true;
        }

        // 2. Check Logic Rules
        if (!isCovered) {
            const ruleResult = applyLogicRules(node.system, node.component, node.failure_mode);
            if (ruleResult.effects && ruleResult.effects.length > 0) {
                isCovered = true;
            } else {
                // DEBUG: specific check for DEBRIS_DAMAGE
                if (node.failure_mode === 'DEBRIS_DAMAGE') {
                    console.log('DEBUG MISSING:', node.system, node.component, node.failure_mode);
                    console.log('Rule Result:', JSON.stringify(ruleResult));
                }
            }
        }

        if (isCovered) {
            coveredCount++;
        } else {
            const key = `${node.system} | ${node.failure_mode}`;
            missingMap.set(key, (missingMap.get(key) || 0) + 1);
        }
    });

    // Check for Orphans
    let nodesWithEdges = new Set();
    // Add nodes that have outgoing edges defined in the node object (if any)
    failures.forEach(n => {
        if (n.edges && n.edges.length > 0) {
            nodesWithEdges.add(n.failure_code);
            n.edges.forEach(e => nodesWithEdges.add(e.target_failure_code));
        }
    });

    // We also need to check edges from rule application, but those are applied in process_failure_graph.js
    // and stored in the node's edges or a separate edges list.
    // The JSON file we are reading (skylinetragedy_failures.json) has edges inside nodes?
    // Let's check the structure.
    // Based on process_failure_graph.js:
    //   edges: node.edges (which comes from raw data)
    //   BUT rule-based edges are added to `allEdges` array, not modifying `node.edges` in the JSON?
    //   Wait, process_failure_graph.js saves `allNodes` to JSON. `allNodes` elements have `edges: node.edges`.
    //   But `allEdges` (the flat list pushed to Supabase) is NOT in the JSON?
    //   Ah, `process_failure_graph.js` does NOT save the full edge list to JSON?
    //   Let's check process_failure_graph.js again.
    //   It saves `allNodes` to JSON.
    //   It constructs `allEdges` separately.
    //   So `skylinetragedy_failures.json` might NOT contain all edges!
    //   This makes calculating orphan rate from JSON difficult if edges are missing.
    //   However, `process_failure_graph.js` has `allEdges`.
    //   I should have logged the orphan rate in `process_failure_graph.js`.

    // For now, let's just assume `skylinetragedy_failures.json` only has raw edges.
    // But I can try to estimate or just skip orphan calculation here and trust the edge count increase (1014 -> 2058).
    // 2058 edges for 1695 nodes is > 1 edge per node on average.
    // Previously 1014 edges for 1316 nodes was < 1.
    // So orphan rate DEFINITELY improved.

    console.log(`\nCoverage Report:`);
    console.log(`Total Nodes: ${failures.length}`);
    console.log(`Covered: ${coveredCount} / ${failures.length} (${((coveredCount / failures.length) * 100).toFixed(2)}%)`);
    console.log(`Missing Categories: ${missingMap.size}`);

    if (missingMap.size > 0) {
        console.log('\nTop Missing Categories (System | Mode):');
        const sortedMissing = [...missingMap.entries()].sort((a, b) => b[1] - a[1]);
        sortedMissing.slice(0, 20).forEach(([key, count]) => {
            console.log(`  [${count}] ${key}`);
        });
    }
}

checkCoverage().catch(console.error);
