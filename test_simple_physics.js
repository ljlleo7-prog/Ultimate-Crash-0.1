
import SimpleFlightPhysicsService from './src/services/SimpleFlightPhysicsService.js';

const mockAircraft = {
  name: 'Test Plane',
  emptyWeight: 40000,
  fuelWeight: 10000,
  payloadWeight: 0,
  wingArea: 125,
  maxThrustPerEngine: 120000,
  engineCount: 2
};

const service = new SimpleFlightPhysicsService(mockAircraft);

console.log('--- TEST START ---');

// 1. Initial State
let state = service.getAircraftState();
console.log('Initial Z:', state.position.z);
console.log('Initial Speed:', state.velocity.u);

// 2. Takeoff Run
console.log('\n--- TAKEOFF RUN ---');
service.setFlaps(15); // 15 degrees flap
service.state.controls.throttle = 1.0;

// Run until we reach ~135 kts (approx 70 m/s)
let time = 0;
while (service.state.velocity.u < 70 && time < 60) {
    service.update({ throttle: 1.0, pitch: 0, roll: 0, yaw: 0 }, 1/60);
    time += 1/60;
}

state = service.getAircraftState();
console.log(`Reached ${state.derived.airspeed.toFixed(1)} KTS in ${time.toFixed(1)}s`);
console.log('Altitude:', state.position.z.toFixed(2));

// 3. Rotate at ~140 KTS
console.log('\n--- ROTATE ATTEMPT ---');
// Pitch up gently
const rotateStartSpeed = state.derived.airspeed;
let rotated = false;
let liftedOff = false;
let maxPitch = 0;

for (let i = 0; i < 900; i++) { // 15s
    // Simple Pilot: Pull up until pitch is 15 deg, then neutral
    let pitchInput = 0;
    const currentPitchDeg = service.state.orientation.theta * 180 / Math.PI;
    
    if (currentPitchDeg < 15) {
        pitchInput = 0.5; // Pull
    } else {
        pitchInput = -0.1; // Push slightly to stop rotation
    }
    
    // Maintain throttle 100%
    service.update({ throttle: 1.0, pitch: pitchInput, roll: 0, yaw: 0 }, 1/60);
    state = service.getAircraftState();
    
    if (currentPitchDeg > maxPitch) maxPitch = currentPitchDeg;
    
    if (!rotated && state.orientation.theta > 0.05) { // ~3 deg
        console.log(`Rotated at ${state.derived.airspeed.toFixed(1)} KTS (Pitch: ${currentPitchDeg.toFixed(1)}°)`);
        rotated = true;
    }
    
    if (!liftedOff && state.position.z > 0.5) {
         console.log(`Liftoff at ${state.derived.airspeed.toFixed(1)} KTS`);
         liftedOff = true;
    }
    
    // Log status every second (60 frames)
    if (i % 60 === 0 && liftedOff) {
        console.log(`T+${(i/60).toFixed(1)}s: Alt=${state.position.z.toFixed(1)}m, Spd=${state.derived.airspeed.toFixed(1)}kts, Pitch=${currentPitchDeg.toFixed(1)}°, VS=${state.verticalSpeed.toFixed(0)}`);
    }
}

state = service.getAircraftState();
console.log('Final Speed:', state.derived.airspeed.toFixed(1), 'KTS');
console.log('Final Altitude:', state.position.z.toFixed(2));
console.log('Final Pitch:', (state.orientation.theta * 180 / Math.PI).toFixed(2), 'deg');
console.log('Max Pitch:', maxPitch.toFixed(2), 'deg');
console.log('Vertical Speed:', state.verticalSpeed.toFixed(0), 'ft/min');

if (liftedOff && state.derived.airspeed > 145 && state.position.z > 10) {
    console.log('✅ Takeoff Successful with correct parameters');
} else {
    console.log('❌ Takeoff Check Failed');
}

// 4. Engine Failure
console.log('\n--- ENGINE FAILURE ---');
service.failEngine(0); // Fail Left Engine
// Fly for 5s
for (let i = 0; i < 300; i++) {
    service.update({ throttle: 1.0, pitch: 0.1, roll: 0, yaw: 0 }, 1/60);
}
state = service.getAircraftState();
console.log('Yaw Rate after failure:', state.angularRates.r.toFixed(4));
console.log('Heading Change:', ((state.orientation.psi * 180 / Math.PI) % 360).toFixed(2));

if (Math.abs(state.angularRates.r) > 0.001) {
    console.log('✅ Yaw induced by failure');
} else {
    console.error('❌ No yaw effect from engine failure');
}

// 5. Stall Test
console.log('\n--- STALL TEST ---');
// Pitch up hard
for (let i = 0; i < 300; i++) {
    service.update({ throttle: 0.5, pitch: 1.0, roll: 0, yaw: 0 }, 1/60);
}
state = service.getAircraftState();
console.log('Pitch:', (state.orientation.theta * 180 / Math.PI).toFixed(2));
console.log('Stall Warning:', state.crashWarning);
console.log('Vertical Speed:', state.verticalSpeed);

if (state.crashWarning === 'STALL') {
    console.log('✅ Stall Detected');
} else {
    console.error('❌ Stall not detected');
}
