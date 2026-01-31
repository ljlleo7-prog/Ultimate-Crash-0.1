
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import eventBus from '../src/services/eventBus.js';

// --- Simulation Configuration ---
const SIM_CONFIG = {
    aircraft: {
        name: "Boeing 737-800",
        emptyWeight: 41140,
        maxFuelCapacity: 20800,
        maxThrustPerEngine: 120000,
        engineCount: 2,
        wingSpan: 34.3,
        wingArea: 124.6,
        specificFuelConsumption: 0.000015
    },
    // Default Flight Parameters (can be overridden)
    flightParams: {
        altitude: 35000, // ft
        airspeed: 450,   // kts
        heading: 0,      // degrees
        fuel: 8000       // kg
    },
    difficulty: 'intermediate', // 'rookie', 'intermediate', 'pro', 'devil'
    simDuration: 60,   // seconds to simulate
    dt: 0.1           // time step in seconds
};

// --- Logger Helper ---
const logs = [];
const log = (msg) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[${timestamp}] ${msg}`);
    logs.push(`[${timestamp}] ${msg}`);
};

// --- Main Simulation Function ---
async function runSimulation(failureId, failureContext = {}, customParams = {}) {
    log(`🚀 Starting Simulation: ${failureId}`);
    
    // Merge params
    const params = { ...SIM_CONFIG.flightParams, ...customParams };
    
    // 1. Initialize Physics Service
    // Note: We mock aircraft data
    const physics = new RealisticFlightPhysicsService(SIM_CONFIG.aircraft, 0, 0, SIM_CONFIG.difficulty);
    
    // 2. Set Initial State (Cruise)
    log(`⚙️  Initializing Flight State: Alt ${params.altitude}ft, Spd ${params.airspeed}kts`);
    
    // Position (Z is negative altitude in meters)
    const altMeters = params.altitude * 0.3048;
    physics.state.pos.z = -altMeters;
    physics.onGround = false;
    physics.currentGroundZ = 0; // Ground at 0 MSL
    
    // Velocity (Body Frame approx)
    const speedMs = params.airspeed * 0.514444;
    physics.state.vel.set(speedMs, 0, 0);
    
    // Fuel
    physics.state.fuel = params.fuel;
    physics.initializeSystems(SIM_CONFIG.difficulty); // Re-init to sync fuel tanks
    
    // Engines (Set to Cruise Power)
    physics.engines.forEach((eng, i) => {
        eng.state.running = true;
        eng.state.n1 = 85.0; // Cruise N1
        eng.state.n2 = 90.0;
        eng.state.egt = 650;
        eng.state.fuelFlow = 1.2;
        eng.setThrottle(0.65); // Approx cruise throttle
    });
    
    // Stabilize Physics (Run a few frames to settle)
    log(`⏳ Stabilizing...`);
    for(let i=0; i<10; i++) {
        physics.update({ throttle: 0.65, pitch: 0, roll: 0, yaw: 0 }, 0.1);
    }
    
    // 3. Trigger Failure
    log(`⚠️  Triggering Failure: ${failureId}`);
    
    // Subscribe to events to log them
    const unsub = eventBus.subscribe(eventBus.Types.FAILURE_OCCURRED, (payload) => {
        log(`🔥 EVENT: Failure Occurred -> ${payload.type} (Engine ${payload.data?.engineIndex !== undefined ? payload.data.engineIndex + 1 : 'N/A'})`);
    });
    
    const unsub2 = eventBus.subscribe(eventBus.Types.CRITICAL_MESSAGE, (payload) => {
        log(`📢 EVENT: Message -> "${payload.content}"`);
    });

    // Manually trigger via FailureHandler
    // We need to access the failure system directly
    if (physics.failureSystem) {
        // Ensure context has difficulty for nuanced effects
        const ctx = { ...failureContext, difficulty: SIM_CONFIG.difficulty };
        physics.failureSystem.triggerFailure(failureId, ctx);
    } else {
        log(`❌ Error: Failure System not available`);
        return;
    }
    
    // 4. Run Simulation Loop
    log(`▶️  Running Simulation for ${SIM_CONFIG.simDuration}s...`);
    
    const steps = SIM_CONFIG.simDuration / SIM_CONFIG.dt;
    let lastLogTime = 0;
    
    for (let step = 0; step < steps; step++) {
        const time = step * SIM_CONFIG.dt;
        
        // Update Physics
        physics.update({ throttle: 0.65, pitch: 0, roll: 0, yaw: 0 }, SIM_CONFIG.dt);
        
        // Log Status every 5 seconds
        if (time - lastLogTime >= 5.0) {
            logStatus(time, physics);
            lastLogTime = time;
        }
    }
    
    // Final Status
    logStatus(SIM_CONFIG.simDuration, physics);
    
    // Cleanup
    unsub();
    unsub2();
    log(`✅ Simulation Complete`);
}

function logStatus(time, physics) {
    const eng1 = physics.engines[0];
    const eng2 = physics.engines[1];
    
    // Fire System Status
    const fire1 = physics.systems.fire?.eng1 ? 'FIRE' : 'OK';
    const fire2 = physics.systems.fire?.eng2 ? 'FIRE' : 'OK';
    
    // Hydraulic Status
    const hydA = physics.systems.hydraulics?.sysA?.pressure.toFixed(0) || 0;
    const hydB = physics.systems.hydraulics?.sysB?.pressure.toFixed(0) || 0;
    
    // Electrical Status
    const elec = physics.systems.electrical;
    const gen1 = !elec.sourceOff1 ? 'ON' : 'OFF';
    const gen2 = !elec.sourceOff2 ? 'ON' : 'OFF';
    const volts = elec.acVolts.toFixed(0);
    
    // Pneumatic Status
    const pneu = physics.systems.pressurization;
    const ductL = pneu.ductPressL.toFixed(1);
    const ductR = pneu.ductPressR.toFixed(1);
    
    log(`[T+${time.toFixed(1)}s] ` +
        `ENG1: N1=${eng1.state.n1.toFixed(1)}% EGT=${eng1.state.egt.toFixed(0)} VIB=${(eng1.state.vibration || 0).toFixed(1)} [${fire1}] | ` +
        `ENG2: N1=${eng2.state.n1.toFixed(1)}% EGT=${eng2.state.egt.toFixed(0)} VIB=${(eng2.state.vibration || 0).toFixed(1)} [${fire2}]`
    );
    log(`           SYS : ELEC [G1:${gen1} G2:${gen2} ${volts}V] | HYD [A:${hydA} B:${hydB}] | BLEED [L:${ductL} R:${ductR}]`);
}

// --- Execution ---
// Get args from command line if running via node
const args = process.argv.slice(2);
const failureArg = args[0] || 'engine_fire';
const engineIndexArg = args[1] ? parseInt(args[1]) : 0;

runSimulation(failureArg, { engineIndex: engineIndexArg });

