
import RealisticAutopilotService from '../src/services/RealisticAutopilotService.js';

const autopilot = new RealisticAutopilotService();

console.log("--- Test 1: Manual VS Authority (Far from Altitude) ---");
autopilot.setTargets({
    mode: 'HDG',
    altitude: 10000,
    vs: 2000,
    heading: 360,
    speed: 250
});
autopilot.setEngaged(true);

// State: 5000ft (Far from 10000ft)
const stateFar = {
    airspeed: 250,
    verticalSpeed: 2000,
    pitch: 0,
    roll: 0,
    heading: 360,
    track: 360,
    latitude: 0,
    longitude: 0,
    altitude: 5000
};

// Update
const outputFar = autopilot.update(stateFar, { trim: 0 }, 0.1);

console.log(`Target VS: ${autopilot.targets.vs}`);
if (autopilot.targets.vs === 2000) {
    console.log("✅ PASS: VS respected when far from altitude.");
} else {
    console.log(`❌ FAIL: VS overwritten to ${autopilot.targets.vs}`);
}

console.log("\n--- Test 2: Altitude Hold (Close to Altitude) ---");
// State: 9980ft (Within 50ft of 10000ft)
const stateClose = {
    ...stateFar,
    altitude: 9980,
    verticalSpeed: 500 // Approaching
};

// Reset PID to ensure fresh start
autopilot.altitudePID.reset();

const outputClose = autopilot.update(stateClose, { trim: 0 }, 0.1);

console.log(`Target VS: ${autopilot.targets.vs}`);
// Expect PID control. Error is 20ft. Kp=1.5 -> VS ~ 20ft * 1.5 = 30 fpm.
// Definitely not 2000.
if (autopilot.targets.vs !== 2000 && Math.abs(autopilot.targets.vs) < 1000) {
    console.log("✅ PASS: VS overwritten to hold altitude.");
} else {
    console.log(`❌ FAIL: VS not capturing. Value: ${autopilot.targets.vs}`);
}

console.log("\n--- Test 3: LNAV with Altitude (Pre-Turn) ---");
autopilot.setNavigationPlan({
    fix: { latitude: 1, longitude: 1, altitude: 4000 },
    inboundCourseDeg: 90
});
autopilot.setTargets({ mode: 'LNAV', vs: 0 }); // User didn't set VS

// State: 2000ft (Far from 4000ft)
const stateLnav = {
    ...stateFar,
    latitude: 0,
    longitude: 0,
    altitude: 2000
};

const outputLnav = autopilot.update(stateLnav, { trim: 0 }, 0.1);

console.log(`Target VS: ${autopilot.targets.vs}`);
// Expect VS to be driven by PID (climb)
// Error 2000. Kp=1.5 -> VS 3000 (Max).
if (autopilot.targets.vs > 500) {
    console.log("✅ PASS: LNAV drives VS for altitude fix.");
} else {
    console.log(`❌ FAIL: LNAV did not set VS. Value: ${autopilot.targets.vs}`);
}
