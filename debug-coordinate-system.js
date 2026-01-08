#!/usr/bin/env node

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';

console.log('🔍 COORDINATE SYSTEM BUG ANALYSIS');
console.log('=================================\n');

const physics = new NewFlightPhysicsService();

// Get initial state
const initial = physics.getFlightState();
console.log('🚀 INITIAL STATE:');
console.log(`  Altitude: ${initial.altitude.toFixed(1)} ft`);
console.log(`  Position.z: ${physics.state.position.z.toFixed(3)} m`);
console.log(`  Velocity.w: ${physics.state.velocity.w.toFixed(6)} m/s`);

console.log('\n🧮 FORCE ANALYSIS:');
physics.calculateAerodynamicForces();
physics.calculatePropulsionForces();
physics.calculateGravitationalForces();
physics.sumForcesAndMoments();

console.log(`  Lift (upward): ${physics.aeroForces.z.toFixed(1)} N`);
console.log(`  Weight (downward): ${(physics.aircraft.mass * physics.GRAVITY).toFixed(1)} N`);
console.log(`  Net Fz: ${physics.forces.z.toFixed(1)} N ${physics.forces.z > 0 ? '(UP)' : '(DOWN)'}`);

console.log('\n🎯 EXPECTED BEHAVIOR:');
const weight = physics.aircraft.mass * physics.GRAVITY;
const expectedAz = physics.forces.z / physics.aircraft.mass;
console.log(`  Expected acceleration: ${expectedAz.toFixed(6)} m/s² ${expectedAz < 0 ? '(DOWN)' : '(UP)'}`);

console.log('\n🔄 VELOCITY UPDATE ANALYSIS:');
const dt = 0.1;
const newW = physics.state.velocity.w + expectedAz * dt;
console.log(`  w_new = w_old + az * dt`);
console.log(`  w_new = ${physics.state.velocity.w.toFixed(6)} + ${expectedAz.toFixed(6)} × ${dt}`);
console.log(`  w_new = ${newW.toFixed(6)} m/s`);
console.log(`  Direction: ${newW > 0 ? 'INCREASING DOWNWARD' : 'DECREASING DOWNWARD'}`);

console.log('\n📍 POSITION UPDATE ANALYSIS:');
const phi = physics.state.orientation.phi;
const theta = physics.state.orientation.theta;
const u = physics.state.velocity.u;
const v = physics.state.velocity.v;
const w = newW; // Updated velocity

console.log(`  Euler angles: φ=${(phi*180/Math.PI).toFixed(2)}°, θ=${(theta*180/Math.PI).toFixed(2)}°`);
console.log(`  Body velocities: u=${u.toFixed(3)} m/s, v=${v.toFixed(3)} m/s, w=${w.toFixed(6)} m/s`);

const zDot = -u * Math.sin(theta) + v * Math.sin(phi) * Math.cos(theta) + w * Math.cos(phi) * Math.cos(theta);
console.log(`\n  Earth frame velocity (zDot):`);
console.log(`  zDot = -u×sin(θ) + v×sin(φ)×cos(θ) + w×cos(φ)×cos(θ)`);
console.log(`  zDot = -${u.toFixed(3)}×${Math.sin(theta).toFixed(6)} + ${v.toFixed(3)}×${Math.sin(phi).toFixed(6)}×${Math.cos(theta).toFixed(6)} + ${w.toFixed(6)}×${Math.cos(phi).toFixed(6)}×${Math.cos(theta).toFixed(6)}`);
console.log(`  zDot = ${zDot.toFixed(6)} m/s`);
console.log(`  Interpretation: ${zDot < 0 ? 'DESCENDING (altitude decreasing)' : 'CLIMBING (altitude increasing)'}`);

const newPositionZ = physics.state.position.z + zDot * dt;
const altitudeChange = (physics.state.position.z - newPositionZ) * 3.28084; // Convert to feet
console.log(`\n  Position update:`);
console.log(`  z_new = z_old + zDot × dt`);
console.log(`  z_new = ${physics.state.position.z.toFixed(6)} + ${zDot.toFixed(6)} × ${dt}`);
console.log(`  z_new = ${newPositionZ.toFixed(6)} m`);
console.log(`  Altitude change: ${altitudeChange >= 0 ? '+' : ''}${altitudeChange.toFixed(1)} ft ${altitudeChange > 0 ? '(CLIMBING)' : '(DESCENDING)'}`);

console.log('\n🐛 BUG ANALYSIS:');
console.log(`  Expected from forces: ${expectedAz < 0 ? 'DESCENDING' : 'CLIMBING'}`);
console.log(`  Actual from motion: ${zDot < 0 ? 'DESCENDING' : 'CLIMBING'}`);

if ((expectedAz < 0 && zDot < 0) || (expectedAz > 0 && zDot > 0)) {
  console.log(`  ✅ Forces and motion agree`);
} else {
  console.log(`  🚨 COORDINATE SYSTEM MISMATCH!`);
  console.log(`     Forces say ${expectedAz < 0 ? 'DESCEND' : 'CLIMB'} but position says ${zDot < 0 ? 'DESCEND' : 'CLIMB'}`);
  
  // Check if it's a sign issue
  if (expectedAz < 0 && zDot > 0) {
    console.log(`     💡 POSSIBLE FIX: Invert sign of Fz in force summation`);
  }
}

console.log('\n💡 INVESTIGATION:');
console.log(`  1. Check if forces are in body frame but being applied to earth frame`);
console.log(`  2. Check if coordinate system conventions are mixed up`);
console.log(`  3. Check if gravity transformation is correct`);

console.log('\n' + '='.repeat(60));