#!/usr/bin/env node

import { NewFlightPhysicsService } from './src/services/newFlightPhysicsService.js';

console.log('🔍 THRUST CALCULATION DEBUG ANALYSIS');
console.log('=====================================\n');

const physics = new NewFlightPhysicsService();

// Get thrust parameters
const throttle = physics.state.controls.throttle;
const maxThrustPerEngine = physics.aircraft.maxThrustPerEngine;
const engineCount = physics.aircraft.engineCount;
const density = physics.environment.density;
const seaLevelDensity = physics.AIR_DENSITY_SEA_LEVEL;

console.log('📊 Input Parameters:');
console.log(`  Throttle: ${(throttle * 100).toFixed(1)}%`);
console.log(`  Max thrust per engine: ${maxThrustPerEngine} N`);
console.log(`  Engine count: ${engineCount}`);
console.log(`  Current density: ${density.toFixed(4)} kg/m³`);
console.log(`  Sea level density: ${seaLevelDensity} kg/m³`);

console.log('\n🧮 Step-by-Step Thrust Calculation:');

// Step 1: Density ratio
const densityRatio = density / seaLevelDensity;
console.log(`\n1. Density Ratio:`);
console.log(`   ρ_ratio = ${density} / ${seaLevelDensity}`);
console.log(`   ρ_ratio = ${densityRatio.toFixed(3)}`);

// Step 2: Altitude derating
const altitudeDerating = Math.pow(densityRatio, 0.7);
console.log(`\n2. Altitude Derating:`);
console.log(`   Derating = (ρ_ratio)^0.7`);
console.log(`   Derating = (${densityRatio.toFixed(3)})^0.7`);
console.log(`   Derating = ${altitudeDerating.toFixed(3)}`);

// Step 3: Max thrust at altitude
const maxThrustAtAltitude = maxThrustPerEngine * altitudeDerating;
console.log(`\n3. Max Thrust at Altitude:`);
console.log(`   T_max_alt = ${maxThrustPerEngine} × ${altitudeDerating.toFixed(3)}`);
console.log(`   T_max_alt = ${maxThrustAtAltitude.toFixed(1)} N per engine`);

// Step 4: Total thrust
const totalThrust = throttle * engineCount * maxThrustAtAltitude;
console.log(`\n4. Total Thrust:`);
console.log(`   T_total = ${throttle} × ${engineCount} × ${maxThrustAtAltitude.toFixed(1)}`);
console.log(`   T_total = ${totalThrust.toFixed(1)} N`);

console.log('\n🎯 Expected vs Actual:');
console.log(`   Expected: ~50,000 N (as you mentioned)`);
console.log(`   Calculated: ${totalThrust.toFixed(1)} N`);
console.log(`   Difference: ${(totalThrust - 50000).toFixed(1)} N`);

console.log('\n🚨 CRITICAL ISSUE:');
const thrustRatio = totalThrust / 50000;
if (thrustRatio > 1.3) {
  console.log(`   ❌ EXCESSIVE THRUST by ${(thrustRatio * 100 - 100).toFixed(1)}%`);
  console.log(`   💡 SOLUTION: Reduce max thrust per engine to ~${(50000 / (engineCount * altitudeDerating * throttle)).toFixed(0)} N`);
  
  // Calculate what max thrust should be
  const requiredMaxThrust = 50000 / (engineCount * altitudeDerating * throttle);
  console.log(`   🔧 Adjust: maxThrustPerEngine = ${requiredMaxThrust.toFixed(0)} N`);
} else if (thrustRatio < 0.8) {
  console.log(`   ❌ INSUFFICIENT THRUST by ${(100 - thrustRatio * 100).toFixed(1)}%`);
  console.log(`   💡 SOLUTION: Increase max thrust per engine`);
} else {
  console.log(`   ✅ REASONABLE THRUST`);
}

console.log('\n⚖️  Force Balance with Current Drag:');
// Quick drag calculation
const airspeed = physics.getAirspeed();
const dynamicPressure = 0.5 * density * airspeed.mps * airspeed.mps;
const cd = physics.aircraft.zeroLiftDragCoefficient + physics.aircraft.inducedDragFactor * 0.05 * 0.05; // Cl ≈ 0.05
const dragForce = dynamicPressure * physics.aircraft.wingArea * cd;

console.log(`   Thrust: ${totalThrust.toFixed(1)} N`);
console.log(`   Drag:   ${dragForce.toFixed(1)} N`);
console.log(`   Net:    ${(totalThrust - dragForce).toFixed(1)} N ${totalThrust > dragForce ? '(ACCELERATING)' : '(DECELERATING)'}`);

console.log('\n' + '='.repeat(60));