import eventBus, { EventTypes, EventCategories } from './eventBus.js';

// Flight phases with typical parameters
export const FlightPhases = {
  BRIEFING: 'briefing',
  TAKEOFF: 'takeoff',
  CLIMB: 'climb',
  INITIAL_CLIMB: 'initial_climb',
  MAIN_CLIMB: 'main_climb',
  CRUISE: 'cruise',
  DESCENT: 'descent',
  APPROACH: 'approach',
  LANDING: 'landing',
  EMERGENCY: 'emergency',
  POST_MORTEM: 'post_mortem'
};

// Default comprehensive scenario with realistic flight phases
const defaultScenario = {
  id: 'realistic-flight-1',
  name: 'Realistic Transcontinental Flight',
  difficulty: 'medium',
  aircraftModel: 'Boeing 737-800',
  callsign: 'SKY123',
  departure: 'KJFK',
  arrival: 'KLAX',
  targetCruiseAltitude: 35000, // New: Define target cruise altitude in feet
  
  // Flight phases with detailed parameters
  phases: [
    {
      id: 'phase-briefing',
      name: 'Pre-Flight Briefing',
      type: FlightPhases.BRIEFING,
      durationSeconds: 10,
      physics: {
        mode: 'off'
      },
      narrative: {
        title: 'Welcome to ${callsign}',
        content: 'You are captain of a ${aircraft} bound for ${arrival}. Weather is clear, but be prepared for possible turbulence ahead.'
      }
    },
    {
      id: 'phase-takeoff',
      name: 'Takeoff Roll',
      type: FlightPhases.TAKEOFF,
      durationSeconds: 30,
      physics: {
        mode: 'continuous',
        initialAltitude: 0,
        targetAltitude: 1000,
        targetSpeed: 150
      },
      narrative: {
        title: 'Takeoff Clearance',
        content: '${departure} Tower: "${callsign}, cleared for takeoff runway 13R." Rotate at 135 knots.'
      }
    },
    {
      id: 'phase-initial-climb',
      name: 'Initial Climb',
      type: FlightPhases.INITIAL_CLIMB,
      durationSeconds: 120, // Placeholder, will be condition-based
      physics: {
        mode: 'continuous',
        initialAltitude: 3000, // Start of this phase
        targetAltitude: 10000,
        targetSpeed: 250 // IAS
      },
      narrative: {
        title: 'Initial Climb',
        content: '${callsign}, positive rate, gear up. Accelerate to 250 knots below 10,000 feet.'
      }
    },
    {
      id: 'phase-main-climb',
      name: 'Main Climb',
      type: FlightPhases.MAIN_CLIMB,
      durationSeconds: 300, // Placeholder, will be condition-based
      physics: {
        mode: 'continuous',
        initialAltitude: 10000, // Start of this phase
        targetAltitude: 35000, // Example cruise altitude
        targetSpeed: 270 // IAS
      },
      narrative: {
        title: 'Main Climb',
        content: '${callsign}, climbing through 10,000 feet. Accelerate to 270 knots.'
      }
    },
    {
      id: 'phase-cruise',
      name: 'Cruise Flight',
      type: FlightPhases.CRUISE,
      durationSeconds: 180,
      physics: {
        mode: 'continuous',
        initialAltitude: 35000,
        targetAltitude: 35000,
        targetSpeed: 450 // TAS
      },
      narrative: {
        title: 'Cruise at FL350',
        content: '${callsign}, maintain 35,000 feet, 450 knots. Enjoy the smooth ride.'
      },
      // Potential failure points during cruise
      failurePoints: [
        {
          id: 'failure-engine-1',
          type: 'engine',
          engineIndex: 0,
          probability: 0.3,
          triggerTime: 60 // Seconds into this phase
        },
        {
          id: 'failure-hydraulic',
          type: 'hydraulic',
          system: 'primary',
          probability: 0.2,
          triggerTime: 90
        }
      ]
    },
    {
      id: 'phase-descent',
      name: 'Descent Initiation',
      type: FlightPhases.DESCENT,
      durationSeconds: 120,
      physics: {
        mode: 'continuous',
        initialAltitude: 35000,
        targetAltitude: 10000,
        targetSpeed: 300
      },
      narrative: {
        title: 'Beginning Descent',
        content: 'ATC: "${callsign}, descend and maintain 10,000 feet, reduce speed to 300 knots."'
      }
    },
    {
      id: 'phase-approach',
      name: 'Final Approach',
      type: FlightPhases.APPROACH,
      durationSeconds: 60,
      physics: {
        mode: 'continuous',
        initialAltitude: 10000,
        targetAltitude: 2000,
        targetSpeed: 180
      },
      narrative: {
        title: 'Final Approach to ${arrival}',
        content: '${callsign}, configure for landing: flaps 30, gear down. Maintain 180 knots until glideslope intercept.'
      }
    },
    {
      id: 'phase-landing',
      name: 'Landing Roll',
      type: FlightPhases.LANDING,
      durationSeconds: 30,
      physics: {
        mode: 'continuous',
        initialAltitude: 2000,
        targetAltitude: 0,
        targetSpeed: 0
      },
      narrative: {
        title: 'Landing at ${arrival}',
        content: '${callsign}, flare at 50 feet, maintain positive pitch until touchdown. Reverse thrust and brakes after wheels down.'
      }
    }
  ]
};

class SceneManager {
  constructor(scenario = defaultScenario) {
    this.scenario = scenario;
    this.currentIndex = 0;
    this.elapsedInPhase = 0;
    this.totalElapsed = 0;
    this.status = 'idle';
    this.lastCommand = null;
    this.activeFailures = new Map(); // Track active failures
    this.completedPhases = new Set(); // Track completed phases
    this.currentPhaseData = null; // Additional phase-specific data
    this.narrativeHistory = []; // Track narrative messages
    
    // Set up command handling
    this.unsubscribeCommand = eventBus.subscribe('command.input', payload => {
      this.lastCommand = payload;
      eventBus.publishWithMetadata(EventTypes.COMMAND_EXECUTED, {
        scenarioId: this.scenario.id,
        phaseId: this.currentPhase()?.id,
        payload
      });
    });
    
    // Set up system failure resolution handling
    this.unsubscribeFailureResolved = eventBus.subscribe(EventTypes.FAILURE_RESOLVED, payload => {
      this.activeFailures.delete(payload.failureId);
    });
  }

  currentPhase() {
    return this.scenario.phases[this.currentIndex] || null;
  }

  start() {
    if (!this.currentPhase()) {
      return;
    }
    this.status = 'running';
    this.elapsedInPhase = 0;
    this.totalElapsed = 0;
    this.activeFailures.clear();
    this.completedPhases.clear();
    this.narrativeHistory = [];
    
    const initialPhase = this.currentPhase();
    
    // Publish phase started event
    eventBus.publishWithMetadata(EventTypes.PHASE_CHANGED, {
      scenarioId: this.scenario.id,
      phase: initialPhase,
      totalElapsed: this.totalElapsed
    });
    
    // Publish initial narrative
    if (initialPhase.narrative) {
      this.publishNarrative(initialPhase.narrative);
    }
  }

  nextPhase() {
    // Mark current phase as completed
    const currentPhase = this.currentPhase();
    if (currentPhase) {
      this.completedPhases.add(currentPhase.id);
      eventBus.publishWithMetadata(EventTypes.PHASE_COMPLETE, {
        scenarioId: this.scenario.id,
        phase: currentPhase,
        totalElapsed: this.totalElapsed,
        elapsedInPhase: this.elapsedInPhase
      });
    }
    
    // Move to next phase
    this.currentIndex += 1;
    this.elapsedInPhase = 0;
    this.currentPhaseData = null;
    
    const nextPhase = this.currentPhase();
    if (!nextPhase) {
      this.status = 'completed';
      eventBus.publishWithMetadata('scenario.completed', {
        scenarioId: this.scenario.id,
        totalElapsed: this.totalElapsed,
        completedPhases: Array.from(this.completedPhases),
        activeFailures: Array.from(this.activeFailures.values())
      });
      return;
    }
    
    // Set initial physics conditions for the new phase
    this.setPhaseInitialConditions(nextPhase);

    // Publish phase changed event
    eventBus.publishWithMetadata(EventTypes.PHASE_CHANGED, {
      scenarioId: this.scenario.id,
      phase: nextPhase,
      totalElapsed: this.totalElapsed,
      previousPhase: currentPhase
    });
    
    // Publish narrative for new phase
    if (nextPhase.narrative) {
      this.publishNarrative(nextPhase.narrative);
    }
  }

  // Update the scenario with new flight parameters
  updateScenario(newParams) {
    this.scenario = {
      ...this.scenario,
      ...newParams
    };
    
    // If running, update current phase narrative
    const currentPhase = this.currentPhase();
    if (currentPhase && currentPhase.narrative) {
      this.publishNarrative(currentPhase.narrative);
    }
    
    return this.scenario;
  }

  update(dt, payload = null) {
    if (this.status !== 'running') {
      return;
    }
    
    const phase = this.currentPhase();
    if (!phase) {
      this.status = 'completed';
      return;
    }
    
    this.elapsedInPhase += dt;
    this.totalElapsed += dt;
    
    // Check for failure triggers in current phase
    this.checkFailureTriggers(phase);
    
    // Update active failures
    this.updateActiveFailures(dt);
    
    // Publish phase tick event
    eventBus.publishWithMetadata('phase.tick', {
      scenarioId: this.scenario.id,
      phaseId: phase.id,
      phaseType: phase.type,
      elapsedInPhase: this.elapsedInPhase,
      totalElapsed: this.totalElapsed,
      activeFailures: Array.from(this.activeFailures.values()),
      physicsActive: this.physicsActive()
    });
    
    this.checkPhaseCompletion(dt, payload);
  }

  checkPhaseCompletion(dt, payload) {
    const phase = this.currentPhase();
    if (!phase) return;

    // Check if phase is complete
    let isPhaseComplete = false;
    
    // Condition-based completion for specific phases
    if (phase.type === FlightPhases.TAKEOFF) {
      const altitude_m = payload?.position?.z || 0;
      const altitude_ft = altitude_m * 3.28084;
      const verticalSpeed_fps = payload?.velocity?.w || 0; // Vertical speed in ft/s
      const verticalSpeed_fpm = verticalSpeed_fps * 60; // Vertical speed in ft/min
      const apEngaged = payload?.autopilot?.engaged || false;
      const gearUp = payload?.gearValue === false; // gearValue is true for down, false for up
      const flapsUp = payload?.flapsValue === 0; // flapsValue is 0 for up
      
      // Transition from TAKEOFF to INITIAL_CLIMB
      if (
        verticalSpeed_fpm > 500 && // Positive climb rate
        gearUp &&
        flapsUp &&
        altitude_ft >= 3000 &&
        apEngaged
      ) {
        isPhaseComplete = true;
      }
    } else if (phase.type === FlightPhases.INITIAL_CLIMB) {
      const altitude_m = payload?.position?.z || 0;
      const altitude_ft = altitude_m * 3.28084;
      
      // Transition from INITIAL_CLIMB to MAIN_CLIMB
      if (altitude_ft >= 10000) {
        isPhaseComplete = true;
      }
    } else if (phase.type === FlightPhases.MAIN_CLIMB) {
      const altitude_m = payload?.position?.z || 0;
      const altitude_ft = altitude_m * 3.28084;
      
      // Transition from MAIN_CLIMB to CRUISE
      if (altitude_ft >= this.scenario.targetCruiseAltitude) {
        isPhaseComplete = true;
      }
    } else {
      // Default: time-based completion
      isPhaseComplete = this.elapsedInPhase >= phase.durationSeconds;
    }

    if (isPhaseComplete) {
      eventBus.publishWithMetadata('phase.ended', {
        scenarioId: this.scenario.id,
        phaseId: phase.id,
        elapsedInPhase: this.elapsedInPhase
      });
      this.nextPhase();
    }
  }

  // Check for failure points to trigger in current phase
  checkFailureTriggers(phase) {
    if (!phase.failurePoints) return;
    
    for (const failurePoint of phase.failurePoints) {
      // Skip already triggered failures
      if (this.activeFailures.has(failurePoint.id)) continue;
      
      // Check if trigger time has been reached
      if (this.elapsedInPhase >= failurePoint.triggerTime) {
        // Randomly trigger based on probability
        if (Math.random() <= failurePoint.probability) {
          this.triggerFailure(failurePoint);
        }
      }
    }
  }
  
  // Trigger a system failure
  triggerFailure(failurePoint) {
    const failure = {
      id: failurePoint.id,
      type: failurePoint.type,
      severity: 'minor', // Initial severity
      progress: 0, // 0-100% progression
      startTime: this.totalElapsed,
      data: { ...failurePoint },
      isCritical: false,
      timeToCritical: null
    };
    
    this.activeFailures.set(failure.id, failure);
    
    // Publish failure occurred event
    eventBus.publishWithMetadata(EventTypes.FAILURE_OCCURRED, {
      failureId: failure.id,
      failure,
      phaseId: this.currentPhase()?.id,
      scenarioId: this.scenario.id,
      totalElapsed: this.totalElapsed
    });
    
    // Create narrative for failure
    this.publishNarrative({
      title: 'System Alert',
      content: this.getFailureNarrative(failure),
      severity: 'warning'
    });
  }
  
  // Update active failures progression
  updateActiveFailures(dt) {
    for (const [failureId, failure] of this.activeFailures.entries()) {
      // Update failure progress
      failure.progress += dt * (5 + Math.random() * 10); // 5-15% per second
      
      // Check if failure has become critical
      if (failure.progress >= 75 && !failure.isCritical) {
        failure.isCritical = true;
        failure.timeToCritical = this.totalElapsed;
        
        eventBus.publishWithMetadata(EventTypes.FAILURE_PROGRESSED, {
          failureId: failure.id,
          failure,
          phaseId: this.currentPhase()?.id,
          scenarioId: this.scenario.id,
          totalElapsed: this.totalElapsed
        });
        
        this.publishNarrative({
          title: 'Critical Failure Alert',
          content: this.getCriticalFailureNarrative(failure),
          severity: 'critical'
        });
      }
      
      // Check if failure is complete (100% progression)
      if (failure.progress >= 100) {
        this.resolveFailure(failureId, false); // False = not resolved by user
      }
    }
  }
  
  // Resolve a failure (either by user action or natural completion)
  resolveFailure(failureId, resolvedByUser = true) {
    const failure = this.activeFailures.get(failureId);
    if (!failure) return;
    
    eventBus.publishWithMetadata(EventTypes.FAILURE_RESOLVED, {
      failureId: failure.id,
      failure,
      resolvedByUser,
      phaseId: this.currentPhase()?.id,
      scenarioId: this.scenario.id,
      totalElapsed: this.totalElapsed
    });
    
    this.activeFailures.delete(failureId);
    
    if (resolvedByUser) {
      this.publishNarrative({
        title: 'System Restored',
        content: this.getResolutionNarrative(failure),
        severity: 'success'
      });
    }
  }
  
  // Publish narrative message
  publishNarrative(narrative) {
    // Parse template in title and content
    const parsedTitle = narrative.title ? this.parseTemplate(narrative.title, narrative.data) : '';
    const parsedContent = narrative.content ? this.parseTemplate(narrative.content, narrative.data) : '';
    
    const narrativeEntry = {
      id: `narrative-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: this.totalElapsed,
      phaseId: this.currentPhase()?.id,
      title: parsedTitle,
      content: parsedContent,
      severity: narrative.severity,
      data: narrative.data
    };
    
    this.narrativeHistory.push(narrativeEntry);
    eventBus.publishWithMetadata(EventTypes.NARRATIVE_UPDATE, narrativeEntry);
    
    // Publish critical messages as separate events
    if (narrative.severity === 'critical') {
      eventBus.publishWithMetadata(EventTypes.CRITICAL_MESSAGE, narrativeEntry);
    }
  }
  
  // Parse template with dynamic data
  parseTemplate(template, data) {
    if (!template) return '';
    
    // Create a context with scenario data and provided data
    const context = {
      callsign: this.scenario.callsign || 'Flight 123',
      departure: this.scenario.departure || 'Unknown',
      arrival: this.scenario.arrival || 'Unknown',
      aircraft: this.scenario.aircraftModel || 'Unknown Aircraft',
      difficulty: this.scenario.difficulty || 'Unknown',
      ...data
    };
    
    // Replace variables in template
    return template.replace(/\${([^}]+)}/g, (match, key) => {
      const trimmedKey = key.trim();
      // Handle nested properties (e.g., ${some.object.prop})
      const value = trimmedKey.split('.').reduce((obj, prop) => {
        return obj && obj[prop] !== undefined ? obj[prop] : undefined;
      }, context);
      
      return value !== undefined ? value : match;
    });
  }

  // Generate narrative text for failures
  getFailureNarrative(failure) {
    const templates = {
      engine: { minor: 'Engine ${engineIndex + 1} showing abnormal vibrations. Monitor closely.' },
      hydraulic: { minor: 'Primary hydraulic pressure dropping. Check systems.' },
      electrical: { minor: 'Electrical bus ${bus} experiencing intermittent power loss.' },
      fuel: { minor: 'Fuel imbalance detected. Crossfeed engaged automatically.' }
    };
    
    const template = templates[failure.type]?.minor || 'System ${type} failure detected.';
    return this.parseTemplate(template, failure.data);
  }
  
  // Generate critical failure narrative
  getCriticalFailureNarrative(failure) {
    const templates = {
      engine: { critical: 'Engine ${engineIndex + 1} FAILED! Immediate action required!' },
      hydraulic: { critical: 'Primary hydraulic system FAILURE! Manual reversion required!' },
      electrical: { critical: 'Main electrical bus FAILURE! Emergency power engaged!' },
      fuel: { critical: 'Fuel leak detected! Rapid fuel loss occurring!' }
    };
    
    const template = templates[failure.type]?.critical || 'System ${type} CRITICAL FAILURE!';
    return this.parseTemplate(template, failure.data);
  }
  
  // Generate resolution narrative
  getResolutionNarrative(failure) {
    const templates = {
      engine: { resolved: 'Engine ${engineIndex + 1} restored to normal operation.' },
      hydraulic: { resolved: 'Hydraulic pressure stabilized. System restored.' },
      electrical: { resolved: 'Electrical bus power restored to normal levels.' },
      fuel: { resolved: 'Fuel imbalance resolved.' }
    };
    
    const template = templates[failure.type]?.resolved || 'System ${type} restored.';
    return this.parseTemplate(template, failure.data);
  }

  physicsActive() {
    const phase = this.currentPhase();
    if (!phase || !phase.physics) {
      return false;
    }
    if (phase.physics.mode === 'off') {
      return false;
    }
    if (phase.physics.mode === 'continuous') {
      return true;
    }
    if (phase.physics.mode === 'window') {
      const limit = typeof phase.physics.activeUntilSeconds === 'number'
        ? phase.physics.activeUntilSeconds
        : phase.durationSeconds;
      return this.elapsedInPhase <= limit;
    }
    return false;
  }

  getState() {
    const phase = this.currentPhase();
    return {
      scenarioId: this.scenario.id,
      status: this.status,
      phaseId: phase ? phase.id : null,
      phaseName: phase ? phase.name : null,
      phaseType: phase ? phase.type : null,
      elapsedInPhase: this.elapsedInPhase,
      totalElapsed: this.totalElapsed,
      physicsActive: this.physicsActive(),
      activeFailures: Array.from(this.activeFailures.values()),
      completedPhases: Array.from(this.completedPhases),
      lastCommand: this.lastCommand,
      narrativeHistory: this.narrativeHistory.slice(-5) // Return last 5 narrative entries
    };
  }

  // Set initial physics conditions for the current phase
  setPhaseInitialConditions(phase) {
    if (!phase || !phase.physics) {
      return;
    }

    const physics = phase.physics;
    const initialConditions = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { u: 0, v: 0, w: 0 },
      orientation: { phi: 0, theta: 0, psi: 0 },
      throttle: 0
      // Gear is omitted here to preserve current state in physics service
      // Unless explicitly set by a phase below
    };

    // Apply phase-specific physics settings
    if (physics.initialAltitude !== undefined) {
      // Convert to meters if altitude is in feet
      initialConditions.position.z = physics.initialAltitude * 0.3048;
    }

    if (physics.initialSpeed !== undefined) {
      // Convert to m/s if speed is in knots
      initialConditions.velocity.u = physics.initialSpeed * 0.514444;
    }

    if (physics.initialHeading !== undefined) {
      // Convert to radians if heading is in degrees
      initialConditions.orientation.psi = physics.initialHeading * Math.PI / 180;
    }

    // Handle takeoff specifically
    if (phase.type === FlightPhases.TAKEOFF) {
      // Always start on the ground with zero speed for takeoff
      initialConditions.position.z = 0;
      initialConditions.velocity.u = 0;
      initialConditions.velocity.v = 0;
      initialConditions.velocity.w = 0;
      initialConditions.orientation.theta = 0;
      initialConditions.gear = true; // Explicitly DOWN for takeoff
      
      // Set initial heading based on departure airport runway (default to 130 degrees for runway 13R)
      const runwayHeading = this.getDepartureRunwayHeading() || 130;
      initialConditions.orientation.psi = runwayHeading * Math.PI / 180;
      
      // Apply takeoff configuration - set to idle for startup
      initialConditions.throttle = 0.05; // 5% idle instead of 30%
    }

    // Publish initial conditions event
    eventBus.publishWithMetadata(EventTypes.PHYSICS_INITIALIZE, {
      phaseId: phase.id,
      phaseType: phase.type,
      initialConditions,
      targetAltitude: physics.targetAltitude ? physics.targetAltitude * 0.3048 : undefined,
      targetSpeed: physics.targetSpeed ? physics.targetSpeed * 0.514444 : undefined,
      targetHeading: physics.targetHeading ? physics.targetHeading * Math.PI / 180 : undefined // Add target heading
    });
  }

  getDepartureRunwayHeading() {
    // This would ideally come from the scenario's departure airport data
    return 130; // Default for KJFK 13R
  }
}

// Create a singleton instance
const instance = new SceneManager();
export default instance;
