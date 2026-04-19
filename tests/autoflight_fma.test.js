import { test } from 'node:test';
import assert from 'node:assert/strict';
import FMAService from '../src/services/autoflight/FMAService.js';

const service = new FMAService();

test('FMA reports armed altitude while climbing in selected modes', () => {
  const fma = service.buildStatus({
    engaged: true,
    autopilotMode: 'HDG',
    autopilotDebug: { altitudeMode: 'armed' },
    targets: { altitude: 12000, vs: 1500 }
  });

  assert.equal(fma.lateral.active.label, 'HDG SEL');
  assert.equal(fma.vertical.active.label, 'V/S');
  assert.equal(fma.vertical.armed.label, 'ALT');
  assert.equal(fma.vertical.armed.armed, true);
});

test('FMA reports LOC and GS arm/capture states', () => {
  const armed = service.buildStatus({
    engaged: true,
    autopilotMode: 'ILS',
    autopilotDebug: { ils: { locCaptured: false, gsCaptured: false, message: 'Armed for intercept' } },
    targets: { altitude: 3000, vs: 0 }
  });

  assert.equal(armed.lateral.active.label, 'LOC ARM');
  assert.equal(armed.vertical.active.label, 'G/S ARM');
  assert.equal(armed.reason, 'Armed for intercept');

  const captured = service.buildStatus({
    engaged: true,
    autopilotMode: 'ILS',
    autopilotDebug: { ils: { locCaptured: true, gsCaptured: true, message: 'Established' } },
    targets: { altitude: 3000, vs: 0 }
  });

  assert.equal(captured.lateral.active.label, 'LOC');
  assert.equal(captured.vertical.active.label, 'G/S');
});

process.exit(0);
