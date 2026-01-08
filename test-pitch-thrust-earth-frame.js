import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

// Test thrust transformation from aircraft to Earth frame
console.log('🛫 THRUST & PITCH TEST - EARTH FRAME ANALYSIS');
console.log('==============================================');

// Initialize physics
const physics = new NewFlightPhysicsService();

// Set up initial state
physics.state.position = { x: 0, y: 0, z: -10668 }; // 35,000 ft
physics.state.velocity = { u: 240, v: 0, w: 0 }; // ~466 KTS
physics.state.orientation = { phi: 0, theta: 0, psi: 0 };
physics.state.controls = { throttle: 0.47, pitch: 0, roll: 0, yaw: 0 };

console.log('\n📊 SCENARIO 1: LEVEL FLIGHT (θ = 0°)');
console.log('=====================================');
physics.state.orientation.theta = 0; // Level flight
const result1 = physics.update({ throttle: 0.47, pitch: 0, roll: 0, yaw: 0 });

const theta1 = result1.orientation.theta;
const thrust1 = physics.thrustForces;

// Transform thrust to Earth frame: Earth components = Aircraft * cos(theta) + Z * sin(theta)
const thrustX_earth1 = thrust1.x * Math.cos(theta1);
const thrustZ_earth1 = thrust1.x * Math.sin(theta1);

console.log(`  Pitch (θ): ${(theta1 * 180/Math.PI).toFixed(1)}°`);
console.log(`  Thrust (aircraft): X=${thrust1.x.toFixed(0)} N, Z=${thrust1.z.toFixed(0)} N`);
console.log(`  Thrust (Earth frame): X=${thrustX_earth1.toFixed(0)} N, Z=${thrustZ_earth1.toFixed(0)} N`);

console.log('\n📊 SCENARIO 2: POSITIVE PITCH (θ = +5°)');
console.log('=====================================');
physics.state.orientation.theta = 5 * Math.PI / 180; // 5° nose up
const result2 = physics.update({ throttle: 0.47, pitch: 0, roll: 0, yaw: 0 });

const theta2 = result2.orientation.theta;
const thrust2 = physics.thrustForces;

// Transform thrust to Earth frame
const thrustX_earth2 = thrust2.x * Math.cos(theta2);
const thrustZ_earth2 = thrust2.x * Math.sin(theta2);

console.log(`  Pitch (θ): ${(theta2 * 180/Math.PI).toFixed(1)}°`);
console.log(`  Thrust (aircraft): X=${thrust2.x.toFixed(0)} N, Z=${thrust2.z.toFixed(0)} N`);
console.log(`  Thrust (Earth frame): X=${thrustX_earth2.toFixed(0)} N, Z=${thrustZ_earth2.toFixed(0)} N`);

console.log('\n📊 SCENARIO 3: HIGH PITCH (θ = +15°)');
console.log('=====================================');
physics.state.orientation.theta = 15 * Math.PI / 180; // 15° nose up
const result3 = physics.update({ throttle: 0.47, pitch: 0, roll: 0, yaw: 0 });

const theta3 = result3.orientation.theta;
const thrust3 = physics.thrustForces;

// Transform thrust to Earth frame
const thrustX_earth3 = thrust3.x * Math.cos(theta3);
const thrustZ_earth3 = thrust3.x * Math.sin(theta3);

console.log(`  Pitch (θ): ${(theta3 * 180/Math.PI).toFixed(1)}°`);
console.log(`  Thrust (aircraft): X=${thrust3.x.toFixed(0)} N, Z=${thrust3.z.toFixed(0)} N`);
console.log(`  Thrust (Earth frame): X=${thrustX_earth3.toFixed(0)} N, Z=${thrustZ_earth3.toFixed(0)} N`);

console.log('\n🔍 ANALYSIS:');
console.log('===========');
console.log('✅ Yes! When aircraft has positive pitch:');
console.log(`  • θ = 0°: Thrust upward = ${thrustZ_earth1.toFixed(0)} N (Earth frame)`);
console.log(`  • θ = 5°: Thrust upward = ${thrustZ_earth2.toFixed(0)} N (Earth frame)`);
console.log(`  • θ = 15°: Thrust upward = ${thrustZ_earth3.toFixed(0)} N (Earth frame)`);
console.log('');
console.log('💡 The upward thrust component in Earth frame = Total Thrust × sin(θ)');
console.log('💡 This is why high-pitch climb produces strong upward acceleration!');

console.log('\n🎯 CRITICAL INSIGHT:');
console.log('===================');
console.log('For stable cruise, you want slight positive pitch so thrust contributes');
console.log('to upward force, balancing the aerodynamic lift requirements!');