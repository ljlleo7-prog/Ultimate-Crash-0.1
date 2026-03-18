import { test } from 'node:test';
import assert from 'node:assert/strict';
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';

const SIM_DT = 0.05;
let cachedAircraft = null;

const getAircraft = async () => {
  if (cachedAircraft) return cachedAircraft;
  const aircraftDb = await loadAircraftData();
  cachedAircraft = aircraftDb.find(a => a.model === 'Boeing 737-800');
  return cachedAircraft;
};

const runSteps = (physics, inputs, steps) => {
  let state = null;
  for (let i = 0; i < steps; i++) {
    state = physics.update(inputs, SIM_DT);
  }
  return state;
};

test('Autopilot HDG mode holds heading', async () => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, 'intermediate');
  physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: 3000 * 0.3048 }, heading: 90, fuel: 5000, coldStart: false });
  physics.state.vel.set(150 * 0.514444, 0, 0);
  physics.setMotionEnabled(true);

  physics.setAutopilot(true, { mode: 'HDG', speed: 150, heading: 90, vs: 0, altitude: 10000 });

  const state = runSteps(physics, { throttle: 0.5, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, 200);

  const heading = ((state.orientation?.psi ?? 0) * 180/Math.PI + 360) % 360;
  const headingError = Math.abs(((heading - 90 + 540) % 360) - 180);

  console.log(`HDG mode: Target=90° Actual=${heading.toFixed(1)}° Error=${headingError.toFixed(2)}°`);
  assert.ok(headingError < 3.0, `Heading error ${headingError.toFixed(2)}° exceeds 3°`);
});

test('Autopilot ALT mode holds altitude', async () => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, 'intermediate');
  physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: 3000 * 0.3048 }, heading: 90, fuel: 5000, coldStart: false });
  physics.state.vel.set(150 * 0.514444, 0, 0);
  physics.setMotionEnabled(true);

  physics.setAutopilot(true, { mode: 'HDG', speed: 150, heading: 90, vs: 0, altitude: 10000 });

  const state = runSteps(physics, { throttle: 0.5, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, 200);

  const altError = Math.abs(state.derived?.altitude - 10000);

  console.log(`ALT hold: Target=10000ft Actual=${state.derived?.altitude.toFixed(0)}ft Error=${altError.toFixed(0)}ft`);
  assert.ok(altError < 200, `Altitude error ${altError.toFixed(0)}ft exceeds 200ft`);
});

test('Autopilot SPD mode holds speed', async () => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, 'intermediate');
  physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: 3000 * 0.3048 }, heading: 90, fuel: 5000, coldStart: false });
  physics.state.vel.set(150 * 0.514444, 0, 0);
  physics.setMotionEnabled(true);

  physics.setAutopilot(true, { mode: 'HDG', speed: 180, heading: 90, vs: 0, altitude: 10000 });

  const state = runSteps(physics, { throttle: 0.5, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, 400);

  const speedError = Math.abs(state.derived?.airspeed - 180);

  console.log(`SPD hold: Target=180kts Actual=${state.derived?.airspeed.toFixed(1)}kts Error=${speedError.toFixed(1)}kts`);
  assert.ok(speedError < 10, `Speed error ${speedError.toFixed(1)}kts exceeds 10kts`);
});

process.exit(0);
