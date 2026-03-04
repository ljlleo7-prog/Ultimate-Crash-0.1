import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airportService } from '../src/services/airportService.js';

test('airportService provides airport lookups', () => {
  const allAirports = airportService.getAllAirports();
  assert.ok(allAirports.length > 0);

  const sample = allAirports.find(airport => airport.iata) || allAirports[0];
  const byCode = airportService.getAirportByCode(sample.iata || sample.icao);
  assert.ok(byCode);
  assert.equal(byCode.icao || byCode.iata, sample.icao || sample.iata);
});

test('airportService calculates distance and finds nearby airports', () => {
  const allAirports = airportService.getAllAirports();
  const sample = allAirports[0];
  const distance = airportService.calculateDistance(sample, sample);
  assert.equal(distance, 0);

  const nearby = airportService.getAirportsWithinRadius(sample.latitude, sample.longitude, 0);
  assert.ok(nearby.length >= 1);
});

test('airportService builds runway geometry for airport', () => {
  const allAirports = airportService.getAllAirports();
  const sample = allAirports.find(airport => airport.runways || airport.runway) || allAirports[0];
  const runways = airportService.getRunwayInfo(sample.iata || sample.icao);
  const runwayName = runways[0] ? runways[0].name : undefined;
  const geometry = airportService.getRunwayGeometry(sample.iata || sample.icao, runwayName);
  assert.ok(geometry);
  assert.ok(geometry.length > 0);
  assert.ok(geometry.heading >= 0);
});
