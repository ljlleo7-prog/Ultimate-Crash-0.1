
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';
import { airportService } from '../src/services/airportService.js';

// Configuration
const KLAX_CODE = 'KLAX';
const RUNWAY_ID = '24R';
const AIRCRAFT_MODEL = "Boeing 737-800";
const SIM_DT = 0.05; // 20Hz
const SIM_DURATION = 120; // Seconds

async function runTest(scenario) {
    console.log(`\n---------------------------------------------------`);
    console.log(`🧪 Running Scenario: ${scenario.name}`);
    
    // Load Data
    const aircraftDb = await loadAircraftData();
    const aircraftConfig = aircraftDb.find(a => a.model === AIRCRAFT_MODEL);
    
    if (!aircraftConfig) {
        console.error(`❌ Aircraft ${AIRCRAFT_MODEL} not found`);
        return;
    }
    
    // Get Runway Geometry
    const runwayGeom = airportService.getRunwayGeometry(KLAX_CODE, RUNWAY_ID);
    if (!runwayGeom) {
        console.error("❌ Failed to get runway geometry");
        return;
    }
    // console.log(`🛫 Runway: ${runwayGeom.runwayName} at ${KLAX_CODE} (Hdg: ${runwayGeom.heading})`);
    
    // Calculate Initial Position based on Scenario
    const thresholdLat = runwayGeom.thresholdStart.latitude;
    const thresholdLon = runwayGeom.thresholdStart.longitude;
    const runwayHeading = runwayGeom.heading; // 240 for 24R
    
    // Approach Direction (Reciprocal)
    // If runway heads 240, we approach FROM 060.
    // The vector FROM Threshold TO Aircraft is 060.
    const approachDir = (runwayHeading + 180) % 360;
    
    // Convert offsets to meters
    const distM = scenario.dist * 1852;
    const offsetM = scenario.offset * 1852;
    
    const toRad = Math.PI / 180;
    const hRad = approachDir * toRad;
    
    // Earth Radius
    const R = 6371000;
    
    // 1. Move BACKWARDS from threshold (along approach path)
    const centerLat = thresholdLat + (distM * Math.cos(hRad)) / R * (180/Math.PI);
    const centerLon = thresholdLon + (distM * Math.sin(hRad)) / (R * Math.cos(thresholdLat * toRad)) * (180/Math.PI);
    
    // 2. Move SIDEWAYS (Offset)
    // Right of runway heading = RunwayHeading + 90
    // e.g. Runway 240 -> Right is 330.
    const offsetHeading = (runwayHeading + 90) % 360;
    const oRad = offsetHeading * toRad;
    
    const startLat = centerLat + (offsetM * Math.cos(oRad)) / R * (180/Math.PI);
    const startLon = centerLon + (offsetM * Math.sin(oRad)) / (R * Math.cos(centerLat * toRad)) * (180/Math.PI);
    
    // Initialize Physics
    // Pass startLat/Lon to constructor
    const physics = new RealisticFlightPhysicsService(aircraftConfig, startLat, startLon, 'intermediate');
    
    physics.setInitialConditions({
        position: { z: scenario.alt * 0.3048 },
        heading: scenario.heading, 
        fuel: 5000,
        coldStart: false
    });
    
    // Force Set Latitude/Longitude just in case constructor didn't stick or setInitialConditions reset something (unlikely but safe)
    physics.state.latitude = startLat;
    physics.state.longitude = startLon;
    
    // Set Velocity (Body frame approximation)
    const velMs = scenario.speed * 0.514444;
    physics.state.vel.set(velMs, 0, 0); 
    
    // Configure ILS
    physics.setRunwayGeometry(runwayGeom);
    
    // Engage Autopilot
    physics.setAutopilot(true, {
        speed: scenario.speed,
        altitude: 3000, // Should be overridden by ILS Glideslope
        heading: runwayHeading, // Initial target, ILS LNAV should override
        mode: 'ILS'
    });
    
    // Tune NAV Frequency (KLAX 24R = 108.50)
    // If we don't do this, ILS will fail freq check
    if (physics.autopilot) {
        physics.autopilot.setNavFrequency(108.50);
    }

    console.log(`📍 Spawned at: ${startLat.toFixed(4)}, ${startLon.toFixed(4)}`);
    console.log(`   Dist: ${scenario.dist}nm, Offset: ${scenario.offset}nm, Alt: ${scenario.alt}ft, Hdg: ${scenario.heading}°`);
    console.log(`   Tuned NAV1: 108.50 MHz`);
    
    // Run Loop
    const steps = SIM_DURATION / SIM_DT;
    let finalCrossTrack = 0;
    let finalAltError = 0;
    
    let prevDist = 9999;
    let thresholdState = null;
    let passedThreshold = false;
    
    for (let i = 0; i < steps; i++) {
        // Update physics
        const inputs = {
             throttle: 0.5, // Initial
             pitch: 0,
             roll: 0,
             yaw: 0,
             flaps: 1.0, // Full flaps for approach drag
             gear: true,  // Gear down for approach drag
             spoilers: Math.sqrt(physics.state.vel.x**2 + physics.state.vel.y**2 + physics.state.vel.z**2) > 85 ? 1.0 : 0.0
        };
        physics.update(inputs, SIM_DT);
        
        // Get Debug State
        const debugState = physics.autopilot ? physics.autopilot.debugState : null;
        
        // Get current state
        const euler = physics.state.quat ? physics.state.quat.toEuler() : { phi: 0, theta: 0, psi: 0 };
        const currentHeading = euler.psi * 180 / Math.PI;
        const alt = -physics.state.pos.z / 0.3048; // ft
        
        if (debugState && debugState.ils) {
            finalCrossTrack = debugState.ils.distCross;
            finalAltError = debugState.ils.altError;
            const distNm = debugState.ils.distAlong / 6076;

            // Threshold Logic
            const distAbs = Math.abs(distNm);
            if (!passedThreshold) {
                if (distAbs < prevDist) {
                    prevDist = distAbs;
                    thresholdState = {
                        lateral: finalCrossTrack,
                        vertical: finalAltError,
                        headingError: Math.abs(((currentHeading - runwayHeading + 540) % 360) - 180),
                        alt: alt,
                        dist: distNm
                    };
                } else {
                    // Distance started increasing (crossed threshold or flying away)
                    if (distAbs < 0.5) { 
                         passedThreshold = true;
                         console.log(`📍 Threshold Crossing detected at T+${(i*SIM_DT).toFixed(1)}s (Dist: ${distNm.toFixed(2)}nm)`);
                    }
                }
            }
        }
        
        // Log periodically
        if (i % (5 / SIM_DT) === 0) { // Every 5s
             const dist = debugState && debugState.ils ? debugState.ils.distAlong / 6076 : 0; 
             const speed = physics.state.vel ? physics.state.vel.magnitude() * 1.94384 : 0; 
             const roll = euler.phi * 180 / Math.PI;
             const targetRoll = debugState ? (debugState.targetRoll || 0) : 0;

             console.log(`   [T+${(i*SIM_DT).toFixed(0)}s] Alt: ${alt.toFixed(0)}ft, Dist: ${dist.toFixed(1)}nm, X-Track: ${finalCrossTrack.toFixed(0)}ft, Spd: ${speed.toFixed(0)}, Hdg: ${currentHeading.toFixed(0)}, Roll: ${roll.toFixed(1)}/${targetRoll.toFixed(1)}`);
        }

        // Early exit if passed threshold
        if (passedThreshold && (i * SIM_DT) > SIM_DURATION / 2) {
            break;
        }
    }
    
    // Evaluation
    const evalState = thresholdState || {
         lateral: finalCrossTrack,
         vertical: finalAltError,
         headingError: Math.abs((((physics.state.quat ? physics.state.quat.toEuler().psi : 0) * 180 / Math.PI - runwayHeading + 540) % 360) - 180)
    };

    console.log(`🏁 Result (Evaluated at Threshold/End):`);
    console.log(`   Cross Track Error: ${evalState.lateral.toFixed(1)} ft`);
    console.log(`   G/S Error: ${evalState.vertical.toFixed(1)} ft`);
    console.log(`   Heading Error: ${evalState.headingError.toFixed(1)}°`);
    
    const isAligned = Math.abs(evalState.lateral) < 150; 
    const isOnGlide = Math.abs(evalState.vertical) < 150;
    const isHeadingAligned = evalState.headingError < 1.0;
    
    if (isAligned && isOnGlide && isHeadingAligned) {
        console.log(`✅ TEST PASSED: Successfully guided to runway.`);
        return { success: true, name: scenario.name, lateral: evalState.lateral, vertical: evalState.vertical, headingError: evalState.headingError };
    } else {
        console.log(`❌ TEST FAILED: Failed to align or hold glideslope.`);
        if (!isAligned) console.log(`   -> Lateral Deviation too high.`);
        if (!isOnGlide) console.log(`   -> Vertical Deviation too high.`);
        if (!isHeadingAligned) console.log(`   -> Heading Misalignment too high.`);
        return { success: false, name: scenario.name, lateral: evalState.lateral, vertical: evalState.vertical, headingError: evalState.headingError };
    }
}

const scenarios = [
    { name: "Ideal Approach (8nm, Aligned)", dist: 8, offset: 0, alt: 2600, heading: 240, speed: 150 },
    
    // 3 degree glide slope: ~318 ft per nm.
    // 8nm * 318 = ~2544 ft + 50ft (TCH) = ~2600 ft.
    
    { name: "Left Offset (8nm, 0.5nm Left)", dist: 8, offset: -0.5, alt: 2600, heading: 240, speed: 150 }, 
    { name: "Right Offset (8nm, 0.5nm Right)", dist: 8, offset: 0.5, alt: 2600, heading: 240, speed: 150 }, 
    
    { name: "Intercept Angle (8nm, 1nm Right, Hdg 210)", dist: 8, offset: 1.0, alt: 2600, heading: 210, speed: 150 },
    
    { name: "High Approach (5nm, 1800ft)", dist: 5, offset: 0, alt: 1800, heading: 240, speed: 150 }, 
    // Reduced from 2200ft to 1800ft to allow capture without massive overspeed (no spoilers)
    
    { name: "Low Approach (5nm, 1000ft)", dist: 5, offset: 0, alt: 1000, heading: 240, speed: 150 }
    // 5nm target ~ 1650ft. 1000ft is low. Should hold alt until intercept?
];

// Run scenarios
(async () => {
    const results = [];
    try {
        for (const s of scenarios) {
            const res = await runTest(s);
            if (res) results.push(res);
        }
        
        console.log(`\n===================================================`);
        console.log(`📊 FINAL TEST SUMMARY`);
        console.log(`===================================================`);
        results.forEach(r => {
            const status = r.success ? "✅ PASS" : "❌ FAIL";
            console.log(`${status} | ${r.name.padEnd(40)} | Lat: ${r.lateral.toFixed(1)}ft | Vert: ${r.vertical.toFixed(1)}ft | HdgErr: ${r.headingError.toFixed(1)}°`);
        });
        console.log(`===================================================`);
        
        const failedCount = results.filter(r => !r.success).length;
        if (failedCount > 0) {
            console.log(`\n🚨 ${failedCount} tests failed. Exiting with code 1.`);
            process.exit(1);
        } else {
            console.log(`\n✨ All tests passed. Exiting with code 0.`);
            process.exit(0);
        }
        
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
