#!/usr/bin/env node

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';

console.log('🔍 TIME STEP INSTABILITY DEBUG');
console.log('===============================\n');

const physics = new NewFlightPhysicsService();

// Use same dt as test-physics-only.js
const dt = 0.1;

console.log('🚀 INITIAL STATE:');
const initial = physics.getFlightState();
console.log(`  Altitude: ${initial.altitude.toFixed(1)} ft`);
console.log(`  Time step: ${dt}s (${(1/dt).toFixed(1)} Hz)`);

console.log('\n🧪 TEST 1: Small dt (60 Hz)');
const physics1 = new NewFlightPhysicsService();
for (let i = 0; i < 10 / 0.016; i++) {
  physics1.update(0.016);
}
const result1 = physics1.getFlightState();
console.log(`  Final altitude: ${result1.altitude.toFixed(1)} ft (Δ ${(result1.altitude - initial.altitude).toFixed(1)} ft)`);
console.log(`  Final airspeed: ${result1.airspeed.toFixed(1)} KTS (Δ ${(result1.airspeed - initial.airspeed).toFixed(1)} KTS)`);

console.log('\n🧪 TEST 2: Large dt (10 Hz) - SAME AS TEST FILE');
const physics2 = new NewFlightPhysicsService();
for (let i = 0; i < 10 / dt; i++) {
  physics2.update(dt);
}
const result2 = physics2.getFlightState();
console.log(`  Final altitude: ${result2.altitude.toFixed(1)} ft (Δ ${(result2.altitude - initial.altitude).toFixed(1)} ft)`);
console.log(`  Final airspeed: ${result2.airspeed.toFixed(1)} KTS (Δ ${(result2.airspeed - initial.airspeed).toFixed(1)} KTS)`);

console.log('\n🔍 DETAILED ANALYSIS WITH LARGE DT:');
const physics3 = new NewFlightPhysicsService();

for (let step = 1; step <= 3; step++) {
  const before = physics3.getFlightState();
  
  console.log(`\n--- Step ${step} (dt = ${dt}s) ---`);
  console.log(`  Before: Alt ${before.altitude.toFixed(1)}ft, Speed ${before.airspeed.toFixed(1)}KTS`);
  
  // Calculate forces before update
  physics3.calculateAerodynamicForces();
  physics3.calculatePropulsionForces();
  physics3.calculateGravitationalForces();
  physics3.sumForcesAndMoments();
  
  console.log(`  Forces: Fx=${physics3.forces.x.toFixed(1)}N, Fy=${physics3.forces.y.toFixed(1)}N, Fz=${physics3.forces.z.toFixed(1)}N`);
  console.log(`  Acceleration: az=${(physics3.forces.z / physics3.aircraft.mass).toFixed(3)} m/s²`);
  
  // Update
  physics3.update(dt);
  
  const after = physics3.getFlightState();
  console.log(`  After:  Alt ${after.altitude.toFixed(1)}ft, Speed ${after.airspeed.toFixed(1)}KTS`);
  console.log(`  Change: ΔAlt ${(after.altitude - before.altitude).toFixed(1)}ft, ΔSpeed ${(after.airspeed - before.airspeed).toFixed(1)}KTS`);
}

console.log('\n🎯 CONCLUSION:');
const alt1 = result1.altitude - initial.altitude;
const alt2 = result2.altitude - initial.altitude;

console.log(`  Small dt (0.016s): ΔAlt = ${alt1 >= 0 ? '+' : ''}${alt1.toFixed(1)} ft`);
console.log(`  Large dt (0.1s):   ΔAlt = ${alt2 >= 0 ? '+' : ''}${alt2.toFixed(1)} ft`);

if (Math.abs(alt2 - alt1) > 100) {
  console.log(`\n🚨 NUMERICAL INSTABILITY DETECTED!`);
  console.log(`   The large time step causes inaccurate integration.`);
  console.log(`   💡 SOLUTION: Use smaller time steps or improve integration method.`);
} else {
  console.log(`\n✅ Numerical integration appears stable.`);
}

console.log('\n' + '='.repeat(60));