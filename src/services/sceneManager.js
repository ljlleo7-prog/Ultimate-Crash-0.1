import eventBus, { EventTypes } from './eventBus.js';
import { getRunwayHeading } from '../utils/routeGenerator.js';

// Flight phases with cinematic stages
export const FlightPhases = {
  GATE: 'gate',
  PUSHBACK: 'pushback',
  TAXI_OUT: 'taxi_out',
  TAKEOFF_PREP: 'takeoff_prep',
  TAKEOFF: 'takeoff',
  LOW_CLIMB: 'low_climb',
  HIGH_CLIMB: 'high_climb',
  CRUISE: 'cruise',
  HIGH_DESCENT: 'high_descent',
  FINAL_DESCENT: 'final_descent',
  APPROACH: 'approach',
  LANDING: 'landing',
  TAXI_IN: 'taxi_in',
  SHUTDOWN: 'shutdown',
  EMERGENCY: 'emergency',
  POST_MORTEM: 'post_mortem'
};

// Default comprehensive scenario with cinematic narrative
const defaultScenario = {
  id: 'cinematic-flight-1',
  name: 'Tragedy Cinema: Transcontinental',
  difficulty: 'medium',
  aircraftModel: 'Boeing 737-800',
  callsign: 'SKY123',
  departure: 'KJFK',
  arrival: 'KLAX',
  targetCruiseAltitude: 35000,
  
  phases: [
    {
      id: 'phase-gate',
      name: 'Gate Departure',
      type: FlightPhases.GATE,
      durationSeconds: 15,
      physics: { mode: 'off' },
      narrative: {
        title: 'Gate 42 - Pre-Flight',
        content: 'Boarding complete. Cabin crew, arm doors and cross check. Captain, the manifest looks... unusually heavy today.'
      }
    },
    {
      id: 'phase-pushback',
      name: 'Pushback',
      type: FlightPhases.PUSHBACK,
      durationSeconds: 20,
      physics: { mode: 'off' },
      narrative: {
        title: 'Pushback',
        content: 'Ground: "Tow connected, bypass pin inserted. Release parking brakes." Starting engines 1 and 2.'
      }
    },
    {
      id: 'phase-taxi-out',
      name: 'Taxi to Runway',
      type: FlightPhases.TAXI_OUT,
      durationSeconds: 15, // Cinematic skip
      physics: { mode: 'off' },
      narrative: {
        title: 'Taxiing',
        content: 'Taxiing to Runway 13R. "Something feels loose in the rudder pedals," the First Officer mutters.'
      }
    },
    {
      id: 'phase-takeoff-prep',
      name: 'Takeoff Preparation',
      type: FlightPhases.TAKEOFF_PREP,
      durationSeconds: 20,
      physics: { 
        mode: 'continuous',
        initialAltitude: 0,
        initialSpeed: 0,
        throttle: 0.1 // Idle
      },
      narrative: {
        title: 'Holding Short',
        content: 'Tower: "${callsign}, lineup and wait Runway 13R." Engines stabilized. Final config check.'
      }
    },
    {
      id: 'phase-takeoff',
      name: 'Takeoff',
      type: FlightPhases.TAKEOFF,
      durationSeconds: 40,
      physics: { 
        mode: 'continuous',
        targetAltitude: 1000,
        targetSpeed: 160
      },
      narrative: {
        title: 'Takeoff Roll',
        content: 'Tower: "${callsign}, winds calm, cleared for takeoff." TOGA power set. V1... Rotate.'
      }
    },
    {
      id: 'phase-low-climb',
      name: 'Initial Climb',
      type: FlightPhases.LOW_CLIMB,
      durationSeconds: 60,
      physics: {
        mode: 'continuous',
        initialAltitude: 1000, // Transition logic will handle smooth handover
        targetAltitude: 5000,
        targetSpeed: 250
      },
      narrative: {
        title: 'Climb Thrust',
        content: 'Positive rate, gear up. Contact Departure. "Good day, ${callsign}. Radar contact. Climb and maintain 10,000."'
      }
    },
    {
      id: 'phase-high-climb',
      name: 'Climb to Cruise',
      type: FlightPhases.HIGH_CLIMB,
      durationSeconds: 20, // Short duration because we Fast Forward
      fastForward: {
        targetAltitude: 20000,
        targetSpeed: 300,
        timeSkip: 600 // Skip 10 minutes
      },
      physics: {
        mode: 'continuous',
        initialAltitude: 5000,
        targetAltitude: 35000,
        targetSpeed: 300
      },
      narrative: {
        title: 'Passing FL200',
        content: '[TIME SKIP] Climbing through 20,000ft. The air is thinning. Turbulence reported ahead.'
      }
    },
    {
      id: 'phase-cruise',
      name: 'Cruise',
      type: FlightPhases.CRUISE,
      durationSeconds: 120,
      physics: {
        mode: 'continuous',
        initialAltitude: 35000,
        targetAltitude: 35000,
        targetSpeed: 450
      },
      narrative: {
        title: 'Cruise at FL350',
        content: 'Cruising at 35,000ft. Seatbelt sign off. Meal service starting... wait, what was that vibration?'
      },
      failurePoints: [
        {
          id: 'failure-engine-1',
          type: 'engine',
          engineIndex: 0,
          probability: 0.6, // High chance for drama
          triggerTime: 40,
          preWarnTime: 10, // Warn 10s before
          preWarnNarrative: 'The left engine EGT is fluctuating. Strange harmonic vibrations detected.'
        }
      ]
    },
    {
      id: 'phase-high-descent',
      name: 'Initial Descent',
      type: FlightPhases.HIGH_DESCENT,
      durationSeconds: 20,
      fastForward: {
        targetAltitude: 10000,
        targetSpeed: 280,
        timeSkip: 900 // Skip 15 minutes
      },
      physics: {
        mode: 'continuous',
        initialAltitude: 35000,
        targetAltitude: 10000,
        targetSpeed: 280
      },
      narrative: {
        title: 'Descent Clearance',
        content: '[TIME SKIP] ATC: "${callsign}, descend and maintain FL100. Expect ILS approach."'
      }
    },
    {
      id: 'phase-final-descent',
      name: 'Approach Vector',
      type: FlightPhases.FINAL_DESCENT,
      durationSeconds: 60,
      physics: {
        mode: 'continuous',
        initialAltitude: 10000,
        targetAltitude: 3000,
        targetSpeed: 210
      },
      narrative: {
        title: 'Vector to Final',
        content: 'Turning to intercept. "Reduce speed to 210. Flaps 5." Visibility is dropping.'
      }
    },
    {
      id: 'phase-approach',
      name: 'Final Approach',
      type: FlightPhases.APPROACH,
      durationSeconds: 90,
      physics: {
        mode: 'continuous',
        initialAltitude: 3000,
        targetAltitude: 200, // Decision height
        targetSpeed: 140
      },
      narrative: {
        title: 'On Localizer',
        content: 'Gear down, flaps 30. "Cleared for approach." The runway lights are barely visible through the fog.'
      }
    },
    {
      id: 'phase-landing',
      name: 'Landing',
      type: FlightPhases.LANDING,
      durationSeconds: 45,
      physics: {
        mode: 'continuous',
        initialAltitude: 200,
        targetAltitude: 0,
        targetSpeed: 135
      },
      narrative: {
        title: 'Short Final',
        content: 'Minimums. Continue. Flare... Touchdown.'
      }
    },
    {
      id: 'phase-taxi-in',
      name: 'Taxi to Gate',
      type: FlightPhases.TAXI_IN,
      durationSeconds: 20,
      physics: { mode: 'off' }, // Cinematic
      narrative: {
        title: 'Taxi to Gate',
        content: 'Welcome to ${arrival}. Please remain seated. The ordeal is over... for now.'
      }
    },
    {
      id: 'phase-shutdown',
      name: 'Shutdown',
      type: FlightPhases.SHUTDOWN,
      durationSeconds: 10,
      physics: { mode: 'off' },
      narrative: {
        title: 'Engine Shutdown',
        content: 'APU running. Cutoff switches off. "Good flight, everyone."'
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
    this.activeFailures = new Map();
    this.completedPhases = new Set();
    this.currentPhaseData = null;
    this.narrativeHistory = [];
    this.preWarnedFailures = new Set(); // Track pre-warned failures
    
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
    this.preWarnedFailures.clear();
    
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
    this.preWarnedFailures.clear();
    
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
    
    // Handle Fast Forward / Cinematic Skip
    if (nextPhase.fastForward) {
      this.handleFastForward(nextPhase);
    } else {
      // Standard transition
      this.setPhaseInitialConditions(nextPhase);
    }

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

  handleFastForward(phase) {
    const ff = phase.fastForward;
    
    // Advance time
    this.totalElapsed += (ff.timeSkip || 0);
    
    // Create new physics conditions for the teleport
    const conditions = {
      position: { z: ff.targetAltitude ? -ff.targetAltitude * 0.3048 : undefined }, // Convert ft to meters (NED)
      // Velocity needs to be set based on target speed
      // We'll let physics service handle the vector math if we pass speed
      // But setInitialConditions expects specific structure
      // We will publish a special event for Fast Forward
    };
    
    // We can reuse setInitialConditions logic but we need to signal it's a "Teleport"
    // which might need to reset rate of climb etc.
    
    const initialConditions = {};
    if (ff.targetAltitude !== undefined) {
      initialConditions.position = { z: ff.targetAltitude * 0.3048 }; // Pass positive meters, helper converts
    }
    if (ff.targetSpeed !== undefined) {
      initialConditions.velocity = { u: ff.targetSpeed * 0.514444, v: 0, w: 0 }; // Approx forward speed
    }
    
    // Publish Fast Forward Event
    eventBus.publishWithMetadata('cinematic.fast_forward', {
      phaseId: phase.id,
      timeSkip: ff.timeSkip,
      targetState: initialConditions
    });
    
    // Also apply these conditions to physics immediately
    this.setPhaseInitialConditions(phase, initialConditions);
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
    
    // Check for failure triggers and PRE-WARNINGS in current phase
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

    let isPhaseComplete = false;
    const altitude_m = payload?.position?.z || 0;
    const altitude_ft = altitude_m * 3.28084;
    const speed_kts = (payload?.derived?.airspeed || 0);

    // Condition-based completion
    switch (phase.type) {
      case FlightPhases.TAKEOFF:
        // Complete when above 1000ft
        if (altitude_ft > 1000) isPhaseComplete = true;
        break;
      case FlightPhases.LOW_CLIMB:
        // Complete when above 5000ft
        if (altitude_ft > 5000) isPhaseComplete = true;
        break;
      case FlightPhases.HIGH_CLIMB:
        // Time based or altitude based (if not skipped)
        if (altitude_ft > 20000 && this.elapsedInPhase > 10) isPhaseComplete = true;
        break;
      case FlightPhases.HIGH_DESCENT:
        if (altitude_ft < 11000 && this.elapsedInPhase > 10) isPhaseComplete = true;
        break;
      case FlightPhases.FINAL_DESCENT:
        if (altitude_ft < 3000) isPhaseComplete = true;
        break;
      case FlightPhases.APPROACH:
        if (altitude_ft < 500) isPhaseComplete = true;
        break;
      case FlightPhases.LANDING:
        // Complete when stopped or very slow
        if (speed_kts < 30 && this.elapsedInPhase > 20) isPhaseComplete = true;
        break;
      default:
        // Default: time-based completion
        if (phase.durationSeconds && this.elapsedInPhase >= phase.durationSeconds) {
          isPhaseComplete = true;
        }
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
      // 1. Check Pre-Warning
      if (failurePoint.preWarnTime && failurePoint.preWarnNarrative) {
        // Trigger window: [TriggerTime - PreWarnTime, TriggerTime]
        const warnTime = failurePoint.triggerTime - failurePoint.preWarnTime;
        if (this.elapsedInPhase >= warnTime && !this.preWarnedFailures.has(failurePoint.id)) {
           this.preWarnedFailures.add(failurePoint.id);
           this.publishNarrative({
             title: 'Warning Sign',
             content: failurePoint.preWarnNarrative,
             severity: 'warning'
           });
        }
      }

      // 2. Check Actual Failure
      // Skip already triggered failures
      if (this.activeFailures.has(failurePoint.id)) continue;
      
      // Check if trigger time has been reached
      if (this.elapsedInPhase >= failurePoint.triggerTime) {
        // Randomly trigger based on probability
        if (Math.random() <= failurePoint.probability) {
          this.triggerFailure(failurePoint);
        } else {
          // If we passed the check but didn't trigger (lucky), mark as "processed" so we don't retry every frame?
          // Actually, typical implementation retries every frame or marks it.
          // To strictly follow probability, we should check once.
          // For now, let's just mark it as "failed to trigger" by adding to activeFailures with a dummy flag or just ignore.
          // But here, probability is per-flight check usually.
          // To avoid 60 checks per second, we should use a flag.
          // But since probability is usually 1.0 for scripted events or low for random, 
          // let's assume if it misses, it misses forever for this timestamp.
          // Simpler: Set probability to 1.0 for scripted tragedy.
          this.activeFailures.set(failurePoint.id, { id: failurePoint.id, dummy: true }); // Prevent re-check
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
      if (failure.dummy) continue; // Skip dummy entries

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
    if (!failure || failure.dummy) return;
    
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
      activeFailures: Array.from(this.activeFailures.values()).filter(f => !f.dummy),
      completedPhases: Array.from(this.completedPhases),
      lastCommand: this.lastCommand,
      narrativeHistory: this.narrativeHistory.slice(-5) // Return last 5 narrative entries
    };
  }

  // Set initial physics conditions for the current phase
  setPhaseInitialConditions(phase, overrides = null) {
    if (!phase || !phase.physics) {
      return;
    }

    const physics = phase.physics;
    const initialConditions = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { u: 0, v: 0, w: 0 },
      orientation: { phi: 0, theta: 0, psi: 0 },
      throttle: 0,
      ...overrides // Merge overrides (from fastForward)
    };
    
    // If overrides provided position, ensure we use it
    if (overrides && overrides.position) {
       Object.assign(initialConditions.position, overrides.position);
    }
    if (overrides && overrides.velocity) {
       Object.assign(initialConditions.velocity, overrides.velocity);
    }

    // Apply phase-specific physics settings if not overridden
    if (physics.initialAltitude !== undefined && (!overrides || !overrides.position || overrides.position.z === undefined)) {
      // Convert to meters if altitude is in feet
      initialConditions.position.z = physics.initialAltitude * 0.3048;
    }

    if (physics.initialSpeed !== undefined && (!overrides || !overrides.velocity)) {
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
      let runwayHeading = 130;
      if (this.scenario.initialHeading !== undefined) {
        runwayHeading = this.scenario.initialHeading;
      } else {
        runwayHeading = this.getDepartureRunwayHeading() || 130;
      }
      initialConditions.orientation.psi = runwayHeading * Math.PI / 180;
      
      // Apply takeoff configuration - set to idle for startup
      initialConditions.throttle = 0.05; // 5% idle instead of 30%
    }
    
    // Default throttle from config
    if (physics.throttle !== undefined) {
        initialConditions.throttle = physics.throttle;
    }

    // Publish initial conditions event
    eventBus.publishWithMetadata(EventTypes.PHYSICS_INITIALIZE, {
      phaseId: phase.id,
      phaseType: phase.type,
      initialConditions,
      targetAltitude: (phase.fastForward?.targetAltitude || physics.targetAltitude) ? (phase.fastForward?.targetAltitude || physics.targetAltitude) * 0.3048 : undefined,
      targetSpeed: (phase.fastForward?.targetSpeed || physics.targetSpeed) ? (phase.fastForward?.targetSpeed || physics.targetSpeed) * 0.514444 : undefined,
      targetHeading: physics.targetHeading ? physics.targetHeading * Math.PI / 180 : undefined
    });
  }

  getDepartureRunwayHeading() {
    const runway = this.scenario?.departureRunway;
    if (typeof runway === 'string' && runway.length > 0) {
      return getRunwayHeading(runway);
    }
    return 130;
  }
}

// Create a singleton instance
const instance = new SceneManager();
export default instance;
