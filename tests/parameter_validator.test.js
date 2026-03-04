import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ParameterValidator } from '../src/utils/ParameterValidator.js';

test('validateEngineParameter clamps out-of-range values', () => {
  const clampedHigh = ParameterValidator.validateEngineParameter('egt', 2000, 'piston');
  assert.equal(clampedHigh.value, 1000);
  assert.equal(clampedHigh.wasClamped, true);

  const clampedLow = ParameterValidator.validateEngineParameter('flameoutAltitude', -100, 'jet');
  assert.equal(clampedLow.value, 0);
  assert.equal(clampedLow.wasClamped, true);
});

test('validateControlInput respects bounds', () => {
  const throttle = ParameterValidator.validateControlInput('throttle', 2);
  assert.equal(throttle.value, 1);
  assert.equal(throttle.wasClamped, true);

  const brakes = ParameterValidator.validateControlInput('brakes', -0.5);
  assert.equal(brakes.value, 0);
  assert.equal(brakes.wasClamped, true);
});

test('sanitizeParameters normalizes nested values', () => {
  const sanitized = ParameterValidator.sanitizeParameters({
    engine: {
      egt: 2000,
      fuelFlow: 'not-a-number'
    },
    controls: {
      aileron: 2,
      rudder: -2
    }
  });

  assert.equal(sanitized.engine.egt, 1000);
  assert.equal(sanitized.engine.fuelFlow, 0);
  assert.equal(sanitized.controls.aileron, 1);
  assert.equal(sanitized.controls.rudder, -1);
});
