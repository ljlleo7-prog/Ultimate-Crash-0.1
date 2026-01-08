#!/usr/bin/env node

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';

console.log('🛫 Testing Physics Model WITHOUT Autopilot');
console.log('This test will show if the physics model is stable at cruise conditions');

const physics = new NewFlightPhysicsService();

// Test parameters
const testDuration = 10; // seconds
const dt = 0.1; // 10Hz update rate

// Aircraft state
let state = physics.getFlightState();
console.log('\n🚀 Initial Flight State:');
console.log(`  Altitude: ${state.altitude.toFixed(0)} ft`);
console.log(`  Airspeed: ${state.airspeed.toFixed(1)} KTS`);
console.log(`  Pitch: ${state.pitch.toFixed(2)}°`);
console.log(`  Throttle: ${(physics.state.controls.throttle * 100).toFixed(1)}%`);

console.log('\n🔄 Running physics simulation for 10 seconds...');
console.log('Manual controls: No elevator, 75% throttle throughout');

// Initialize data logging
const dataLog = [];

for (let time = 0; time <= testDuration; time += dt) {
  // Get current flight state
  state = physics.getFlightState();
  
  // Apply constant manual controls
  physics.setControls({
    elevator: 0,      // No elevator input
    throttle: 0.47,  // 47% throttle for balanced cruise thrust (~50kN)
    aileron: 0,
    rudder: 0
  });
  
  // Update physics
  physics.update(dt);
  
  // Log data every 1 second
  if (time % 1.0 < 0.01 || time === 0) {
    dataLog.push({
      time: time,
      altitude: state.altitude,
      airspeed: state.airspeed,
      pitch: state.pitch,
      throttle: physics.state.controls.throttle
    });
    
    console.log(`Time: ${time.toFixed(1)}s - Alt: ${state.altitude.toFixed(0)}ft, ` +
                `Speed: ${state.airspeed.toFixed(1)} KTS, Pitch: ${state.pitch.toFixed(2)}°, ` +
                `Throttle: ${(physics.state.controls.throttle * 100).toFixed(1)}%`);
  }
}

// Final analysis
const initialAltitude = dataLog[0].altitude;
const finalAltitude = dataLog[dataLog.length - 1].altitude;
const altitudeChange = finalAltitude - initialAltitude;

const initialAirspeed = dataLog[0].airspeed;
const finalAirspeed = dataLog[dataLog.length - 1].airspeed;
const airspeedChange = finalAirspeed - initialAirspeed;

console.log('\n' + '='.repeat(60));
console.log('✅ PHYSICS-ONLY TEST COMPLETED');
console.log('='.repeat(60));

console.log('\n📊 Analysis:');
console.log(`  Altitude change: ${altitudeChange > 0 ? '+' : ''}${altitudeChange.toFixed(0)} ft over ${testDuration}s`);
console.log(`  Airspeed change: ${airspeedChange > 0 ? '+' : ''}${airspeedChange.toFixed(1)} KTS over ${testDuration}s`);
console.log(`  Final pitch: ${dataLog[dataLog.length - 1].pitch.toFixed(2)}°`);

if (Math.abs(altitudeChange) < 100 && Math.abs(airspeedChange) < 20) {
  console.log('\n🎉 Physics model appears STABLE at cruise conditions');
  console.log('   → Problem likely in autopilot control logic');
} else if (altitudeChange > 100) {
  console.log('\n⚠️  Physics model is UNSTABLE - Aircraft climbing');
  console.log('   → Need to fix force balance in physics model');
} else if (altitudeChange < -100) {
  console.log('\n⚠️  Physics model is UNSTABLE - Aircraft descending');
  console.log('   → Need to fix force balance in physics model');
} else if (airspeedChange > 20) {
  console.log('\n⚠️  Physics model is UNSTABLE - Aircraft gaining speed');
  console.log('   → Need to fix thrust/drag balance');
} else if (airspeedChange < -20) {
  console.log('\n⚠️  Physics model is UNSTABLE - Aircraft slowing down');
  console.log('   → Need to fix thrust/drag balance');
}

console.log('\n💡 Next step: Fix the identified instability before tuning autopilot');

// Save data log to file for analysis
import fs from 'fs';
const csvHeader = 'time,altitude,airspeed,pitch,throttle\n';
const csvData = dataLog.map(row => 
  `${row.time},${row.altitude},${row.airspeed},${row.pitch},${row.throttle}`
).join('\n');

fs.writeFileSync('physics_test_data.csv', csvHeader + csvData);
console.log('\n💾 Test data saved to physics_test_data.csv');

console.log('\n' + '='.repeat(60));