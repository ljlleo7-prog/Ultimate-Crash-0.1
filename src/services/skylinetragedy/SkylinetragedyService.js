import { failureGraphManager } from './FailureGraphManager.js';
import { cascadeResolver } from './CascadeResolver.js';
import { symptomFilter } from './SymptomFilter.js';
import { gapLogger } from './GapLogger.js';
import { narrativeManager } from './NarrativeManager.js';
import { narrativePipeline } from './NarrativePipeline.js';
import eventBus from '../eventBus.js';

class SkylinetragedyService {
    constructor() {
        this.activeFailures = new Set();
        this.physicsService = null;
        this.time = 0;
        this.initialized = false;
    }

    async initialize() {
        await failureGraphManager.initialize();
        await narrativeManager.initialize();
        this.initialized = true;
        console.log('Skylinetragedy Service Initialized');
    }

    update(dt, physicsService) {
        if (!this.initialized) return;

        this.physicsService = physicsService;
        this.time += dt;

        // Resolve cascades
        const newFailures = cascadeResolver.update(dt, this.activeFailures);
        newFailures.forEach(id => this.triggerFailure(id));

        const symptoms = symptomFilter.filterSymptoms(this.activeFailures, physicsService);
        if (symptoms.length > 0) {
            narrativePipeline.update(symptoms);
        }

        // Check for gaps (mock logic for now)
        // If physics shows something weird but no active failure explains it...
        // This is hard to detect automatically without deep physics integration.
        // We'll leave it for manual trigger or specific checks.
    }

    triggerFailure(id) {
        if (this.activeFailures.has(id)) return;
        
        this.activeFailures.add(id);
        const failure = failureGraphManager.getFailure(id);
        
        if (failure) {
            console.log(`Cascading Failure Triggered: ${failure.failure_code}`);
            eventBus.publish('FAILURE_TRIGGERED', { id, failure });
            
            // Log if no downstream effects?
            const edges = failureGraphManager.getEdgesFrom(id);
            if (edges.length === 0) {
                // Potential gap?
                // Not necessarily. Maybe it's a leaf node.
            }
        } else {
            console.warn(`Failure ID ${id} triggered but not found in graph.`);
        }
    }

    // Manual trigger for testing/simulation
    injectFailure(failureCode) {
        // Find ID by code
        const failure = failureGraphManager.getAllFailures().find(f => f.failure_code === failureCode);
        if (failure) {
            this.triggerFailure(failure.id);
        } else {
            console.warn(`Failure Code ${failureCode} not found.`);
        }
    }

    async processGaps() {
        const logs = gapLogger.getLogs();
        if (logs.length > 0) {
            console.warn('Gap logs are captured for the offline pipeline.', logs);
        }
    }
}

export const skylinetragedyService = new SkylinetragedyService();
