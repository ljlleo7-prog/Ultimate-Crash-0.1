
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';

const aircraftData = {
    wingArea: 125,
    maxThrustPerEngine: 120000,
    emptyWeight: 40000,
    fuelWeight: 10000
};

const physics = new RealisticFlightPhysicsService(aircraftData);

// Set up takeoff conditions
// Speed: 150 knots ~ 77 m/s
const speedKnots = 150;
const speedMs = speedKnots * 0.514444;

physics.state.vel.x = speedMs;
physics.state.vel.y = 0;
physics.state.vel.z = 0; // Level flight momentarily

// Pitch up for rotation (alpha)
// Let's test a range of Alphas
const alphas = [0, 5, 10, 15].map(d => d * Math.PI / 180);

console.log('--- Drag Calculation Analysis ---');
console.log(`Speed: ${speedKnots} kts (${speedMs.toFixed(1)} m/s)`);
console.log(`Wing Area: ${aircraftData.wingArea} m^2`);

alphas.forEach(alpha => {
    // Set velocity vector to create this alpha
    // v_x = V * cos(alpha)
    // v_z = V * sin(alpha)
    physics.state.vel.x = speedMs * Math.cos(alpha);
    physics.state.vel.z = speedMs * Math.sin(alpha);
    
    // Set controls
    physics.controls.flaps = 0.2; // Takeoff flaps
    physics.controls.gear = 1;    // Gear down
    
    // Run one update step to calculate forces
    const env = physics.calculateEnvironment(0); // Sea level
    const { aeroForces, debug } = physics.calculateAerodynamicsAndGround(env);
    
    // Extract Drag
    // F_drag is not directly returned in aeroForces (which is Fx, Fy, Fz body), 
    // but we can reconstruct it or look at debug if available.
    // Looking at the code, calculateAerodynamicsAndGround returns { forces, moments, aeroForces... }
    // Let's recalculate CD manually to see components
    
    const q = 0.5 * env.density * speedMs * speedMs;
    const CL_flaps = physics.controls.flaps * 0.5;
    const CL = physics.aircraft.CL0 + physics.aircraft.CLa * alpha + CL_flaps;
    
    const CD_flaps = physics.controls.flaps * 0.05;
    const CD_gear = physics.controls.gear * 0.02;
    const CD_induced = physics.aircraft.K * CL * CL;
    const CD = physics.aircraft.CD0 + CD_induced + CD_flaps + CD_gear;
    
    const F_drag = q * aircraftData.wingArea * CD;
    
    console.log(`\nAlpha: ${(alpha * 180 / Math.PI).toFixed(1)} deg`);
    console.log(`  CL: ${CL.toFixed(3)}`);
    console.log(`  CD Components:`);
    console.log(`    Base: ${physics.aircraft.CD0}`);
    console.log(`    Induced: ${CD_induced.toFixed(4)} (K=${physics.aircraft.K}, CL^2=${(CL*CL).toFixed(2)})`);
    console.log(`    Flaps: ${CD_flaps.toFixed(4)}`);
    console.log(`    Gear: ${CD_gear.toFixed(4)}`);
    console.log(`  Total CD: ${CD.toFixed(4)}`);
    console.log(`  Dynamic Pressure (q): ${q.toFixed(0)} Pa`);
    console.log(`  Drag Force: ${(F_drag / 1000).toFixed(1)} kN`);
});
