import { supabase } from './SupabaseClient';
import { failureGraphCache } from './FailureGraphCache.js';

class FailureGraphManager {
    constructor() {
        this.failures = new Map();
        this.edges = [];
        this.symptoms = new Map(); // failureId -> [symptoms]
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const cached = failureGraphCache.load();
            if (cached) {
                this.loadFromCache(cached);
            }

            const { data: failures, error: failuresError } = await supabase
                .from('skylinetragedy_failures')
                .select('*');
            if (failuresError) throw failuresError;

            const { data: edges, error: edgesError } = await supabase
                .from('skylinetragedy_failure_edges')
                .select('*');
            if (edgesError) throw edgesError;

            const { data: symptoms, error: symptomsError } = await supabase
                .from('skylinetragedy_failure_symptoms')
                .select('*');
            if (symptomsError) throw symptomsError;

            if (failures && edges && symptoms) {
                this.failures = new Map();
                this.edges = edges;
                this.symptoms = new Map();
                failures.forEach(f => this.failures.set(f.id, f));
                symptoms.forEach(s => {
                    if (!this.symptoms.has(s.failure_id)) {
                        this.symptoms.set(s.failure_id, []);
                    }
                    this.symptoms.get(s.failure_id).push(s);
                });

                failureGraphCache.save({
                    failures,
                    edges,
                    symptoms,
                    cachedAt: new Date().toISOString()
                });
            }

            if (this.failures.size === 0) {
                this.loadMockData();
            }

            this.initialized = true;
            console.log(`Failure Graph Loaded: ${this.failures.size} failures, ${this.edges.length} edges, ${this.symptoms.size} symptom sets.`);
        } catch (error) {
            console.error('Failed to initialize Failure Graph:', error);
            const cached = failureGraphCache.load();
            if (cached) {
                this.loadFromCache(cached);
            } else {
                this.loadMockData();
            }
            this.initialized = true;
        }
    }

    loadMockData() {
        // Mock Failure: Hydraulic Leak -> Spoiler Asymmetry -> Roll
        const hydLeak = {
            id: 'mock-hyd-leak',
            failure_code: 'HYD_A_LEAK',
            system: 'HYDRAULICS',
            description: 'Hydraulic System A Leak',
            severity: 5,
            time_scale: 'slow',
            source_confidence: 1.0
        };
        const spoilerFail = {
            id: 'mock-spoiler-fail',
            failure_code: 'SPOILER_ASYMM',
            system: 'FLIGHT_CONTROLS',
            description: 'Spoiler Asymmetry',
            severity: 7,
            time_scale: 'immediate',
            source_confidence: 1.0
        };
        
        this.failures.set(hydLeak.id, hydLeak);
        this.failures.set(spoilerFail.id, spoilerFail);

        this.edges.push({
            id: 'edge-1',
            cause_failure: 'mock-hyd-leak',
            effect_failure: 'mock-spoiler-fail',
            probability: 0.8,
            delay_seconds: 5,
            propagation_type: 'SYSTEM'
        });

        this.symptoms.set(hydLeak.id, [
            {
                id: 'sym-1',
                failure_id: 'mock-hyd-leak',
                sensory_type: 'visual',
                description: 'Low Hydraulic Pressure Light',
                instrument_related: true,
                physics_related: false
            },
            {
                id: 'sym-2',
                failure_id: 'mock-hyd-leak',
                sensory_type: 'auditory',
                description: 'Whining noise from hydraulic pump',
                instrument_related: false,
                physics_related: false
            }
        ]);

        this.symptoms.set(spoilerFail.id, [
            {
                id: 'sym-3',
                failure_id: 'mock-spoiler-fail',
                sensory_type: 'handling',
                description: 'Aircraft rolls uncommanded',
                instrument_related: false,
                physics_related: true // Physics engine should handle the roll
            }
        ]);
    }

    loadFromCache(cached) {
        this.failures = new Map();
        this.edges = cached.edges || [];
        this.symptoms = new Map();
        (cached.failures || []).forEach(f => this.failures.set(f.id, f));
        (cached.symptoms || []).forEach(s => {
            if (!this.symptoms.has(s.failure_id)) {
                this.symptoms.set(s.failure_id, []);
            }
            this.symptoms.get(s.failure_id).push(s);
        });
    }

    getFailure(id) {
        return this.failures.get(id);
    }

    getEdgesFrom(failureId) {
        return this.edges.filter(e => e.cause_failure === failureId);
    }

    getSymptoms(failureId) {
        return this.symptoms.get(failureId) || [];
    }

    getAllFailures() {
        return Array.from(this.failures.values());
    }

    getAllEdges() {
        return this.edges;
    }
}

export const failureGraphManager = new FailureGraphManager();
