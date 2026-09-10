import { test } from 'node:test';
import assert from 'node:assert/strict';
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';

let cachedAircraft = null;
const getAircraft = async () => {
    if (cachedAircraft) return cachedAircraft;
    const db = await loadAircraftData();
    cachedAircraft = db.find(a => a.model === 'Boeing 737-800');
    return cachedAircraft;
};

const createPhysics = async (difficulty = 'intermediate') => {
    const aircraft = await getAircraft();
    const physics = new RealisticFlightPhysicsService(aircraft, 34.0, -118.0, difficulty);
    physics.setInitialConditions({ latitude: 34.0, longitude: -118.0, position: { z: 0 }, heading: 90, fuel: 5000, coldStart: false });
    physics.setMotionEnabled(false);
    return physics;
};

test('ice.windowHeat toggles via performSystemAction', async () => {
    const physics = await createPhysics();
    const initial = physics.systems.ice.windowHeat;
    physics.performSystemAction('ice', 'windowHeat');
    assert.equal(physics.systems.ice.windowHeat, !initial);
    physics.performSystemAction('ice', 'windowHeat');
    assert.equal(physics.systems.ice.windowHeat, initial);
});

test('ice.eng1AntiIce and eng2AntiIce toggle independently', async () => {
    const physics = await createPhysics();
    physics.performSystemAction('ice', 'eng1AntiIce');
    assert.equal(physics.systems.ice.eng1AntiIce, true);
    assert.equal(physics.systems.ice.eng2AntiIce, false);
    physics.performSystemAction('ice', 'eng2AntiIce');
    assert.equal(physics.systems.ice.eng2AntiIce, true);
});

test('ice.engAntiIce alias sets both eng1 and eng2', async () => {
    const physics = await createPhysics();
    physics.performSystemAction('ice', 'engAntiIce');
    assert.equal(physics.systems.ice.eng1AntiIce, true);
    assert.equal(physics.systems.ice.eng2AntiIce, true);
    physics.performSystemAction('ice', 'engAntiIce');
    assert.equal(physics.systems.ice.eng1AntiIce, false);
    assert.equal(physics.systems.ice.eng2AntiIce, false);
});

test('signs.attend and signs.groundCall toggle', async () => {
    const physics = await createPhysics();
    assert.equal(physics.systems.signs.attend, false);
    assert.equal(physics.systems.signs.groundCall, false);
    physics.performSystemAction('signs', 'attend');
    assert.equal(physics.systems.signs.attend, true);
    physics.performSystemAction('signs', 'groundCall');
    assert.equal(physics.systems.signs.groundCall, true);
});

test('wipers.left and wipers.right toggle', async () => {
    const physics = await createPhysics();
    physics.performSystemAction('wipers', 'left');
    assert.equal(physics.systems.wipers.left, true);
    physics.performSystemAction('wipers', 'right');
    assert.equal(physics.systems.wipers.right, true);
    physics.performSystemAction('wipers', 'left');
    assert.equal(physics.systems.wipers.left, false);
});

test('cold & dark: windowHeat and probeHeat start false', async () => {
    const physics = await createPhysics('pro');
    assert.equal(physics.systems.ice.windowHeat, false);
    assert.equal(physics.systems.ice.probeHeat, false);
});
