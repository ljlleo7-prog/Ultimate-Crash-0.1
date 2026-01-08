#!/usr/bin/env node

import NewFlightPhysicsService from './src/services/newFlightPhysicsService.js';

console.log('🔍 DETAILED FORCE BREAKDOWN:');
console.log('============================');

const physics = new NewFlightPhysicsService();

const input = { 
  pitch: 3 * Math.PI/180, 
  throttle: 0.47, 
  roll: 0, 
  yaw: 0 
};

// Calculate individual components
physics.calculateAerodynamicForces(input);
console.log('Aerodynamic Forces:', physics.aeroForces);

physics.calculatePropulsionForces();
console.log('Propulsion Forces:', physics.thrustForces);

physics.calculateGravitationalForces();
console.log('Gravity Forces:', physics.gravityForces);

physics.sumForcesAndMoments();
console.log('Total Forces:', physics.forces);

console.log('\n🔬 AERODYNAMIC DETAILS:');
const velocity = physics.state.velocity;
const airspeed = Math.sqrt(velocity.u * velocity.u + velocity.v * velocity.v + velocity.w * velocity.w);
const dynamicPressure = 0.5 * physics.environment.density * airspeed * airspeed;
const q = dynamicPressure * physics.aircraft.wingArea;

const alpha = Math.atan2(velocity.w, velocity.u);
let cl = 0.44 + physics.aircraft.liftCurveSlope * alpha;
cl = Math.max(0.1, cl);
cl = Math.min(physics.aircraft.maxLiftCoefficient, cl);

const cd = physics.aircraft.zeroLiftDragCoefficient + physics.aircraft.inducedDragFactor * cl * cl;
const lift = q * cl;
const drag = q * cd;

console.log('Airspeed:', airspeed.toFixed(2), 'm/s');
console.log('Dynamic pressure (q):', q.toFixed(0), 'Pa');
console.log('Alpha:', (alpha * 180/Math.PI).toFixed(2), 'degrees');
console.log('CL:', cl.toFixed(3));
console.log('CD:', cd.toFixed(3));
console.log('Lift (q*CL):', lift.toFixed(0), 'N');
console.log('Drag (q*CD):', drag.toFixed(0), 'N');

console.log('\n🔧 STATE VALUES:');
console.log('u (forward):', velocity.u.toFixed(2), 'm/s');
console.log('v (right):', velocity.v.toFixed(2), 'm/s'); 
console.log('w (up):', velocity.w.toFixed(2), 'm/s');
console.log('Pitch (theta):', (physics.state.orientation.theta * 180/Math.PI).toFixed(2), 'degrees');