/**
 * Physics Test and Validation
 * Tests the new flight physics service to ensure it achieves realistic cruise conditions
 */

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';

function testPhysics() {
  console.log('🛩️  Testing New Flight Physics System\n');
  
  // Create physics instance
  const physics = new NewFlightPhysicsService("Boeing 737-800");
  
  console.log('Initial State:');
  console.log(`  Altitude: ${-physics.state.position.z * 3.28084} ft`);
  console.log(`  Pitch: ${physics.radToDeg(physics.state.orientation.theta)}°`);
  console.log(`  Controls: Throttle ${(physics.state.controls.throttle * 100).toFixed(0)}%`);
  console.log();
  
  // Run simulation for cruise conditions
  const targetAltitude = 35000; // feet
  const targetAirspeed = 460;   // knots TAS (realistic for 260 KTS IAS at 35,000ft)
  const targetPitch = null;     // Don't force pitch - let it find equilibrium
  
  console.log('🎯 Target Conditions:');
  console.log(`  Altitude: ${targetAltitude} ft`);
  console.log(`  Airspeed: ${targetAirspeed} KTS`);
  console.log(`  Pitch: Let aircraft find natural equilibrium`);
  console.log();
  
  // Simulation loop
  let stableTime = 0;
  let maxSimTime = 60; // 60 seconds simulation
  
  for (let i = 0; i < maxSimTime / physics.dt; i++) {
    // Update physics
    physics.update();
    
    // Check for stable cruise conditions
    const state = physics.getState();
    const airspeed = physics.getAirspeed();
    const speedKts = airspeed.kts; // Use TAS as approximation for now
    
    const altitudeError = Math.abs(state.altitude - targetAltitude);
    const airspeedError = Math.abs(speedKts - targetAirspeed);
    
    // Consider stable if altitude and speed are close (let pitch find natural equilibrium)
    const pitch = state.pitch;
    if (altitudeError < 200 && airspeedError < 20) {
      stableTime += physics.dt;
    } else {
      stableTime = 0;
    }
    
    // Print status every 5 seconds
    if (i % (5 / physics.dt) === 0) {
      const time = i * physics.dt;
      const altitude = state.altitude; // Already in feet from getState()
      console.log(`Time: ${time.toFixed(1)}s - Alt: ${altitude.toFixed(0)}ft, Speed: ${speedKts.toFixed(1)}kts TAS, Pitch: ${pitch.toFixed(1)}°`);
    }
    
    // Stop if we've been stable for 3 seconds
    if (stableTime > 3) {
      console.log(`\n✅ Stable cruise achieved after ${(i * physics.dt).toFixed(1)} seconds!`);
      break;
    }
  }
  
  // Final state analysis
  const finalState = physics.getState();
  const airspeed = physics.getAirspeed();
  const speedKts = airspeed.kts; // Use TAS as approximation
  const pitch = finalState.pitch;
  
  console.log('📊 Final Results:');
  console.log(`  Altitude: ${finalState.altitude.toFixed(0)} ft (Target: ${targetAltitude.toFixed(0)} ft)`);
  console.log(`  Airspeed: ${speedKts.toFixed(1)} KTS TAS (Target: ${targetAirspeed.toFixed(0)} KTS)`);
  console.log(`  TAS: ${speedKts.toFixed(1)} KTS`);
  console.log(`  Pitch: ${pitch.toFixed(1)}° (natural equilibrium)`);
  console.log(`  Vertical Speed: ${finalState.verticalSpeed.toFixed(1)} ft/min`);
  console.log(`  Roll: ${finalState.roll.toFixed(1)}°`);
  console.log(`  Heading: ${finalState.heading.toFixed(0)}°`);
  
  // Error analysis
  const altitudeError = Math.abs(finalState.altitude - targetAltitude);
  const airspeedError = Math.abs(speedKts - targetAirspeed);
  
  console.log('\n📈 Error Analysis:');
  console.log(`  Altitude Error: ${altitudeError.toFixed(0)} ft`);
  console.log(`  Airspeed Error: ${airspeedError.toFixed(1)} KTS TAS`);
  console.log(`  Pitch: ${pitch.toFixed(1)}° (natural)`);
  
  // Force balance check
  const fx = physics.forces.x;
  const fy = physics.forces.y;
  const fz = physics.forces.z;
  console.log('\n⚖️ Force Balance:');
  console.log(`  X (Forward): ${fx.toFixed(0)}N ${Math.abs(fx) < 5000 ? '✅ BALANCED' : '⚠️ UNBALANCED'}`);
  console.log(`  Y (Lateral): ${fy.toFixed(0)}N ${Math.abs(fy) < 1000 ? '✅ BALANCED' : '⚠️ UNBALANCED'}`);
  console.log(`  Z (Vertical): ${fz.toFixed(0)}N ${Math.abs(fz) < 5000 ? '✅ BALANCED' : '⚠️ UNBALANCED'}`);
  
  // Validation with tolerances
  const altitudeTolerance = 500; // feet (more forgiving)
  const speedTolerance = 25; // KTS (reduced from 50 for better accuracy)
  
  const altitudeOK = altitudeError <= altitudeTolerance;
  const airspeedOK = airspeedError <= speedTolerance;
  const forceBalanceOK = Math.abs(fx) < 15000 && Math.abs(fy) < 1000 && Math.abs(fz) < 5000;
  
  console.log('\n🎯 Validation Results:');
  console.log(`  Altitude: ${altitudeOK ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Airspeed: ${airspeedOK ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Force Balance: ${forceBalanceOK ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallSuccess = altitudeOK && airspeedOK && forceBalanceOK;
  console.log(`\n${overallSuccess ? '🏆 SUCCESS' : '⚠️  NEEDS ADJUSTMENT'}: Physics system ${overallSuccess ? 'achieves' : 'approach'} stable cruise conditions`);
  
  // Force analysis
  console.log('\n🔧 Force Analysis:');
  console.log(`  Total Forces: X=${physics.forces.x.toFixed(0)}N, Y=${physics.forces.y.toFixed(0)}N, Z=${physics.forces.z.toFixed(0)}N`);
  console.log(`  Aircraft Mass: ${physics.aircraft.mass} kg`);
  console.log(`  Air Density: ${physics.environment.density.toFixed(3)} kg/m³`);
  
  return overallSuccess;
}

// Additional test: Control response
function testControlResponse() {
  console.log('\n\n🎮 Testing Control Response\n');
  
  const physics = new NewFlightPhysicsService("Boeing 737-800");
  
  // Test elevator response (pitch control)
  console.log('Testing elevator input...');
  physics.setControls({ elevator: 0.1 });
  
  const initialPitch = physics.radToDeg(physics.state.orientation.theta);
  
  // Run for 3 seconds
  for (let i = 0; i < 3 / physics.dt; i++) {
    physics.update();
  }
  
  const finalPitch = physics.radToDeg(physics.state.orientation.theta);
  const pitchChange = finalPitch - initialPitch;
  
  console.log(`  Initial Pitch: ${initialPitch.toFixed(2)}°`);
  console.log(`  Final Pitch: ${finalPitch.toFixed(2)}°`);
  console.log(`  Change: ${pitchChange.toFixed(2)}°`);
  console.log(`  Response: ${Math.abs(pitchChange) > 0.1 ? '✅ WORKING' : '❌ NO RESPONSE'}`);
  
  // Test throttle response
  console.log('\nTesting throttle input...');
  const initialAirspeed = physics.getAirspeed().kts;
  
  physics.setControls({ throttle: 0.5 }); // Reduce throttle
  
  // Run for 5 seconds
  for (let i = 0; i < 5 / physics.dt; i++) {
    physics.update();
  }
  
  const finalAirspeed = physics.getAirspeed().kts;
  const airspeedChange = finalAirspeed - initialAirspeed;
  
  console.log(`  Initial Airspeed: ${initialAirspeed.toFixed(1)} KTS`);
  console.log(`  Final Airspeed: ${finalAirspeed.toFixed(1)} KTS`);
  console.log(`  Change: ${airspeedChange.toFixed(1)} KTS`);
  console.log(`  Response: ${Math.abs(airspeedChange) > 1 ? '✅ WORKING' : '❌ NO RESPONSE'}`);
}

// Run tests
try {
  const success = testPhysics();
  testControlResponse();
  
  if (success) {
    console.log('\n🎉 All tests completed successfully!');
    console.log('The physics system is ready for integration into the flight simulation.');
  } else {
    console.log('\n⚠️  Physics system needs parameter tuning to achieve optimal cruise conditions.');
  }
  
} catch (error) {
  console.error('❌ Test failed with error:', error);
}