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

const createPhysics = async ({ altitudeFt = 3000, heading = 90, speedKt = 150 } = {}) => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, 'intermediate');
  physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: altitudeFt * 0.3048 }, heading, fuel: 5000, coldStart: false });
  physics.state.vel.set(speedKt * 0.514444, 0, 0);
  physics.setMotionEnabled(true);
  return physics;
};

test('Autopilot engagement does not create a large first-frame bank or pitch jump', async () => {
  const physics = await createPhysics({ altitudeFt: 6000, heading: 90, speedKt: 180 });
  runSteps(physics, { throttle: 0.52, pitch: 0.06, roll: 0.04, yaw: 0, trim: 0.05, flaps: 0, gear: false }, 60);

  const before = {
    throttle: physics.controls.throttle,
    elevator: physics.controls.elevator,
    aileron: physics.controls.aileron,
    trim: physics.controls.trim
  };

  physics.setAutopilot(true, { mode: 'HDG', heading: 90, speed: 180, vs: 0, altitude: 6000 });
  const after = physics.update({ throttle: 0.52, pitch: 0.06, roll: 0.04, yaw: 0, trim: 0.05, flaps: 0, gear: false }, SIM_DT);

  const elevatorDelta = Math.abs(physics.controls.elevator - before.elevator);
  const aileronDelta = Math.abs(physics.controls.aileron - before.aileron);
  const throttleDelta = Math.abs(physics.controls.throttle - before.throttle);
  const trimDelta = Math.abs(physics.controls.trim - before.trim);

  assert.ok(elevatorDelta < 0.08, `First-frame elevator jump ${elevatorDelta.toFixed(3)} exceeds 0.08`);
  assert.ok(aileronDelta < 0.08, `First-frame aileron jump ${aileronDelta.toFixed(3)} exceeds 0.08`);
  assert.ok(throttleDelta < 0.08, `First-frame throttle jump ${throttleDelta.toFixed(3)} exceeds 0.08`);
  assert.ok(trimDelta < 0.08, `First-frame trim jump ${trimDelta.toFixed(3)} exceeds 0.08`);
  assert.ok(Math.abs(after.autopilotDebug?.targetRoll ?? 0) < 8, `First target roll ${(after.autopilotDebug?.targetRoll ?? 0).toFixed(2)}° exceeds 8°`);
  assert.ok(Math.abs(after.autopilotDebug?.targetPitch ?? 0) < 8, `First target pitch ${(after.autopilotDebug?.targetPitch ?? 0).toFixed(2)}° exceeds 8°`);
});

test('Autopilot engagement captures unspecified targets from current state instead of stale values', async () => {
  const physics = await createPhysics({ altitudeFt: 11850, heading: 96, speedKt: 173 });
  physics.setAutopilot(false, { mode: 'HDG', speed: 220, heading: 140, vs: -1800, altitude: 7000 });
  physics.state.vel.set(173 * 0.514444, 0, 0);

  physics.setAutopilot(true, { mode: 'HDG', heading: 96 });
  const status = physics.getAutopilotStatus();

  assert.equal(status.targets.heading, 95);
  assert.equal(status.targets.speed, 175);
  assert.equal(status.targets.ias, 175);
  assert.equal(status.targets.vs, 0);
  assert.equal(status.targets.altitude, 11900);
});

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

test('Autopilot normalizes target settings', async () => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, 'intermediate');
  physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: 3000 * 0.3048 }, heading: 93, fuel: 5000, coldStart: false });
  physics.state.vel.set(173 * 0.514444, 0, 0);
  physics.setMotionEnabled(true);

  physics.setAutopilot(true, { mode: 'HDG', speed: 173, heading: 93, vs: 355, altitude: 12345 });

  const status = physics.getAutopilotStatus();

  assert.equal(status.targets.speed, 175);
  assert.equal(status.targets.ias, 175);
  assert.equal(status.targets.vs, 400);
  assert.equal(status.targets.altitude, 12300);
  assert.equal(status.targets.heading, 95);
});

test('Autopilot levels off after capturing selected altitude', async () => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, 'intermediate');
  physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: 9700 * 0.3048 }, heading: 90, fuel: 5000, coldStart: false });
  physics.state.vel.set(180 * 0.514444, 0, 0);
  physics.setMotionEnabled(true);

  physics.setAutopilot(true, { mode: 'HDG', speed: 180, heading: 90, vs: 1500, altitude: 10000 });

  const state = runSteps(physics, { throttle: 0.55, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, 320);
  const status = physics.getAutopilotStatus();

  const altError = Math.abs((state.derived?.altitude ?? 0) - 10000);
  const targetVs = status.targets.vs;

  assert.ok(altError < 180, `Altitude error ${altError.toFixed(0)}ft exceeds 180ft`);
  assert.ok(Math.abs(targetVs) <= 100, `Target VS ${targetVs}fpm did not return near level flight`);
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

test('Autopilot predictive throttle limits speed overshoot after a step change', async () => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, 'intermediate');
  physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: 12000 * 0.3048 }, heading: 90, fuel: 5000, coldStart: false });
  physics.state.vel.set(170 * 0.514444, 0, 0);
  physics.setMotionEnabled(true);

  physics.setAutopilot(true, { mode: 'HDG', speed: 170, heading: 90, vs: 0, altitude: 12000 });
  runSteps(physics, { throttle: 0.45, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, 80);
  physics.updateAutopilotTargets({ speed: 210 });

  let maxSpeed = -Infinity;
  let finalState = null;
  for (let i = 0; i < 280; i += 1) {
    finalState = physics.update({ throttle: 0.45, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, SIM_DT);
    const speed = finalState?.derived?.airspeed ?? 0;
    if (speed > maxSpeed) maxSpeed = speed;
  }

  const finalSpeed = finalState?.derived?.airspeed ?? 0;
  const overshoot = maxSpeed - 210;
  assert.ok(overshoot < 12, `Speed overshoot ${overshoot.toFixed(1)}kts exceeds 12kts`);
  assert.ok(Math.abs(finalSpeed - 210) < 10, `Final speed error ${Math.abs(finalSpeed - 210).toFixed(1)}kts exceeds 10kts`);
});

test('Autopilot heading intercept builds stronger bank authority without a sharp first-frame snap', async () => {
  const physics = await createPhysics({ altitudeFt: 8000, heading: 90, speedKt: 200 });
  runSteps(physics, { throttle: 0.56, pitch: 0.02, roll: 0.01, yaw: 0, trim: 0.03, flaps: 0, gear: false }, 80);

  const beforeAileron = physics.controls.aileron;
  physics.setAutopilot(true, { mode: 'HDG', heading: 130, speed: 200, vs: 0, altitude: 8000 });

  let maxTargetRoll = 0;
  let maxObservedRoll = 0;
  let firstFrameAileronDelta = 0;
  let peakAileronStepDelta = 0;
  let previousAileron = beforeAileron;

  for (let i = 0; i < 80; i += 1) {
    const state = physics.update({ throttle: 0.56, pitch: 0.02, roll: 0.01, yaw: 0, trim: 0.03, flaps: 0, gear: false }, SIM_DT);
    const targetRoll = Math.abs(state.autopilotDebug?.targetRoll ?? 0);
    const observedRoll = Math.abs((state.orientation?.phi ?? 0) * 180 / Math.PI);
    const aileron = physics.controls.aileron;
    const stepDelta = Math.abs(aileron - previousAileron);

    if (i === 0) {
      firstFrameAileronDelta = Math.abs(aileron - beforeAileron);
    }

    if (targetRoll > maxTargetRoll) maxTargetRoll = targetRoll;
    if (observedRoll > maxObservedRoll) maxObservedRoll = observedRoll;
    if (stepDelta > peakAileronStepDelta) peakAileronStepDelta = stepDelta;
    previousAileron = aileron;
  }

  assert.ok(firstFrameAileronDelta < 0.08, `First-frame aileron jump ${firstFrameAileronDelta.toFixed(3)} exceeds 0.08`);
  assert.ok(peakAileronStepDelta < 0.05, `Peak aileron step delta ${peakAileronStepDelta.toFixed(3)} exceeds 0.05`);
  assert.ok(maxTargetRoll > 20, `Target roll ${maxTargetRoll.toFixed(2)}° did not build beyond 20°`);
  assert.ok(maxObservedRoll > 12, `Observed bank ${maxObservedRoll.toFixed(2)}° did not build beyond 12°`);
});

test('Autopilot preserves conservative bank on short final ILS', async () => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, 'intermediate');
  physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: 800 * 0.3048 }, heading: 95, fuel: 5000, coldStart: false });
  physics.state.vel.set(145 * 0.514444, 0, 0);
  physics.setMotionEnabled(true);
  physics.setEnvironment({ windSpeed: 0, windDirection: 0, windGust: 0, windShear: 0, turbulence: 0, temperature: 15, pressure: 1013.25 });
  physics.autopilot.setRunwayGeometry({
    runwayName: '27',
    heading: 90,
    ilsFrequency: 110.3,
    thresholdStart: { latitude: 34.0, longitude: -118.01, elevation: 100 }
  });

  physics.setAutopilot(true, { mode: 'ILS', speed: 145, heading: 90, vs: -700, altitude: 800 });

  let maxTargetRoll = 0;
  for (let i = 0; i < 25; i += 1) {
    const state = physics.update({ throttle: 0.45, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 1, gear: true }, SIM_DT);
    maxTargetRoll = Math.max(maxTargetRoll, Math.abs(state.autopilotDebug?.targetRoll ?? 0));
  }

  assert.ok(maxTargetRoll <= 8.1, `Short-final ILS target roll ${maxTargetRoll.toFixed(2)}° exceeds 8° limit`);
});

test('Autothrottle reduces thrust during overspeed climb instead of holding climb power', async () => {
  const physics = await createPhysics({ altitudeFt: 9000, heading: 90, speedKt: 280 });
  physics.setAutopilot(true, { mode: 'HDG', speed: 210, heading: 90, vs: 1800, altitude: 14000 });

  let minThrottleCommand = 1;
  let finalState = null;
  for (let i = 0; i < 80; i += 1) {
    finalState = physics.update({ throttle: 0.76, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, SIM_DT);
    minThrottleCommand = Math.min(minThrottleCommand, finalState.autopilotDebug?.throttleRawCommand ?? 1);
  }

  assert.ok(minThrottleCommand < 0.5, `Overspeed climb throttle command ${minThrottleCommand.toFixed(3)} did not reduce below normal lower envelope`);
});

test('Autothrottle can exceed normal thrust envelope during low-energy recovery', async () => {
  const physics = await createPhysics({ altitudeFt: 9000, heading: 90, speedKt: 135 });
  physics.setAutopilot(true, { mode: 'HDG', speed: 210, heading: 90, vs: 1000, altitude: 12000 });

  let maxThrottleCommand = 0;
  let finalState = null;
  for (let i = 0; i < 80; i += 1) {
    finalState = physics.update({ throttle: 0.55, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, SIM_DT);
    maxThrottleCommand = Math.max(maxThrottleCommand, finalState.autopilotDebug?.throttleRawCommand ?? 0);
  }

  assert.ok(maxThrottleCommand > 0.8, `Low-energy throttle command ${maxThrottleCommand.toFixed(3)} did not exceed normal upper envelope`);
});

process.exit(0);
