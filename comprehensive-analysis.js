#!/usr/bin/env node

import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

console.log('🧪 COMPREHENSIVE COORDINATE SYSTEM ANALYSIS');
console.log('===========================================\n');

const physics = new NewFlightPhysicsService();

const input = { 
  pitch: 3 * Math.PI/180, 
  throttle: 0.47, 
  roll: 0, 
  yaw: 0 
};

console.log('📊 STEP 1: INITIAL STATE ANALYSIS');
console.log('================================');

// Run one update to get initial forces
physics.update(input);

console.log('Initial Aircraft State:');
const state = physics.getState();
console.log(`  Position: x=${state.position.x.toFixed(2)}, y=${state.position.y.toFixed(2)}, z=${state.position.z.toFixed(2)} (Z-up)`);
console.log(`  Velocity: u=${state.velocity.u.toFixed(2)}, v=${state.velocity.v.toFixed(2)}, w=${state.velocity.w.toFixed(2)} (body frame)`);
console.log(`  Orientation: pitch=${(state.orientation.theta * 180/Math.PI).toFixed(2)}°, roll=${(state.orientation.phi * 180/Math.PI).toFixed(2)}°`);
console.log(`  Airspeed: ${state.velocity.airspeed_kts.toFixed(1)} KTS`);
console.log(`  Altitude: ${state.position.altitude_ft.toFixed(0)} ft`);

console.log('\n📊 STEP 2: FORCE BREAKDOWN ANALYSIS');
console.log('=====================================');

console.log('Aerodynamic Forces (from calculation):');
const aeroResult = physics.calculateAerodynamicForces(input);
console.log(`  X (forward drag): ${aeroResult.forces.x.toFixed(0)} N`);
console.log(`  Y (side force): ${aeroResult.forces.y.toFixed(0)} N`);
console.log(`  Z (lift): ${aeroResult.forces.z.toFixed(0)} N`);
console.log(`  Class aeroForces: ${physics.aeroForces.x.toFixed(0)}, ${physics.aeroForces.y.toFixed(0)}, ${physics.aeroForces.z.toFixed(0)}`);

console.log('\nPropulsion Forces:');
physics.calculatePropulsionForces();
console.log(`  X (thrust): ${physics.thrustForces.x.toFixed(0)} N`);
console.log(`  Y: ${physics.thrustForces.y.toFixed(0)} N`);
console.log(`  Z: ${physics.thrustForces.z.toFixed(0)} N`);

console.log('\nGravity Forces:');
physics.calculateGravitationalForces();
console.log(`  X: ${physics.gravityForces.x.toFixed(0)} N`);
console.log(`  Y: ${physics.gravityForces.y.toFixed(0)} N`);
console.log(`  Z: ${physics.gravityForces.z.toFixed(0)} N`);

console.log('\nTotal Forces (after summation):');
physics.sumForcesAndMoments();
console.log(`  X: ${physics.forces.x.toFixed(0)} N`);
console.log(`  Y: ${physics.forces.y.toFixed(0)} N`);
console.log(`  Z: ${physics.forces.z.toFixed(0)} N`);

console.log('\n📊 STEP 3: PHYSICS VALIDATION');
console.log('==============================');

const weight = physics.aircraft.mass * physics.GRAVITY;
console.log(`Aircraft Weight: ${weight.toFixed(0)} N (downward)`);
console.log(`Lift Force: ${physics.aeroForces.z.toFixed(0)} N (upward)`);
console.log(`Net Vertical: ${physics.forces.z.toFixed(0)} N ${physics.forces.z > 0 ? '(UPWARD)' : '(DOWNWARD)'}`);

if (Math.abs(physics.forces.z) < weight * 0.1) {
  console.log('✅ APPROXIMATE BALANCE: Forces are reasonably balanced');
} else {
  console.log('❌ FORCE IMBALANCE: Significant net vertical force detected');
}

console.log('\n📊 STEP 4: AERODYNAMIC VALIDATION');
console.log('===================================');

console.log('Debug Information:');
console.log(`  Angle of Attack: ${(aeroResult.debug.alpha * 180/Math.PI).toFixed(2)}°`);
console.log(`  Lift Coefficient: ${aeroResult.debug.cl.toFixed(3)}`);
console.log(`  Drag Coefficient: ${aeroResult.debug.drag.toFixed(3)}`);
console.log(`  Dynamic Pressure: ${aeroResult.debug.dynamicPressure.toFixed(0)} Pa`);
console.log(`  Raw Lift (q*CL): ${aeroResult.debug.lift.toFixed(0)} N`);

console.log('\n📊 STEP 5: COORDINATE SYSTEM CHECK');
console.log('====================================');

console.log('Body Frame Convention:');
console.log('  X-axis: Forward (+) / Backward (-)');
console.log('  Y-axis: Right (+) / Left (-)');
console.log('  Z-axis: Upward (+) / Downward (-)');
console.log('\nApplied Forces in Body Frame:');
console.log(`  Thrust: [${physics.thrustForces.x.toFixed(0)}, ${physics.thrustForces.y.toFixed(0)}, ${physics.thrustForces.z.toFixed(0)}]`);
console.log(`  Aerodynamic: [${physics.aeroForces.x.toFixed(0)}, ${physics.aeroForces.y.toFixed(0)}, ${physics.aeroForces.z.toFixed(0)}]`);
console.log(`  Gravity: [${physics.gravityForces.x.toFixed(0)}, ${physics.gravityForces.y.toFixed(0)}, ${physics.gravityForces.z.toFixed(0)}]`);
console.log(`  Total: [${physics.forces.x.toFixed(0)}, ${physics.forces.y.toFixed(0)}, ${physics.forces.z.toFixed(0)}]`);

console.log('\n📊 STEP 6: EXPECTED vs ACTUAL');
console.log('===============================');

const expectedLift = weight; // For level flight, lift should equal weight
const actualLift = physics.aeroForces.z;
const liftError = Math.abs(expectedLift - actualLift) / expectedLift;

console.log(`Expected Lift (for level flight): ${expectedLift.toFixed(0)} N`);
console.log(`Actual Lift: ${actualLift.toFixed(0)} N`);
console.log(`Error: ${(liftError * 100).toFixed(1)}%`);

if (liftError < 0.05) {
  console.log('✅ EXCELLENT: Lift is very close to weight');
} else if (liftError < 0.1) {
  console.log('✅ GOOD: Lift is reasonably close to weight');
} else {
  console.log('❌ POOR: Significant lift imbalance detected');
}

console.log('\n' + '='.repeat(60));
