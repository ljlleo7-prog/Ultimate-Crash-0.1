import { failureGraphManager } from './FailureGraphManager.js';

class CascadeResolver {
    constructor() {
        this.pendingCascades = []; // { failureId, triggerTime, sourceId }
        this.processedFailures = new Set();
        this.time = 0;
    }

    update(dt, activeFailures) {
        this.time += dt;
        const newFailures = [];

        // Check pending cascades
        this.pendingCascades = this.pendingCascades.filter(cascade => {
            if (this.time >= cascade.triggerTime) {
                newFailures.push(cascade.failureId);
                return false; // Remove from pending
            }
            return true; // Keep in pending
        });

        // Process newly active failures
        activeFailures.forEach(failureId => {
            if (this.processedFailures.has(failureId)) return;

            const edges = failureGraphManager.getEdgesFrom(failureId);
            edges.forEach(edge => {
                // Ignore PHYSICS propagation
                if (edge.propagation_type === 'PHYSICS') return;

                // Apply probability
                if (Math.random() > edge.probability) return;

                // Schedule cascade
                const delay = edge.delay_seconds || 0;
                const triggerTime = this.time + delay;
                
                // Avoid duplicates in pending or already active
                if (activeFailures.has(edge.effect_failure)) return;
                if (this.pendingCascades.some(c => c.failureId === edge.effect_failure)) return;

                this.pendingCascades.push({
                    failureId: edge.effect_failure,
                    triggerTime: triggerTime,
                    sourceId: failureId
                });
            });

            this.processedFailures.add(failureId);
        });

        // Cleanup processedFailures that are no longer active
        this.processedFailures.forEach(id => {
            if (!activeFailures.has(id)) {
                this.processedFailures.delete(id);
            }
        });

        return newFailures;
    }

    reset() {
        this.pendingCascades = [];
        this.processedFailures.clear();
        this.time = 0;
    }
}

export const cascadeResolver = new CascadeResolver();
