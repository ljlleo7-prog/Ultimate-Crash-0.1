import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Quaternion, calculateDistanceMeters, calculateBearing } from '../src/utils/flightMath.js';

test('Vector3 operations behave as expected', () => {
  const v1 = new Vector3(1, 2, 3);
  const v2 = new Vector3(4, 5, 6);

  const added = v1.add(v2);
  assert.equal(added.x, 5);
  assert.equal(added.y, 7);
  assert.equal(added.z, 9);

  const cross = v1.cross(v2);
  assert.equal(cross.x, -3);
  assert.equal(cross.y, 6);
  assert.equal(cross.z, -3);

  const normalized = new Vector3(3, 0, 0).normalize();
  assert.equal(normalized.x, 1);
  assert.equal(normalized.y, 0);
  assert.equal(normalized.z, 0);
});

test('Quaternion conversions maintain orientation', () => {
  const quat = Quaternion.fromEuler(0, 0, Math.PI / 2);
  const euler = quat.toEuler();
  assert.ok(Math.abs(euler.psi - Math.PI / 2) < 1e-6);

  const rotated = quat.rotate(new Vector3(1, 0, 0));
  assert.ok(Math.abs(rotated.x) < 1e-6);
  assert.ok(Math.abs(rotated.y - 1) < 1e-6);
});

test('Distance and bearing calculations return reasonable values', () => {
  const distance = calculateDistanceMeters(0, 0, 1, 0);
  assert.ok(distance > 110000);
  assert.ok(distance < 112500);

  const eastBearing = calculateBearing(0, 0, 0, 1);
  assert.ok(Math.abs(eastBearing - 90) < 1e-6);

  const northBearing = calculateBearing(0, 0, 1, 0);
  assert.ok(Math.abs(northBearing - 0) < 1e-6);
});
