// Test script to verify AoA display functionality
import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

// Create a physics service instance
const physics = new NewFlightPhysicsService();

// Set up test configuration
physics.setTestConfiguration(10000, 250);

// Set up upward velocity to create negative AoA
physics.state.velocity.w = 10; // 10 m/s upward
physics.state.velocity.u = 128.6; // Forward velocity

// Simulate a physics update
const input = { pitch: 0.05, roll: 0, yaw: 0, throttle: 0.9 };
physics.update(input, 0.1);

// Check the debug data
const debug = physics.debugData;

console.log("🔍 AoA DISPLAY VERIFICATION:");
console.log("============================");
console.log(`Angle of Attack: ${debug.angleOfAttack?.toFixed(1)}°`);
console.log(`Flight Path Angle: ${debug.flightPathAngle?.toFixed(1)}°`);
console.log(`Pitch Angle: ${debug.pitchAngle?.toFixed(1)}°`);
console.log(`\n📊 VERIFICATION CALCULATION:`);
console.log(`AoA = Pitch - Flight Path = ${debug.pitchAngle?.toFixed(1)}° - ${debug.flightPathAngle?.toFixed(1)}° = ${(debug.pitchAngle - debug.flightPathAngle).toFixed(1)}°`);
console.log(`Expected: ${debug.angleOfAttack?.toFixed(1)}°`);
console.log(`\n✅ AoA display data is ${debug.angleOfAttack !== undefined ? 'AVAILABLE' : 'MISSING'}`);

if (debug.angleOfAttack !== undefined) {
  console.log(`🎯 AoA Value: ${debug.angleOfAttack.toFixed(1)}°`);
  console.log(`📈 AoA Type: ${debug.angleOfAttack > 0 ? 'POSITIVE' : debug.angleOfAttack < 0 ? 'NEGATIVE' : 'ZERO'}`);
  console.log(`🚀 Ready for display in FlightPhysicsDashboard!`);
} else {
  console.log("❌ AoA data not available - check debug data structure");
}