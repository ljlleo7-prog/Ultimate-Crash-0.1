import { test } from 'node:test';
import assert from 'node:assert/strict';
import aircraftService from '../src/services/aircraftService.js';

test('aircraftService provides aircraft data and lookup', async () => {
  await aircraftService.initialize();
  const allAircraft = await aircraftService.getAllAircraft();
  assert.ok(allAircraft.length > 0);

  const sample = allAircraft[0];
  const byModel = await aircraftService.getAircraftByModel(sample.model);
  assert.equal(byModel.model, sample.model);
});

test('aircraftService calculates fuel requirements and performance', async () => {
  await aircraftService.initialize();
  const allAircraft = await aircraftService.getAllAircraft();
  const model = allAircraft[0].model;

  const fuel = await aircraftService.calculateFuelRequirements(model, 200, 0, 0.1);
  assert.ok(fuel.totalFuel > 0);
  assert.ok(fuel.fuelPercentage > 0);

  const performance = await aircraftService.calculateFlightPerformance(model, 200, 0);
  assert.ok(performance.performance.rating >= 0);
  assert.ok(performance.performance.rating <= 100);
});

test('aircraftService validates routes and flight time', async () => {
  await aircraftService.initialize();
  const allAircraft = await aircraftService.getAllAircraft();
  const model = allAircraft[0].model;
  const maxRange = allAircraft[0].maxRange;

  const validation = await aircraftService.validateRoute(model, maxRange + 1000, 0);
  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.length > 0);

  const time = await aircraftService.calculateFlightTime(model, 450);
  assert.equal(time.totalMinutes > 0, true);
});

test('aircraftService returns performance envelope', async () => {
  await aircraftService.initialize();
  const allAircraft = await aircraftService.getAllAircraft();
  const model = allAircraft[0].model;

  const envelope = await aircraftService.getPerformanceEnvelope(model);
  assert.ok(envelope.speed.cruise > 0);
  assert.ok(envelope.altitude.max > 0);
  assert.ok(envelope.range.maximum > 0);
});
