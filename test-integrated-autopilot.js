#!/usr/bin/env node

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';
import { AutopilotService } from './src/services/autopilotService.js';

console.log('🛫 Testing Integrated Autopilot + Flight Physics System');

const physics = new NewFlightPhysicsService();
const autopilot = new AutopilotService(physics);

// Test parameters
const testDuration = 10; // seconds
const dt = 0.1; // 10Hz update rate

// Aircraft state
let state = physics.getFlightState();
console.log('\n🚀 Initial Flight State:');
console.log(`  Altitude: ${state.altitude.toFixed(0)} ft`);
console.log(`  Airspeed: ${state.airspeed.toFixed(1)} KTS`);
console.log(`  Pitch: ${state.pitch.toFixed(2)}°`);

// Target cruise conditions
const targetAltitude = 35000; // ft
const targetAirspeed = 460; // KTS TAS

console.log('\n🎯 Autopilot Targets:');
console.log(`  Altitude: ${targetAltitude} ft`);
console.log(`  Airspeed: ${targetAirspeed} KTS`);

console.log('\n🔄 Starting 10-second integration test...');

// Initialize data logging
const dataLog = [];

for (let time = 0; time <= testDuration; time += dt) {
  // Get current flight state
  state = physics.getFlightState();
  
  // Calculate altitude and airspeed errors
  const altitudeError = state.altitude - targetAltitude;
  const airspeedError = state.airspeed - targetAirspeed;
  
  // Manual controls for first 2 seconds
  let elevatorCmd = 0;
  let throttleCmd = 0;
  
  if (time < 2.0) {
    elevatorCmd = -0.1; // slight nose down
    throttleCmd = 0.8;  // moderate thrust
  } else {
    // Enable autopilot at 2 seconds
    if (!autopilot.enabled) {
      autopilot.targetAltitude = targetAltitude;
      autopilot.targetAirspeed = targetAirspeed;
      autopilot.enable();
      console.log(`\n🤖 Autopilot ENABLED at ${time.toFixed(1)}s`);
    }
    
    // Update autopilot
    autopilot.update(dt);
    
    // Get the current outputs from autopilot
    elevatorCmd = autopilot.currentOutputs.elevatorTrim;
    // Calculate actual throttle from autopilot adjustment
    const currentThrottle = physics.state.controls.throttle;
    throttleCmd = currentThrottle + autopilot.currentOutputs.throttleAdjustment;
  }
  
  // Apply controls to physics
  physics.setControls({
    elevator: elevatorCmd,
    throttle: throttleCmd,
    aileron: 0,
    rudder: 0
  });
  
  // Update physics
  physics.update(dt);
  
  // Log data every 0.5 seconds
  if (Math.abs(time % 0.5) < 0.01 || time === 0) {
    dataLog.push({
      time: time,
      altitude: state.altitude,
      airspeed: state.airspeed,
      pitch: state.pitch,
      altitudeError: altitudeError,
      airspeedError: airspeedError,
      elevatorCmd: elevatorCmd,
      throttleCmd: throttleCmd,
      stability: autopilot.stabilityMetrics.stabilityScore
    });
  }
  
  // Progress updates
  if (time % 2.0 < 0.01) {
    console.log(`Time: ${time.toFixed(1)}s - Alt: ${state.altitude.toFixed(0)}ft ` +
                `(${altitudeError > 0 ? '+' : ''}${altitudeError.toFixed(0)}ft err), ` +
                `Speed: ${state.airspeed.toFixed(0)} KTS ` +
                `(${airspeedError > 0 ? '+' : ''}${airspeedError.toFixed(0)} KTS err), ` +
                `Stability: ${autopilot.stabilityMetrics.stabilityScore.toFixed(2)}`);
  }
}

// Final state
state = physics.getFlightState();
const finalAltitudeError = state.altitude - targetAltitude;
const finalAirspeedError = state.airspeed - targetAirspeed;
const finalStability = autopilot.stabilityMetrics.stabilityScore;

console.log('\n' + '='.repeat(60));
console.log('✅ INTEGRATED AUTOPILOT TEST COMPLETED');
console.log('='.repeat(60));

console.log('\n🏁 Final Results:');
console.log(`  Time: ${testDuration} seconds`);
console.log(`  Altitude: ${state.altitude.toFixed(0)} ft (Error: ${finalAltitudeError > 0 ? '+' : ''}${finalAltitudeError.toFixed(0)} ft)`);
console.log(`  Airspeed: ${state.airspeed.toFixed(1)} KTS (Error: ${finalAirspeedError > 0 ? '+' : ''}${finalAirspeedError.toFixed(1)} KTS)`);
console.log(`  Pitch: ${state.pitch.toFixed(2)}°`);
console.log(`  Stability Score: ${finalStability.toFixed(2)}`);

// Performance validation
const altitudeError = Math.abs(finalAltitudeError);
const airspeedError = Math.abs(finalAirspeedError);
const stabilityOK = finalStability < 3.0;

console.log('\n📊 Validation:');
console.log(`  ${altitudeError < 500 ? '✅' : '❌'} Altitude error: ${altitudeError.toFixed(0)} ft (target: <500 ft)`);
console.log(`  ${airspeedError < 25 ? '✅' : '❌'} Airspeed error: ${airspeedError.toFixed(1)} KTS (target: <25 KTS)`);
console.log(`  ${stabilityOK ? '✅' : '❌'} Stability score: ${finalStability.toFixed(2)} (target: <3.0)`);

if (altitudeError < 500 && airspeedError < 25 && stabilityOK) {
  console.log('\n🎉 INTEGRATION SUCCESSFUL! Autopilot + Flight Physics working together.');
} else {
  console.log('\n⚠️  System functional but may need tuning for optimal performance.');
}

console.log('\n🔧 Autopilot Status:');
console.log(`  Engaged: ${autopilot.enabled}`);
console.log(`  PID Gains (Altitude): kp=${autopilot.altitudePID.kp.toFixed(4)}, ki=${autopilot.altitudePID.ki.toFixed(4)}, kd=${autopilot.altitudePID.kd.toFixed(4)}`);
console.log(`  PID Gains (Airspeed): kp=${autopilot.airspeedPID.kp.toFixed(4)}, ki=${autopilot.airspeedPID.ki.toFixed(4)}, kd=${autopilot.airspeedPID.kd.toFixed(4)}`);

// Save data log to file for analysis
import fs from 'fs';
const csvHeader = 'time,altitude,airspeed,pitch,altitudeError,airspeedError,elevatorCmd,throttleCmd,stability\n';
const csvData = dataLog.map(row => 
  `${row.time},${row.altitude},${row.airspeed},${row.pitch},${row.altitudeError},${row.airspeedError},${row.elevatorCmd},${row.throttleCmd},${row.stability}`
).join('\n');

fs.writeFileSync('autopilot_test_data.csv', csvHeader + csvData);
console.log('\n💾 Test data saved to autopilot_test_data.csv');

console.log('\n' + '='.repeat(60));