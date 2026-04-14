/**
 * V-Speed Calculator Test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import VSpeedCalculator from '../src/services/VSpeedCalculator.js';

describe('V-Speed Calculator', () => {
  it('should calculate baseline takeoff speeds', () => {
    const speeds = VSpeedCalculator.calculateTakeoff({
      weight: 60000,
      flaps: 0.17,
      elevation: 0,
      temperature: 15,
      headwind: 0,
      runwayCondition: 'dry'
    });

    console.log('Baseline (60000kg, flaps 5, sea level, 15°C):');
    console.log('  VR:', speeds.vr, 'kt');
    console.log('  V1:', speeds.v1, 'kt');
    console.log('  V2:', speeds.v2, 'kt');

    assert.ok(speeds.vr > 130 && speeds.vr < 160, 'VR should be 130-160kt');
    assert.ok(speeds.v2 > speeds.vr, 'V2 > VR');
    assert.ok(speeds.v1 < speeds.vr, 'V1 < VR');
  });

  it('should increase speeds at high elevation', () => {
    const baseline = VSpeedCalculator.calculateTakeoff({
      weight: 60000,
      flaps: 0.17,
      elevation: 0,
      temperature: 15,
      headwind: 0,
      runwayCondition: 'dry'
    });

    const highAlt = VSpeedCalculator.calculateTakeoff({
      weight: 60000,
      flaps: 0.17,
      elevation: 5000,
      temperature: 15,
      headwind: 0,
      runwayCondition: 'dry'
    });

    console.log('High elevation effect (5000ft):');
    console.log('  Sea level VR:', baseline.vr, 'kt');
    console.log('  5000ft VR:', highAlt.vr, 'kt');
    console.log('  Increase:', highAlt.vr - baseline.vr, 'kt');

    assert.ok(highAlt.vr > baseline.vr, 'Higher elevation = higher VR');
  });

  it('should decrease speeds with headwind', () => {
    const noWind = VSpeedCalculator.calculateTakeoff({
      weight: 60000,
      flaps: 0.17,
      elevation: 0,
      temperature: 15,
      headwind: 0,
      runwayCondition: 'dry'
    });

    const withWind = VSpeedCalculator.calculateTakeoff({
      weight: 60000,
      flaps: 0.17,
      elevation: 0,
      temperature: 15,
      headwind: 20,
      runwayCondition: 'dry'
    });

    console.log('Headwind effect (20kt):');
    console.log('  No wind VR:', noWind.vr, 'kt');
    console.log('  20kt headwind VR:', withWind.vr, 'kt');
    console.log('  Reduction:', noWind.vr - withWind.vr, 'kt');

    assert.ok(withWind.vr < noWind.vr, 'Headwind reduces VR');
  });

  it('should calculate landing speeds', () => {
    const speeds = VSpeedCalculator.calculateLanding({
      weight: 55000,
      flaps: 1.0,
      headwind: 0,
      runwayCondition: 'dry'
    });

    console.log('Landing (55000kg, full flaps):');
    console.log('  VREF:', speeds.vref, 'kt');
    console.log('  VAPP:', speeds.vapp, 'kt');

    assert.ok(speeds.vref > 100 && speeds.vref < 150, 'VREF should be 100-150kt');
    assert.ok(speeds.vapp > speeds.vref, 'VAPP > VREF');
  });
});

setTimeout(() => process.exit(0), 5000);
