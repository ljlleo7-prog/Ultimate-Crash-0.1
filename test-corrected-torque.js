// Test script for corrected torque calculations
import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

// Create a proper aircraft configuration
const aircraftConfig = {
  // Physical properties
  wingArea: 125,           // m²
  wingSpan: 35.8,          // m
  maxLiftCoefficient: 1.4, // CLmax
  
  // Mass properties
  emptyWeight: 50000,      // kg
  fuelWeight: 20000,       // kg
  payloadWeight: 10000,    // kg
  
  // Engine properties
  engineCount: 2,
  maxThrustPerEngine: 85000, // N per engine
  
  // Aerodynamic coefficients
  liftCurveSlope: 5.7,       // per radian
  zeroLiftDragCoefficient: 0.025, // CD0
  inducedDragFactor: 0.04,   // k factor
  
  // Control system
  controlPower: { x: 0.01, y: 0.01, z: 0.01 },
  
  // Moment of inertia (kg⋅m²)
  momentOfInertiaRoll: 30000,
  momentOfInertiaPitch: 50000,
  momentOfInertiaYaw: 80000
};

// Create a physics service instance with proper configuration
const physics = new NewFlightPhysicsService(aircraftConfig);

// Set up test configuration for upward acceleration scenario
physics.setTestConfiguration(35000, 450); // 35,000 ft, 450 KTS

// Set up initial conditions
const input = {
  pitch: 0, // Neutral pitch input
  roll: 0,
  yaw: 0,
  throttle: 0.8
};

// Simulate a case where lift > weight (upward acceleration)
// This should create nose-up pitching due to drag
console.log("🧪 TESTING CORRECTED TORQUE CALCULATIONS");
console.log("==========================================");

// Simulate multiple time steps to see pitch evolution
for (let i = 0; i < 10; i++) {
  // Update physics
  physics.update(input, 0.1); // 0.1 second time step
  
  // Get debug data
  const debug = physics.debugData;
  
  console.log(`\n⏱️ Time Step ${i + 1}:`);
  console.log(`   Lift: ${debug.lift?.toFixed(0) || 0} N`);
  console.log(`   Drag: ${debug.drag?.toFixed(0) || 0} N`);
  console.log(`   Lift Pitching Moment: ${debug.liftPitchingMoment?.toFixed(1) || 0} N⋅m`);
  console.log(`   Drag Pitching Moment: ${debug.dragPitchingMoment?.toFixed(1) || 0} N⋅m`);
  console.log(`   Total Pitching Moment: ${debug.totalPitchingMoment?.toFixed(1) || 0} N⋅m`);
  console.log(`   Elevator Trim: ${debug.elevatorTrim?.toFixed(4) || 0}`);
  
  // Get aircraft state to check pitch
  const state = physics.getAircraftState();
  console.log(`   Pitch Rate: ${state.pitchRate?.toFixed(4) || 0} rad/s`);
  console.log(`   Pitch Angle: ${state.pitch?.toFixed(4) || 0} rad`);
  
  // Check if we're getting the expected nose-up pitch
  if (debug.totalPitchingMoment > 0) {
    console.log(`   ✅ EXPECTED: Nose-up pitching moment detected!`);
  } else if (debug.totalPitchingMoment < 0) {
    console.log(`   ❌ UNEXPECTED: Nose-down pitching moment`);
  }
}

console.log("\n📊 FINAL ANALYSIS:");
const finalDebug = physics.debugData;
console.log(`   Wing Chord: ${finalDebug.wingChord?.toFixed(2) || 0} m`);
console.log(`   Moment Arm: ${finalDebug.momentArm?.toFixed(2) || 0} m`);
console.log(`   Force Imbalance: ${Math.abs(finalDebug.netVertical || 0) / (physics.aircraft.mass * 9.81) * 100}%`);