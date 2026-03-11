
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function verifyGraph() {
    console.log('Starting Graph Integrity Verification...');

    // 1. Count Nodes
    const { count: nodeCount, error: nodeError } = await supabase
        .from('skylinetragedy_failures')
        .select('*', { count: 'exact', head: true });
    
    if (nodeError) {
        console.error('Error fetching nodes:', nodeError);
        return;
    }
    console.log(`Total Failure Nodes: ${nodeCount}`);

    // 2. Count Edges
    const { count: edgeCount, error: edgeError } = await supabase
        .from('skylinetragedy_failure_edges')
        .select('*', { count: 'exact', head: true });

    if (edgeError) {
        console.error('Error fetching edges:', edgeError);
        return;
    }
    console.log(`Total Edges: ${edgeCount}`);

    // 3. Count Effects
    const { count: effectCount, error: effectError } = await supabase
        .from('skylinetragedy_failure_effects')
        .select('*', { count: 'exact', head: true });

    if (effectError) {
        console.error('Error fetching effects:', effectError);
        return;
    }
    console.log(`Total Effects: ${effectCount}`);

    // 4. Check for Orphans (Nodes with no incoming or outgoing edges)
    // This is a bit expensive, so we'll do a sample check or use a join if possible.
    // Ideally, we want to know if there are critical systems disconnected.
    
    // Fetch all edges to build a local graph for analysis (assuming it fits in memory, < 10k items)
    const { data: edges, error: edgesDataError } = await supabase
        .from('skylinetragedy_failure_edges')
        .select('source_failure_code, target_failure_code');

    if (edgesDataError) {
        console.error('Error fetching edge data:', edgesDataError);
        return;
    }

    const sources = new Set(edges.map(e => e.source_failure_code));
    const targets = new Set(edges.map(e => e.target_failure_code));
    const connectedNodes = new Set([...sources, ...targets]);

    console.log(`Nodes with at least one connection: ${connectedNodes.size}`);
    console.log(`Orphan Rate: ${((nodeCount - connectedNodes.size) / nodeCount * 100).toFixed(2)}%`);

    // 5. Check Critical Systems Connectivity
    const criticalSystems = ['HYDRAULIC', 'ELECTRICAL', 'PROPULSION', 'FLIGHT_CONTROLS'];
    
    // Fetch nodes for critical systems
    const { data: criticalNodes, error: critError } = await supabase
        .from('skylinetragedy_failures')
        .select('failure_code, system, component')
        .in('system', criticalSystems);

    if (critError) {
        console.error('Error fetching critical nodes:', critError);
        return;
    }

    let criticalOrphans = 0;
    criticalNodes.forEach(node => {
        if (!connectedNodes.has(node.failure_code)) {
            criticalOrphans++;
            // console.log(`  Orphan Critical Node: ${node.failure_code}`);
        }
    });

    console.log(`Critical System Nodes: ${criticalNodes.length}`);
    console.log(`Critical System Orphans: ${criticalOrphans}`);
    console.log(`Critical Connectivity: ${((criticalNodes.length - criticalOrphans) / criticalNodes.length * 100).toFixed(2)}%`);

    // 6. Check Effect Coverage
    const { data: effects, error: effectsDataError } = await supabase
        .from('skylinetragedy_failure_effects')
        .select('failure_code, effect_type');

    if (effectsDataError) {
        console.error('Error fetching effect data:', effectsDataError);
        return;
    }

    const nodesWithEffects = new Set(effects.map(e => e.failure_code));
    console.log(`Nodes with defined effects: ${nodesWithEffects.size}`);
    console.log(`Effect Coverage: ${((nodesWithEffects.size / nodeCount) * 100).toFixed(2)}%`);

}

verifyGraph().catch(console.error);
