import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';
import { airportService } from '../src/services/airportService.js';

const R = 6371000;
const toDeg = 180 / Math.PI;
const toRad = Math.PI / 180;

const offsetLatLon = (lat, lon, northMeters, eastMeters) => {
  const dLat = (northMeters / R) * toDeg;
  const dLon = (eastMeters / (R * Math.cos(lat * toRad))) * toDeg;
  return { latitude: lat + dLat, longitude: lon + dLon };
};

const run = async () => {
  const aircraftDb = await loadAircraftData();
  const aircraft = aircraftDb.find(a => a.model === 'Boeing 737-800');
  const geom = airportService.getRunwayGeometry('LAX', '24L');

  // Build approach: 4nm out, 0.5nm left offset
  const threshold = geom.thresholdStart;
  const runwayHeading = geom.heading;
  const approachDir = (runwayHeading + 180) % 360;
  const distM = 4 * 1852;
  const offsetM = -0.5 * 1852;
  const approachRad = approachDir * toRad;

  const base = offsetLatLon(threshold.latitude, threshold.longitude,
    distM * Math.cos(approachRad), distM * Math.sin(approachRad));
  const offsetHeading = (runwayHeading + 90) % 360;
  const offsetRad = offsetHeading * toRad;
  const pos = offsetLatLon(base.latitude, base.longitude,
    offsetM * Math.cos(offsetRad), offsetM * Math.sin(offsetRad));

  const distToThresholdFt = distM * 3.28084;
  const runwayElev = threshold.elevation || 0;
  const targetAltitude = runwayElev + 50 + (distToThresholdFt * Math.tan(3 * Math.PI / 180));

  // 30° intercept heading
  const interceptHeading = (geom.heading + 30) % 360;

  const physics = new RealisticFlightPhysicsService(aircraft, pos.latitude, pos.longitude, 'intermediate');
  physics.setInitialConditions({
    latitude: pos.latitude,
    longitude: pos.longitude,
    position: { z: targetAltitude * 0.3048 },
    heading: interceptHeading,
    fuel: 5000,
    coldStart: false
  });
  physics.state.geo.lat = pos.latitude;
  physics.state.geo.lon = pos.longitude;
  physics.state.vel.set(145 * 0.514444, 0, 0);
  physics.setRunwayGeometry(geom);
  physics.setMotionEnabled(true);
  physics.setEnvironment({ windSpeed: 0, windDirection: 0, windGust: 0, windShear: 0, turbulence: 0, precipitation: 0, temperature: 15, cloudCover: 0 });

  physics.autopilot.setNavFrequency(geom.ilsFrequency);
  physics.setAutopilot(true, { mode: 'ILS', speed: 145, heading: geom.heading, vs: 0, altitude: 3000 });

  console.log(`Initial: HDG=${interceptHeading}° Target=${geom.heading}°`);

  for (let i = 0; i < 600; i++) {
    const state = physics.update({ throttle: 0.5, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 1.0, gear: true }, 0.05);
    if (i % 100 === 0) {
      const hdg = ((state.orientation?.psi ?? 0) * toDeg + 360) % 360;
      const locDev = state.autopilotDebug?.ils?.locDeviationDeg ?? 0;
      const cross = state.autopilotDebug?.ils?.distCross ?? 0;
      console.log(`Step ${i}: HDG=${hdg.toFixed(1)}° LOC=${locDev.toFixed(2)}° Cross=${cross.toFixed(0)}ft AGL=${state.derived?.altitude_agl_ft?.toFixed(0)}ft`);
    }
  }
};

run().catch(console.error);
