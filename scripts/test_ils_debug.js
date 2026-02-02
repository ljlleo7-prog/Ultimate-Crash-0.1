
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';
import { airportService } from '../src/services/airportService.js';

// Configuration
const AIRCRAFT_MODEL = "Boeing 737-800";
const SIM_DT = 0.05; // 20Hz
const SIM_DURATION = 300; // Seconds

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
    const airportCode = scenario.airport;
    const runwayId = scenario.runway;
    const runwayGeom = airportService.getRunwayGeometry(airportCode, runwayId);
    if (!runwayGeom) {
        console.error("❌ Failed to get runway geometry");
        return;
    }
    
    // Calculate Initial Position based on Scenario
    const thresholdLat = runwayGeom.thresholdStart.latitude;
    const thresholdLon = runwayGeom.thresholdStart.longitude;
    const runwayHeading = runwayGeom.heading; 
    const approachDir = (runwayHeading + 180) % 360;
    
    // Convert offsets to meters
    const distM = scenario.dist * 1852;
    const offsetM = scenario.offset * 1852;
    
    const toRad = Math.PI / 180;
    const hRad = approachDir * toRad;
    const R = 6371000;
    
    let startLat, startLon, initHeading, initAlt;
    
    if (scenario.randomStart) {
        // ... (Keep simplified or copy if needed, but we focus on deterministic for debug)
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
        const centerLat = thresholdLat + (distM * Math.cos(hRad)) / R * (180/Math.PI);
        const centerLon = thresholdLon + (distM * Math.sin(hRad)) / (R * Math.cos(thresholdLat * toRad)) * (180/Math.PI);
        
        const offsetHeading = (runwayHeading + 90) % 360;
        const oRad = offsetHeading * toRad;
        
        startLat = centerLat + (offsetM * Math.cos(oRad)) / R * (180/Math.PI);
        startLon = centerLon + (offsetM * Math.sin(oRad)) / (R * Math.cos(centerLat * toRad)) * (180/Math.PI);
        initHeading = scenario.heading;
        initAlt = scenario.alt;
    }
    
    const physics = new RealisticFlightPhysicsService(aircraftConfig, startLat, startLon, 'intermediate');
    
    physics.setInitialConditions({
        position: { z: initAlt * 0.3048 },
        heading: initHeading, 
        fuel: 5000,
        coldStart: false
    });
    
    physics.state.latitude = startLat;
    physics.state.longitude = startLon;
    
    const velMs = scenario.speed * 0.514444;
    physics.state.vel.set(velMs, 0, 0); 
    
    physics.setRunwayGeometry(runwayGeom);
    physics.setMotionEnabled(true);
    
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
    
    if (physics.autopilot) {
        physics.autopilot.setNavFrequency(runwayGeom.ilsFrequency || 108.50);
    }

    console.log(`📍 Spawned at: ${startLat.toFixed(4)}, ${startLon.toFixed(4)}`);
    console.log(`   Dist: ${scenario.dist}nm, Offset: ${scenario.offset}nm, Alt: ${scenario.alt}ft, Hdg: ${scenario.heading}°`);
    
    const steps = SIM_DURATION / SIM_DT;
    let finalCrossTrack = 0;
    let finalAltError = 0;
    let prevDist = 9999;
    let thresholdState = null;
    let passedThreshold = false;

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
    
    for (let i = 0; i < steps; i++) {
        const inputs = {
             throttle: 0.5, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 1.0, gear: true, 
             spoilers: Math.sqrt(physics.state.vel.x**2 + physics.state.vel.y**2 + physics.state.vel.z**2) > 85 ? 1.0 : 0.0
        };
        physics.update(inputs, SIM_DT);
        
        // ILS Switch Logic (same as main test)
        if (scenario.useNavPreTurn) {
            const ds = physics.autopilot ? physics.autopilot.debugState : null;
            const lnav = ds && ds.lnav;
            if (lnav && physics.autopilot.mode === 'LNAV') {
                const metrics = computeRunwayMetrics();
                const isAligned = Math.abs(metrics.distCrossFt) < 20000; 
                const distToRunwayNm = Math.abs(metrics.distAlongFt / 6076);
                
                if (distToRunwayNm < 25.0 && isAligned) {
                    physics.autopilot.setTargets({ mode: 'ILS' });
                    console.log(`🔄 Switched to ILS at T+${(i*SIM_DT).toFixed(1)}s`);
                }
            }
        }
        
        const debugState = physics.autopilot ? physics.autopilot.debugState : null;
        const euler = physics.state.quat ? physics.state.quat.toEuler() : { phi: 0, theta: 0, psi: 0 };
        const currentHeading = euler.psi * 180 / Math.PI;
        const alt = -physics.state.pos.z / 0.3048; 
        
        const metrics = computeRunwayMetrics();
        finalCrossTrack = metrics.distCrossFt;
        finalAltError = metrics.altErrorFt;
        
        if (debugState && debugState.ils && debugState.ils.active) {
            finalCrossTrack = debugState.ils.distCross;
            finalAltError = debugState.ils.altError;
            const distNm = debugState.ils.distAlong / 6076;
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
                    if (distAbs < 0.5) { 
                         passedThreshold = true;
                         console.log(`📍 Threshold Crossing detected at T+${(i*SIM_DT).toFixed(1)}s (Dist: ${distNm.toFixed(2)}nm)`);
                    }
                }
            }
        }
        
        if (i % (2 / SIM_DT) === 0) { // Log every 2s
             const dist = debugState && debugState.ils ? debugState.ils.distAlong / 6076 : 0;
             console.log(`[T+${(i*SIM_DT).toFixed(0)}s] Alt: ${alt.toFixed(0)}, Dist: ${dist.toFixed(1)}, XTrack: ${finalCrossTrack.toFixed(0)}, Hdg: ${currentHeading.toFixed(0)}`);
        }
        
        if (passedThreshold && (i * SIM_DT) > 200) break;
    }
    
    const evalState = thresholdState || { lateral: finalCrossTrack, vertical: finalAltError, headingError: 0 };
    console.log(`🏁 Result: Lat ${evalState.lateral.toFixed(1)}, Vert ${evalState.vertical.toFixed(1)}`);
}

const scenarios = [
    // { name: "KLAX 24R | NAV pre-turn", airport: "KLAX", runway: "24R", dist: 20, offset: 5.0, alt: 5000, heading: 90, speed: 180, useNavPreTurn: true, randomStart: false },
    { name: "KLAX 24R | Wrong Hdg (+90)", airport: "KLAX", runway: "24R", dist: 15, offset: 0.0, alt: 4000, heading: 240 + 90, speed: 180 }
];

(async () => {
    for (const s of scenarios) {
        await runTest(s);
    }
})();
