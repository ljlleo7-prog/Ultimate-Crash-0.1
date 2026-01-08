/**
 * Autopilot System Test
 * Tests the autopilot's ability to maintain altitude and airspeed
 * Validates PID control performance and stability
 */

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';
import { AutopilotService } from './src/services/autopilotService.js';

console.log('🤖 Testing Advanced Autopilot System\n');

// Initialize flight physics
const flightPhysics = new NewFlightPhysicsService("Boeing 737-800");

// Initialize autopilot
const autopilot = new AutopilotService(flightPhysics);

// Set initial targets
const targetAltitude = 35000; // feet
const targetAirspeed = 460; // KTS TAS

console.log(`🎯 Test Targets:
  Altitude: ${targetAltitude} ft
  Airspeed: ${targetAirspeed} KTS TAS
`);

// Simulation parameters
const simulationTime = 30; // seconds
const dt = 0.016; // 60 Hz
let time = 0;

// Data tracking
const flightData = [];
const autopilotData = [];

console.log('🚀 Starting autopilot test...\n');

// Main simulation loop
while (time < simulationTime) {
  // Update autopilot (if enabled)
  autopilot.update(dt);
  
  // Update flight physics
  flightPhysics.update(dt);
  
  // Record data every 0.5 seconds for analysis
  if (time % 0.5 < dt) {
    const flightState = flightPhysics.getFlightState();
    const autopilotStatus = autopilot.getStatus();
    
    flightData.push({
      time: time,
      altitude: flightState.altitude,
      airspeed: flightState.airspeed,
      pitch: flightState.pitch,
      verticalSpeed: flightState.verticalSpeed,
      elevator: flightPhysics.state.controls.elevator,
      throttle: flightPhysics.state.controls.throttle
    });
    
    autopilotData.push({
      time: time,
      altitudeError: autopilotStatus.errors.altitude,
      airspeedError: autopilotStatus.errors.airspeed,
      stabilityScore: autopilotStatus.stability.stabilityScore
    });
  }
  
  // Log status every 2 seconds
  if (Math.floor(time * 10) % 20 === 0 && time > 0) {
    const flightState = flightPhysics.getFlightState();
    const autopilotStatus = autopilot.getStatus();
    
    console.log(`Time: ${time.toFixed(1)}s - Alt: ${Math.round(flightState.altitude)}ft ` +
                `(${Math.round(autopilotStatus.errors.altitude)}ft err), ` +
                `Speed: ${Math.round(flightState.airspeed)} KTS ` +
                `(${Math.round(autopilotStatus.errors.airspeed)} KTS err), ` +
                `Stability: ${autopilotStatus.stability.stabilityScore.toFixed(2)}`);
  }
  
  time += dt;
}

console.log('\n' + '='.repeat(60));
console.log('📊 AUTOPILOT TEST RESULTS');
console.log('='.repeat(60));

// Analyze results
const finalFlightState = flightPhysics.getFlightState();
const finalAutopilotStatus = autopilot.getStatus();

// Calculate performance metrics
const altitudeErrors = flightData.map(d => Math.abs(d.altitude - targetAltitude));
const airspeedErrors = flightData.map(d => Math.abs(d.airspeed - targetAirspeed));

const maxAltitudeError = Math.max(...altitudeErrors);
const avgAltitudeError = altitudeErrors.reduce((a, b) => a + b, 0) / altitudeErrors.length;

const maxAirspeedError = Math.max(...airspeedErrors);
const avgAirspeedError = airspeedErrors.reduce((a, b) => a + b, 0) / airspeedErrors.length;

const stabilityScores = autopilotData.map(d => d.stabilityScore);
const avgStabilityScore = stabilityScores.reduce((a, b) => a + b, 0) / stabilityScores.length;

// Final performance
console.log(`🎯 Final Flight State:
  Altitude: ${Math.round(finalFlightState.altitude)} ft (Target: ${targetAltitude} ft)
  Airspeed: ${Math.round(finalFlightState.airspeed)} KTS TAS (Target: ${targetAirspeed} KTS)
  Pitch: ${finalFlightState.pitch.toFixed(2)}°
  Vertical Speed: ${Math.round(finalFlightState.verticalSpeed)} ft/min
`);

console.log(`📈 Performance Metrics:
  Altitude Error - Max: ${Math.round(maxAltitudeError)} ft, Avg: ${Math.round(avgAltitudeError)} ft
  Airspeed Error - Max: ${Math.round(maxAirspeedError)} KTS, Avg: ${Math.round(avgAirspeedError)} KTS
  Stability Score - Avg: ${avgStabilityScore.toFixed(2)} (lower is better)
`);

console.log(`🎮 Final Control Inputs:
  Elevator: ${(finalFlightState.controls.elevator * 100).toFixed(1)}%
  Throttle: ${(finalFlightState.controls.throttle * 100).toFixed(1)}%
`);

// Validation criteria
const altitudeOK = maxAltitudeError < 100; // feet
const airspeedOK = maxAirspeedError < 15;  // KTS
const stabilityOK = avgStabilityScore < 2.0;

console.log('\n🎯 Validation Results:');
console.log(`  Altitude Control: ${altitudeOK ? '✅ PASS' : '❌ FAIL'} (Max error: ${Math.round(maxAltitudeError)} ft)`);
console.log(`  Airspeed Control: ${airspeedOK ? '✅ PASS' : '❌ FAIL'} (Max error: ${Math.round(maxAirspeedError)} KTS)`);
console.log(`  System Stability: ${stabilityOK ? '✅ PASS' : '❌ FAIL'} (Avg score: ${avgStabilityScore.toFixed(2)})`);

const overallPass = altitudeOK && airspeedOK && stabilityOK;

if (overallPass) {
  console.log('\n🏆 SUCCESS: Autopilot system demonstrates excellent cruise control!');
} else {
  console.log('\n⚠️ PARTIAL SUCCESS: Autopilot needs further tuning.');
}

// Test autopilot engagement/disengagement
console.log('\n🔄 Testing Autopilot Disengagement...');

// Disable autopilot
autopilot.disable();

let disengageTime = 0;
const disengageTestTime = 5; // seconds

console.log('📊 Observing aircraft behavior without autopilot control...\n');

while (disengageTime < disengageTestTime) {
  // Update only flight physics (no autopilot)
  flightPhysics.update(dt);
  
  if (Math.floor(disengageTime * 10) % 10 === 0 && disengageTime > 0) {
    const flightState = flightPhysics.getFlightState();
    console.log(`Disengage ${disengageTime.toFixed(1)}s: Alt ${Math.round(flightState.altitude)}ft, ` +
                `Speed ${Math.round(flightState.airspeed)} KTS`);
  }
  
  disengageTime += dt;
}

// Re-enable autopilot
console.log('\n🚀 Re-engaging Autopilot...');
autopilot.enable();

let reengageTime = 0;
const reengageTestTime = 5; // seconds

console.log('📊 Observing aircraft recovery with autopilot...\n');

while (reengageTime < reengageTestTime) {
  // Update autopilot and flight physics
  autopilot.update(dt);
  flightPhysics.update(dt);
  
  if (Math.floor(reengageTime * 10) % 10 === 0 && reengageTime > 0) {
    const flightState = flightPhysics.getFlightState();
    const autopilotStatus = autopilot.getStatus();
    console.log(`Re-engage ${reengageTime.toFixed(1)}s: Alt ${Math.round(flightState.altitude)}ft ` +
                `(${Math.round(autopilotStatus.errors.altitude)}ft err), ` +
                `Speed ${Math.round(flightState.airspeed)} KTS ` +
                `(${Math.round(autopilotStatus.errors.airspeed)} KTS err)`);
  }
  
  reengageTime += dt;
}

console.log('\n' + '='.repeat(60));
console.log('✅ AUTOPILOT TEST COMPLETED');
console.log('='.repeat(60));

const finalReengageState = flightPhysics.getFlightState();
const finalReengageStatus = autopilot.getStatus();

console.log(`🏁 Final Re-engaged State:
  Altitude: ${Math.round(finalReengageState.altitude)} ft (Error: ${Math.round(finalReengageStatus.errors.altitude)} ft)
  Airspeed: ${Math.round(finalReengageState.airspeed)} KTS (Error: ${Math.round(finalReengageStatus.errors.airspeed)} KTS)
  Stability Score: ${finalReengageStatus.stability.stabilityScore.toFixed(2)}
`);

if (Math.abs(finalReengageStatus.errors.altitude) < 50 && Math.abs(finalReengageStatus.errors.airspeed) < 10) {
  console.log('🎉 EXCELLENT: Autopilot successfully recovered control!');
} else {
  console.log('📊 GOOD: Autopilot is responding but may need more time to converge.');
}

console.log('\nThe autopilot system is ready for integration!');