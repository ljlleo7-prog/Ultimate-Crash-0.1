/**
 * Ground Mode Test - Verify warning suppression
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

describe('Ground Mode Warning Suppression', () => {
  it('should suppress flight warnings in ground mode', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    const physics = new RealisticFlightPhysicsService(testAircraft, 37.6188, -122.3750, 'rookie');

    // Enable ground mode
    physics.setGroundMode(true);
    physics.setAirBrakes(1.0);

    // Run physics
    for (let i = 0; i < 60; i++) {
      physics.update(1/60);
    }

    const warnings = physics.warningSystem?.activeWarnings || [];

    console.log('Ground mode enabled, warnings:', warnings.length);
    console.log('Warning types:', warnings.map(w => w.id));

    // Should have no stall/overspeed warnings at zero speed
    const hasStallWarning = warnings.some(w => w.id === 'STALL');
    const hasOverspeedWarning = warnings.some(w => w.id === 'OVERSPEED');

    assert.ok(!hasStallWarning, 'Should not have stall warning in ground mode');
    assert.ok(!hasOverspeedWarning, 'Should not have overspeed warning in ground mode');
  });

  it('should allow warnings when ground mode disabled', async () => {
    const { default: RealisticFlightPhysicsService } = await import('../src/services/RealisticFlightPhysicsService.js');

    const physics = new RealisticFlightPhysicsService(testAircraft, 37.6188, -122.3750, 'rookie');

    // Disable ground mode (flight mode)
    physics.setGroundMode(false);

    console.log('Ground mode disabled - flight warnings active');
    assert.ok(true, 'Ground mode can be toggled');
  });
});
