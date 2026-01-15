
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const aircraftDatabase = require("../src/data/aircraftDatabase.json");

const aircraft = aircraftDatabase.aircraft[0]; // B737-800
const service = new RealisticFlightPhysicsService(aircraft);

console.log("=== Flight Physics Test Suite ===");
console.log(`Aircraft: ${aircraft.model}`);

// Helper to run simulation for t seconds
function runSim(duration, dt = 0.05, label = "") {
    const steps = duration / dt;
    for (let i = 0; i < steps; i++) {
        service.update({
            throttle: service.controls.throttle,
            pitch: service.controls.elevator,
            roll: service.controls.aileron,
            yaw: service.controls.rudder,
            flaps: service.controls.flaps,
            gear: service.controls.gear
        }, dt);
    }
    const state = service.getOutputState();
    console.log(`[${label}] T=${service.time.toFixed(1)}s | Alt: ${state.position.z.toFixed(1)}m | TAS: ${state.derived.airspeed.toFixed(1)}kts | Pitch: ${(state.orientation.theta * 180 / Math.PI).toFixed(1)}deg`);
    return state;
}

// 1. Static Ground Test
console.log("\n--- Test 1: Static Ground ---");
service.controls.throttle = 0;
runSim(2.0, 0.05, "Idle");
let state = service.getOutputState();
// Expect Altitude around 3.0m (Gear Height)
if (Math.abs(state.position.z - 3.0) < 0.5 && Math.abs(state.velocity.u) < 0.5) {
    console.log("PASS: Aircraft stays still on ground.");
} else {
    console.log("FAIL: Aircraft moved or sank.", state.position.z, state.velocity.u);
}

// 2. Takeoff Run
console.log("\n--- Test 2: Takeoff Run ---");
service.controls.throttle = 1.0;
service.controls.flaps = 0.3; // Flaps 5
// Run for 30 seconds
for (let i=0; i<3; i++) runSim(10.0, 0.05, "Takeoff Roll");

state = service.getOutputState();
if (state.derived.airspeed > 100) {
    console.log("PASS: Aircraft accelerated to > 100 kts.");
} else {
    console.log("FAIL: Acceleration too slow.");
}

// 3. Rotation
console.log("\n--- Test 3: Rotation ---");
service.controls.elevator = -0.5; // Pull up
runSim(5.0, 0.05, "Rotate");
state = service.getOutputState();
if (state.position.z > 5) {
    console.log("PASS: Aircraft liftoff.");
} else {
    console.log("FAIL: Aircraft did not lift off.");
}

// 4. Climb
console.log("\n--- Test 4: Climb ---");
service.controls.elevator = -0.1; // Maintain pitch
service.controls.gear = false; // Gear up
runSim(10.0, 0.05, "Climb");
state = service.getOutputState();
if (state.position.z > 50 && state.derived.airspeed > 140) {
    console.log("PASS: Stable climb established.");
} else {
    console.log("FAIL: Climb issues.");
}

console.log("\nTests Complete.");
