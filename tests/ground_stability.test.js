/**
 * Ground Physics Test
 * Tests plane stability at low/zero speed on runway
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mock minimal aircraft data
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

describe('Ground Physics Stability', () => {
  it('should remain stable at zero speed with parking brake', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    const physics = new RealisticFlightPhysicsService(testAircraft, 37.6188, -122.3750, 'rookie');

    // Set parking brake
    physics.setAirBrakes(1.0);
    physics.controls.throttle = 0;

    const initialAlt = physics.state.pos.z;
    const initialVel = { ...physics.state.vel };

    // Run 100 frames at zero speed
    for (let i = 0; i < 100; i++) {
      physics.update(1/60);
    }

    const finalAlt = physics.state.pos.z;
    const finalVel = { ...physics.state.vel };

    console.log('Initial altitude:', initialAlt);
    console.log('Final altitude:', finalAlt);
    console.log('Initial velocity:', initialVel);
    console.log('Final velocity:', finalVel);
    console.log('Altitude drift:', Math.abs(finalAlt - initialAlt));

    // Check for vertical stability (should not drift more than 1m)
    assert.ok(Math.abs(finalAlt - initialAlt) < 1.0, 'Altitude should remain stable');
    assert.ok(Math.abs(finalVel.x) < 0.1, 'Forward velocity should be near zero');
    assert.ok(Math.abs(finalVel.z) < 0.1, 'Vertical velocity should be near zero');
  });

  it('should remain stable at 5kt taxi speed', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    const physics = new RealisticFlightPhysicsService(testAircraft, 37.6188, -122.3750, 'rookie');

    // Release brake, small throttle
    physics.setAirBrakes(0);
    physics.controls.throttle = 0.05;

    // Run until speed stabilizes
    for (let i = 0; i < 300; i++) {
      physics.update(1/60);
    }

    const speed = Math.sqrt(physics.state.vel.x ** 2 + physics.state.vel.y ** 2);
    const verticalVel = physics.state.vel.z;

    console.log('Taxi speed:', speed, 'm/s');
    console.log('Vertical velocity:', verticalVel, 'm/s');
    console.log('Altitude:', physics.state.pos.z);

    assert.ok(Math.abs(verticalVel) < 0.5, 'Should not bounce vertically during taxi');
  });
});

// Auto-terminate
