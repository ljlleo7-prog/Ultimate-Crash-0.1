
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';

const physics = new RealisticFlightPhysicsService({});

// Sensitivity Analysis for Induced Drag
console.log('--- Induced Drag Sensitivity Analysis ---');
console.log('Base K:', physics.aircraft.K);
console.log('Wing Span:', physics.aircraft.wingSpan);

// Test scenarios: Different Pitches and Heights
const scenarios = [
    { pitch: 0, height: 0, desc: 'Ground Roll (0 deg)' },
    { pitch: 5, height: 1, desc: 'Early Rotation (5 deg, 1m)' },
    { pitch: 10, height: 2, desc: 'Rotation (10 deg, 2m)' },
    { pitch: 12, height: 5, desc: 'Liftoff (12 deg, 5m)' },
    { pitch: 15, height: 20, desc: 'Climb Out (15 deg, 20m)' },
];

scenarios.forEach(s => {
    // Reset State
    physics.reset();
    
    // Set Conditions
    const speedKnots = 150;
    const speedMs = speedKnots * 0.514444;
    const thetaRad = s.pitch * Math.PI / 180;
    
    physics.state.pos.z = -s.height; // Height is -z
    physics.state.quat = physics.state.quat.constructor.fromEuler(0, thetaRad, 0);
    
    // Velocity Vector (Body Frame approx alignment for simplicity or properly rotated)
    // To keep alpha = pitch (level flight path initially), we set velocity horizontal
    physics.state.vel = new physics.state.vel.constructor(
        speedMs * Math.cos(thetaRad),
        0,
        speedMs * Math.sin(thetaRad)
    );

    physics.controls.flaps = 0.2;
    physics.controls.gear = 1.0;
    
    const env = physics.calculateEnvironment(-physics.state.pos.z);
    const { debug } = physics.calculateAerodynamicsAndGround(env);
    
    // Calculate Induced Drag Factor manually to check
    const h = s.height;
    const b = physics.aircraft.wingSpan;
    const r = h / b;
    const groundEffectFactor = (h < b) ? (16 * r * r) / (1 + 16 * r * r) : 1.0;
    const clampedGE = Math.max(0.2, groundEffectFactor);

    console.log(`\nScenario: ${s.desc}`);
    console.log(`  Height: ${s.height}m (b=${b}m), GE Factor: ${clampedGE.toFixed(3)}`);
    console.log(`  Alpha: ${s.pitch} deg`);
    console.log(`  CL: ${debug.CL.toFixed(3)}`);
    console.log(`  CD Total: ${debug.CD.toFixed(4)}`);
    console.log(`  Drag Force: ${(debug.drag / 1000).toFixed(2)} kN`);
    console.log(`  Lift Force: ${(debug.lift / 1000).toFixed(2)} kN`);
    console.log(`  Induced Drag Component: ${(physics.aircraft.K * debug.CL * debug.CL * clampedGE).toFixed(4)}`);
});
