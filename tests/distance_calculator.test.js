import { test } from 'node:test';
import assert from 'node:assert/strict';
import aircraftService from '../src/services/aircraftService.js';
import {
  calculateDistance,
  calculateFlightTime,
  calculateFuelConsumption,
  calculateFlightPlan,
  formatDistance,
  formatFlightTime,
  formatFuel,
  isValidAirportCode,
  suggestAircraftForDistance,
  calculateOptimalAircraft
} from '../src/utils/distanceCalculator.js';

test('calculateDistance and calculateFlightTime return expected values', () => {
  const distance = calculateDistance(0, 0, 0, 1);
  assert.ok(distance > 50);
  assert.ok(distance < 70);

  const time = calculateFlightTime(450, 450);
  assert.equal(time.hours, 1);
  assert.equal(time.minutes, 0);
  assert.equal(time.totalMinutes, 60);
});

test('format helpers and airport code validation behave correctly', () => {
  assert.equal(formatDistance(123.456), '123.5 NM');
  assert.equal(formatFlightTime({ hours: 0, minutes: 45 }), '45m');
  assert.equal(formatFlightTime({ hours: 2, minutes: 5 }), '2h 5m');
  assert.equal(formatFuel(null), 'Calculating...');
  assert.equal(isValidAirportCode('JFK'), true);
  assert.equal(isValidAirportCode('KJFK'), true);
  assert.equal(isValidAirportCode('JK'), false);
});

test('calculateFuelConsumption falls back to generic when model missing', async () => {
  const fuel = await calculateFuelConsumption(500, 'INVALID_MODEL', 0, 0.1);
  assert.equal(fuel.isGeneric, true);
  assert.ok(fuel.totalFuel > 0);
});

test('aircraft suggestions and optimal selection use loaded database', async () => {
  await aircraftService.initialize();
  const suggestions = suggestAircraftForDistance(1000);
  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);

  const optimal = calculateOptimalAircraft(500, 1000, 50);
  assert.ok(optimal);
  assert.ok(optimal.maxRange >= 500 || optimal.suitabilityScore >= 0);
});

test('calculateFlightPlan builds a full plan with waypoints', async () => {
  await aircraftService.initialize();
  const allAircraft = await aircraftService.getAllAircraft();
  const aircraftModel = allAircraft[0].model;
  const departure = { iata: 'AAA', name: 'Alpha', city: 'A', country: 'A', latitude: 0, longitude: 0, runways: [], frequencies: [] };
  const arrival = { iata: 'BBB', name: 'Bravo', city: 'B', country: 'B', latitude: 0, longitude: 1, runways: [], frequencies: [] };

  const plan = await calculateFlightPlan(departure, arrival, aircraftModel, 0, 0.1);
  assert.equal(plan.departure.airport, 'AAA');
  assert.equal(plan.arrival.airport, 'BBB');
  assert.ok(plan.distance.nauticalMiles > 50);
  assert.ok(Array.isArray(plan.waypoints));
});
