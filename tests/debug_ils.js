import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';
import { airportService } from '../src/services/airportService.js';

const run = async () => {
  const aircraftDb = await loadAircraftData();
  const aircraft = aircraftDb.find(a => a.model === 'Boeing 737-800');
  const geom = airportService.getRunwayGeometry('LAX', '24L');

  console.log('Runway geometry:', geom ? 'OK' : 'MISSING');
  console.log('Runway heading:', geom?.heading);
  console.log('ILS frequency:', geom?.ilsFrequency);

  const physics = new RealisticFlightPhysicsService(aircraft, 33.9425, -118.4081, 'intermediate');
  physics.setInitialConditions({
    latitude: 33.9425,
    longitude: -118.4081,
    position: { z: 500 * 0.3048 },
    heading: geom.heading,
    fuel: 5000,
    coldStart: false
  });
  physics.state.vel.set(145 * 0.514444, 0, 0);
  physics.setRunwayGeometry(geom);
  physics.setMotionEnabled(true);
  physics.autopilot.setNavFrequency(geom.ilsFrequency);
  physics.setAutopilot(true, { mode: 'ILS', speed: 145, heading: geom.heading, vs: 0, altitude: 3000 });

  console.log('Autopilot engaged:', physics.autopilot.engaged);
  console.log('Autopilot mode:', physics.autopilot.mode);

  for (let i = 0; i < 10; i++) {
    const state = physics.update({ throttle: 0.5, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 1.0, gear: true }, 0.05);
    if (i === 0 || i === 9) {
      console.log(`Step ${i}: AGL=${state.derived?.altitude_agl_ft?.toFixed(1)}ft ILS=${state.autopilotDebug?.ils?.active ? 'ACTIVE' : 'INACTIVE'} Phase=${state.autopilotDebug?.ils?.phase}`);
    }
  }
};

run().catch(console.error);
