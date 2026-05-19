import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';
import { airportService } from '../src/services/airportService.js';
import { CHALLENGES } from '../src/data/challengeCatalog.js';

const SIM_DT = 0.05;
const DEFAULT_AIRCRAFT_MODEL = 'B737-800';

const toRadians = (degrees) => degrees * Math.PI / 180;

const offsetPointFromReference = (reference, headingDeg, distanceNm) => {
  if (!reference || !Number.isFinite(reference.latitude) || !Number.isFinite(reference.longitude)) {
    return null;
  }

  const distanceMeters = (distanceNm || 0) * 1852;
  const headingRad = toRadians(headingDeg);
  const metersPerLat = 111111;
  const metersPerLon = 111111 * Math.cos(reference.latitude * Math.PI / 180);

  return {
    latitude: reference.latitude + (distanceMeters * Math.cos(headingRad)) / metersPerLat,
    longitude: reference.longitude + (distanceMeters * Math.sin(headingRad)) / metersPerLon
  };
};

const buildScenarioSpawn = (challenge) => {
  const preset = challenge.launchConfig?.spawnPreset;
  if (!preset) return null;

  const departureCode = challenge.departureCode;
  const arrivalCode = challenge.arrivalCode;
  const departureRunway = challenge.launchConfig?.routeDetails?.departureRunway;
  const arrivalRunway = challenge.launchConfig?.routeDetails?.landingRunway;
  const departureGeometry = departureCode && departureRunway
    ? airportService.getRunwayGeometry(departureCode, departureRunway)
    : null;
  const arrivalGeometry = arrivalCode && arrivalRunway
    ? airportService.getRunwayGeometry(arrivalCode, arrivalRunway)
    : null;

  if (preset.type === 'runway' && departureGeometry?.thresholdStart) {
    const point = offsetPointFromReference(departureGeometry.thresholdStart, departureGeometry.heading, 0.054);
    return {
      latitude: point?.latitude ?? departureGeometry.thresholdStart.latitude,
      longitude: point?.longitude ?? departureGeometry.thresholdStart.longitude,
      heading: preset.heading ?? departureGeometry.heading,
      altitude: preset.altitude,
      speed: preset.speed,
      runwayGeometry: departureGeometry,
      airportElevation: departureGeometry.thresholdStart.elevation || 0
    };
  }

  if (preset.type === 'departure-airborne' && departureGeometry?.thresholdStart) {
    const point = offsetPointFromReference(departureGeometry.thresholdStart, departureGeometry.heading, preset.distanceNm || 8);
    return {
      latitude: point?.latitude ?? departureGeometry.thresholdStart.latitude,
      longitude: point?.longitude ?? departureGeometry.thresholdStart.longitude,
      heading: preset.heading ?? departureGeometry.heading,
      altitude: preset.altitude ?? 9000,
      speed: preset.speed ?? 240,
      runwayGeometry: departureGeometry,
      airportElevation: departureGeometry.thresholdStart.elevation || 0
    };
  }

  if (preset.type === 'approach-final' && arrivalGeometry?.thresholdStart) {
    const reciprocalHeading = (arrivalGeometry.heading + 180) % 360;
    const point = offsetPointFromReference(arrivalGeometry.thresholdStart, reciprocalHeading, preset.distanceNm || 10);
    return {
      latitude: point?.latitude ?? arrivalGeometry.thresholdStart.latitude,
      longitude: point?.longitude ?? arrivalGeometry.thresholdStart.longitude,
      heading: preset.heading ?? arrivalGeometry.heading,
      altitude: preset.altitude ?? 3000,
      speed: preset.speed ?? 180,
      runwayGeometry: arrivalGeometry,
      airportElevation: arrivalGeometry.thresholdStart.elevation || 0
    };
  }

  if (preset.type === 'enroute-midpoint') {
    const departure = airportService.getAirportByCode?.(departureCode) || airportService.searchAirports(departureCode)?.[0];
    const arrival = airportService.getAirportByCode?.(arrivalCode) || airportService.searchAirports(arrivalCode)?.[0];
    if (!departure || !arrival) return null;

    return {
      latitude: (departure.latitude + arrival.latitude) / 2,
      longitude: (departure.longitude + arrival.longitude) / 2,
      heading: preset.heading ?? departureGeometry?.heading ?? 0,
      altitude: preset.altitude ?? 20000,
      speed: preset.speed ?? 280,
      runwayGeometry: departureGeometry || arrivalGeometry || null,
      airportElevation: departure?.elevation || 0
    };
  }

  return null;
};

const buildNeutralInputs = (service) => ({
  throttle: service.controls.throttle,
  pitch: service.controls.elevator,
  roll: service.controls.aileron,
  yaw: service.controls.rudder,
  flaps: service.controls.flaps,
  gear: service.controls.gear,
  trim: service.controls.trim
});

const runStableValidation = async (challenge, aircraft) => {
  const spawn = buildScenarioSpawn(challenge);
  if (!spawn) {
    throw new Error('Missing spawn geometry');
  }

  const service = new RealisticFlightPhysicsService(
    {
      ...aircraft,
      scenarioMode: true,
      scenarioRestrictions: challenge.launchConfig?.restrictions || {}
    },
    spawn.latitude,
    spawn.longitude,
    challenge.launchConfig?.difficulty || 'pro'
  );

  service.setInitialConditions({
    latitude: spawn.latitude,
    longitude: spawn.longitude,
    altitude: spawn.altitude,
    speed: spawn.speed,
    orientation: { psi: toRadians(spawn.heading || 0), theta: 0, phi: 0 },
    difficulty: challenge.launchConfig?.difficulty || 'pro',
    failureType: challenge.launchConfig?.failureType || 'none'
  });

  if (spawn.runwayGeometry) {
    service.setRunwayGeometry(spawn.runwayGeometry);
  }

  const weather = challenge.launchConfig?.weatherData || {};
  service.setEnvironment({
    windSpeed: weather.windSpeed || 0,
    windDirection: weather.windDirection || 0,
    turbulence: weather.turbulence || 0,
    precipitation: weather.precipitation || 0
  });

  service.setMotionEnabled(true);
  if (!challenge.launchConfig?.restrictions?.autopilotForbidden && challenge.id === 'ils-landing-check') {
    service.setAutopilot(true, {
      speed: spawn.speed,
      altitude: spawn.altitude,
      heading: spawn.heading,
      mode: 'ILS'
    });
  }

  const initialState = service.getOutputState();
  const initialAltitude = initialState?.derived?.altitude_ft ?? initialState?.altitude ?? 0;
  const initialAirspeed = initialState?.derived?.airspeed ?? initialState?.indicatedAirspeed ?? spawn.speed ?? 0;
  let maxBank = 0;
  let maxPitch = 0;
  let maxSinkRate = 0;

  const duration = challenge.launchConfig?.validation?.requiredStableSeconds || 3;
  const steps = Math.ceil(duration / SIM_DT);

  for (let i = 0; i < steps; i += 1) {
    service.update(buildNeutralInputs(service), SIM_DT);
    const state = service.getOutputState();
    const derived = state?.derived || {};
    const altitude = derived.altitude_ft ?? state?.altitude ?? 0;
    const airspeed = derived.airspeed ?? state?.indicatedAirspeed ?? 0;
    const pitchDeg = Math.abs((state?.orientation?.theta || 0) * 180 / Math.PI);
    const bankDeg = Math.abs((state?.orientation?.phi || 0) * 180 / Math.PI);
    const sinkRate = Math.abs(state?.verticalSpeed || 0);

    if (![altitude, airspeed, pitchDeg, bankDeg, sinkRate].every(Number.isFinite)) {
      throw new Error('Non-finite state detected');
    }

    if (state?.hasCrashed || service.crashed) {
      throw new Error('Aircraft crashed during stability window');
    }

    maxPitch = Math.max(maxPitch, pitchDeg);
    maxBank = Math.max(maxBank, bankDeg);
    maxSinkRate = Math.max(maxSinkRate, sinkRate);
  }

  const finalState = service.getOutputState();
  const finalAltitude = finalState?.derived?.altitude_ft ?? finalState?.altitude ?? initialAltitude;
  const finalAirspeed = finalState?.derived?.airspeed ?? finalState?.indicatedAirspeed ?? initialAirspeed;
  const validation = challenge.launchConfig?.validation || {};
  const altitudeDelta = Math.abs(finalAltitude - initialAltitude);
  const airspeedDelta = Math.abs(finalAirspeed - initialAirspeed);

  if (altitudeDelta > (validation.maxAltitudeDeltaFt ?? 250)) {
    throw new Error(`Altitude diverged ${altitudeDelta.toFixed(1)} ft`);
  }

  if (airspeedDelta > (validation.maxAirspeedDeltaKts ?? 20)) {
    throw new Error(`Airspeed diverged ${airspeedDelta.toFixed(1)} kt`);
  }

  if (maxSinkRate > (validation.maxSinkRateFpm ?? 1600)) {
    throw new Error(`Sink rate exceeded ${maxSinkRate.toFixed(0)} fpm`);
  }

  return {
    altitudeDelta,
    airspeedDelta,
    maxBank,
    maxPitch,
    maxSinkRate
  };
};

const main = async () => {
  const aircraftDb = await loadAircraftData();
  const aircraft = aircraftDb.find((entry) => entry.model === DEFAULT_AIRCRAFT_MODEL) || aircraftDb[0];

  if (!aircraft) {
    console.error('No aircraft data available.');
    process.exit(1);
  }

  const stableChallenges = CHALLENGES.filter((challenge) => challenge.launchConfig?.validation?.profile === 'stable_spawn');
  let passed = 0;

  for (const challenge of stableChallenges) {
    try {
      const result = await runStableValidation(challenge, aircraft);
      passed += 1;
      console.log(`PASS ${challenge.id} altΔ=${result.altitudeDelta.toFixed(1)}ft speedΔ=${result.airspeedDelta.toFixed(1)}kt bank=${result.maxBank.toFixed(1)}° pitch=${result.maxPitch.toFixed(1)}° sink=${result.maxSinkRate.toFixed(0)}fpm`);
    } catch (error) {
      console.error(`FAIL ${challenge.id}: ${error.message}`);
    }
  }

  console.log(`Validated ${passed}/${stableChallenges.length} stable-spawn challenges.`);
  process.exit(passed === stableChallenges.length ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
