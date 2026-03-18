const STAGE_ORDER = [
    'inactive',
    'incipient',
    'degraded',
    'active',
    'critical',
    'stabilized',
    'irreversible',
    'recovered'
];

const getStageRank = (stage) => {
    const index = STAGE_ORDER.indexOf(stage);
    return index === -1 ? STAGE_ORDER.indexOf('active') : index;
};

const getByPath = (value, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((current, key) => (current == null ? undefined : current[key]), value);
};

const compareObservable = (actual, operator, expected) => {
    switch (operator) {
        case '<': return actual < expected;
        case '<=': return actual <= expected;
        case '>': return actual > expected;
        case '>=': return actual >= expected;
        case '!=': return actual !== expected;
        case 'includes': return Array.isArray(actual) ? actual.includes(expected) : false;
        case 'truthy': return !!actual;
        case 'falsy': return !actual;
        case '=':
        case '==':
        default:
            return actual === expected;
    }
};

class FailureGraphExecutor {
    constructor(graph) {
        this.graph = graph;
        this.time = 0;
        this.pendingActivations = new Map();
    }

    reset() {
        this.time = 0;
        this.pendingActivations.clear();
    }

    update(dt, payload) {
        const { activeFailures, flightState, triggerFailure } = payload;
        this.time += dt;

        this.scheduleEligibleEdges(activeFailures, flightState);

        for (const [key, pending] of Array.from(this.pendingActivations.entries())) {
            if (activeFailures.has(pending.edge.targetRuntimeId)) {
                this.pendingActivations.delete(key);
                continue;
            }

            if (this.time < pending.triggerAt) {
                continue;
            }

            const sourceFailure = activeFailures.get(pending.edge.sourceRuntimeId);
            if (!sourceFailure || !this.isEdgeEligible(pending.edge, sourceFailure, flightState)) {
                this.pendingActivations.delete(key);
                continue;
            }

            triggerFailure(pending.edge.targetRuntimeId, pending.context);
            this.pendingActivations.delete(key);
        }
    }

    scheduleEligibleEdges(activeFailures, flightState) {
        this.graph.edges.forEach((edge) => {
            const sourceFailure = activeFailures.get(edge.sourceRuntimeId);
            if (!sourceFailure) return;
            if (activeFailures.has(edge.targetRuntimeId)) return;

            const key = `${edge.id}:${sourceFailure.id}:${edge.targetRuntimeId}`;
            if (this.pendingActivations.has(key)) return;
            if (!this.isEdgeEligible(edge, sourceFailure, flightState)) return;
            if (Math.random() > (edge.probability ?? 1)) return;

            this.pendingActivations.set(key, {
                edge,
                triggerAt: this.time + (edge.delaySeconds || 0),
                context: this.buildTargetContext(edge, sourceFailure)
            });
        });
    }

    isEdgeEligible(edge, sourceFailure, flightState) {
        if (edge.sourceStage && getStageRank(sourceFailure.currentStage) < getStageRank(edge.sourceStage)) {
            return false;
        }

        if ((edge.minSourceTimeInStage || 0) > sourceFailure.timeInStage) {
            return false;
        }

        if (!this.evaluateObservables(edge.requiredObservables, sourceFailure, flightState, true)) {
            return false;
        }

        if (!this.evaluateObservables(edge.inhibitedObservables, sourceFailure, flightState, false)) {
            return false;
        }

        return true;
    }

    evaluateObservables(observables = [], sourceFailure, flightState, expectedResult) {
        return observables.every((observable) => {
            const actual = this.resolveObservableValue(observable.path, sourceFailure, flightState);
            const passed = compareObservable(actual, observable.operator, observable.value);
            return expectedResult ? passed : !passed;
        });
    }

    resolveObservableValue(path, sourceFailure, flightState) {
        if (!path) return undefined;

        if (path === 'source.context.engineIndex') {
            return sourceFailure?.variation?.context?.engineIndex;
        }

        if (path === 'source.stage') {
            return sourceFailure?.currentStage;
        }

        return getByPath(flightState, path);
    }

    buildTargetContext(edge, sourceFailure) {
        const template = edge.targetContextTemplate || {};
        const context = {};

        Object.entries(template).forEach(([key, value]) => {
            if (key === 'inheritEngineIndex' && value) {
                const engineIndex = sourceFailure?.variation?.context?.engineIndex;
                if (engineIndex !== undefined) {
                    context.engineIndex = engineIndex;
                }
                return;
            }

            context[key] = value;
        });

        context.triggeredBy = edge.sourceRuntimeId;
        context.propagationType = edge.propagationType;
        return context;
    }
}

export default FailureGraphExecutor;
