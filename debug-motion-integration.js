#!/usr/bin/env node

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';

console.log('🔍 MOTION INTEGRATION DEBUG');
console.log('============================\n');

const physics = new NewFlightPhysicsService();

// Calculate forces
physics.calculateAerodynamicForces();
physics.calculatePropulsionForces();
physics.calculateGravitationalForces();
physics.sumForcesAndMoments();

console.log('📊 INITIAL STATE:');
console.log(`  Position.z: ${physics.state.position.z.toFixed(3)} m (${(-physics.state.position.z * 3.28084).toFixed(1)} ft)`);
console.log(`  Velocity.w: ${physics.state.velocity.w.toFixed(6)} m/s`);

console.log('\n🧮 FORCES:');
console.log(`  Fx_total: ${physics.forces.x.toFixed(1)} N`);
console.log(`  Fy_total: ${physics.forces.y.toFixed(1)} N`);
console.log(`  Fz_total: ${physics.forces.z.toFixed(1)} N`);

console.log('\n⚖️ ACCELERATIONS:');
const ax = physics.forces.x / physics.aircraft.mass;
const ay = physics.forces.y / physics.aircraft.mass;
const az = physics.forces.z / physics.aircraft.mass;
console.log(`  ax: ${ax.toFixed(6)} m/s²`);
console.log(`  ay: ${ay.toFixed(6)} m/s²`);
console.log(`  az: ${az.toFixed(6)} m/s²`);

console.log('\n🔄 VELOCITY UPDATE:');
const dt = physics.dt;
const newW = physics.state.velocity.w + az * dt;
console.log(`  w_new = w_old + az * dt`);
console.log(`  w_new = ${physics.state.velocity.w.toFixed(6)} + ${az.toFixed(6)} × ${dt}`);
console.log(`  w_new = ${newW.toFixed(6)} m/s`);

console.log('\n📍 POSITION UPDATE:');
// Same transformation as in updatePosition()
const phi = physics.state.orientation.phi;
const theta = physics.state.orientation.theta;
const u = physics.state.velocity.u;
const v = physics.state.velocity.v;
const w = newW; // Use updated w

console.log(`  phi: ${(phi * 180/Math.PI).toFixed(2)}°`);
console.log(`  theta: ${(theta * 180/Math.PI).toFixed(2)}°`);
console.log(`  u: ${u.toFixed(6)} m/s`);
console.log(`  v: ${v.toFixed(6)} m/s`);
console.log(`  w: ${w.toFixed(6)} m/s`);

const zDot = -u * Math.sin(theta) + v * Math.sin(phi) * Math.cos(theta) + w * Math.cos(phi) * Math.cos(theta);
console.log(`  zDot = -u*sin(θ) + v*sin(φ)*cos(θ) + w*cos(φ)*cos(θ)`);
console.log(`  zDot = -${u.toFixed(6)}×${Math.sin(theta).toFixed(6)} + ${v.toFixed(6)}×${Math.sin(phi).toFixed(6)}×${Math.cos(theta).toFixed(6)} + ${w.toFixed(6)}×${Math.cos(phi).toFixed(6)}×${Math.cos(theta).toFixed(6)}`);
console.log(`  zDot = ${zDot.toFixed(6)} m/s`);

const newPositionZ = physics.state.position.z + zDot * dt;
console.log(`  z_new = z_old + zDot * dt`);
console.log(`  z_new = ${physics.state.position.z.toFixed(6)} + ${zDot.toFixed(6)} × ${dt}`);
console.log(`  z_new = ${newPositionZ.toFixed(6)} m`);

console.log('\n🎯 EXPECTED BEHAVIOR:');
console.log(`  az = ${az.toFixed(6)} m/s² (${az < 0 ? 'DOWNWARD' : 'UPWARD'} acceleration)`);
console.log(`  w_new = ${newW.toFixed(6)} m/s (${newW > 0 ? 'INCREASING DOWNWARD' : 'DECREASING DOWNWARD'} velocity)`);
console.log(`  zDot = ${zDot.toFixed(6)} m/s (${zDot < 0 ? 'DESCENDING' : 'CLIMBING'} rate)`);

console.log('\n🐛 ANALYSIS:');
if (zDot > 0) {
  console.log(`  🚨 BUG FOUND: Forces say DESCEND (az < 0) but position says CLIMB (zDot > 0)`);
  console.log(`  💡 ISSUE: Coordinate system mismatch in position update`);
} else if (zDot < 0) {
  console.log(`  ✅ CORRECT: Forces and motion agree - DESCENDING`);
} else {
  console.log(`  ⚠️  NEUTRAL: Forces balanced, minimal motion`);
}

console.log('\n' + '='.repeat(60));