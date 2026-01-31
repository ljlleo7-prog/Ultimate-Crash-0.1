
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import eventBus from '../src/services/eventBus.js';
import { loadAircraftData } from '../src/services/aircraftService.js';

// --- Simulation Configuration ---
const SIM_CONFIG = {
    aircraftModel: "Boeing 737-800", // Default model
    flightParams: {
        altitude: 35000, // ft
        airspeed: 450,   // kts
        heading: 0,      // degrees
        fuel: 8000       // kg
    },
    difficulty: 'intermediate',
    simDuration: 30,   // Reduced to 30s as requested
    dt: 0.02           // 50Hz for stability
};

// --- Evaluation System ---
class FlightRecorder {
    constructor() {
        this.history = [];
        this.events = [];
        this.startTime = Date.now();
    }

    recordFrame(time, physics) {
        const euler = physics.state.quat.toEuler();
        this.history.push({
            time,
            pitch: euler.theta,
            roll: euler.phi,
            heading: euler.psi, 
            altitude: -physics.state.pos.z / 0.3048, // Convert back to ft
            airspeed: physics.state.vel.magnitude() * 1.94384,
            eng1_n1: physics.engines[0]?.state.n1 || 0,
            eng2_n1: physics.engines[1]?.state.n1 || 0,
            eng1_egt: physics.engines[0]?.state.egt || 0,
            eng2_egt: physics.engines[1]?.state.egt || 0,
            hydPress: physics.systems.hydraulics?.sysA?.pressure || 0,
            elecVolts: physics.systems.electrical?.acVolts || 0
        });
    }

    logEvent(time, type, message) {
        this.events.push({ time: time.toFixed(1), type, message });
    }

    generateReport() {
        if (this.history.length === 0) return "No data recorded.";

        const start = this.history[0];
        const end = this.history[this.history.length - 1];
        
        // Analyze Deviations
        let maxRoll = 0;
        let maxPitch = 0;
        let minAlt = start.altitude;
        let maxAltChange = 0;

        this.history.forEach(h => {
            if (Math.abs(h.roll) > maxRoll) maxRoll = Math.abs(h.roll);
            if (Math.abs(h.pitch) > maxPitch) maxPitch = Math.abs(h.pitch);
            if (h.altitude < minAlt) minAlt = h.altitude;
            if (Math.abs(h.altitude - start.altitude) > maxAltChange) maxAltChange = Math.abs(h.altitude - start.altitude);
        });

        const rollDeg = (maxRoll * 57.2958).toFixed(1);
        const pitchDeg = (maxPitch * 57.2958).toFixed(1);
        const altDrop = (start.altitude - end.altitude).toFixed(0);

        return `
=== FLIGHT EVALUATION REPORT ===
Duration: ${end.time.toFixed(1)}s
Aircraft: ${SIM_CONFIG.aircraftModel}

1. PHYSICAL STABILITY:
   - Max Roll Deviation: ${rollDeg}° ${rollDeg > 30 ? "(CRITICAL INSTABILITY)" : "(Stable)"}
   - Max Pitch Deviation: ${pitchDeg}°
   - Altitude Change: ${altDrop} ft ${altDrop > 1000 ? "(SIGNIFICANT DESCENT)" : "(Maintained)"}

2. SYSTEM BEHAVIOR:
   - Final N1: ENG1 ${end.eng1_n1.toFixed(1)}% | ENG2 ${end.eng2_n1.toFixed(1)}%
   - Electrical: ${end.elecVolts.toFixed(0)}V ${end.elecVolts < 110 ? "(FAILURE DETECTED)" : "(Normal)"}
   - Hydraulics: ${end.hydPress.toFixed(0)} PSI

3. EVENT LOG:
   ${this.events.length > 0 ? this.events.map(e => `[T+${e.time}s] ${e.type}: ${e.message}`).join('\n   ') : "No significant events detected."}

4. SUMMARY:
   The aircraft ${rollDeg > 45 || end.altitude < 1000 ? "lost control/crashed" : "remained controllable"} during the failure scenario.
================================
`;
    }
}

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
    
    // 1. Load Aircraft Data
    log(`📥 Loading Aircraft Database...`);
    const aircraftDb = await loadAircraftData();
    const aircraftConfig = aircraftDb.find(a => a.model === SIM_CONFIG.aircraftModel);
    
    if (!aircraftConfig) {
        log(`❌ Error: Aircraft ${SIM_CONFIG.aircraftModel} not found in database.`);
        process.exit(1);
    }
    log(`✅ Loaded Config for ${aircraftConfig.model} (Weight: ${aircraftConfig.emptyWeight}kg, Engines: ${aircraftConfig.engineCount})`);

    // Merge params
    const params = { ...SIM_CONFIG.flightParams, ...customParams };
    
    // 2. Initialize Physics Service with REAL data
    const physics = new RealisticFlightPhysicsService(aircraftConfig, 0, 0, SIM_CONFIG.difficulty);
    
    // 4. Initialize Flight State
    console.log("⚙️  Initializing Flight State: Alt 35000ft, Spd 450kts");
    physics.setInitialConditions({
        position: { z: 35000 * 0.3048 }, // Altitude (ft -> meters)
        heading: 0,
        fuel: 15000, // kg
        coldStart: false
    });
    
    // Set Initial Velocity manually (setInitialConditions resets it to 0)
    const trueAirspeedKts = 450; 
    const trueAirspeedMs = trueAirspeedKts * 0.514444;
    physics.state.vel.set(trueAirspeedMs, 0, 0);

    // --- SYSTEM SETUP: CRUISE CONFIGURATION ---
    console.log("🔌 Configuring Systems for CRUISE...");
    
    // Electrical
    physics.systems.electrical.battery = true;
    physics.systems.electrical.gen1 = true;
    physics.systems.electrical.gen2 = true;
    physics.systems.electrical.stbyPower = true;
    physics.systems.electrical.acVolts = 115;
    physics.systems.electrical.dcVolts = 28;
    physics.systems.electrical.sourceOff1 = false;
    physics.systems.electrical.sourceOff2 = false;
    
    // Hydraulics
    if (physics.systems.hydraulics.sysA) {
        physics.systems.hydraulics.sysA.engPump = true;
        physics.systems.hydraulics.sysA.elecPump = true;
        physics.systems.hydraulics.sysA.pressure = 3000;
    }
    if (physics.systems.hydraulics.sysB) {
        physics.systems.hydraulics.sysB.engPump = true;
        physics.systems.hydraulics.sysB.elecPump = true;
        physics.systems.hydraulics.sysB.pressure = 3000;
    }
    
    // Fuel
    physics.systems.fuel.leftPumps = true;
    physics.systems.fuel.rightPumps = true;
    physics.systems.fuel.centerPumps = false;
    physics.systems.fuel.crossfeed = false;
    
    // Pressurization / Bleeds
    physics.systems.pressurization.packL = true;
    physics.systems.pressurization.packR = true;
    physics.systems.pressurization.bleed1 = true;
    physics.systems.pressurization.bleed2 = true;
    physics.systems.pressurization.isolationValve = true; // Auto/Open

    // Lighting
    physics.systems.lighting.nav = true;
    physics.systems.lighting.beacon = true;
    physics.systems.lighting.strobe = true;

    // --- ENGINES (CRUISE POWER) ---
    console.log("🔥 Spooling Engines to Cruise Power...");
    physics.engines.forEach((eng, i) => {
        eng.state.running = true;
        eng.state.n1 = 85.0; 
        eng.state.n2 = 90.0;
        eng.state.egt = 650;
        eng.state.oilPressure = 80;
        eng.state.fuelFlow = 1.2;
        eng.setThrottle(0.65);
        
        // Sync Systems
        if (physics.systems.engines[`eng${i+1}`]) {
            physics.systems.engines[`eng${i+1}`].n2 = 90.0;
            physics.systems.engines[`eng${i+1}`].egt = 650;
            physics.systems.engines[`eng${i+1}`].fuelControl = true;
            physics.systems.engines[`eng${i+1}`].startSwitch = 'OFF';
        }
    });

    // --- ENGAGE AUTOPILOT ---
    console.log("🤖 Engaging Autopilot (Alt Hold, Hdg Hold, AutoThrottle)...");
    physics.setAutopilot(true, {
        speed: 280, // IAS Target (High altitude cruise IAS is lower than TAS)
        altitude: 35000,
        heading: 0,
        vs: 0,
        mode: 'LNAV' // Or HDG
    });

    // Recorder
    const recorder = new FlightRecorder();

    // Event Listeners
    const unsub = eventBus.subscribe(eventBus.Types.FAILURE_OCCURRED, (payload) => {
        const msg = `Failure Occurred -> ${payload.type}`;
        log(`🔥 ${msg}`);
        recorder.logEvent(physics.time || 0, 'FAILURE', msg);
    });
    
    const unsub2 = eventBus.subscribe(eventBus.Types.CRITICAL_MESSAGE, (payload) => {
        log(`📢 ${payload.content}`);
        recorder.logEvent(physics.time || 0, 'WARNING', payload.content);
    });

    // 5. Stabilize
    console.log("⏳ Stabilizing (2s)...");
    for(let i=0; i<20; i++) {
        physics.update({ throttle: 0.65, pitch: 0, roll: 0, yaw: 0 }, 0.1);
    }
    
    // 4. Trigger Failure
    log(`⚠️  Triggering Failure: ${failureId}`);
    if (physics.failureSystem) {
        const ctx = { ...failureContext, difficulty: SIM_CONFIG.difficulty };
        physics.failureSystem.triggerFailure(failureId, ctx);
        recorder.logEvent(0, 'TRIGGER', `Simulated ${failureId}`);
    } else {
        log(`❌ Error: Failure System not available`);
        process.exit(1);
    }
    
    // 5. Run Simulation Loop
    log(`▶️  Running Simulation for ${SIM_CONFIG.simDuration}s...`);
    
    const steps = SIM_CONFIG.simDuration / SIM_CONFIG.dt;
    let lastLogTime = 0;
    let time = 0;
    
    for (let step = 0; step < steps; step++) {
        time = step * SIM_CONFIG.dt;
        physics.time = time; // Inject time for logging
        
        // Simulate Basic Autopilot / Stability Augmentation
        // Try to keep wings level if controllable
        /*
        const euler = physics.state.quat.toEuler();
        const currentRoll = euler.phi;
        const currentPitch = euler.theta;
        
        // Simple PID-like controller to maintain level flight
        const kp_roll = 4.0;
        const kp_pitch = 5.0;
        
        const rollCorrection = -currentRoll * kp_roll; 
        const pitchCorrection = -currentPitch * kp_pitch;
        
        // Clamp inputs
        const aileron = Math.max(-1, Math.min(1, rollCorrection));
        const elevator = Math.max(-1, Math.min(1, pitchCorrection));
        */

        // Update Physics with "Pilot" inputs
        // Since AP is engaged in setup, we pass empty/neutral inputs and let AP override.
        physics.update({ 
            // throttle: 0.65, 
            // pitch: elevator, 
            // roll: aileron, 
            // yaw: 0,
            // trim: -0.1 // Slight nose down trim to counter-act engine pitch up
        }, SIM_CONFIG.dt);
        
        // Record Data
        recorder.recordFrame(time, physics);
        
        // Log Status every 5 seconds
        if (time - lastLogTime >= 5.0) {
            logStatus(time, physics);
            lastLogTime = time;
        }
    }
    
    // Final Status & Report
    logStatus(time, physics);
    console.log(recorder.generateReport());
    
    // Cleanup
    unsub();
    unsub2();
    log(`✅ Simulation Complete`);
    process.exit(0);
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
    
    // Fuel Status
    const fuelL = physics.systems.fuel?.tanks?.left.toFixed(0) || 0;
    const fuelR = physics.systems.fuel?.tanks?.right.toFixed(0) || 0;
    
    log(`[T+${time.toFixed(1)}s] ` +
        `ENG1: N1=${eng1.state.n1.toFixed(1)}% EGT=${eng1.state.egt.toFixed(0)} VIB=${(eng1.state.vibration || 0).toFixed(1)} [${fire1}] | ` +
        `ENG2: N1=${eng2.state.n1.toFixed(1)}% EGT=${eng2.state.egt.toFixed(0)} VIB=${(eng2.state.vibration || 0).toFixed(1)} [${fire2}]`
    );
    log(`           SYS : ELEC [G1:${gen1} G2:${gen2} ${volts}V] | HYD [A:${hydA} B:${hydB}] | BLEED [L:${ductL} R:${ductR}] | FUEL [L:${fuelL} R:${fuelR}]`);
}

// --- Execution ---
// Get args from command line if running via node
const args = process.argv.slice(2);
const failureArg = args[0] || 'engine_fire';
const engineIndexArg = args[1] ? parseInt(args[1]) : 0;

runSimulation(failureArg, { engineIndex: engineIndexArg })
    .catch(err => {
        console.error('❌ Simulation Failed:', err);
        process.exit(1);
    });

