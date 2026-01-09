#!/usr/bin/env node

import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

console.log('🌀 DRAG TORQUE TEST - Enhanced Physics');
console.log('=====================================\n');

const physics = new NewFlightPhysicsService();

// Set up test scenario: Aircraft with lift > weight (upward acceleration)
console.log('🎯 TEST SCENARIO: Upward acceleration with lift > weight');
console.log('Expected: Significant drag-induced pitching moment\n');

// Initialize physics with test conditions
physics.state.velocity.u = 200; // 200 m/s forward
physics.state.velocity.w = 5;   // 5 m/s upward (climbing)
physics.state.orientation.theta = 0.05; // 5 degrees pitch up
physics.state.controls.pitch = 0; // No elevator input

console.log('📊 INITIAL CONDITIONS:');
console.log(`   Forward velocity: ${physics.state.velocity.u} m/s`);
console.log(`   Vertical velocity: ${physics.state.velocity.w} m/s`);
console.log(`   Pitch angle: ${(physics.state.orientation.theta * 180/Math.PI).toFixed(1)}°`);
console.log(`   Altitude: ${(physics.state.position.z / 0.3048).toFixed(0)} ft`);

// Calculate aerodynamic forces
const forces = physics.calculateAerodynamicForces();

console.log('\n🌀 ENHANCED DRAG TORQUE ANALYSIS:');
const debug = forces.debug;
console.log(`   Raw Lift: ${debug.lift.toFixed(0)} N`);
console.log(`   Raw Drag: ${debug.drag.toFixed(0)} N`);
console.log(`   Total Pitching Moment: ${debug.totalPitchingMoment.toFixed(1)} N⋅m`);
console.log(`   Drag-induced Pitching: ${debug.dragPitchingMoment.toFixed(1)} N⋅m`);
console.log(`   Lift-induced Pitching: ${debug.liftPitchingMoment.toFixed(1)} N⋅m`);
console.log(`   Wing Chord: ${debug.wingChord.toFixed(2)} m`);
console.log(`   Moment Arm: ${debug.momentArm.toFixed(2)} m`);
console.log(`   Elevator Trim: ${debug.elevatorTrim.toFixed(3)}`);

// Test with different angles of attack
console.log('\n🔄 TESTING DIFFERENT ANGLE OF ATTACK SCENARIOS:');

const testAngles = [
  { alpha: 0.02, desc: "Light climb (2° AoA)" },
  { alpha: 0.05, desc: "Moderate climb (5° AoA)" },
  { alpha: 0.10, desc: "Steep climb (10° AoA)" }
];

testAngles.forEach(test => {
  // Set test conditions
  physics.state.velocity.u = 200;
  physics.state.velocity.w = 200 * Math.tan(test.alpha);
  physics.state.orientation.theta = test.alpha;
  
  const result = physics.calculateAerodynamicForces();
  const debug = result.debug;
  
  console.log(`\n📈 ${test.desc}:`);
  console.log(`   AoA: ${(test.alpha * 180/Math.PI).toFixed(1)}°`);
  console.log(`   Vertical velocity: ${physics.state.velocity.w.toFixed(1)} m/s`);
  console.log(`   Drag torque: ${debug.dragPitchingMoment.toFixed(1)} N⋅m`);
  console.log(`   Total pitching moment: ${debug.totalPitchingMoment.toFixed(1)} N⋅m`);
  console.log(`   Expected pitch rate: ${(debug.totalPitchingMoment / 15000).toFixed(4)} rad/s²`);
});

// Test force balance
console.log('\n⚖️ FORCE BALANCE CHECK:');
const weight = physics.aircraft.mass * physics.GRAVITY;
const lift = debug.lift;
const gravityZ = debug.gravity_z;
const netVertical = debug.total_z;

console.log(`   Weight: ${weight.toFixed(0)} N`);
console.log(`   Lift: ${lift.toFixed(0)} N`);
console.log(`   Gravity (Z): ${gravityZ.toFixed(0)} N`);
console.log(`   Net Vertical Force: ${netVertical.toFixed(0)} N`);
console.log(`   Vertical Acceleration: ${(netVertical / physics.aircraft.mass).toFixed(2)} m/s²`);

if (netVertical > weight * 0.1) {
  console.log('   🚨 EXCESSIVE UPWARD FORCE - Aircraft accelerating up');
  console.log('   💡 EXPECTED: Significant drag-induced nose-up pitching moment');
}

console.log('\n' + '='.repeat(60));