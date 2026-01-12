const listeners = new Map();

// Event categories for better organization
export const EventCategories = {
  FLIGHT_PHASE: 'flight.phase',
  SYSTEM_FAILURE: 'system.failure',
  PHYSICS_EVENT: 'physics.event',
  CONTROL_INPUT: 'control.input',
  NARRATIVE: 'narrative',
  USER_ACTION: 'user.action'
};

// Event types with structured payloads
export const EventTypes = {
  // Flight phase events
  PHASE_CHANGED: 'flight.phase.changed',
  PHASE_COMPLETE: 'flight.phase.complete',
  
  // System failure events
  FAILURE_OCCURRED: 'system.failure.occurred',
  FAILURE_PROGRESSED: 'system.failure.progressed',
  FAILURE_RESOLVED: 'system.failure.resolved',
  
  // Physics events
  STALL_WARNING: 'physics.stall.warning',
  STALL_OCCURRED: 'physics.stall.occurred',
  HIGH_SPEED_WARNING: 'physics.highspeed.warning',
  HIGH_SPEED_OCCURRED: 'physics.highspeed.occurred',
  ALTITUDE_WARNING: 'physics.altitude.warning',
  G_FORCE_WARNING: 'physics.gforce.warning',
  PHYSICS_INITIALIZE: 'physics.initialize',
  
  // Control events
  THROTTLE_CHANGED: 'control.throttle.changed',
  SURFACE_CHANGED: 'control.surface.changed',
  AUTOPILOT_CHANGED: 'control.autopilot.changed',
  
  // Narrative events
  NARRATIVE_UPDATE: 'narrative.update',
  CRITICAL_MESSAGE: 'narrative.critical',
  STATUS_UPDATE: 'narrative.status',
  
  // User action events
  COMMAND_EXECUTED: 'user.command.executed',
  EMERGENCY_PROCEDURE: 'user.emergency.procedure'
};

function subscribe(type, handler) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  const set = listeners.get(type);
  set.add(handler);
  return () => {
    set.delete(handler);
    if (set.size === 0) {
      listeners.delete(type);
    }
  };
}

function publish(type, payload) {
  const set = listeners.get(type);
  if (!set || set.size === 0) {
    return;
  }
  for (const handler of set) {
    try {
      handler(payload);
    } catch (error) {
      console.error('eventBus handler error', { type, error });
    }
  }
}

// Publish event with timestamp and metadata
function publishWithMetadata(type, payload) {
  const event = {
    ...payload,
    timestamp: Date.now(),
    eventType: type
  };
  publish(type, event);
}

// Batch publish multiple events
function publishBatch(events) {
  events.forEach(({ type, payload }) => {
    publishWithMetadata(type, payload);
  });
}

// Subscribe to all events in a category
function subscribeToCategory(category, handler) {
  const unsubscribeFunctions = [];
  
  for (const [type] of listeners.entries()) {
    if (type.startsWith(category)) {
      unsubscribeFunctions.push(subscribe(type, handler));
    }
  }
  
  return () => {
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
  };
}

function clear() {
  listeners.clear();
}

// Get all registered event types
function getRegisteredEventTypes() {
  return Array.from(listeners.keys());
}

const eventBus = {
  subscribe,
  publish,
  publishWithMetadata,
  publishBatch,
  subscribeToCategory,
  clear,
  getRegisteredEventTypes,
  Categories: EventCategories,
  Types: EventTypes
};

export default eventBus;

