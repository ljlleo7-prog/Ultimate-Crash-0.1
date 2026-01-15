
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const aircraftDatabase = require("../src/data/aircraftDatabase.json");

const aircraft = aircraftDatabase.aircraft[0];
const service = new RealisticFlightPhysicsService(aircraft);

console.log("=== Autopilot Test Suite ===");

// Helper to run simulation
function runSim(duration, dt = 0.05, inputs = null) {
    const steps = duration / dt;
    for (let i = 0; i < steps; i++) {
        const currentInputs = inputs || {
            throttle: service.controls.throttle,
            pitch: service.controls.elevator,
            roll: service.controls.aileron,
            yaw: service.controls.rudder,
            flaps: service.controls.flaps,
            gear: service.controls.gear,
            trim: service.controls.trim
        };
        service.update(currentInputs, dt);
    }
    const state = service.getOutputState();
    return state;
}

// 1. Get Airborne manually
console.log("Taking off...");
service.controls.throttle = 1.0;
service.controls.flaps = 0.3; // Flaps 5
service.controls.gear = true;

// Run 20s (Takeoff Roll)
runSim(20.0);

// Rotate
console.log("Rotating...");
service.controls.elevator = -0.5; // Pull up
runSim(5.0);

// Climb
console.log("Climbing...");
service.controls.elevator = -0.1; // Maintain pitch
service.controls.gear = false;
runSim(10.0);

const state = service.getOutputState();
console.log(`Initial Air State: Alt ${state.derived.altitude_ft.toFixed(0)}ft, Spd ${state.derived.airspeed.toFixed(0)}kts`);

if (isNaN(state.derived.airspeed)) {
    console.error("FATAL: Physics NaN detected before AP engagement");
    process.exit(1);
}

// 2. Engage Autopilot
console.log("\n--- Engaging Autopilot ---");
const targetSpeed = 250;
const targetVS = 2000;
console.log(`Targets: ${targetSpeed} kts, ${targetVS} ft/min`);

service.setAutopilot(true, {
    speed: targetSpeed,
    vs: targetVS,
    altitude: 10000
});

// Run for 30 seconds
for (let t = 0; t <= 30; t += 1.0) {
    // Run 1 sec of physics
    // When AP is engaged, inputs are overridden, so we can pass anything or current controls
    runSim(1.0);
    
    const s = service.getOutputState();
    const ap = service.getAutopilotStatus();
    
    console.log(`T=${t.toFixed(1)}s | Spd: ${s.derived.airspeed.toFixed(1)} | VS: ${(s.verticalSpeed).toFixed(0)} | Pitch: ${(s.orientation.theta*180/Math.PI).toFixed(1)}° | Thr: ${service.controls.throttle.toFixed(2)} | Elev: ${service.controls.elevator.toFixed(3)} | Trim: ${service.controls.trim.toFixed(3)}`);
}
