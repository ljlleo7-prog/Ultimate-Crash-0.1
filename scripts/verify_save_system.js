
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';

// Test Runner Configuration
const TEST_CONFIG = {
    simDurationBeforeSave: 200, // frames (approx 10s at 20hz)
    simDurationPostLoad: 100,   // frames (approx 5s)
    dt: 0.05
};

async function runScenario(name, setupFn) {
    console.log(`\n=========================================`);
    console.log(`🧪 TEST SCENARIO: ${name}`);
    console.log(`=========================================`);

    // 1. Load Aircraft Config
    const aircraftDb = await loadAircraftData();
    const aircraftConfig = aircraftDb.find(a => a.model === "Boeing 737-800");
    if (!aircraftConfig) throw new Error("Aircraft not found");

    // 2. Initialize Physics Service
    const service = new RealisticFlightPhysicsService(aircraftConfig, 37.6188, -122.3750, 'intermediate');
    service.setMotionEnabled(true);

    // 3. Setup Scenario
    console.log("⚙️  Setting up scenario conditions...");
    await setupFn(service);

    // 4. Simulate before save
    console.log(`⏳ Simulating ${TEST_CONFIG.simDurationBeforeSave} frames...`);
    for (let i = 0; i < TEST_CONFIG.simDurationBeforeSave; i++) {
        service.update({ throttle: service.autopilot.engaged ? undefined : 0.6 }, TEST_CONFIG.dt);
    }

    // 5. Save State
    const stateBeforeSave = service.getSerializableState();
    console.log(`📝 State Saved at T=${service.time.toFixed(1)}s`);
    logKeyMetrics(stateBeforeSave);

    // 6. Corrupt State
    console.log("💥 Corrupting State...");
    service.reset(); 
    service.state.pos.z = 0; 
    service.state.vel.x = 0;
    service.autopilot.engaged = false;

    // 7. Load State
    console.log("mw Loading Saved State...");
    // Simulate the save wrapper structure
    const saveFile = {
        version: '2.0',
        physicsState: stateBeforeSave
    };
    service.loadFlightState(saveFile);

    // 8. Verify Restoration
    const stateAfterLoad = service.getSerializableState();
    const metrics = compareStates(stateBeforeSave, stateAfterLoad);
    
    // 9. Post-Load Simulation
    console.log(`⏳ Simulating ${TEST_CONFIG.simDurationPostLoad} frames post-load...`);
    for (let i = 0; i < TEST_CONFIG.simDurationPostLoad; i++) {
        service.update({ throttle: service.autopilot.engaged ? undefined : 0.6 }, TEST_CONFIG.dt);
    }
    
    // Check for stability (no NaN, no massive divergence)
    const finalState = service.getSerializableState();
    if (Math.abs(finalState.physics.position.z - stateAfterLoad.physics.position.z) > 1000) { // >1000m drop in 5s is crash
        console.error("❌ STABILITY CHECK FAILED: Aircraft likely crashed after load.");
        return false;
    }

    if (metrics.passed) {
        console.log(`✅ SCENARIO PASSED: ${name}`);
    } else {
        console.error(`❌ SCENARIO FAILED: ${name}`);
        console.error(metrics.errors);
    }
    
    return metrics.passed;
}

function logKeyMetrics(state) {
    const alt = (-state.physics.position.z * 3.28084).toFixed(0);
    const vel = state.physics.velocity.x.toFixed(2);
    const ap = state.autopilot.engaged ? state.autopilot.mode : "OFF";
    const fails = state.failures ? state.failures.activeFailures.length : 0;
    console.log(`   Alt: ${alt}ft | Vel: ${vel}m/s | AP: ${ap} | Active Failures: ${fails}`);
}

function compareStates(original, loaded) {
    const errors = [];
    const TOLERANCE = 0.001;

    // Physics
    const altDiff = Math.abs(original.physics.position.z - loaded.physics.position.z);
    if (altDiff > TOLERANCE) errors.push(`Alt Mismatch: ${altDiff}`);
    
    const velDiff = Math.abs(original.physics.velocity.x - loaded.physics.velocity.x);
    if (velDiff > TOLERANCE) errors.push(`Vel X Mismatch: ${velDiff}`);

    // Autopilot
    if (original.autopilot.engaged !== loaded.autopilot.engaged) errors.push(`AP Engaged Mismatch`);
    if (original.autopilot.mode !== loaded.autopilot.mode) errors.push(`AP Mode Mismatch`);
    
    // Failures
    const origFailures = original.failures ? original.failures.activeFailures.length : 0;
    const loadFailures = loaded.failures ? loaded.failures.activeFailures.length : 0;
    if (origFailures !== loadFailures) errors.push(`Failure Count Mismatch: ${origFailures} vs ${loadFailures}`);

    // Check specific failure details if any exist
    if (origFailures > 0 && loadFailures > 0) {
        const f1 = original.failures.activeFailures[0];
        const f2 = loaded.failures.activeFailures.find(f => f.id === f1.id);
        if (!f2) errors.push(`Failure ID ${f1.id} missing after load`);
        else {
             if (Math.abs(f1.intensity - f2.intensity) > TOLERANCE) errors.push(`Failure Intensity Mismatch`);
        }
    }

    return { passed: errors.length === 0, errors };
}

// Scenarios
const scenarios = {
    "Climb": async (service) => {
        service.setInitialConditions({
            altitude: 10000,
            speed: 250,
            heading: 90
        });
        service.setAutopilot(true, {
            mode: 'VS',
            altitude: 20000,
            speed: 280,
            heading: 90,
            verticalSpeed: 2000
        });
    },

    "Descend": async (service) => {
        service.setInitialConditions({
            altitude: 35000,
            speed: 280,
            heading: 180
        });
        service.setAutopilot(true, {
            mode: 'VS',
            altitude: 10000,
            speed: 250,
            heading: 180,
            verticalSpeed: -1500
        });
    },

    "Finals": async (service) => {
        service.setInitialConditions({
            altitude: 2000,
            speed: 140,
            heading: 270
        });
        service.controls.flaps = 1.0; // Full flaps
        service.controls.gear = 1.0;  // Gear down
        service.setAutopilot(true, {
            mode: 'APP',
            altitude: 0,
            speed: 135,
            heading: 270
        });
    },

    "Cold-Start": async (service) => {
        service.setInitialConditions({
            altitude: 0,
            speed: 0,
            heading: 0
        });
        service.setMotionEnabled(false); // Parked
        // Shut down engines
        service.engines.forEach(e => {
            e.state.running = false;
            e.state.n1 = 0;
            e.state.n2 = 0;
        });
        service.systems.electrical.gen1 = false;
        service.systems.electrical.gen2 = false;
    },

    "Engine Failure": async (service) => {
        service.setInitialConditions({
            altitude: 20000,
            speed: 300,
            heading: 360
        });
        // Trigger Engine Fire
        if (service.failureSystem) {
            console.log("   🔥 Triggering Engine Fire...");
            service.failureSystem.triggerFailure('engine_fire', { engineIndex: 0 });
            
            // Advance time slightly to let failure progress
            service.failureSystem.update(5.0, service.getOutputState());
        }
    }
};

// Main Execution
async function main() {
    const args = process.argv.slice(2);
    const filter = args[0]; // Optional: run specific test

    let passed = 0;
    let total = 0;

    for (const [name, fn] of Object.entries(scenarios)) {
        if (filter && !name.toLowerCase().includes(filter.toLowerCase())) continue;
        
        try {
            const success = await runScenario(name, fn);
            if (success) passed++;
        } catch (e) {
            console.error(`🚨 EXCEPTION in ${name}:`, e);
        }
        total++;
    }

    console.log(`\n🏁 SUMMARY: ${passed}/${total} Scenarios Passed`);
    process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
