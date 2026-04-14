
import eventBus from '../eventBus.js';
import BaseFailure from './BaseFailure.js';
import { createCanonicalFailureGraph } from './CanonicalFailureGraph.js';
import FailureGraphExecutor from './FailureGraphExecutor.js';

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
        this.incidentLog = [];
        this.graph = createCanonicalFailureGraph();
        this.settings = this.getDifficultySettings(this.difficulty);
        this.graphExecutor = new FailureGraphExecutor(this.graph, {
            onCascadeScheduled: (payload) => this.handleCascadeScheduled(payload),
            onCascadeTriggered: (payload) => this.handleCascadeTriggered(payload)
        });

        // Register definitions
        this.registerGroup(EngineFailures);
        this.registerGroup(SystemFailures);
        this.registerGroup(ControlFailures);
        this.registerGroup(EnvironmentFailures);
        this.registerGroup(SensorFailures);

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
        const settings = {
            rookie: {
                probMultiplier: 0.0,
                maxFailures: 0,
                cascadeProbabilityMultiplier: 0.35,
                cascadeDelayMultiplier: 2.5,
                blockedCascadeClasses: ['catastrophic']
            },
            amateur: {
                probMultiplier: 0.2,
                maxFailures: 1,
                cascadeProbabilityMultiplier: 0.65,
                cascadeDelayMultiplier: 1.5,
                blockedCascadeClasses: []
            },
            intermediate: {
                probMultiplier: 0.5,
                maxFailures: 2,
                cascadeProbabilityMultiplier: 1.0,
                cascadeDelayMultiplier: 1.0,
                blockedCascadeClasses: []
            },
            advanced: {
                probMultiplier: 1.0,
                maxFailures: 3,
                cascadeProbabilityMultiplier: 1.1,
                cascadeDelayMultiplier: 0.9,
                blockedCascadeClasses: []
            },
            pro: {
                probMultiplier: 1.5,
                maxFailures: 4,
                cascadeProbabilityMultiplier: 1.2,
                cascadeDelayMultiplier: 0.8,
                blockedCascadeClasses: []
            },
            devil: {
                probMultiplier: 2.5,
                maxFailures: 5,
                cascadeProbabilityMultiplier: 1.35,
                cascadeDelayMultiplier: 0.65,
                blockedCascadeClasses: []
            }
        };
        return settings[difficulty] || settings.intermediate;
    }

    getCascadePolicy(context = {}) {
        const difficulty = context.difficulty || this.difficulty;
        const settings = this.getDifficultySettings(difficulty);
        return {
            difficulty,
            probabilityMultiplier: settings.cascadeProbabilityMultiplier ?? 1,
            delayMultiplier: settings.cascadeDelayMultiplier ?? 1,
            blockedCascadeClasses: Array.isArray(settings.blockedCascadeClasses) ? [...settings.blockedCascadeClasses] : []
        };
    }

    update(dt, flightState) {
        this.time += dt;

        // Update active failures
        this.activeFailures.forEach(failure => {
            failure.update(dt, flightState);
        });

        this.graphExecutor.update(dt, {
            activeFailures: this.activeFailures,
            flightState,
            triggerFailure: (id, context) => this.triggerFailure(id, context),
            getCascadePolicy: (sourceFailure) => this.getCascadePolicy(sourceFailure?.variation?.context)
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

    recordIncident(type, payload = {}) {
        this.incidentLog.push({
            time: this.time,
            type,
            ...payload
        });
    }

    getIncidentLog() {
        return this.incidentLog.map(entry => ({ ...entry }));
    }

    handleCascadeScheduled({ edge, sourceFailure, context, scheduledAt, triggerAt, time }) {
        const payload = {
            edgeId: edge.id,
            source: edge.sourceRuntimeId,
            target: edge.targetRuntimeId,
            context,
            scheduledAt,
            triggerAt,
            time,
            sourceStage: sourceFailure?.currentStage || null,
            effectiveProbability: context?.cascadePolicy?.effectiveProbability ?? edge.probability ?? 1,
            effectiveDelay: context?.cascadePolicy?.effectiveDelay ?? edge.delaySeconds ?? 0,
            cascadeBlocked: context?.cascadePolicy?.blocked === true
        };
        this.recordIncident('cascade_scheduled', payload);
        eventBus.publish(eventBus.Types.FAILURE_CASCADE_SCHEDULED, payload);
    }

    handleCascadeTriggered({ edge, sourceFailure, context, scheduledAt, triggerAt, time }) {
        const payload = {
            edgeId: edge.id,
            source: edge.sourceRuntimeId,
            target: edge.targetRuntimeId,
            context,
            scheduledAt,
            triggerAt,
            time,
            sourceStage: sourceFailure?.currentStage || null,
            effectiveProbability: context?.cascadePolicy?.effectiveProbability ?? edge.probability ?? 1,
            effectiveDelay: context?.cascadePolicy?.effectiveDelay ?? edge.delaySeconds ?? 0,
            cascadeBlocked: context?.cascadePolicy?.blocked === true
        };
        this.recordIncident('cascade_triggered', payload);
        eventBus.publish(eventBus.Types.FAILURE_CASCADE_TRIGGERED, payload);
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
        if (!context.cascadePolicy) {
            context.cascadePolicy = this.getCascadePolicy(context);
        }

        if (def.category === 'engine' && context.engineIndex === undefined) {
            context.engineIndex = Math.floor(Math.random() * this.engineCount);
        }

        const failure = new BaseFailure(def, context, this.handleTransition);
        const initialStage = def.stages?.inactive?.next || (def.stages?.incipient ? 'incipient' : 'active');
        failure.transitionTo(initialStage);

        this.activeFailures.set(id, failure);
        this.recordIncident('failure_triggered', {
            failureId: id,
            context: { ...context },
            stage: failure.currentStage
        });

        // Global Event
        eventBus.publish(eventBus.Types.FAILURE_OCCURRED, {
            type: id,
            severity: 'major', // Dynamic?
            data: context,
            time: this.time
        });
    }
    
    handleTransition(failure, desc) {
        // Handle sensory events
        let message = typeof desc === 'string' ? desc : desc.text;
        this.recordIncident('failure_progressed', {
            failureId: failure.id,
            stage: failure.currentStage,
            message,
            description: desc
        });
        eventBus.publish(eventBus.Types.FAILURE_PROGRESSED, {
            type: failure.id,
            stage: failure.currentStage,
            message,
            description: desc,
            time: this.time
        });

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
                severity: 'warning',
                time: this.time
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
        this.graphExecutor.reset();
    }
}

export default FailureHandler;
