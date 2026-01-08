#!/usr/bin/env node

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';

console.log('🔍 COMPLETE FORCE BALANCE ANALYSIS');
console.log('===================================\n');

const physics = new NewFlightPhysicsService();

// Manually trigger force calculations to get current values
physics.calculateAerodynamicForces();
physics.calculatePropulsionForces();
physics.calculateGravitationalForces();

console.log('📊 FLIGHT CONDITIONS:');
console.log(`  Altitude: ${(-physics.state.position.z).toFixed(0)} ft`);
console.log(`  Airspeed: ${physics.getAirspeed().kts.toFixed(1)} KTS`);
console.log(`  Pitch: ${(physics.state.orientation.theta * 180/Math.PI).toFixed(2)}°`);
console.log(`  Throttle: ${(physics.state.controls.throttle * 100).toFixed(1)}%`);
console.log(`  Density: ${physics.environment.density.toFixed(4)} kg/m³`);

console.log('\n🧮 AERODYNAMIC FORCES:');
console.log(`  Fx_aero (drag): ${physics.aeroForces.x.toFixed(1)} N`);
console.log(`  Fy_aero (side): ${physics.aeroForces.y.toFixed(1)} N`);
console.log(`  Fz_aero (lift): ${physics.aeroForces.z.toFixed(1)} N`);

console.log('\n🚀 PROPULSION FORCES:');
console.log(`  Fx_thrust: ${physics.thrustForces.x.toFixed(1)} N`);
console.log(`  Fy_thrust: ${physics.thrustForces.y.toFixed(1)} N`);
console.log(`  Fz_thrust: ${physics.thrustForces.z.toFixed(1)} N`);

console.log('\n🌍 GRAVITATIONAL FORCES:');
console.log(`  Fx_gravity: ${physics.gravityForces.x.toFixed(1)} N`);
console.log(`  Fy_gravity: ${physics.gravityForces.y.toFixed(1)} N`);
console.log(`  Fz_gravity: ${physics.gravityForces.z.toFixed(1)} N`);

console.log('\n⚖️ TOTAL FORCE BALANCE:');
const totalFx = (physics.aeroForces?.x || 0) + (physics.thrustForces?.x || 0) + (physics.gravityForces?.x || 0);
const totalFy = (physics.aeroForces?.y || 0) + (physics.thrustForces?.y || 0) + (physics.gravityForces?.y || 0);
const totalFz = (physics.aeroForces?.z || 0) + (physics.thrustForces?.z || 0) + (physics.gravityForces?.z || 0);

console.log(`  Total Fx: ${totalFx.toFixed(1)} N ${totalFx > 1000 ? '(ACCELERATING)' : '(STABLE)'}`);
console.log(`  Total Fy: ${totalFy.toFixed(1)} N`);
console.log(`  Total Fz: ${totalFz.toFixed(1)} N ${totalFz > 0 ? '(CLIMBING)' : '(DESCENDING)'}`);

console.log('\n🎯 WEIGHT & BALANCE:');
const weight = physics.aircraft.mass * physics.GRAVITY;
console.log(`  Aircraft Weight: ${weight.toFixed(1)} N`);
console.log(`  Upward Forces: ${(physics.aeroForces.z + physics.thrustForces.z + physics.gravityForces.z).toFixed(1)} N`);
console.log(`  Net Vertical: ${totalFz.toFixed(1)} N ${totalFz > 0 ? '(UPWARD)' : '(DOWNWARD)'}`);

console.log('\n📈 ANALYSIS:');
if (Math.abs(totalFz) > 500) {
  console.log(`  ⚠️  VERTICAL FORCE IMBALANCE: ${Math.abs(totalFz).toFixed(1)} N`);
  if (totalFz > 0) {
    console.log(`  📈 Aircraft will CLIMB (excess upward force)`);
    console.log(`  💡 SOLUTION: Reduce lift coefficient or increase weight`);
  } else {
    console.log(`  📉 Aircraft will DESCEND (insufficient lift)`);
    console.log(`  💡 SOLUTION: Increase lift coefficient or reduce weight`);
  }
} else {
  console.log(`  ✅ VERTICAL FORCES BALANCED`);
}

if (totalFx > 1000) {
  console.log(`  ⚠️  FORWARD FORCE IMBALANCE: ${totalFx.toFixed(1)} N`);
  console.log(`  🚀 Aircraft will ACCELERATE`);
  console.log(`  💡 SOLUTION: Increase drag or reduce thrust`);
} else if (totalFx < -1000) {
  console.log(`  ⚠️  FORWARD FORCE IMBALANCE: ${totalFx.toFixed(1)} N`);
  console.log(`  🛑 Aircraft will DECELERATE`);
  console.log(`  💡 SOLUTION: Reduce drag or increase thrust`);
} else {
  console.log(`  ✅ FORWARD FORCES BALANCED`);
}

console.log('\n' + '='.repeat(60));