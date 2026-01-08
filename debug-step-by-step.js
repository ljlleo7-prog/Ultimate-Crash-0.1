#!/usr/bin/env node

import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

console.log('🔍 STEP-BY-STEP PHYSICS SIMULATION');
console.log('==================================\n');

const physics = new NewFlightPhysicsService();

console.log('🚀 INITIAL STATE:');
const initial = physics.getState();
console.log(`  Altitude: ${initial.position.altitude_ft.toFixed(1)} ft`);
console.log(`  Airspeed: ${initial.velocity.airspeed_kts.toFixed(1)} KTS`);
console.log(`  Pitch: ${(initial.orientation.theta * 180/Math.PI).toFixed(2)}°`);
console.log(`  Vertical Speed: ${(initial.velocity.w * 196.85).toFixed(1)} ft/min`);

console.log('\n🔄 SIMULATION STEPS (0.016s each):');

for (let step = 1; step <= 10; step++) {
  // Get pre-update values
  const preUpdate = physics.getState();
  
  // Run one physics update
  const input = {
    pitch: 3 * Math.PI/180, // 3° pitch
    throttle: 0.47, // 47% throttle
    roll: 0,
    yaw: 0
  };
  physics.update(input);
  
  // Get post-update values  
  const postUpdate = physics.getState();
  
  // Calculate actual changes
  const altitudeChange = postUpdate.position.altitude_ft - preUpdate.position.altitude_ft;
  const airspeedChange = postUpdate.velocity.airspeed_kts - preUpdate.velocity.airspeed_kts;
  const vsChange = (postUpdate.velocity.w - preUpdate.velocity.w) * 196.85;
  
  if (step <= 5 || step % 5 === 0) {
    console.log(`\n--- Step ${step} ---`);
    console.log(`  Before: Alt ${preUpdate.position.altitude_ft.toFixed(1)}ft, Speed ${preUpdate.velocity.airspeed_kts.toFixed(1)}KTS, VS ${(preUpdate.velocity.w * 196.85).toFixed(1)}ft/min`);
    console.log(`  After:  Alt ${postUpdate.position.altitude_ft.toFixed(1)}ft, Speed ${postUpdate.velocity.airspeed_kts.toFixed(1)}KTS, VS ${(postUpdate.velocity.w * 196.85).toFixed(1)}ft/min`);
    console.log(`  Change: ΔAlt ${altitudeChange >= 0 ? '+' : ''}${altitudeChange.toFixed(1)}ft, ΔSpeed ${airspeedChange >= 0 ? '+' : ''}${airspeedChange.toFixed(1)}KTS`);
    
    // Check if altitude is increasing (climbing)
    if (Math.abs(altitudeChange) > 0.1) {
      const direction = altitudeChange > 0 ? 'CLIMBING' : 'DESCENDING';
      console.log(`  Status: 🚨 ${direction} (unexpected!)`);
    } else {
      console.log(`  Status: ✅ Stable altitude`);
    }
  }
  
  // Stop if significant change detected
  if (Math.abs(altitudeChange) > 5) {
    console.log(`\n🚨 DETECTED SIGNIFICANT ALTITUDE CHANGE AT STEP ${step}!`);
    break;
  }
}

console.log('\n📊 FINAL STATE:');
const final = physics.getState();
console.log(`  Altitude: ${final.position.altitude_ft.toFixed(1)} ft (Δ ${(final.position.altitude_ft - initial.position.altitude_ft).toFixed(1)} ft)`);
console.log(`  Airspeed: ${final.velocity.airspeed_kts.toFixed(1)} KTS (Δ ${(final.velocity.airspeed_kts - initial.velocity.airspeed_kts).toFixed(1)} KTS)`);
console.log(`  Vertical Speed: ${(final.velocity.w * 196.85).toFixed(1)} ft/min`);
console.log(`  Pitch: ${(final.orientation.theta * 180/Math.PI).toFixed(2)}°`);

console.log('\n🔍 CURRENT FORCES:');
physics.calculateAerodynamicForces();
physics.calculatePropulsionForces(); 
physics.calculateGravitationalForces();
physics.sumForcesAndMoments();

console.log(`  Lift: ${physics.aeroForces.z.toFixed(0)} N ${physics.aeroForces.z > 0 ? '(UP)' : '(DOWN)'}`);
console.log(`  Weight: ${(physics.aircraft.mass * physics.GRAVITY).toFixed(0)} N`);
console.log(`  Net vertical: ${physics.forces.z.toFixed(0)} N ${physics.forces.z > 0 ? '(UP)' : '(DOWN)'}`);

console.log('\n' + '='.repeat(60));