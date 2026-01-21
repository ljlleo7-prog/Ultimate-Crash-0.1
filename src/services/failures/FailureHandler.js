
import eventBus from '../eventBus.js';
import BaseFailure from './BaseFailure.js';

// Registry of all failure definitions (will be populated)
import EngineFailures from './types/EngineFailures.js';
import SystemFailures from './types/SystemFailures.js';
import ControlFailures from './types/ControlFailures.js';
import EnvironmentFailures from './types/EnvironmentFailures.js';

class FailureHandler {
    constructor(config = {}) {
        this.difficulty = config.difficulty || 'intermediate';
        this.activeFailures = new Map(); // id -> failureInstance
        this.registry = new Map();
        
        // Register definitions
        this.registerGroup(EngineFailures);
        this.registerGroup(SystemFailures);
        this.registerGroup(ControlFailures);
        this.registerGroup(EnvironmentFailures);

        this.settings = this.getDifficultySettings(this.difficulty);
        this.time = 0;
        this.nextCheckTime = 10.0;
    }

    registerGroup(group) {
        if (!group) return;
        Object.values(group).forEach(def => {
            this.registry.set(def.id, def);
        });
    }

    getDifficultySettings(difficulty) {
        // ... (Logic from old FailureSystem.js) ...
        const settings = {
            rookie: { probMultiplier: 0.0, maxFailures: 0 },
            amateur: { probMultiplier: 0.2, maxFailures: 1 },
            intermediate: { probMultiplier: 0.5, maxFailures: 2 },
            advanced: { probMultiplier: 1.0, maxFailures: 3 },
            pro: { probMultiplier: 1.5, maxFailures: 4 },
            devil: { probMultiplier: 2.5, maxFailures: 5 }
        };
        return settings[difficulty] || settings.intermediate;
    }

    update(dt, flightState) {
        this.time += dt;

        // Update active failures
        this.activeFailures.forEach(failure => {
            failure.update(dt, flightState);
        });

        // Random triggering logic
        if (this.time > this.nextCheckTime) {
            this.checkRandomFailures(flightState);
            this.nextCheckTime = this.time + 5.0 + Math.random() * 5.0;
        }
    }

    applyImpact(physicsService) {
        this.activeFailures.forEach(failure => {
            failure.apply(physicsService);
        });
    }

    triggerFailure(id, context = {}) {
        if (this.activeFailures.has(id)) return;
        
        const def = this.registry.get(id);
        if (!def) {
            console.warn(`Failure definition not found: ${id}`);
            return;
        }

        // Auto-fill context if needed (e.g., random engine index)
        if (def.category === 'engine' && context.engineIndex === undefined) {
            context.engineIndex = Math.random() > 0.5 ? 1 : 0;
        }

        const failure = new BaseFailure(def, context);
        failure.transitionTo('incipient'); // Start sequence
        
        this.activeFailures.set(id, failure);
        
        // Global Event
        eventBus.publish(eventBus.Types.FAILURE_OCCURRED, {
            type: id,
            severity: 'major', // Dynamic?
            data: context
        });

        // Narrative Event (Initial)
        const desc = failure.getDescription();
        eventBus.publish(eventBus.Types.CRITICAL_MESSAGE, {
            title: 'SYSTEM ALERT',
            content: desc,
            severity: 'warning'
        });
    }

    checkRandomFailures(state) {
        if (this.activeFailures.size >= this.settings.maxFailures) return;
        
        const baseProb = 0.005 * this.settings.probMultiplier;
        if (Math.random() > baseProb) return;

        // Filter valid candidates based on conditions
        const candidates = Array.from(this.registry.values()).filter(def => {
            if (def.condition && typeof def.condition === 'function') {
                return def.condition(state);
            }
            return true;
        });

        if (candidates.length === 0) return;

        const def = candidates[Math.floor(Math.random() * candidates.length)];
        this.triggerFailure(def.id);
    }

    reset() {
        this.activeFailures.clear();
        this.time = 0;
    }
}

export default FailureHandler;
