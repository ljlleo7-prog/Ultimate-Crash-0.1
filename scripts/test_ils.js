
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';
import { airportService } from '../src/services/airportService.js';

// Configuration
// Defaults used when scenario does not specify airport/runway
const DEFAULT_AIRPORT = 'KLAX';
const DEFAULT_RUNWAY = '24R';
const AIRCRAFT_MODEL = "Boeing 737-800";
const SIM_DT = 0.05; // 20Hz
const SIM_DURATION = 500; // Seconds (Increased to allow 15nm approaches to complete)

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
    const airportCode = scenario.airport || DEFAULT_AIRPORT;
    const runwayId = scenario.runway || DEFAULT_RUNWAY;
    const runwayGeom = airportService.getRunwayGeometry(airportCode, runwayId);
    if (!runwayGeom) {
        console.error("❌ Failed to get runway geometry");
        return;
    }
    // console.log(`🛫 Runway: ${runwayGeom.runwayName} at ${airportCode} (Hdg: ${runwayGeom.heading})`);
    
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
    
    let startLat, startLon, initHeading, initAlt;
    if (scenario.randomStart) {
        const radialCenter = approachDir;
        const radial = (radialCenter + (Math.random() * 60 - 30) + 360) % 360;
        const randDistNm = 12 + Math.random() * 5;
        const randDistM = randDistNm * 1852;
        const rRad = radial * toRad;
        startLat = thresholdLat + (randDistM * Math.cos(rRad)) / R * (180/Math.PI);
        startLon = thresholdLon + (randDistM * Math.sin(rRad)) / (R * Math.cos(thresholdLat * toRad)) * (180/Math.PI);
        const headingJitter = (Math.random() * 60 - 30);
        initHeading = (runwayHeading + headingJitter + 360) % 360;
        initAlt = scenario.alt || 4000;
    } else {
        // 1. Move BACKWARDS from threshold (along approach path)
        const centerLat = thresholdLat + (distM * Math.cos(hRad)) / R * (180/Math.PI);
        const centerLon = thresholdLon + (distM * Math.sin(hRad)) / (R * Math.cos(thresholdLat * toRad)) * (180/Math.PI);
        
        // 2. Move SIDEWAYS (Offset)
        // Right of runway heading = RunwayHeading + 90
        // e.g. Runway 240 -> Right is 330.
        const offsetHeading = (runwayHeading + 90) % 360;
        const oRad = offsetHeading * toRad;
        
        startLat = centerLat + (offsetM * Math.cos(oRad)) / R * (180/Math.PI);
        startLon = centerLon + (offsetM * Math.sin(oRad)) / (R * Math.cos(centerLat * toRad)) * (180/Math.PI);
        initHeading = scenario.heading;
        initAlt = scenario.alt;
    }
    
    // Initialize Physics
    // Pass startLat/Lon to constructor
    const physics = new RealisticFlightPhysicsService(aircraftConfig, startLat, startLon, 'intermediate');
    
    physics.setInitialConditions({
        position: { z: initAlt * 0.3048 },
        heading: initHeading, 
        fuel: 5000,
        coldStart: false
    });
    
    // Force Set Latitude/Longitude just in case constructor didn't stick or setInitialConditions reset something (unlikely but safe)
    physics.state.latitude = startLat;
    physics.state.longitude = startLon;
    
    // Set Velocity (Body frame approximation)
    const velMs = scenario.speed * 0.514444;
    physics.state.vel.set(velMs, 0, 0); 
    
    // Configure ILS / Runway Geometry
    physics.setRunwayGeometry(runwayGeom);

    // Enable Motion (Fix for speed=0 issue)
    physics.setMotionEnabled(true);
    
    // Phase 1: Use LNAV with pre-turn to intercept a 15nm localizer inbound
    if (scenario.useNavPreTurn && physics.autopilot && physics.autopilot.setNavigationPlan) {
        const fifteenNmM = 15 * 1852;
        const toRad = Math.PI / 180;
        const inbound = runwayHeading;
        const inboundRad = inbound * toRad;
        const fixLat = thresholdLat - (fifteenNmM * Math.cos(inboundRad)) / R * (180/Math.PI);
        const fixLon = thresholdLon - (fifteenNmM * Math.sin(inboundRad)) / (R * Math.cos(thresholdLat * toRad)) * (180/Math.PI);
        
        physics.autopilot.setNavigationPlan({
            fix: { latitude: fixLat, longitude: fixLon, altitude: 4000 },
            inboundCourseDeg: inbound,
            leadBankDeg: 25
        });
        
        physics.setAutopilot(true, {
            speed: scenario.speed,
            altitude: initAlt,
            heading: initHeading,
            mode: 'LNAV'
        });
    } else {
        physics.setAutopilot(true, {
            speed: scenario.speed,
            altitude: 3000,
            heading: runwayHeading,
            mode: 'ILS'
        });
    }
    
    // Tune NAV Frequency (use geometry frequency) for later ILS
    if (physics.autopilot) {
        physics.autopilot.setNavFrequency(runwayGeom.ilsFrequency || 108.50);
    }

    console.log(`📍 Spawned at: ${startLat.toFixed(4)}, ${startLon.toFixed(4)}`);
    console.log(`   Airport: ${airportCode}, Runway: ${runwayGeom.runwayName} (Hdg ${runwayHeading})`);
    console.log(`   Dist: ${scenario.dist}nm, Offset: ${scenario.offset}nm, Alt: ${scenario.alt}ft, Hdg: ${scenario.heading}°`);
    console.log(`   Tuned NAV1: ${(runwayGeom.ilsFrequency || 108.50).toFixed(2)} MHz`);
    
    // Run Loop
    const duration = SIM_DURATION;
    const steps = duration / SIM_DT;
    let finalCrossTrack = 0;
    let finalAltError = 0;
    const computeRunwayMetrics = () => {
        const latRad = thresholdLat * Math.PI / 180;
        const metersPerLat = 111132.92;
        const metersPerLon = 111412.84 * Math.cos(latRad);
        const dx = (physics.state.geo.lat - thresholdLat) * metersPerLat;
        const dy = (physics.state.geo.lon - thresholdLon) * metersPerLon;
        const rH = runwayHeading * Math.PI / 180;
        const ux = Math.cos(rH);
        const uy = Math.sin(rH);
        const along = dx * ux + dy * uy;
        const cross = -dx * uy + dy * ux;
        const distToThresholdFt = -along * 3.28084;
        let targetAlt = 50;
        if (distToThresholdFt > 0 && distToThresholdFt < 90000) {
            targetAlt = 50 + (distToThresholdFt * Math.tan(3 * Math.PI / 180));
        }
        const currentAltFt = -physics.state.pos.z * 3.28084;
        return { distAlongFt: along * 3.28084, distCrossFt: cross * 3.28084, altErrorFt: targetAlt - currentAltFt };
    };
    
    let prevDist = 9999;
    let thresholdState = null;
    let passedThreshold = false;
    
    const ilsSwitchTime = scenario.useNavPreTurn ? Infinity : SIM_DURATION + 1;
    for (let i = 0; i < steps; i++) {
        // Update physics
        const inputs = {
             throttle: 0.5, // Initial
             pitch: 0,
             roll: 0,
             yaw: 0,
             trim: 0, // Ensure trim is defined
             flaps: 1.0, // Full flaps for approach drag
             gear: true,  // Gear down for approach drag
             spoilers: Math.sqrt(physics.state.vel.x**2 + physics.state.vel.y**2 + physics.state.vel.z**2) > 85 ? 1.0 : 0.0
        };
        physics.update(inputs, SIM_DT);
        
        const t = i * SIM_DT;
        if (!scenario.useNavPreTurn) {
            if (t > ilsSwitchTime && physics.autopilot && physics.autopilot.mode !== 'ILS') {
                physics.autopilot.setTargets({ mode: 'ILS' });
            }
        } else {
            const ds = physics.autopilot ? physics.autopilot.debugState : null;
            const lnav = ds && ds.lnav;
            if (lnav && physics.autopilot.mode === 'LNAV') {
                // Switch to ILS when approaching the fix OR if we are aligned and in range
                const distToFixNm = (lnav.dist_m || 0) / 1852;
                
                // Check for LNAV -> ILS Handover
                // Switch if we are somewhat aligned and within range
                const metrics = computeRunwayMetrics();
                const isAligned = Math.abs(metrics.distCrossFt) < 20000; // Relaxed to ~3.3nm to ensure early capture
                const distToRunwayNm = Math.abs(metrics.distAlongFt / 6076);
                
                // Also check heading alignment to avoid premature capture if flying away
                // But for "Pre-Turn", we assume we are flying TOWARDS the fix generally.
                // Let's trust the distance and cross-track.

                if (distToRunwayNm < 25.0 && isAligned) {
                    physics.autopilot.setTargets({ mode: 'ILS' });
                    const euler = physics.state.quat ? physics.state.quat.toEuler() : { psi: 0 };
                    const currentHeading = (euler.psi * 180 / Math.PI + 360) % 360;
                    const hdgDiff = Math.abs(((currentHeading - lnav.inbound + 540) % 360) - 180);
                    console.log(`🔄 Switched to ILS at T+${t.toFixed(1)}s (Dist to Runway ${distToRunwayNm.toFixed(2)}nm, hdg diff ${hdgDiff.toFixed(1)}°, xtrack ${Math.abs(metrics.distCrossFt).toFixed(0)}ft)`);
                }
            }
        }
        
        // Get Debug State
        const debugState = physics.autopilot ? physics.autopilot.debugState : null;
        
        // Get current state
        const euler = physics.state.quat ? physics.state.quat.toEuler() : { phi: 0, theta: 0, psi: 0 };
        const currentHeading = euler.psi * 180 / Math.PI;
        const alt = -physics.state.pos.z / 0.3048; // ft
        
        const metrics = computeRunwayMetrics();
        finalCrossTrack = metrics.distCrossFt;
        finalAltError = metrics.altErrorFt;
        if (debugState && debugState.ils && debugState.ils.active) {
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
             const distIlsNm = (debugState && debugState.ils && debugState.ils.active) ? debugState.ils.distAlong / 6076 : null; 
             const distLnavNm = (debugState && debugState.lnav && typeof debugState.lnav.dist_m === 'number') ? (debugState.lnav.dist_m / 1852) : null;
             const dist = distIlsNm !== null ? distIlsNm : (distLnavNm !== null ? distLnavNm : 0);
             const speed = physics.state.vel ? physics.state.vel.magnitude() * 1.94384 : 0; 
             const roll = euler.phi * 180 / Math.PI;
             const targetRoll = debugState ? (debugState.targetRoll || 0) : 0;
             const lnavDelta = (debugState && debugState.lnav && typeof debugState.lnav.delta === 'number') ? `, Δ${Math.round(debugState.lnav.delta)}°` : '';
              let modeMsg = '';
              if (physics.autopilot && physics.autopilot.mode === 'ILS') {
                  const locErr = debugState && debugState.ils ? (debugState.ils.locDeviation || 0).toFixed(2) : '?';
                  const gsErr = debugState && debugState.ils ? (debugState.ils.gsDeviation || 0).toFixed(2) : '?';
                  modeMsg = ` | ILS: Loc ${locErr}°, GS ${gsErr}°`;
              } else if (debugState && debugState.lnavMessage) {
                  modeMsg = ` | LNAV: ${debugState.lnavMessage}${lnavDelta}`;
              }
              console.log(`   [T+${(i*SIM_DT).toFixed(0)}s] Alt: ${alt.toFixed(0)}ft, Dist: ${dist.toFixed(1)}nm, X-Track: ${finalCrossTrack.toFixed(0)}ft, Spd: ${speed.toFixed(0)}, Hdg: ${currentHeading.toFixed(0)}, Roll: ${roll.toFixed(1)}/${targetRoll.toFixed(1)}${modeMsg}`);
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
    
    // Stricter Criteria per User Request (< 20ft ideal, < 30ft acceptable)
    const isAligned = Math.abs(evalState.lateral) < 30; 
    const isOnGlide = Math.abs(evalState.vertical) < 30;
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
    // KLAX - RWY 24R
    { name: "KLAX 24R | 15nm Centerline, Wrong Heading (+90°)", airport: "KLAX", runway: "24R", dist: 15, offset: 0.0, alt: 4000, heading: 240 + 90, speed: 180 },
    { name: "KLAX 24R | Far Intercept (15nm, 2nm Right)",       airport: "KLAX", runway: "24R", dist: 15, offset: 2.0, alt: 4000, heading: 240,       speed: 180 },
    { name: "KLAX 24R | 10nm, 1nm Left, Hdg 210",               airport: "KLAX", runway: "24R", dist: 10, offset: -1.0, alt: 2600, heading: 210,     speed: 160 },
    { name: "KLAX 24R | 8nm Aligned",                           airport: "KLAX", runway: "24R", dist: 8,  offset: 0.0, alt: 2600, heading: 240,     speed: 150 },

    // KSFO - RWY 28R / 28L
    { name: "KSFO 28R | 12nm, 1nm Right, Hdg 300",              airport: "KSFO", runway: "28R", dist: 12, offset: 1.0, alt: 3500, heading: 300,     speed: 170 },
    { name: "KSFO 28L | 10nm Aligned",                          airport: "KSFO", runway: "28L", dist: 10, offset: 0.0, alt: 3000, heading: 280,     speed: 160 },
    { name: "KSFO 28R | 15nm Centerline, Wrong Heading (+60°)", airport: "KSFO", runway: "28R", dist: 15, offset: 0.0, alt: 4000, heading: 280 + 60, speed: 180 },

    // KJFK - RWY 04R / 22L
    { name: "KJFK 04R | 15nm, 2nm Right",                       airport: "KJFK", runway: "04R", dist: 15, offset: 2.0, alt: 4000, heading: 40,      speed: 180 },
    { name: "KJFK 22L | 8nm, 1nm Left, Hdg 200",                airport: "KJFK", runway: "22L", dist: 8,  offset: -1.0, alt: 2600, heading: 200,     speed: 160 }
    
    ,
    // NAV pre-turn → ILS test (random start)
    { name: "KLAX 24R | NAV pre-turn to 15nm → ILS",            airport: "KLAX", runway: "24R", dist: 20, offset: 5.0, alt: 5000, heading: 90,      speed: 180, useNavPreTurn: true, randomStart: false },
    { name: "KSFO 28R | NAV pre-turn to 15nm → ILS",            airport: "KSFO", runway: "28R", dist: 0,  offset: 0.0, alt: 4200, heading: 120,     speed: 170, useNavPreTurn: true, randomStart: true },
    { name: "KJFK 22L | NAV pre-turn to 15nm → ILS",            airport: "KJFK", runway: "22L", dist: 0,  offset: 0.0, alt: 4300, heading: 310,     speed: 175, useNavPreTurn: true, randomStart: true }
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
