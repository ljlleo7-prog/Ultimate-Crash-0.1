// Test script to validate the new flight physics calculations
// This will verify the Boeing 737-800 lift calculation at cruise conditions

import FlightPhysicsService from './src/services/flightPhysicsService.js';

console.log('🛩️  Flight Physics Validation Test');
console.log('===================================\n');

// Create a new physics service for Boeing 737-800
const physics = new FlightPhysicsService('Boeing 737-800');

// Set initial cruise conditions
console.log('📊 Setting initial conditions:');
console.log('  Altitude: 35,000 ft');
console.log('  IAS: 280 knots');
console.log('  Aircraft: Boeing 737-800');
console.log();

// Update physics to get initial state
const initialState = physics.update(16); // ~60 FPS

console.log('🔬 Physics Calculations:');
console.log('========================');

// Get debug information
const debugInfo = physics.getDebugInfo();

console.log('🌤️  Atmospheric Conditions:');
console.log(`  Temperature: ${debugInfo.atmosphere.temperature.toFixed(1)} K`);
console.log(`  Air Density: ${debugInfo.atmosphere.density.toFixed(4)} kg/m³`);
console.log(`  Speed of Sound: ${debugInfo.atmosphere.speedOfSound.toFixed(1)} m/s`);
console.log();

console.log('🛡️  Aerodynamic Calculations:');
console.log(`  Dynamic Pressure: ${debugInfo.aerodynamics.dynamicPressure.toFixed(0)} Pa`);
console.log(`  Mach Number: ${debugInfo.aerodynamics.machNumber.toFixed(3)}`);
console.log(`  Angle of Attack: ${debugInfo.aerodynamics.angleOfAttack.toFixed(2)}°`);
console.log(`  Lift Coefficient (Cl): ${debugInfo.aerodynamics.liftCoefficient.toFixed(3)}`);
console.log(`  Drag Coefficient (Cd): ${debugInfo.aerodynamics.dragCoefficient.toFixed(3)}`);
console.log();

console.log('⚖️  Forces (Newtons):');
console.log(`  Lift Force: ${debugInfo.forces.liftForce.toFixed(0)} N`);
console.log(`  Drag Force: ${debugInfo.forces.dragForce.toFixed(0)} N`);
console.log(`  Thrust Force: ${debugInfo.forces.thrustForce.toFixed(0)} N`);
console.log(`  Gravity Force: ${debugInfo.forces.gravityForce.toFixed(0)} N`);
console.log();

console.log('📈 Key Ratios:');
const liftWeightRatio = debugInfo.forces.liftForce / debugInfo.forces.gravityForce;
const thrustDragRatio = debugInfo.forces.thrustForce / debugInfo.forces.dragForce;

console.log(`  Lift/Weight Ratio: ${(liftWeightRatio * 100).toFixed(1)}%`);
console.log(`  Thrust/Drag Ratio: ${(thrustDragRatio * 100).toFixed(1)}%`);
console.log();

// Validation checks
console.log('✅ Validation Results:');
console.log('======================');

let allGood = true;

// Check if lift is approximately equal to weight (within 10% tolerance)
const liftErrorPercent = Math.abs(liftWeightRatio - 1.0) * 100;
if (liftErrorPercent < 10) {
  console.log(`  ✅ Lift/Weight ratio is GOOD: ${(liftWeightRatio * 100).toFixed(1)}% (error: ${liftErrorPercent.toFixed(1)}%)`);
} else {
  console.log(`  ❌ Lift/Weight ratio is BAD: ${(liftWeightRatio * 100).toFixed(1)}% (error: ${liftErrorPercent.toFixed(1)}%)`);
  allGood = false;
}

// Check if thrust is approximately equal to drag (within 15% tolerance)
const thrustDragErrorPercent = Math.abs(thrustDragRatio - 1.0) * 100;
if (thrustDragErrorPercent < 15) {
  console.log(`  ✅ Thrust/Drag ratio is GOOD: ${(thrustDragRatio * 100).toFixed(1)}% (error: ${thrustDragErrorPercent.toFixed(1)}%)`);
} else {
  console.log(`  ❌ Thrust/Drag ratio is NEEDS ATTENTION: ${(thrustDragRatio * 100).toFixed(1)}% (error: ${thrustDragErrorPercent.toFixed(1)}%)`);
}

// Check stall conditions
if (!debugInfo.stallStatus.isStalling && !debugInfo.stallStatus.stallWarning) {
  console.log(`  ✅ No stall conditions detected`);
} else {
  console.log(`  ⚠️  Stall conditions: ${debugInfo.stallStatus.isStalling ? 'STALLING' : 'STALL WARNING'}`);
}

// Check angle of attack
const aoa = debugInfo.aerodynamics.angleOfAttack;
if (aoa > -5 && aoa < 10) {
  console.log(`  ✅ Angle of Attack is normal: ${aoa.toFixed(1)}°`);
} else {
  console.log(`  ⚠️  Angle of Attack is unusual: ${aoa.toFixed(1)}°`);
}

console.log();

// Aircraft specifications check
console.log('🛩️  Boeing 737-800 Specifications:');
console.log('================================');
const aircraft = physics.aircraftParams;
console.log(`  Wing Area: ${aircraft.wingArea} m²`);
console.log(`  Operating Mass: ${aircraft.mass} kg`);
console.log(`  Max Lift Coefficient: ${aircraft.maxLiftCoefficient}`);
console.log(`  Stall Speed: ${aircraft.stallSpeed} knots`);
console.log();

// Summary
console.log('📋 Summary:');
console.log('===========');
if (allGood && liftErrorPercent < 5) {
  console.log('🎉 EXCELLENT! Physics model is working correctly.');
  console.log('   The ~20% lift ratio issue has been RESOLVED.');
} else if (allGood) {
  console.log('✅ GOOD! Physics model is working well with minor deviations.');
  console.log('   The lift ratio issue has been significantly IMPROVED.');
} else {
  console.log('⚠️  NEEDS WORK! Some issues still present in the physics model.');
}

console.log();
console.log('🏁 Test completed.');