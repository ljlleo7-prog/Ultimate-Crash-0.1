import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialSteps } from '../src/data/tutorialSteps.js';
import en from '../src/locales/en.js';
import zh from '../src/locales/zh.js';

const getNestedValue = (obj, keyPath) => {
  if (!keyPath || typeof keyPath !== 'string') {
    return undefined;
  }
  return keyPath.split('.').reduce((value, key) => {
    if (value && Object.prototype.hasOwnProperty.call(value, key)) {
      return value[key];
    }
    return undefined;
  }, obj);
};

test('tutorial steps schema is valid and ids are unique', () => {
  const ids = new Set();
  const allowedPlacements = new Set(['top', 'bottom', 'left', 'right', 'center']);

  for (const step of tutorialSteps) {
    assert.equal(typeof step.id, 'string');
    assert.equal(typeof step.phase, 'string');
    assert.equal(typeof step.targetId, 'string');
    assert.equal(typeof step.placement, 'string');
    assert.equal(typeof step.translationKey, 'string');
    assert.equal(allowedPlacements.has(step.placement), true);

    assert.equal(ids.has(step.id), false);
    ids.add(step.id);

    if (step.actionRequired !== undefined) {
      assert.equal(['next_button', 'finish'].includes(step.actionRequired), true);
    }

    if (step.trigger !== undefined) {
      assert.equal(typeof step.trigger, 'function');
    }
  }
});

test('tutorial translations exist in en and zh', () => {
  const requiredUiKeys = ['tutorial.title', 'tutorial.skip', 'tutorial.next', 'tutorial.finish'];
  for (const key of requiredUiKeys) {
    const enValue = getNestedValue(en, key);
    const zhValue = getNestedValue(zh, key);
    assert.equal(typeof enValue, 'string');
    assert.equal(typeof zhValue, 'string');
  }

  for (const step of tutorialSteps) {
    const enValue = getNestedValue(en, step.translationKey);
    const zhValue = getNestedValue(zh, step.translationKey);
    assert.equal(typeof enValue, 'string');
    assert.equal(typeof zhValue, 'string');
  }
});

test('tutorial triggers are reference-safe and reachable by scenario', () => {
  const scenarios = [
    {
      difficulty: 'rookie',
      currentStep: 2,
      aircraftModel: 'B737-800',
      selectedDeparture: 'KSFO',
      selectedArrival: 'KLAX',
      flightInitialized: true
    },
    {
      currentStep: 3
    },
    {
      showOverhead: true,
      systems: {
        electrical: { battery: true, apuGen: true },
        apu: { starting: true, running: true, bleed: true },
        fuel: { leftPumps: true, rightPumps: true },
        engines: { eng2: { startSwitch: 'GRD', fuelControl: true } }
      }
    },
    { showOverhead: false },
    { flaps: 5, parkingBrake: false, throttle: 0.9, pitch: 10, gear: false },
    { autopilot: true }
  ];

  for (const step of tutorialSteps) {
    if (!step.trigger) continue;

    assert.doesNotThrow(() => step.trigger({}));

    const isReachable = scenarios.some((state) => {
      try {
        return Boolean(step.trigger(state));
      } catch {
        return false;
      }
    });

    assert.equal(isReachable, true);
  }
});
