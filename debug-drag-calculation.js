#!/usr/bin/env node

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';

console.log('🔍 DRAG CALCULATION DEBUG ANALYSIS');
console.log('=====================================\n');

const physics = new NewFlightPhysicsService();

// Get initial conditions at cruise
const airspeed = physics.getAirspeed();
const density = physics.environment.density;
const wingArea = physics.aircraft.wingArea;
const zeroLiftDrag = physics.aircraft.zeroLiftDragCoefficient;
const inducedDrag = physics.aircraft.inducedDragFactor;

console.log('📊 Input Parameters:');
console.log(`  Airspeed: ${airspeed.mps.toFixed(1)} m/s (${airspeed.kts.toFixed(1)} KTS)`);
console.log(`  Density: ${density.toFixed(4)} kg/m³`);
console.log(`  Wing Area: ${wingArea} m²`);
console.log(`  Zero-lift Drag Coefficient (Cd₀): ${zeroLiftDrag}`);
console.log(`  Induced Drag Factor (k): ${inducedDrag}`);
console.log(`  Cl_trim: 0.05 (from cruiseTrimFactor)`);

console.log('\n🧮 Step-by-Step Drag Calculation:');

// Step 1: Dynamic pressure
const dynamicPressure = 0.5 * density * airspeed.mps * airspeed.mps;
console.log(`\n1. Dynamic Pressure (q):`);
console.log(`   q = 0.5 × ${density} × (${airspeed.mps})²`);
console.log(`   q = 0.5 × ${density} × ${airspeed.mps * airspeed.mps}`);
console.log(`   q = ${dynamicPressure.toFixed(1)} Pa`);

// Step 2: Lift coefficient calculation
const clTrim = 0.05; // cruiseTrimFactor
let cl = clTrim; // Assuming zero angle of attack for simplicity
console.log(`\n2. Lift Coefficient (Cl):`);
console.log(`   Cl = Cl_trim = ${clTrim} (assuming α = 0°)`);
console.log(`   Cl = ${cl}`);

// Step 3: Drag coefficient
const cd = zeroLiftDrag + inducedDrag * cl * cl;
console.log(`\n3. Drag Coefficient (Cd):`);
console.log(`   Cd = Cd₀ + k × Cl²`);
console.log(`   Cd = ${zeroLiftDrag} + ${inducedDrag} × (${cl})²`);
console.log(`   Cd = ${zeroLiftDrag} + ${inducedDrag} × ${cl * cl}`);
console.log(`   Cd = ${cd}`);

// Step 4: Drag force
const dragForce = dynamicPressure * wingArea * cd;
console.log(`\n4. Drag Force:`);
console.log(`   Drag = q × S × Cd`);
console.log(`   Drag = ${dynamicPressure.toFixed(1)} × ${wingArea} × ${cd}`);
console.log(`   Drag = ${dragForce.toFixed(1)} N`);

console.log('\n🎯 Expected Thrust at Cruise:');
const throttle = 0.75;
const densityRatio = density / physics.AIR_DENSITY_SEA_LEVEL;
const altitudeDerating = Math.pow(densityRatio, 0.7);
const maxThrustPerEngine = 120000; // Realistic CFM56-7B
const totalThrust = throttle * 2 * maxThrustPerEngine * altitudeDerating;
console.log(`   Throttle: ${(throttle * 100).toFixed(1)}%`);
console.log(`   Max thrust per engine: ${maxThrustPerEngine} N`);
console.log(`   Altitude derating: ${altitudeDerating.toFixed(3)}`);
console.log(`   Total thrust: ${totalThrust.toFixed(1)} N`);

console.log('\n⚖️  Force Balance Analysis:');
console.log(`   Thrust: ${totalThrust.toFixed(1)} N`);
console.log(`   Drag:   ${dragForce.toFixed(1)} N`);
console.log(`   Net:    ${(totalThrust - dragForce).toFixed(1)} N ${totalThrust > dragForce ? '(ACCELERATING)' : '(DECELERATING)'}`);

console.log('\n🚨 CRITICAL FINDING:');
const thrustDragRatio = totalThrust / dragForce;
console.log(`   Thrust/Drag Ratio: ${thrustDragRatio.toFixed(2)} : 1`);
if (thrustDragRatio > 1.5) {
  console.log('   ❌ EXCESSIVE THRUST - Aircraft will accelerate indefinitely!');
  console.log('   💡 SOLUTION: Increase drag coefficients dramatically');
  
  // Calculate required drag coefficient
  const requiredCd = totalThrust / (dynamicPressure * wingArea);
  console.log(`\n🔧 Required Drag Coefficient: ${requiredCd.toFixed(2)}`);
  console.log(`   Current Cd: ${cd.toFixed(2)}`);
  console.log(`   Need to increase by: ${(requiredCd / cd).toFixed(1)}x`);
} else if (thrustDragRatio < 0.8) {
  console.log('   ❌ EXCESSIVE DRAG - Aircraft will decelerate');
  console.log('   💡 SOLUTION: Decrease drag coefficients');
} else {
  console.log('   ✅ REASONABLE BALANCE');
}

console.log('\n' + '='.repeat(60));