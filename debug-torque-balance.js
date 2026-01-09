// 🔍 DEBUG: Torque Balance Analysis
// Check why aircraft pitches down despite lift > weight

import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

console.log('🔍 DEBUGGING TORQUE BALANCE ISSUE');
console.log('===================================');

// Create service with Boeing 737-800 data
const aircraftData = {
  // Physical properties
  wingArea: 127,        // m²
  wingSpan: 35.8,       // m
  wingChord: 127 / 35.8, // ~3.55m
  maxLiftCoefficient: 1.4, // CLmax
  
  // Mass properties
  emptyWeight: 41400,   // kg
  fuelWeight: 25000,    // kg
  payloadWeight: 12600, // kg
  
  // Engine properties
  engineCount: 2,            // Number of engines
  maxThrustPerEngine: 117000, // N per engine
  
  // Aerodynamic coefficients
  liftCurveSlope: 5.5,        // per radian
  zeroLiftDragCoefficient: 0.02, // CD0
  inducedDragFactor: 0.04,    // k factor
  stallAngle: 16 * Math.PI / 180, // 16 degrees
  
  // Control system parameters
  controlPower: { x: 0.02, y: 0.015, z: 0.01 }, // N⋅m/rad
  trimSurfaceAreaRatio: 0.12, // 12% of wing area
  trimEffectiveness: 0.1,     // 10%
  
  // Trim system
  trimLimits: { min: -0.5, max: 0.5 } // radians
};

const physics = new NewFlightPhysicsService(aircraftData);

// Override state for climbing scenario
physics.state.velocity = { u: 107, v: 0, w: 0 }; // 107 m/s forward (209 KTS)
physics.state.orientation.theta = 0; // Level pitch
physics.state.controls = { pitch: 0, roll: 0, yaw: 0, throttle: 0.6 }; // Manual controls

// Ensure environment gravity is set
physics.environment = physics.environment || {};
physics.environment.gravity = 9.81; // m/s²
physics.environment.density = 0.4; // kg/m³

console.log('\n🧪 SETTING UP CLIMB SCENARIO:');
console.log('Aircraft: Boeing 737-800');
console.log(`Mass: ${physics.aircraft.mass.toLocaleString()} kg`);
console.log(`Velocity: ${physics.state.velocity.u} m/s (209 KTS)`);
console.log(`Throttle: ${(physics.state.controls.throttle * 100).toFixed(0)}%`);
console.log(`Weight: ${(physics.aircraft.mass * physics.environment.gravity / 1000).toFixed(1)} kN`);

// Calculate forces
const result = physics.calculateAerodynamicForces();

console.log('\n⚖️ FORCE BALANCE ANALYSIS:');
console.log(`Lift: ${(result.debug.liftForce / 1000).toFixed(1)} kN`);
console.log(`Weight: ${(physics.aircraft.mass * physics.environment.gravity / 1000).toFixed(1)} kN`);
console.log(`Net Vertical: ${((result.debug.liftForce - physics.aircraft.mass * physics.environment.gravity) / 1000).toFixed(1)} kN`);
console.log(`Lift/Weight Ratio: ${(result.debug.liftForce / (physics.aircraft.mass * physics.environment.gravity)).toFixed(3)}`);

console.log('\n🎯 PITCHING MOMENT ANALYSIS:');
console.log(`Lift-induced pitching: ${result.debug.liftPitchingMoment.toFixed(1)} N⋅m`);
console.log(`Drag-induced pitching: ${result.debug.dragPitchingMoment.toFixed(1)} N⋅m`);
console.log(`Total aerodynamic: ${result.debug.totalPitchingMoment.toFixed(1)} N⋅m`);
console.log(`Elevator trim: ${result.debug.elevatorTrim.toFixed(6)} rad`);
console.log(`Trim moment: ${result.debug.trimMoment.toFixed(1)} N⋅m`);
console.log(`Total with trim: ${result.debug.totalPitchingMomentWithTrim.toFixed(1)} N⋅m`);

console.log('\n🚨 TORQUE BALANCE ANALYSIS:');
const pitchInertia = physics.aircraft.mass * Math.pow(physics.aircraft.wingChord, 2) / 12;
const totalTorque = result.debug.totalPitchingMomentWithTrim;
const pitchAcceleration = totalTorque / pitchInertia;

console.log(`Expected pitch acceleration: ${pitchAcceleration.toFixed(6)} rad/s²`);
console.log(`Expected pitch change per second: ${(pitchAcceleration * 57.3).toFixed(3)} °/s`);

if (Math.abs(totalTorque) < 1000) {
  console.log(`\n✅ BALANCED: Total moment ${totalTorque.toFixed(1)} N⋅m ≈ 0 (stable)`);
} else if (totalTorque < 0) {
  console.log(`\n❌ PITCHING DOWN: Total moment ${totalTorque.toFixed(1)} N⋅m (nose-down)`);
} else {
  console.log(`\n❌ PITCHING UP: Total moment ${totalTorque.toFixed(1)} N⋅m (nose-up)`);
}

console.log('\n🔧 ROOT CAUSE ANALYSIS:');
console.log('1. Lift creates nose-down moment (correct physics)');
console.log('2. Elevator trim should balance this nose-down tendency');
console.log('3. For climb: drag creates nose-up moment to assist trim');

console.log('\n✅ EXPECTED BEHAVIOR:');
console.log('With proper trim balance, aircraft should have near-zero total moment');