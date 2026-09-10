import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';

const require = createRequire(import.meta.url);
const aircraftDatabase = require('../src/data/aircraftDatabase.json');
const aircraft = aircraftDatabase.aircraft[0];

const tickSystems = (service, seconds, step = 0.5) => {
  for (let t = 0; t < seconds; t += step) {
    service.update({}, step);
  }
};

const createColdDarkService = () => {
  const service = new RealisticFlightPhysicsService(aircraft, 0, 0, 'pro');
  service.setMotionEnabled(false);
  service.state.pos.z = 0;
  service.onGround = true;
  return service;
};

const connectBattery = (service) => {
  service.systems.electrical.batterySelector = 'AUTO';
};

const selectApuGenerators = (service) => {
  service.systems.electrical.apuGen1 = true;
  service.systems.electrical.apuGen2 = true;
};

test('battery-only state keeps DC alive but leaves AC-powered pumps unavailable', () => {
  const service = createColdDarkService();

  connectBattery(service);
  service.systems.electrical.busTie = true;
  service.systems.fuel.leftPumps = true;
  service.systems.fuel.rightPumps = true;
  service.systems.fuel.centerPumps = true;

  tickSystems(service, 1);

  assert.equal(service.systems.electrical.dcVolts > 20, true);
  assert.equal(service.systems.electrical.acVolts, 0);
  assert.equal(service.systems.fuel.pressL, 0);
  assert.equal(service.systems.fuel.pressR, 0);
  assert.equal(service.systems.fuel.pressC, 0);
});

test('apu generator can repower AC buses from a cold and dark state', () => {
  const service = createColdDarkService();

  connectBattery(service);
  service.systems.apu.master = true;
  service.systems.apu.start = true;
  selectApuGenerators(service);

  tickSystems(service, 35);

  assert.equal(service.systems.apu.running, true);
  assert.equal(service.systems.apu.n2 >= 95, true);
  assert.equal(service.systems.electrical.acVolts > 100, true);
  assert.equal(service.systems.electrical.apuGenOff, false);
});

test('engine start does not light off without bleed pressure even with fuel available', () => {
  const service = createColdDarkService();

  connectBattery(service);
  service.systems.fuel.leftPumps = true;
  service.systems.fuel.rightPumps = true;
  selectApuGenerators(service);
  service.systems.apu.master = true;
  service.systems.apu.start = true;

  tickSystems(service, 35);

  service.systems.engines.eng1.fuelControl = true;
  service.systems.engines.eng1.startSwitch = 'GRD';
  service.systems.apu.bleed = false;
  service.systems.pressurization.bleed1 = false;
  service.engines[0].state.running = false;
  service.engines[0].state.n2 = 0;

  tickSystems(service, 12);

  assert.equal(service.systems.pressurization.ductPressL < 20, true);
  assert.equal(service.engines[0].state.running, false);
  assert.equal(service.engines[0].state.n2 < 15, true);
});

test('engine start can light off once bleed and fuel feed are both available', () => {
  const service = createColdDarkService();

  connectBattery(service);
  service.systems.fuel.leftPumps = true;
  service.systems.fuel.rightPumps = true;
  selectApuGenerators(service);
  service.systems.apu.master = true;
  service.systems.apu.start = true;

  tickSystems(service, 35);

  service.systems.apu.bleed = true;
  service.systems.engines.eng1.fuelControl = true;
  service.systems.engines.eng1.startSwitch = 'GRD';
  service.engines[0].state.running = false;
  service.engines[0].state.n2 = 0;

  tickSystems(service, 120, 0.5);

  assert.equal(service.systems.pressurization.ductPressL > 20, true);
  assert.equal(service.systems.fuel.pressL > 10 || service.systems.fuel.pressC > 10, true);
  assert.equal(service.engines[0].state.running, true);
  assert.equal(service.engines[0].state.n2 > 0, true);
});

test('hydraulic pressure decays without pump supply and rebuilds with electrical supply restored', () => {
  const service = createColdDarkService();
  const sysA = service.systems.hydraulics.sysA;

  connectBattery(service);
  service.systems.electrical.acVolts = 0;
  sysA.engPump = false;
  sysA.elecPump = false;
  sysA.pressure = 3000;

  tickSystems(service, 6);
  assert.equal(sysA.pressure < 3000, true);

  selectApuGenerators(service);
  service.systems.apu.master = true;
  service.systems.apu.start = true;

  tickSystems(service, 35);

  sysA.elecPump = true;
  tickSystems(service, 4);

  assert.equal(service.systems.electrical.acVolts > 100, true);
  assert.equal(sysA.pressure > 0, true);
});

test('ground steering path stays finite with empty pilot input', () => {
  const service = new RealisticFlightPhysicsService(aircraft, 0, 0, 'intermediate');
  service.setMotionEnabled(false);
  service.onGround = true;
  service.groundStatus = { status: 'RUNWAY' };
  service.runwayGeometry = {
    heading: 90,
    thresholdStart: { latitude: 0, longitude: 0 }
  };

  service.currentGroundZ = 3;
  service.state.pos.z = 0;
  service.state.geo.lat = 0;
  service.state.geo.lon = 0;
  service.state.vel.x = 5;
  service.state.vel.y = 0.4;
  service.state.rates.z = 0.05;

  const output = service.update({}, 0.5);

  assert.equal(Number.isFinite(service.controls.rudder), true);
  assert.equal(Number.isFinite(output.debugPhysics.steeringMoment_n), true);
});
