import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { airportService } from '../src/services/airportService.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const aircraftDatabase = require('../src/data/aircraftDatabase.json');

const aircraft = aircraftDatabase.aircraft[0];
const airportCode = process.argv[2] || 'KLAX';
const runwayName = process.argv[3] || '24R';
const throttleTarget = Number.isFinite(Number(process.argv[4])) ? Number(process.argv[4]) : 0.35;
const durationSeconds = Number.isFinite(Number(process.argv[5])) ? Number(process.argv[5]) : 20;
const dt = 0.05;

const runwayGeom = airportService.getRunwayGeometry(airportCode, runwayName);
if (!runwayGeom?.thresholdStart) {
  console.error(`Failed to load runway geometry for ${airportCode} ${runwayName}`);
  process.exit(1);
}

const headingDeg = Number.isFinite(runwayGeom.heading) ? runwayGeom.heading : 0;
const headingRad = headingDeg * Math.PI / 180;
const offsetMeters = 100;
const metersPerLat = 111111;
const metersPerLon = 111111 * Math.cos(runwayGeom.thresholdStart.latitude * Math.PI / 180);

const startLat = runwayGeom.thresholdStart.latitude + (offsetMeters * Math.cos(headingRad)) / metersPerLat;
const startLon = runwayGeom.thresholdStart.longitude + (offsetMeters * Math.sin(headingRad)) / metersPerLon;

const service = new RealisticFlightPhysicsService(
  { ...aircraft, airportElevation: runwayGeom.thresholdStart.elevation || 0 },
  startLat,
  startLon,
  'rookie'
);

service.setAutopilot(false);
service.setInitialConditions({
  latitude: startLat,
  longitude: startLon,
  heading: headingDeg,
  difficulty: 'rookie'
});
service.setRunwayGeometry({ ...runwayGeom, airportCode });
service.setMotionEnabled(true);
service.controls.wheelBrakes = 0;
if (service.systems?.brakes) service.systems.brakes.parkingBrake = false;

const projectRunwayMetrics = () => {
  const latRad = service.state.geo.lat * Math.PI / 180;
  const mPerLat = 111132.92;
  const mPerLon = 111412.84 * Math.cos(latRad);
  const dLat = service.state.geo.lat - runwayGeom.thresholdStart.latitude;
  const dLon = service.state.geo.lon - runwayGeom.thresholdStart.longitude;
  const xNorth = dLat * mPerLat;
  const yEast = dLon * mPerLon;
  const hRad = runwayGeom.heading * Math.PI / 180;
  const cosH = Math.cos(hRad);
  const sinH = Math.sin(hRad);
  const distAlong = xNorth * cosH + yEast * sinH;
  const distCross = xNorth * sinH - yEast * cosH;
  return { distAlong, distCross, xNorth, yEast };
};

const snapshot = (label, t) => {
  const output = service.getOutputState();
  const m = projectRunwayMetrics();
  const ground = output.groundStatus?.status || 'UNKNOWN';
  const gs = output.derived?.groundSpeed ?? 0;
  const tas = output.derived?.airspeed ?? 0;
  const thrust = output.thrust ?? 0;
  console.log(
    `${label} t=${t.toFixed(2)} throttle=${service.controls.throttle.toFixed(3)} ` +
    `gs=${gs.toFixed(2)} tas=${tas.toFixed(2)} thrust=${thrust.toFixed(0)} ` +
    `ground=${ground} crashed=${output.hasCrashed ? 'yes' : 'no'} ` +
    `along=${m.distAlong.toFixed(1)} cross=${m.distCross.toFixed(1)} ` +
    `lat=${service.state.geo.lat.toFixed(6)} lon=${service.state.geo.lon.toFixed(6)} ` +
    `posN=${service.state.pos.x.toFixed(2)} posE=${service.state.pos.y.toFixed(2)} ` +
    `velU=${service.state.vel.x.toFixed(2)} velV=${service.state.vel.y.toFixed(2)}`
  );
  return { output, metrics: m };
};

console.log(`Taxi verification: ${airportCode} ${runwayName}`);
console.log(`Start lat/lon=${startLat.toFixed(6)}, ${startLon.toFixed(6)} heading=${headingDeg}`);
console.log(`Runway length=${runwayGeom.length.toFixed(1)} width=${runwayGeom.width.toFixed(1)}`);

snapshot('START', 0);

let lastGround = service.getOutputState().groundStatus?.status || 'UNKNOWN';
const steps = Math.floor(durationSeconds / dt);
for (let i = 1; i <= steps; i += 1) {
  const t = i * dt;
  service.update({
    throttle: throttleTarget,
    pitch: 0,
    roll: 0,
    yaw: 0,
    flaps: service.controls.flaps,
    gear: service.controls.gear
  }, dt);

  const { output } = snapshot('STEP', t);
  const ground = output.groundStatus?.status || 'UNKNOWN';
  if (ground !== lastGround) {
    console.log(`STATUS_CHANGE ${lastGround} -> ${ground} at t=${t.toFixed(2)}`);
    lastGround = ground;
  }
  if (output.hasCrashed) {
    console.log(`CRASH at t=${t.toFixed(2)} reason=${output.crashWarning || 'unknown'}`);
    break;
  }
}

setTimeout(() => process.exit(0), 0);
