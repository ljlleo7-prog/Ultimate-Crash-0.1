/**
 * Ground Physics Test - Off Runway Stability
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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

describe('Off-Runway Ground Stability', () => {
  it('should remain stable off runway (grass/objects)', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    // Position off runway
    const physics = new RealisticFlightPhysicsService(testAircraft, 37.62, -122.38, 'rookie');

    physics.setAirBrakes(1.0);
    physics.controls.throttle = 0;

    const initialAlt = physics.state.pos.z;

    // Run 200 frames
    for (let i = 0; i < 200; i++) {
      physics.update(1/60);
    }

    const finalAlt = physics.state.pos.z;
    const altDrift = Math.abs(finalAlt - initialAlt);

    console.log('Off-runway initial altitude:', initialAlt);
    console.log('Off-runway final altitude:', finalAlt);
    console.log('Off-runway altitude drift:', altDrift);
    console.log('Ground status:', physics.groundStatus?.status);

    assert.ok(altDrift < 2.0, 'Should not sink/float significantly off runway');
  });

  it('should handle low speed without instability', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    const physics = new RealisticFlightPhysicsService(testAircraft, 37.6188, -122.3750, 'amateur');

    physics.setAirBrakes(0.5);
    physics.controls.throttle = 0.02;

    let maxVerticalVel = 0;
    let maxAltChange = 0;
    const initialAlt = physics.state.pos.z;

    for (let i = 0; i < 300; i++) {
      physics.update(1/60);
      maxVerticalVel = Math.max(maxVerticalVel, Math.abs(physics.state.vel.z));
      maxAltChange = Math.max(maxAltChange, Math.abs(physics.state.pos.z - initialAlt));
    }

    console.log('Max vertical velocity:', maxVerticalVel, 'm/s');
    console.log('Max altitude change:', maxAltChange, 'm');
    console.log('Final speed:', Math.sqrt(physics.state.vel.x**2 + physics.state.vel.y**2), 'm/s');

    assert.ok(maxVerticalVel < 1.0, 'Should not have excessive vertical oscillation');
    assert.ok(maxAltChange < 3.0, 'Should not bounce excessively');
  });
});
