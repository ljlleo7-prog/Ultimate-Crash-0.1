import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';

const require = createRequire(import.meta.url);
const aircraftDatabase = require('../src/data/aircraftDatabase.json');
const aircraft = aircraftDatabase.aircraft[0];

const withFixedRandom = (value, fn) => {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
};

const runFailureTicks = (service, seconds, step = 1) => {
  for (let t = 0; t < seconds; t += step) {
    service.failureSystem.update(step, service.getOutputState());
    service.failureSystem.applyImpact(service);
  }
};

test('engine failure progresses to active and fails engine', () => {
  withFixedRandom(0.5, () => {
    const service = new RealisticFlightPhysicsService(aircraft);
    service.setAutopilot(false);
    service.failureSystem.triggerFailure('engine_failure', { engineIndex: 0 });
    runFailureTicks(service, 5);
    const failure = service.failureSystem.activeFailures.get('engine_failure');
    assert.equal(failure.currentStage, 'active');
    assert.equal(service.engines[0].state.failed, true);
  });
});

test('engine fire progression sets fire system flag', () => {
  withFixedRandom(0.5, () => {
    const service = new RealisticFlightPhysicsService(aircraft);
    service.setAutopilot(false);
    service.failureSystem.triggerFailure('engine_fire', { engineIndex: 0 });
    runFailureTicks(service, 12);
    const failure = service.failureSystem.activeFailures.get('engine_fire');
    assert.equal(failure.currentStage, 'active');
    assert.equal(service.systems.fire.eng1, true);
  });
});

test('control jam overrides elevator with AP off and on', () => {
  withFixedRandom(0.5, () => {
    const apOffService = new RealisticFlightPhysicsService(aircraft);
    apOffService.setAutopilot(false);
    apOffService.controls.elevator = 0.2;
    apOffService.failureSystem.triggerFailure('control_jam', { surface: 'elevator', stuckValue: 0.75 });
    apOffService.failureSystem.applyImpact(apOffService);
    assert.equal(apOffService.controls.elevator, 0.75);

    const apOnService = new RealisticFlightPhysicsService(aircraft);
    apOnService.setAutopilot(true, { mode: 'HDG', heading: 90, speed: 220, altitude: 3000 });
    apOnService.controls.elevator = 0.1;
    apOnService.failureSystem.triggerFailure('control_jam', { surface: 'elevator', stuckValue: -0.4 });
    apOnService.failureSystem.applyImpact(apOnService);
    const apState = apOnService.getOutputState().autopilot;
    assert.equal(apState.engaged, true);
    assert.equal(apOnService.controls.elevator, -0.4);
  });
});

test('circuit arc cascades to electrical fire after active phase', () => {
  withFixedRandom(0.0, () => {
    const service = new RealisticFlightPhysicsService(aircraft);
    service.failureSystem.triggerFailure('circuit_arc');
    service.failureSystem.update(16, service.getOutputState());
    service.failureSystem.applyImpact(service);
    assert.equal(service.failureSystem.activeFailures.has('electrical_fire'), true);
  });
});
