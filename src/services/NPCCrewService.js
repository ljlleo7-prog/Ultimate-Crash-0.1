
import { supabase } from './skylinetragedy/SupabaseClient';
import eventBus from './eventBus';

class NPCCrewService {
    constructor() {
        this.difficulty = 'intermediate'; // Default
        this.stressLevel = 0;
        this.crewState = {
            FO: { status: 'idle', stress: 0, lastResponseTime: 0 },
            CABIN_CREW: { status: 'idle', stress: 0, lastResponseTime: 0 }
        };
        this.responseCache = new Map(); // key: scenario_id + role + difficulty -> [responses]
        this.initialized = false;
        
        // Bind methods
        this.handleFailure = this.handleFailure.bind(this);
        this.handlePhaseChange = this.handlePhaseChange.bind(this);
        this.summon = this.summon.bind(this);
    }

    initialize(difficulty = 'intermediate') {
        if (this.initialized) return;
        
        this.difficulty = difficulty;
        this.initialized = true;
        this.setupListeners();
        
        // Preload common scenarios
        this.preloadResponses();
        
        console.log(`NPCCrewService initialized with difficulty: ${this.difficulty}`);
    }

    setupListeners() {
        // Listen for failures
        eventBus.subscribe(eventBus.Types.FAILURE_OCCURRED, (data) => {
            this.handleFailure(data);
        });

        // Listen for phase changes
        eventBus.subscribe(eventBus.Types.PHASE_CHANGED, (data) => {
            this.handlePhaseChange(data);
        });
    }

    async preloadResponses() {
        const scenarios = ['taxi', 'takeoff_roll', 'climb', 'cruise', 'descent', 'approach', 'landing'];
        for (const scenario of scenarios) {
            // Pre-fetch for FO
            this.fetchResponses(scenario, 'FO').catch(err => console.warn(err));
        }
    }

    async fetchResponses(scenarioId, role) {
        const key = `${scenarioId}-${role}-${this.difficulty}`;
        
        if (this.responseCache.has(key)) {
            return this.responseCache.get(key);
        }

        try {
            // Map difficulty to DB values if needed, or use direct string
            // DB has: rookie, amateur, intermediate, advanced, pro, devil
            // Service receives: rookie, amateur, intermediate, advanced, pro, devil
            
            const { data, error } = await supabase
                .from('skylinetragedy_npc_responses')
                .select('content')
                .eq('scenario_id', scenarioId)
                .eq('role', role)
                .eq('difficulty', this.difficulty);

            if (error) {
                console.warn(`Supabase error fetching NPC responses: ${error.message}`);
                return this.getFallbackResponses(role);
            }
            
            if (data && data.length > 0) {
                const responses = data.map(r => r.content);
                this.responseCache.set(key, responses);
                return responses;
            } else {
                return this.getFallbackResponses(role);
            }
        } catch (err) {
            console.warn(`Failed to fetch NPC responses for ${key}:`, err);
            return this.getFallbackResponses(role);
        }
    }

    getFallbackResponses(role) {
        if (role === 'FO') {
            return ["(Silence)", "Copy that.", "I'm checking.", "Standby."];
        }
        return ["(Cabin Noise)", "Captain?", "Everything okay back here?"];
    }

    async triggerResponse(scenarioId, role, force = false) {
        // Difficulty Logic: Latency & Ignored Requests
        const isHard = ['pro', 'devil'].includes(this.difficulty);
        
        // Chance to ignore (unless forced by summon)
        if (!force && isHard && Math.random() < 0.3) {
            console.log(`${role} ignored implicit trigger due to stress.`);
            return;
        }

        // Latency simulation
        const baseLatency = isHard ? 2000 : 500;
        const randomLatency = Math.random() * (isHard ? 3000 : 1000);
        const delay = baseLatency + randomLatency;
        
        setTimeout(async () => {
            const responses = await this.fetchResponses(scenarioId, role);
            
            // Pick random response
            const content = responses[Math.floor(Math.random() * responses.length)];
            
            // Publish to EventBus so UI can display it
            eventBus.publish('NPC_CREW_MESSAGE', {
                sender: role === 'FO' ? 'First Officer' : 'Cabin Crew',
                content: content,
                timestamp: Date.now(),
                stress: this.crewState[role].stress,
                role: role
            });
            
            console.log(`[NPC ${role}] Says: "${content}"`);
            
        }, delay);
    }

    handleFailure(data) {
        // Map failure type to scenario ID
        // data.type might be 'engine_fire', 'gear_failure', etc.
        const failureId = data.type || 'generic_failure';
        
        // Increase stress
        this.crewState.FO.stress = Math.min(100, this.crewState.FO.stress + 20);
        this.crewState.CABIN_CREW.stress = Math.min(100, this.crewState.CABIN_CREW.stress + 10);
        
        console.log(`NPC Stress Increased: FO=${this.crewState.FO.stress}, Cabin=${this.crewState.CABIN_CREW.stress}`);
        
        // Trigger FO response
        // Use the failure ID as scenario ID if it matches DB, otherwise generic
        this.triggerResponse(failureId, 'FO');
    }

    handlePhaseChange(data) {
        const phaseName = data.phase?.name?.toLowerCase() || '';
        
        let scenarioId = null;
        if (phaseName.includes('taxi')) scenarioId = 'taxi';
        else if (phaseName.includes('takeoff')) scenarioId = 'takeoff_roll';
        else if (phaseName.includes('climb')) scenarioId = 'climb';
        else if (phaseName.includes('cruise')) scenarioId = 'cruise';
        else if (phaseName.includes('descent')) scenarioId = 'descent';
        else if (phaseName.includes('approach')) scenarioId = 'approach';
        else if (phaseName.includes('landing')) scenarioId = 'landing';
        
        if (scenarioId) {
            // Only occasional comments in normal phases
            if (Math.random() < 0.3) {
                this.triggerResponse(scenarioId, 'FO');
            }
        }
    }

    // Public method for UI interaction
    summon(role) {
        console.log(`Summoning ${role}...`);
        
        // In high difficulty, summoning might fail or be delayed significantly
        const isHard = ['pro', 'devil'].includes(this.difficulty);
        
        if (isHard && Math.random() < 0.2) {
            // Ignored completely
            console.log(`${role} ignored summon!`);
            // Maybe show a "No Response" hint in UI?
            eventBus.publish('NPC_CREW_MESSAGE', {
                sender: 'System',
                content: `${role === 'FO' ? 'First Officer' : 'Cabin Crew'} is not responding.`,
                timestamp: Date.now(),
                type: 'system'
            });
            return;
        }

        this.triggerResponse('summon', role, true);
    }
}

export const npcCrewService = new NPCCrewService();
