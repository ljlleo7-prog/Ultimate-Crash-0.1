
/**
 * Base class for all failure instances.
 * Handles stages, progression, and state management.
 */
class BaseFailure {
    constructor(def, context = {}) {
        this.id = def.id;
        this.name = def.name;
        this.category = def.category;
        this.stages = def.stages || { inactive: { next: 'active' }, active: {} };
        
        // State
        this.currentStage = 'inactive';
        this.timeInStage = 0;
        this.totalTime = 0;
        this.intensity = 0; // 0.0 to 1.0
        
        // Nuance (Random variations per instance)
        this.variation = {
            progressionRate: 0.8 + Math.random() * 0.4, // +/- 20% speed
            maxIntensity: 0.7 + Math.random() * 0.3, // Not always 100% catastrophic
            fluctuation: Math.random(), // Seed for noise
            context: { ...context } // Specifics like engineIndex
        };

        // History
        this.logs = [];
    }

    update(dt, flightState) {
        this.timeInStage += dt;
        this.totalTime += dt;

        const stageDef = this.stages[this.currentStage];
        if (!stageDef) return;

        // Check for stage progression
        if (stageDef.next && stageDef.duration) {
            // Variation applied to duration
            const duration = stageDef.duration * (1 / this.variation.progressionRate);
            if (this.timeInStage > duration) {
                this.transitionTo(stageDef.next);
            }
        }
        
        // Calculate Intensity (Ramp up logic usually)
        if (stageDef.intensityTarget !== undefined) {
            const rate = (stageDef.intensityRate || 0.1) * dt;
            if (this.intensity < stageDef.intensityTarget) {
                this.intensity = Math.min(stageDef.intensityTarget, this.intensity + rate);
            }
        }
    }

    transitionTo(stageName) {
        if (this.currentStage === stageName) return;
        
        const oldStage = this.currentStage;
        this.currentStage = stageName;
        this.timeInStage = 0;
        
        const stageDef = this.stages[stageName];
        const desc = this.getDescription();
        
        this.logs.push({
            time: this.totalTime,
            from: oldStage,
            to: stageName,
            message: desc
        });

        console.log(`[Failure] ${this.name} transitioned: ${oldStage} -> ${stageName}`);
    }

    getDescription() {
        const stageDef = this.stages[this.currentStage];
        if (typeof stageDef?.description === 'function') {
            return stageDef.description(this.variation.context);
        }
        return stageDef?.description || `${this.name} is ${this.currentStage}`;
    }

    // To be overridden or defined in definition
    apply(physicsService) {
        const stageDef = this.stages[this.currentStage];
        if (stageDef && typeof stageDef.effect === 'function') {
            stageDef.effect(physicsService, this.intensity, this.variation.context);
        }
    }
}

export default BaseFailure;
