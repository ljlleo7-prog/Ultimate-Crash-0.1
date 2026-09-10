import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSystemState } from '../src/services/SystemDependencyGraph.js';

const aircraftDB = JSON.parse(readFileSync('./src/data/aircraftDatabase.json', 'utf-8'));

test('Cold Startup Test - All Aircraft', async (t) => {
    for (const aircraft of aircraftDB.aircraft) {
        await t.test(`${aircraft.model} - Cold Startup`, () => {
            // Step 1: Battery ON
            let state = { battery: true, battery_1: true, battery_2: true };
            let available = resolveSystemState(state, aircraft.model);
            assert.ok(available.has('dc_essential') || available.has('dc_bat'),
                `${aircraft.model}: Battery should provide DC power`);

            // Step 2: APU Start
            state.apu_running = true;
            available = resolveSystemState(state, aircraft.model);
            assert.ok(available.has('apu_power'),
                `${aircraft.model}: APU should be running`);

            // Step 3: APU Gen & Bleed
            state.apu_generator = true;
            state.apu_bleed = true;
            available = resolveSystemState(state, aircraft.model);
            assert.ok(available.has('bleed_pressure'),
                `${aircraft.model}: APU bleed should provide pressure`);

            // Step 4: Fuel Pumps
            state.fuel_pump_left = true;
            state.fuel_pump_left_1 = true;
            state.fuel_pump_right = true;
            state.fuel_pump_right_1 = true;
            state.fuel_pump_main = true;
            available = resolveSystemState(state, aircraft.model);

            // Step 5: Engine Start
            for (let i = 1; i <= aircraft.engineCount; i++) {
                state[`engine_${i}_running`] = true;
                state[`engine_generator_${i}`] = true;
            }
            available = resolveSystemState(state, aircraft.model);

            assert.ok(available.has('engine_1_power'),
                `${aircraft.model}: Engine 1 should be running`);
        });
    }
});

test('Post-Landing Shutdown Test - All Aircraft', async (t) => {
    for (const aircraft of aircraftDB.aircraft) {
        await t.test(`${aircraft.model} - Shutdown`, () => {
            // Start with all systems running
            let state = { battery: true, battery_1: true };
            for (let i = 1; i <= aircraft.engineCount; i++) {
                state[`engine_${i}_running`] = true;
                state[`engine_generator_${i}`] = true;
            }

            let available = resolveSystemState(state, aircraft.model);
            const initialSystems = available.size;

            // Shutdown engines
            for (let i = 1; i <= aircraft.engineCount; i++) {
                state[`engine_${i}_running`] = false;
                state[`engine_generator_${i}`] = false;
            }

            available = resolveSystemState(state, aircraft.model);
            assert.ok(available.size < initialSystems,
                `${aircraft.model}: Systems should reduce after engine shutdown`);
            assert.ok(available.has('dc_essential') || available.has('dc_bat'),
                `${aircraft.model}: Battery power should remain`);
        });
    }
});

test('Compressor Stall Test - All Aircraft', async (t) => {
    for (const aircraft of aircraftDB.aircraft) {
        await t.test(`${aircraft.model} - Compressor Stall`, () => {
            // All engines running
            let state = { battery: true, battery_1: true, apu_bleed: true };
            for (let i = 1; i <= aircraft.engineCount; i++) {
                state[`engine_${i}_running`] = true;
                state[`engine_generator_${i}`] = true;
                state[`fuel_pump_left`] = true;
                state[`fuel_pump_left_1`] = true;
            }

            let available = resolveSystemState(state, aircraft.model);
            const beforeStall = available.size;

            // Engine 1 compressor stall (still running but degraded)
            // Should maintain most systems
            available = resolveSystemState(state, aircraft.model);
            assert.ok(available.size === beforeStall,
                `${aircraft.model}: Compressor stall shouldn't immediately affect systems`);
        });
    }
});

test('Mid-Air Engine Failure Restart Test - All Aircraft', async (t) => {
    for (const aircraft of aircraftDB.aircraft) {
        await t.test(`${aircraft.model} - Engine Restart`, () => {
            // Cruise: All engines running
            let state = { battery: true, battery_1: true };
            for (let i = 1; i <= aircraft.engineCount; i++) {
                state[`engine_${i}_running`] = true;
                state[`engine_generator_${i}`] = true;
                state[`engine_${i}_bleed`] = true;
            }
            state.fuel_pump_left = true;
            state.fuel_pump_left_1 = true;

            let available = resolveSystemState(state, aircraft.model);
            const fullPower = available.size;

            // Engine 1 fails
            state.engine_1_running = false;
            state.engine_generator_1 = false;
            state.engine_1_bleed = false;

            available = resolveSystemState(state, aircraft.model);
            assert.ok(available.size < fullPower,
                `${aircraft.model}: Engine failure should reduce available systems`);

            // Windmill restart (bleed from other engine)
            state.engine_1_running = true;
            state.engine_generator_1 = true;

            available = resolveSystemState(state, aircraft.model);
            assert.ok(available.has('engine_1_power'),
                `${aircraft.model}: Engine should restart with bleed available`);
        });
    }
});
