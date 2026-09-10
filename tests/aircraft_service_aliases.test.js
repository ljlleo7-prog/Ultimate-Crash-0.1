import test from 'node:test';
import assert from 'node:assert/strict';
import aircraftService from '../src/services/aircraftService.js';

test('aircraft service resolves B737 aliases to Boeing 737-800', async () => {
  const byShortModel = await aircraftService.getAircraftByModel('B737-800');
  const byIcao = await aircraftService.getAircraftByModel('B738');
  const byCanonical = await aircraftService.getAircraftByModel('Boeing 737-800');

  assert.equal(byShortModel?.model, 'Boeing 737-800');
  assert.equal(byIcao?.model, 'Boeing 737-800');
  assert.equal(byCanonical?.model, 'Boeing 737-800');
});
