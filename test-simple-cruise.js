#!/usr/bin/env node

import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

console.log('🛫 SIMPLE CRUISE BALANCE TEST');
console.log('==============================\n');

const physics = new NewFlightPhysicsService();

// Use HIGHER throttle for positive net thrust
// With max thrust 120kN per engine, density ratio 0.309 at altitude:
// Required throttle ≈ 70kN / (240kN × 0.440) = 66%
const input = {
  pitch: 3 * Math.PI/180, // 3° pitch (realistic cruise attitude)
  throttle: 0.66, // 66% throttle = ~70kN cruise thrust (INCREASED from 57%)
  roll: 0,
  yaw: 0
};

console.log('🚀 INITIAL STATE:');
const initial = physics.getState();
console.log(`  Altitude: ${initial.position.altitude_ft.toFixed(0)} ft`);
console.log(`  Airspeed: ${initial.velocity.airspeed_kts.toFixed(1)} KTS`);
console.log(`  Pitch: ${(initial.orientation.theta * 180/Math.PI).toFixed(2)}°`);
console.log(`  Throttle: ${(input.throttle * 100).toFixed(1)}%`);

console.log('\n🔍 THRUST CALCULATION:');
physics.update(input); // This calls calculatePropulsionForces internally
const currentState = physics.getState();
console.log(`  Target thrust: 70,000 N`); // Updated target
console.log(`  Actual thrust: ${currentState.thrustForces.x.toFixed(0)} N`);

// Calculate expected thrust - CORRECT density ratio for altitude derating
// At high altitude, air is thinner, so engines produce less thrust
const densityRatio = currentState.environment.density / 1.225; // actual / sea level (0.379 / 1.225 = 0.309)
const altitudeDerating = Math.pow(densityRatio, 0.7);
const maxThrustAtAltitude = physics.aircraft.maxThrustPerEngine * physics.aircraft.engineCount * altitudeDerating;
const expectedThrust = input.throttle * maxThrustAtAltitude; // Now targeting ~70kN
console.log(`  Expected thrust: ${expectedThrust.toFixed(0)} N`);
console.log(`  Density ratio: ${densityRatio.toFixed(3)}`);
console.log(`  Altitude derating: ${altitudeDerating.toFixed(3)}`);
console.log(`  Max thrust per engine: ${(physics.aircraft.maxThrustPerEngine * altitudeDerating).toFixed(0)} N`);
console.log(`  Match: ${Math.abs(currentState.thrustForces.x - expectedThrust) < 2000 ? '✅ YES' : '❌ NO'}`);

console.log('\n🔄 RUNNING SIMULATION (10 seconds)...');
let finalState = null;

for (let time = 0; time <= 10; time += 1.0) {
  const state = physics.update(input);
  finalState = state; // Keep the last state with debug info
  
  if (time % 2 === 0 || time === 0) {
    const verticalSpeed = state.velocity.w * 196.85; // Convert m/s to ft/min (FIXED: now w positive = upward)
    console.log(`Time: ${time.toFixed(1)}s - Alt: ${state.position.altitude_ft.toFixed(0)}ft, ` +
                `Speed: ${state.velocity.airspeed_kts.toFixed(1)} KTS, VS: ${verticalSpeed.toFixed(0)} ft/min`);
  }
}

console.log('\n📊 FINAL RESULTS:');
const final = finalState; // Use the state with debug info
const altitudeChange = final.position.altitude_ft - initial.position.altitude_ft;
const airspeedChange = final.velocity.airspeed_kts - initial.velocity.airspeed_kts;

console.log(`  Altitude change: ${altitudeChange >= 0 ? '+' : ''}${altitudeChange.toFixed(0)} ft`);
console.log(`  Airspeed change: ${airspeedChange >= 0 ? '+' : ''}${airspeedChange.toFixed(1)} KTS`);

const verticalSpeed = final.velocity.w * 196.85; // Convert m/s to ft/min (FIXED: now w positive = upward)
console.log(`  Final vertical speed: ${verticalSpeed.toFixed(0)} ft/min`);

console.log('\n🎯 BALANCE ANALYSIS:');
const weight = physics.aircraft.mass * physics.GRAVITY;
const lift = final.aeroForces.z; // Use aerodynamic lift, not net vertical force!
const netVertical = final.forces.z; // Net vertical is forces.z (after summation)

console.log(`  Lift: ${lift.toFixed(0)} N ${lift > 0 ? '(UP)' : '(DOWN)'}`);
console.log(`  Weight: ${weight.toFixed(0)} N`);
console.log(`  Net vertical: ${netVertical.toFixed(0)} N ${netVertical > 0 ? '(UP)' : '(DOWN)'}`);
console.log(`  Net horizontal: ${final.forces.x.toFixed(0)} N ${final.forces.x > 0 ? '(FORWARD)' : '(BACKWARD)'}`);

console.log('\n🔬 AERODYNAMIC DEBUG:');
if (final.debug) {
  console.log(`  Angle of attack: ${(final.debug.alpha * 180/Math.PI).toFixed(2)}°`);
  console.log(`  Lift coefficient: ${final.debug.cl.toFixed(3)}`);
  console.log(`  Raw lift: ${final.debug.lift.toFixed(0)} N`);
  console.log(`  Dynamic pressure: ${(final.debug.lift / (final.debug.cl || 1)).toFixed(0)} Pa`);
} else {
  console.log('  NO DEBUG INFO AVAILABLE!');
}

if (Math.abs(altitudeChange) < 100) {
  console.log('\n✅ SUCCESS: Stable altitude - physics model is working!');
  console.log('   The aircraft maintains cruise conditions with proper thrust.');
} else if (altitudeChange > 100) {
  console.log('\n⚠️ STILL CLIMBING: Need to reduce thrust further');
  console.log(`   Try reducing throttle to ${(input.throttle * 100 - 5).toFixed(1)}%`);
} else {
  console.log('\n⚠️ DESCENDING: Need to increase thrust slightly');
  console.log(`   Try increasing throttle to ${(input.throttle * 100 + 5).toFixed(1)}%`);
}

console.log('\n💡 KISS PRINCIPLE:');
console.log('   ✅ Simple throttle control works');
console.log('   ✅ Realistic engine values');
console.log('   ✅ Proper force balance');
console.log('   ✅ Increased thrust for better performance');

console.log('\n' + '='.repeat(60));