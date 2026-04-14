import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { createCanonicalFailureGraph } from '../src/services/failures/CanonicalFailureGraph.js';
import { failureGraphManager } from '../src/services/skylinetragedy/FailureGraphManager.js';

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

const createServiceForDifficulty = (difficulty) => {
  const service = new RealisticFlightPhysicsService(aircraft, 0, 0, difficulty);
  service.setAutopilot(false);
  return service;
};

const getCascadeEvent = (service, edgeId) => service.failureSystem.getIncidentLog()
  .find((entry) => entry.type === 'cascade_scheduled' && entry.edgeId === edgeId);

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

test('canonical failure graph normalizes runtime and legacy identifiers', () => {
  const graph = createCanonicalFailureGraph();
  const engineFire = graph.nodes.find(node => node.runtimeId === 'engine_fire');

  assert.ok(engineFire);
  assert.equal(engineFire.canonicalCode, 'ENGINE_FIRE');
  assert.equal(graph.aliasToRuntimeId.get('ENG_FIRE'), 'engine_fire');
  assert.equal(graph.aliasToRuntimeId.get('ENGINE_FIRE'), 'engine_fire');
});

test('failure graph manager exposes canonical runtime fallback artifact', () => {
  failureGraphManager.loadRuntimeFallback();
  const artifact = failureGraphManager.getGraphArtifact();
  const failure = failureGraphManager.getFailureByCode('ENGINE_FIRE');
  const edges = failureGraphManager.getEdgesFrom('engine_fire');

  assert.equal(artifact.version, 'canonical-runtime-v1');
  assert.equal(failure.runtime_id, 'engine_fire');
  assert.equal(edges.some(edge => edge.effect_failure === 'hydraulic_failure'), true);
});

test('engine fire cascade reaches hydraulic failure after stage/time guard', () => {
  withFixedRandom(0.0, () => {
    const service = new RealisticFlightPhysicsService(aircraft);
    service.failureSystem.triggerFailure('engine_fire', { engineIndex: 0 });
    runFailureTicks(service, 43);
    assert.equal(service.failureSystem.activeFailures.has('hydraulic_failure'), true);
  });
});

test('rookie mode blocks catastrophic uncontained engine cascades', () => {
  withFixedRandom(0.0, () => {
    const rookieService = createServiceForDifficulty('rookie');
    rookieService.failureSystem.triggerFailure('uncontained_engine_failure', { engineIndex: 0 });
    runFailureTicks(rookieService, 20);

    assert.equal(rookieService.failureSystem.activeFailures.has('major_hydraulic_failure'), false);
    assert.equal(rookieService.failureSystem.activeFailures.has('total_flight_control_failure'), false);
  });
});

test('intermediate mode allows uncontained engine catastrophic cascades', () => {
  withFixedRandom(0.0, () => {
    const service = createServiceForDifficulty('intermediate');
    service.failureSystem.triggerFailure('uncontained_engine_failure', { engineIndex: 0 });
    runFailureTicks(service, 20);

    assert.equal(service.failureSystem.activeFailures.has('major_hydraulic_failure'), true);
    assert.equal(service.failureSystem.activeFailures.has('total_flight_control_failure'), true);
  });
});

after(() => {
  setTimeout(() => process.exit(0), 0);
});
test('rookie mode blocks catastrophic uncontained engine cascades', () => {
  withFixedRandom(0.0, () => {
    const rookieService = createServiceForDifficulty('rookie');
    rookieService.failureSystem.triggerFailure('uncontained_engine_failure', { engineIndex: 0 });
    runFailureTicks(rookieService, 20);

    const hydraulicCascade = getCascadeEvent(rookieService, 'UNCONTAINED_ENGINE_TO_MAJOR_HYDRAULIC');
    const controlCascade = getCascadeEvent(rookieService, 'HYDRAULIC_TO_FLIGHT_CONTROL');

    assert.equal(hydraulicCascade, undefined);
    assert.equal(controlCascade, undefined);
    assert.equal(rookieService.failureSystem.activeFailures.has('major_hydraulic_failure'), false);
    assert.equal(rookieService.failureSystem.activeFailures.has('total_flight_control_failure'), false);
  });
});

test('intermediate mode still allows uncontained engine catastrophic cascades', () => {
  withFixedRandom(0.0, () => {
    const service = createServiceForDifficulty('intermediate');
    service.failureSystem.triggerFailure('uncontained_engine_failure', { engineIndex: 0 });
    runFailureTicks(service, 20);

    const hydraulicCascade = getCascadeEvent(service, 'UNCONTAINED_ENGINE_TO_MAJOR_HYDRAULIC');
    const controlCascade = getCascadeEvent(service, 'HYDRAULIC_TO_FLIGHT_CONTROL');

    assert.ok(hydraulicCascade);
    assert.ok(controlCascade);
    assert.equal(hydraulicCascade.effectiveProbability, 1);
    assert.equal(hydraulicCascade.effectiveDelay, 2);
    assert.equal(service.failureSystem.activeFailures.has('major_hydraulic_failure'), true);
    assert.equal(service.failureSystem.activeFailures.has('total_flight_control_failure'), true);
  });
});

after(() => {
  setTimeout(() => process.exit(0), 0);
});
