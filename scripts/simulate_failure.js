
import fs from 'fs';
import path from 'path';
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

const toDeg = (rad) => rad * 57.2958;
const normalizeAngleDeg = (deg) => {
    const wrapped = ((deg + 180) % 360 + 360) % 360 - 180;
    return wrapped === -180 ? 180 : wrapped;
};
const normalizeHeadingDeg = (deg) => {
    const wrapped = ((deg % 360) + 360) % 360;
    return wrapped === 360 ? 0 : wrapped;
};

// --- Evaluation System ---
class FlightRecorder {
    constructor() {
        this.history = [];
        this.events = [];
        this.startTime = Date.now();
    }

    recordFrame(time, physics) {
        const output = physics.getOutputState();
        const vEarth = physics.state.quat.rotate(physics.state.vel);
        const airspeedKts = output?.derived?.airspeed ?? (physics.state.vel.magnitude() * 1.94384);
        const groundSpeedKts = output?.derived?.groundSpeed ?? Math.hypot(vEarth.x, vEarth.y) * 1.94384;
        const altitudeFt = output?.derived?.altitude_ft ?? (-physics.state.pos.z / 0.3048);
        const verticalSpeedFpm = output?.verticalSpeed ?? (-vEarth.z * 196.85);
        const pitchDeg = output?.debugPhysics?.theta !== undefined ? normalizeAngleDeg(toDeg(output.debugPhysics.theta)) : 0;
        const rollDeg = output?.debugPhysics?.phi !== undefined ? normalizeAngleDeg(toDeg(output.debugPhysics.phi)) : 0;
        const yawDeg = output?.derived?.heading !== undefined ? normalizeHeadingDeg(output.derived.heading) : 0;
        const onGround = output?.debugPhysics?.isOnGround ?? physics.onGround;
        const alphaDeg = output?.debugPhysics?.alpha !== undefined ? toDeg(output.debugPhysics.alpha) : 0;
        const stallAlphaDeg = physics.warningSystem?.thresholds?.stallAlpha ?? 15;
        const stallSpeedKts = physics.aircraft?.stallSpeed ?? null;
        const stallByAlpha = !onGround && alphaDeg > stallAlphaDeg;
        const stallBySpeed = !onGround && stallSpeedKts !== null && airspeedKts < stallSpeedKts;
        const stallWarning = Array.isArray(output?.activeWarnings) && output.activeWarnings.some(w => w.id === 'STALL');
        const stall = stallWarning || stallByAlpha || stallBySpeed;
        this.history.push({
            time,
            pitch: pitchDeg,
            roll: rollDeg,
            yaw: yawDeg,
            altitude: altitudeFt,
            airspeed: airspeedKts,
            groundSpeed: groundSpeedKts,
            verticalSpeed: verticalSpeedFpm,
            alpha: alphaDeg,
            stallAlpha: stallAlphaDeg,
            stallSpeed: stallSpeedKts,
            stallWarning,
            stall,
            eng1_n1: physics.engines[0]?.state.n1 || 0,
            eng2_n1: physics.engines[1]?.state.n1 || 0,
            eng1_egt: physics.engines[0]?.state.egt || 0,
            eng2_egt: physics.engines[1]?.state.egt || 0,
            hydPress: physics.systems.hydraulics?.sysA?.pressure || 0,
            elecVolts: physics.systems.electrical?.acVolts || 0,
            onGround,
            phase: inferPhase(onGround, airspeedKts, pitchDeg, altitudeFt)
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
        let maxAlpha = 0;
        let stallFrames = 0;

        this.history.forEach(h => {
            if (Math.abs(h.roll) > maxRoll) maxRoll = Math.abs(h.roll);
            if (Math.abs(h.pitch) > maxPitch) maxPitch = Math.abs(h.pitch);
            if (h.altitude < minAlt) minAlt = h.altitude;
            if (Math.abs(h.altitude - start.altitude) > maxAltChange) maxAltChange = Math.abs(h.altitude - start.altitude);
            if (Math.abs(h.alpha) > maxAlpha) maxAlpha = Math.abs(h.alpha);
            if (h.stall) stallFrames += 1;
        });

        const rollDeg = maxRoll.toFixed(1);
        const pitchDeg = maxPitch.toFixed(1);
        const alphaDeg = maxAlpha.toFixed(1);
        const altDrop = (start.altitude - end.altitude).toFixed(0);
        const dt = this.history.length > 1 ? (this.history[1].time - this.history[0].time) : 0;
        const stallTime = (stallFrames * dt).toFixed(2);

        return `
=== FLIGHT EVALUATION REPORT ===
Duration: ${end.time.toFixed(1)}s
Aircraft: ${SIM_CONFIG.aircraftModel}

1. PHYSICAL STABILITY:
   - Max Roll Deviation: ${rollDeg}° ${rollDeg > 30 ? "(CRITICAL INSTABILITY)" : "(Stable)"}
   - Max Pitch Deviation: ${pitchDeg}°
   - Max AoA: ${alphaDeg}°
   - Altitude Change: ${altDrop} ft ${altDrop > 1000 ? "(SIGNIFICANT DESCENT)" : "(Maintained)"}

2. SYSTEM BEHAVIOR:
   - Final N1: ENG1 ${end.eng1_n1.toFixed(1)}% | ENG2 ${end.eng2_n1.toFixed(1)}%
   - Electrical: ${end.elecVolts.toFixed(0)}V ${end.elecVolts < 110 ? "(FAILURE DETECTED)" : "(Normal)"}
   - Hydraulics: ${end.hydPress.toFixed(0)} PSI
   - Stall Time: ${stallTime}s

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

const inferPhase = (onGround, airspeedKts, pitchDeg, altitudeFt) => {
    if (onGround && airspeedKts < 30) return 'ground_idle';
    if (onGround && airspeedKts >= 30) return 'ground_roll';
    if (!onGround && altitudeFt < 200 && pitchDeg > 4) return 'rotation';
    if (!onGround && altitudeFt < 1500) return 'initial_climb';
    return 'climb_cruise';
};

const getDefaultLogPath = (mode, failureId) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.resolve(process.cwd(), `failure_${failureId}_${mode}_${stamp}.csv`);
};

const writeLogFile = (logPath, recorder) => {
    const header = [
        'time_s',
        'phase',
        'airspeed_kts',
        'groundSpeed_kts',
        'altitude_ft',
        'verticalSpeed_fpm',
        'pitch_deg',
        'roll_deg',
        'yaw_deg',
        'alpha_deg',
        'stallAlpha_deg',
        'stallSpeed_kts',
        'stallWarning',
        'stall',
        'eng1_n1',
        'eng2_n1',
        'eng1_egt',
        'eng2_egt',
        'hydPress_psi',
        'elecVolts',
        'onGround'
    ].join(',');
    const rows = recorder.history.map(h => [
        h.time.toFixed(2),
        h.phase,
        h.airspeed.toFixed(1),
        h.groundSpeed.toFixed(1),
        h.altitude.toFixed(1),
        h.verticalSpeed.toFixed(0),
        h.pitch.toFixed(2),
        h.roll.toFixed(2),
        h.yaw.toFixed(2),
        h.alpha.toFixed(2),
        h.stallAlpha.toFixed(1),
        h.stallSpeed === null ? '' : h.stallSpeed.toFixed(1),
        h.stallWarning ? 1 : 0,
        h.stall ? 1 : 0,
        h.eng1_n1.toFixed(1),
        h.eng2_n1.toFixed(1),
        h.eng1_egt.toFixed(0),
        h.eng2_egt.toFixed(0),
        h.hydPress.toFixed(0),
        h.elecVolts.toFixed(0),
        h.onGround ? 1 : 0
    ].join(','));
    const csv = [header, ...rows].join('\n');
    fs.writeFileSync(logPath, csv, 'utf-8');
    return logPath;
};

const parseArgs = (args) => {
    const options = {
        mode: 'cruise',
        duration: SIM_CONFIG.simDuration,
        triggerAt: 0,
        logPath: null,
        takeoffSpeed: 150
    };
    const extras = [];
    args.forEach(arg => {
        if (arg.startsWith('--mode=')) options.mode = arg.split('=')[1];
        else if (arg.startsWith('--duration=')) options.duration = parseFloat(arg.split('=')[1]);
        else if (arg.startsWith('--triggerAt=')) options.triggerAt = parseFloat(arg.split('=')[1]);
        else if (arg.startsWith('--log=')) options.logPath = arg.split('=')[1];
        else if (arg.startsWith('--takeoffSpeed=')) options.takeoffSpeed = parseFloat(arg.split('=')[1]);
        else extras.push(arg);
    });
    return { options, extras };
};

const configureCruise = (physics, params) => {
    console.log(`⚙️  Initializing Flight State: Alt ${params.altitude}ft, Spd ${params.airspeed}kts`);
    physics.setInitialConditions({
        position: { z: params.altitude * 0.3048 },
        heading: params.heading,
        fuel: params.fuel,
        coldStart: false
    });
    const trueAirspeedMs = params.airspeed * 0.514444;
    physics.state.vel.set(trueAirspeedMs, 0, 0);
    physics.controls.throttle = 1.0;
    if (Array.isArray(physics.controls.engineThrottles)) {
        physics.controls.engineThrottles = physics.controls.engineThrottles.map(() => 1.0);
    }
    physics.systems.electrical.battery = true;
    physics.systems.electrical.gen1 = true;
    physics.systems.electrical.gen2 = true;
    physics.systems.electrical.stbyPower = true;
    physics.systems.electrical.acVolts = 115;
    physics.systems.electrical.dcVolts = 28;
    physics.systems.electrical.sourceOff1 = false;
    physics.systems.electrical.sourceOff2 = false;
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
    physics.systems.fuel.leftPumps = true;
    physics.systems.fuel.rightPumps = true;
    physics.systems.fuel.centerPumps = false;
    physics.systems.fuel.crossfeed = false;
    physics.systems.pressurization.packL = true;
    physics.systems.pressurization.packR = true;
    physics.systems.pressurization.bleed1 = true;
    physics.systems.pressurization.bleed2 = true;
    physics.systems.pressurization.isolationValve = true;
    physics.systems.lighting.nav = true;
    physics.systems.lighting.beacon = true;
    physics.systems.lighting.strobe = true;
    physics.engines.forEach((eng, i) => {
        eng.state.running = true;
        eng.state.n1 = 95;
        eng.state.n2 = 95;
        eng.state.egt = 650;
        eng.state.oilPressure = 80;
        eng.state.fuelFlow = 2.0;
        eng.setThrottle(1.0);
        if (physics.systems.engines[`eng${i+1}`]) {
            physics.systems.engines[`eng${i+1}`].n2 = 95;
            physics.systems.engines[`eng${i+1}`].egt = 650;
            physics.systems.engines[`eng${i+1}`].fuelControl = true;
            physics.systems.engines[`eng${i+1}`].startSwitch = 'OFF';
        }
    });
    console.log("🔥 Spooling Engines to Cruise Power...");
    physics.engines.forEach((eng, i) => {
        eng.state.running = true;
        eng.state.n1 = 85.0; 
        eng.state.n2 = 90.0;
        eng.state.egt = 650;
        eng.state.oilPressure = 80;
        eng.state.fuelFlow = 1.2;
        eng.setThrottle(0.65);
        if (physics.systems.engines[`eng${i+1}`]) {
            physics.systems.engines[`eng${i+1}`].n2 = 90.0;
            physics.systems.engines[`eng${i+1}`].egt = 650;
            physics.systems.engines[`eng${i+1}`].fuelControl = true;
            physics.systems.engines[`eng${i+1}`].startSwitch = 'OFF';
        }
    });
    console.log("🤖 Engaging Autopilot (Alt Hold, Hdg Hold, AutoThrottle)...");
    physics.setAutopilot(true, {
        speed: 280,
        altitude: params.altitude,
        heading: params.heading,
        vs: 0,
        mode: 'LNAV'
    });
};

const configureTakeoff = (physics, params, options) => {
    console.log("⚙️  Initializing Takeoff State: On runway, engines idle");
    physics.setInitialConditions({
        position: { z: 0 },
        heading: params.heading,
        fuel: params.fuel,
        coldStart: false,
        gear: true,
        brakes: 1,
        throttle: 0
    });
    physics.setMotionEnabled(true);
    physics.controls.flaps = 0.15;
    physics.controls.brakes = 0;
    if (physics.systems.brakes) {
        physics.systems.brakes.parkingBrake = false;
    }
    physics.systems.lighting.nav = true;
    physics.systems.lighting.beacon = true;
    physics.systems.lighting.strobe = true;
    physics.engines.forEach((eng, i) => {
        eng.state.running = true;
        eng.state.n1 = 20.0;
        eng.state.n2 = 50.0;
        eng.state.egt = 420;
        eng.state.oilPressure = 60;
        eng.state.fuelFlow = 0.8;
        eng.setThrottle(0.98);
        if (physics.systems.engines[`eng${i+1}`]) {
            physics.systems.engines[`eng${i+1}`].n2 = 50.0;
            physics.systems.engines[`eng${i+1}`].egt = 420;
            physics.systems.engines[`eng${i+1}`].fuelControl = true;
            physics.systems.engines[`eng${i+1}`].startSwitch = 'OFF';
        }
    });
    const takeoffSpeed = Number.isFinite(options.takeoffSpeed) ? options.takeoffSpeed : 150;
    const takeoffSpeedMs = Math.max(0, takeoffSpeed) * 0.514444;
    physics.state.vel.set(takeoffSpeedMs, 0, 0);
    physics.setAutopilot(false);
};

// --- Main Simulation Function ---
async function runSimulation(failureId, failureContext = {}, customParams = {}, options = {}) {
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

    const params = { ...SIM_CONFIG.flightParams, ...customParams };
    
    // 2. Initialize Physics Service with REAL data
    const physics = new RealisticFlightPhysicsService(aircraftConfig, 0, 0, SIM_CONFIG.difficulty);
    if (options.mode === 'takeoff') {
        configureTakeoff(physics, params, options);
    } else {
        configureCruise(physics, params);
    }

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

    if (options.mode !== 'takeoff') {
        console.log("⏳ Stabilizing (2s)...");
        for(let i=0; i<20; i++) {
            physics.update({ throttle: 0.65, pitch: 0, roll: 0, yaw: 0 }, 0.1);
        }
    }
    
    // 5. Run Simulation Loop
    log(`▶️  Running Simulation for ${options.duration}s...`);
    
    const steps = options.duration / SIM_CONFIG.dt;
    let lastLogTime = 0;
    let time = 0;
    let failureTriggered = false;
    
    for (let step = 0; step < steps; step++) {
        time = step * SIM_CONFIG.dt;
        physics.time = time; // Inject time for logging
        if (!failureTriggered && time >= options.triggerAt) {
            log(`⚠️  Triggering Failure: ${failureId}`);
            if (physics.failureSystem) {
                const ctx = { ...failureContext, difficulty: SIM_CONFIG.difficulty };
                physics.failureSystem.triggerFailure(failureId, ctx);
                recorder.logEvent(time, 'TRIGGER', `Simulated ${failureId}`);
                failureTriggered = true;
            } else {
                log(`❌ Error: Failure System not available`);
                process.exit(1);
            }
        }
        
        if (options.mode === 'takeoff') {
            const throttleRamp = time < 2 ? 0.9 + (time / 2) * 0.08 : 0.98;
            const brakes = 0;
            physics.update({ 
                throttle: throttleRamp, 
                pitch: 0, 
                roll: 0, 
                yaw: 0,
                trim: 0,
                brakes
            }, SIM_CONFIG.dt);
        } else {
            physics.update({}, SIM_CONFIG.dt);
        }
        
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
    const logPath = options.logPath || getDefaultLogPath(options.mode, failureId);
    const writtenPath = writeLogFile(logPath, recorder);
    log(`🧾 Flight status log saved: ${writtenPath}`);
    
    // Cleanup
    unsub();
    unsub2();
    log(`✅ Simulation Complete`);
    process.exit(0);
}

function logStatus(time, physics) {
    const eng1 = physics.engines[0];
    const eng2 = physics.engines[1];
    const euler = physics.state.quat.toEuler();
    const pitchDeg = euler.theta * 57.2958;
    const rollDeg = euler.phi * 57.2958;
    const yawDeg = (euler.psi * 57.2958 + 360) % 360;
    const airspeedKts = physics.state.vel.magnitude() * 1.94384;
    const altitudeFt = -physics.state.pos.z / 0.3048;
    
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
        `SPD=${airspeedKts.toFixed(1)}kts ALT=${altitudeFt.toFixed(0)}ft ` +
        `PITCH=${pitchDeg.toFixed(1)}° ROLL=${rollDeg.toFixed(1)}° YAW=${yawDeg.toFixed(1)}° ` +
        `ENG1: N1=${eng1.state.n1.toFixed(1)}% EGT=${eng1.state.egt.toFixed(0)} VIB=${(eng1.state.vibration || 0).toFixed(1)} [${fire1}] | ` +
        `ENG2: N1=${eng2.state.n1.toFixed(1)}% EGT=${eng2.state.egt.toFixed(0)} VIB=${(eng2.state.vibration || 0).toFixed(1)} [${fire2}]`
    );
    log(`           SYS : ELEC [G1:${gen1} G2:${gen2} ${volts}V] | HYD [A:${hydA} B:${hydB}] | BLEED [L:${ductL} R:${ductR}] | FUEL [L:${fuelL} R:${fuelR}]`);
}

// --- Execution ---
// Get args from command line if running via node
const args = process.argv.slice(2);
const { options, extras } = parseArgs(args);
const failureArg = extras[0] || 'engine_fire';
const engineIndexArg = extras[1] ? parseInt(extras[1]) : 0;
if (options.mode === 'takeoff' && options.triggerAt === 0) {
    options.triggerAt = 5;
}

runSimulation(failureArg, { engineIndex: engineIndexArg }, {}, options)
    .catch(err => {
        console.error('❌ Simulation Failed:', err);
        process.exit(1);
    });
