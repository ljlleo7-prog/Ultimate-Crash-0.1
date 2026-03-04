import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWaypoints, generateSID, generateSTAR, getRunwayHeading, generateRouteWaypoints, generateUniqueFrequency } from '../src/utils/routeGenerator.js';

const withFixedRandom = (value, fn) => {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
};

test('generateWaypoints returns requested count with valid lengths', () => {
  const waypoints = generateWaypoints(5);
  assert.equal(waypoints.length, 5);
  for (const waypoint of waypoints) {
    assert.ok(waypoint.length === 3 || waypoint.length === 5);
  }
});

test('generateSID and generateSTAR include waypoint prefix', () => {
  withFixedRandom(0.4, () => {
    const sid = generateSID('ABCDE');
    const star = generateSTAR('XYZ12');
    assert.ok(sid.startsWith('ABC'));
    assert.ok(star.startsWith('XYZ'));
    assert.equal(sid.endsWith('D'), true);
    assert.equal(star.endsWith('A'), true);
  });
});

test('getRunwayHeading respects direction preference', () => {
  const eastward = getRunwayHeading('09L/27R', true);
  const westward = getRunwayHeading('09L/27R', false);
  assert.equal(eastward, 90);
  assert.equal(westward, 270);
  assert.equal(getRunwayHeading('36', null), 360);
});

test('generateRouteWaypoints creates intermediate points', () => {
  const startAirport = { iata: 'AAA', latitude: 0, longitude: 0, runways: [{ name: '09L/27R' }] };
  const endAirport = { iata: 'BBB', latitude: 0, longitude: 10, runways: [{ name: '18/36' }] };
  const route = generateRouteWaypoints(startAirport, endAirport);
  assert.ok(route.waypoints.length >= 4);
  for (const waypoint of route.waypoints) {
    assert.equal(typeof waypoint.latitude, 'number');
    assert.equal(typeof waypoint.longitude, 'number');
    assert.equal(typeof waypoint.frequency, 'number');
  }
});

test('generateUniqueFrequency stays within VHF range', () => {
  const frequency = generateUniqueFrequency();
  assert.ok(frequency >= 118);
  assert.ok(frequency <= 136.975);
});
