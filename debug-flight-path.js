// Debug script to check flight path angle and AoA
import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

// Create a physics service instance
const physics = new NewFlightPhysicsService();

// Set up test configuration
physics.setTestConfiguration(10000, 250);

// Set up upward velocity
physics.state.velocity.w = 10; // 10 m/s upward
physics.state.velocity.u = 128.6; // Forward velocity

// Calculate flight path angle and AoA
const flightPathAngle = Math.atan2(physics.state.velocity.w, physics.state.velocity.u);
const alpha = physics.state.orientation.theta - flightPathAngle;

console.log("🔍 FLIGHT PATH AND AOA ANALYSIS:");
console.log("================================");
console.log(`Forward velocity (u): ${physics.state.velocity.u} m/s`);
console.log(`Vertical velocity (w): ${physics.state.velocity.w} m/s`);
console.log(`Pitch angle (θ): ${(physics.state.orientation.theta * 180/Math.PI).toFixed(2)}°`);
console.log(`Flight path angle (γ): ${(flightPathAngle * 180/Math.PI).toFixed(2)}°`);
console.log(`Angle of attack (α): ${(alpha * 180/Math.PI).toFixed(2)}°`);
console.log(`sin(γ): ${Math.sin(flightPathAngle).toFixed(4)}`);
console.log(`sin(α): ${Math.sin(alpha).toFixed(4)}`);

// Calculate what the drag moment should be
const wingChord = physics.aircraft.wingArea / physics.aircraft.wingSpan;
const dragMomentArm = wingChord * (0.40 - 0.35); // Drag center at 40%, CG at 35%

console.log(`\n📊 MOMENT ARM CALCULATION:`);
console.log(`Wing chord: ${wingChord.toFixed(2)} m`);
console.log(`Drag moment arm: ${dragMomentArm.toFixed(3)} m`);

// Simulate a physics update to get actual drag force
const input = { pitch: 0.05, roll: 0, yaw: 0, throttle: 0.9 };
physics.update(input, 0.1);

const debug = physics.debugData;
console.log(`\n📈 ACTUAL PHYSICS DATA:`);
console.log(`Drag force: ${debug.drag?.toFixed(0) || 0} N`);
console.log(`Drag-induced pitching: ${debug.dragPitchingMoment?.toFixed(1) || 0} N⋅m`);
console.log(`Lift-induced pitching: ${debug.liftPitchingMoment?.toFixed(1) || 0} N⋅m`);

// Calculate expected drag moment
const expectedDragMoment = debug.drag * dragMomentArm * Math.sin(flightPathAngle);
console.log(`Expected drag moment: ${expectedDragMoment.toFixed(1)} N⋅m`);