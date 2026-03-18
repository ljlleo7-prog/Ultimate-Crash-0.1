/**
 * PhysicsCoordinator - Mediates between physics service and external systems
 * Handles environment updates, failure integration, and system state synchronization
 */

export class PhysicsCoordinator {
  constructor(physicsService) {
    this.physics = physicsService;
    this.subscribers = new Map();
  }

  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event).push(callback);
  }

  notify(event, data) {
    const callbacks = this.subscribers.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  updateEnvironment(weatherData) {
    if (!this.physics) return;
    this.physics.setEnvironment(weatherData);
  }

  updateRunwayContext(geometry) {
    if (!this.physics) return;
    this.physics.setRunwayGeometry(geometry);
  }

  getState() {
    if (!this.physics) return null;
    return {
      position: this.physics.state.pos,
      velocity: this.physics.state.vel,
      attitude: this.physics.state.quat,
      rates: this.physics.state.rates,
      onGround: this.physics.onGround,
      crashed: this.physics.crashed
    };
  }

  setMotionEnabled(enabled) {
    if (!this.physics) return;
    this.physics.setMotionEnabled(enabled);
  }
}
