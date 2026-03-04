import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutopilotService } from '../src/services/autopilotService.js';

const createFlightPhysicsStub = () => ({
  state: {
    controls: {
      throttle: 0.5,
      pitch: 0
    }
  },
  getAircraftState() {
    return { altitude_ft: 35000, airspeed_kts: 450 };
  }
});

test('AutopilotService clamp and rateLimit behave correctly', () => {
  const autopilot = new AutopilotService(createFlightPhysicsStub());
  assert.equal(autopilot.clamp(2, -1, 1), 1);
  assert.equal(autopilot.clamp(-2, -1, 1), -1);

  assert.equal(autopilot.rateLimit(1, 0, 0.2), 0.2);
  assert.equal(autopilot.rateLimit(-1, 0, 0.2), -0.2);
  assert.equal(autopilot.rateLimit(0.1, 0, 0.2), 0.1);
});

test('AutopilotService stability metrics update', () => {
  const autopilot = new AutopilotService(createFlightPhysicsStub());
  autopilot.updateStabilityMetrics(100, -20, 0.05, -0.02);
  assert.equal(autopilot.stabilityMetrics.altitudeError, 100);
  assert.equal(autopilot.stabilityMetrics.airspeedError, 20);
  assert.ok(autopilot.stabilityMetrics.stabilityScore > 0);
});
