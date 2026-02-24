
import eventBus from '../eventBus.js';
import BaseFailure from './BaseFailure.js';

// Registry of all failure definitions (will be populated)
import EngineFailures from './types/EngineFailures.js';
import SystemFailures from './types/SystemFailures.js';
import ControlFailures from './types/ControlFailures.js';
import EnvironmentFailures from './types/EnvironmentFailures.js';
import SensorFailures from './types/SensorFailures.js';

class FailureHandler {
    constructor(config = {}) {
        this.difficulty = config.difficulty || 'intermediate';
        this.engineCount = config.engineCount || 2;
        this.activeFailures = new Map(); // id -> failureInstance
        this.registry = new Map();
        
        // Register definitions
        this.registerGroup(EngineFailures);
        this.registerGroup(SystemFailures);
        this.registerGroup(ControlFailures);
        this.registerGroup(EnvironmentFailures);
        this.registerGroup(SensorFailures);

        this.settings = this.getDifficultySettings(this.difficulty);
        this.time = 0;
        this.nextCheckTime = 10.0;
        
        // Bind callback
        this.handleTransition = this.handleTransition.bind(this);
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
        
        // Cascade Logic: Check if active failures trigger others
        this.checkCascades(flightState);

        // Random triggering logic
        if (this.time > this.nextCheckTime) {
            this.checkRandomFailures(flightState);
            this.nextCheckTime = this.time + 5.0 + Math.random() * 5.0;
        }
    }

    checkCascades(state) {
        // Cascade: Engine Fire -> Hydraulic Failure
        if (this.activeFailures.has('engine_fire')) {
            const fire = this.activeFailures.get('engine_fire');
            if (fire.currentStage === 'active' && fire.timeInStage > 30.0) {
                 // Fire burns through hydraulic lines
                 if (!this.activeFailures.has('hydraulic_failure') && Math.random() < 0.005) {
                     this.triggerFailure('hydraulic_failure', { reason: 'fire_damage' });
                 }
            }
        }
        
        // Cascade: Electrical Bus -> Avionics Overheat (if fan stops)
        if (this.activeFailures.has('electrical_bus_failure')) {
             if (!this.activeFailures.has('avionics_overheat') && Math.random() < 0.001) {
                 this.triggerFailure('avionics_overheat', { reason: 'cooling_loss' });
             }
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

        // Auto-fill context if needed
        if (context.difficulty === undefined) {
            context.difficulty = this.difficulty;
        }

        if (def.category === 'engine' && context.engineIndex === undefined) {
            context.engineIndex = Math.floor(Math.random() * this.engineCount);
        }

        const failure = new BaseFailure(def, context, this.handleTransition);
        
        // Initial transition will trigger the callback
        // If it has stages, start at incipient or whatever the inactive next is
        // Usually we manually call transitionTo('incipient') if it exists, or let it update from inactive
        
        // Check if 'incipient' exists, otherwise 'active'
        const nextStage = def.stages.incipient ? 'incipient' : 'active';
        failure.transitionTo(nextStage); 
        
        this.activeFailures.set(id, failure);
        
        // Global Event
        eventBus.publish(eventBus.Types.FAILURE_OCCURRED, {
            type: id,
            severity: 'major', // Dynamic?
            data: context
        });
    }
    
    handleTransition(failure, desc) {
        // Handle sensory events
        let message = typeof desc === 'string' ? desc : desc.text;
        
        if (typeof desc === 'object') {
            if (desc.sound) {
                eventBus.publish('SENSORY_SOUND', { id: desc.sound });
            }
            if (desc.visual) {
                eventBus.publish('SENSORY_VISUAL', { type: desc.visual });
            }
            if (desc.smell) {
                eventBus.publish('SENSORY_SMELL', { type: desc.smell });
            }
            if (desc.system_alert) {
                 // Publish to Warning System directly if possible, or via event bus
                 // SystemStatusPanel listens to flightState.activeWarnings
                 // We need to push this to flightState or let WarningSystem pick it up
                 // For now, let's assume we use eventBus to notify WarningSystem
                 eventBus.publish('SYSTEM_ALERT_TRIGGERED', { 
                     id: failure.id, 
                     message: desc.system_alert, 
                     level: 'WARNING' 
                 });
            }
        }

        // Narrative Event (Legacy Support + New Log)
        if (message) {
            eventBus.publish(eventBus.Types.CRITICAL_MESSAGE, {
                title: 'SYSTEM ALERT',
                content: message,
                severity: 'warning'
            });
        }
    }

    checkRandomFailures(state) {
        return; // DISABLED: User requested to disable failures for now
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
