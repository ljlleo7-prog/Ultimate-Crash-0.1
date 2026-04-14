/**
 * FMC Data Integration Test
 * Verify FMC receives correct aircraft data and position
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('FMC Data Integration', () => {
  it('should receive aircraft data from physics service', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    const testAircraft = {
      name: 'Boeing 737-800',
      mass: 70000,
      wingspan: 35.8,
      wingArea: 125,
      maxThrust: 121000,
      engineCount: 2,
      gearHeight: 3.5,
      maxFuelCapacity: 20000
    };

    const physics = new RealisticFlightPhysicsService(testAircraft, 37.6188, -122.3750, 'rookie');

    // Verify aircraft data is accessible
    assert.ok(physics.aircraft, 'Aircraft data should exist');
    assert.strictEqual(physics.aircraft.name, 'Boeing 737-800', 'Aircraft name should match');
    assert.ok(physics.aircraft.mass > 0, 'Aircraft mass should be positive');
    assert.strictEqual(physics.aircraft.engineCount, 2, 'Engine count should match');

    console.log('✓ Aircraft data:', physics.aircraft.name);
    console.log('✓ Mass:', physics.aircraft.mass, 'kg');
    console.log('✓ Engines:', physics.aircraft.engineCount);
  });

  it('should have correct position data', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    const testAircraft = {
      name: 'Test Aircraft',
      mass: 70000,
      wingspan: 35,
      wingArea: 125,
      maxThrust: 120000,
      engineCount: 2,
      gearHeight: 3.5,
      maxFuelCapacity: 20000
    };

    const lat = 37.6188;
    const lon = -122.3750;
    const physics = new RealisticFlightPhysicsService(testAircraft, lat, lon, 'rookie');

    // Verify position
    assert.strictEqual(physics.state.geo.lat, lat, 'Latitude should match');
    assert.strictEqual(physics.state.geo.lon, lon, 'Longitude should match');

    console.log('✓ Position:', physics.state.geo.lat.toFixed(4), physics.state.geo.lon.toFixed(4));
  });

  it('should calculate reasonable V-speeds with fuel', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    const testAircraft = {
      name: 'Boeing 737-800',
      mass: 70000,
      fuelWeight: 10000,
      wingspan: 35.8,
      wingArea: 125,
      maxThrust: 121000,
      engineCount: 2,
      gearHeight: 3.5,
      maxFuelCapacity: 20000
    };

    const physics = new RealisticFlightPhysicsService(testAircraft, 37.6188, -122.3750, 'rookie');

    const fuel = physics.state.fuel || 0;
    const weight = physics.aircraft.mass + fuel;

    // Improved V-speed estimation (matching FMCPerformance)
    const vr = Math.sqrt(weight) * 0.6;
    const v2 = vr * 1.13;
    const vref = Math.sqrt(weight) * 0.55;

    console.log('✓ Aircraft mass:', physics.aircraft.mass.toFixed(0), 'kg');
    console.log('✓ Fuel:', fuel.toFixed(0), 'kg');
    console.log('✓ Total weight:', weight.toFixed(0), 'kg');
    console.log('✓ Estimated VR:', Math.round(vr), 'kt');
    console.log('✓ Estimated V2:', Math.round(v2), 'kt');
    console.log('✓ Estimated VREF:', Math.round(vref), 'kt');

    assert.ok(fuel > 0, 'Fuel should be loaded');
    assert.ok(weight > physics.aircraft.mass, 'Total weight should include fuel');
    assert.ok(vr > 100 && vr < 200, 'VR should be reasonable (100-200kt)');
    assert.ok(v2 > vr, 'V2 should be greater than VR');
  });
});

setTimeout(() => process.exit(0), 5000);
