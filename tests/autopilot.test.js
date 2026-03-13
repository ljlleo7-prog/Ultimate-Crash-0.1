import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import RealisticFlightPhysicsService from '../src/services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../src/services/aircraftService.js';
import { airportService } from '../src/services/airportService.js';
import { terrainService } from '../src/services/TerrainService.js';

const R = 6371000;
const toDeg = 180 / Math.PI;
const toRad = Math.PI / 180;

const offsetLatLon = (lat, lon, northMeters, eastMeters) => {
  const dLat = (northMeters / R) * toDeg;
  const dLon = (eastMeters / (R * Math.cos(lat * toRad))) * toDeg;
  return { latitude: lat + dLat, longitude: lon + dLon };
};

const buildApproachState = (geom, distNm, offsetNm, altitudeOffsetFt = 0) => {
  const threshold = geom.thresholdStart;
  const runwayHeading = geom.heading;
  const approachDir = (runwayHeading + 180) % 360;
  const distM = distNm * 1852;
  const offsetM = offsetNm * 1852;
  const approachRad = approachDir * toRad;
  const base = offsetLatLon(
    threshold.latitude,
    threshold.longitude,
    distM * Math.cos(approachRad),
    distM * Math.sin(approachRad)
  );
  const offsetHeading = (runwayHeading + 90) % 360;
  const offsetRad = offsetHeading * toRad;
  const pos = offsetLatLon(
    base.latitude,
    base.longitude,
    offsetM * Math.cos(offsetRad),
    offsetM * Math.sin(offsetRad)
  );
  const distToThresholdFt = distM * 3.28084;
  const runwayElev = threshold.elevation || 0;
  const targetAltitude = runwayElev + 50 + (distToThresholdFt * Math.tan(3 * Math.PI / 180));
  return {
    latitude: pos.latitude,
    longitude: pos.longitude,
    altitude: targetAltitude + altitudeOffsetFt,
    heading: runwayHeading,
    track: runwayHeading
  };
};

const AIRCRAFT_MODEL = 'Boeing 737-800';
const SIM_DT = 0.05;
let cachedAircraft = null;
const DEFAULT_ENV = {
  windSpeed: 10,
  windGust: 16,
  windShear: 4,
  turbulence: 0.2,
  precipitation: 0,
  temperature: 15,
  cloudCover: 0.2
};

const AIRPORT_CASES = [
  { code: 'LAX' },
  { code: 'ORD' },
  { code: 'JFK' }
];

const AIRSPACE_PROFILES = [
  { name: 'standard', overrides: {} },
  { name: 'gusty', overrides: { windSpeed: 18, windGust: 28, windShear: 8, turbulence: 0.5 } }
];

const buildEnv = (heading, overrides = {}) => {
  const { windDirectionOffset, ...rest } = overrides;
  let windDirection = Number.isFinite(rest.windDirection) ? rest.windDirection : heading;
  if (Number.isFinite(windDirectionOffset)) {
    windDirection = (heading + windDirectionOffset + 360) % 360;
  }
  return {
    ...DEFAULT_ENV,
    ...rest,
    windDirection
  };
};

const CSV_OUT = process.env.AP_CSV_OUT || null;
const csvRows = [];
const csvColumns = new Set();
const baseCsvColumns = [
  'scenario',
  'airport',
  'runway',
  'airspace',
  'dt_s',
  'duration_s',
  'target_speed',
  'target_vs',
  'target_altitude',
  'target_heading',
  'windSpeed',
  'windDirection',
  'windGust',
  'windShear',
  'turbulence',
  'precipitation',
  'temperature',
  'cloudCover',
  'time_to_within_s',
  'time_within_s',
  'time_total_s',
  'capture_ratio'
];

const recordCsvRow = (row) => {
  if (!CSV_OUT) return;
  csvRows.push(row);
  Object.keys(row).forEach(key => csvColumns.add(key));
};

const toCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const flushCsv = () => {
  if (!CSV_OUT || !csvRows.length) return;
  const extraColumns = Array.from(csvColumns).filter(c => !baseCsvColumns.includes(c)).sort();
  const columns = [...baseCsvColumns, ...extraColumns];
  const header = columns.join(',');
  const lines = csvRows.map(row => columns.map(col => toCsvValue(row[col])).join(','));
  const output = [header, ...lines].join('\n') + '\n';
  fs.writeFileSync(CSV_OUT, output);
};

process.on('exit', () => {
  flushCsv();
});

const getAircraft = async () => {
  if (cachedAircraft) return cachedAircraft;
  const aircraftDb = await loadAircraftData();
  const aircraftConfig = aircraftDb.find(a => a.model === AIRCRAFT_MODEL);
  if (!aircraftConfig) throw new Error(`Aircraft ${AIRCRAFT_MODEL} not found`);
  cachedAircraft = aircraftConfig;
  return cachedAircraft;
};

const applyEnvironment = async (physics, lat, lon, heading, overrides) => {
  const elevation = await terrainService.getElevation(lat, lon);
  if (Number.isFinite(elevation)) {
    physics.terrainElevation = elevation;
    if (physics.airportElevation === 0) physics.airportElevation = elevation;
  }
  const env = buildEnv(heading, overrides);
  physics.setEnvironment(env);
  return env;
};

const runSim = (physics, durationSec, inputs) => {
  const steps = Math.round(durationSec / SIM_DT);
  for (let i = 0; i < steps; i += 1) {
    physics.update(inputs, SIM_DT);
  }
  return physics.getOutputState();
};

const buildPhysics = async ({ lat, lon, altitudeFt, heading, speedKts, runwayGeom, envProfile }) => {
  const aircraft = await getAircraft();
  const physics = new RealisticFlightPhysicsService(aircraft, lat, lon, 'intermediate');
  physics.setInitialConditions({
    latitude: lat,
    longitude: lon,
    position: { z: altitudeFt * 0.3048 },
    heading: heading,
    fuel: 5000,
    coldStart: false
  });
  physics.state.geo.lat = lat;
  physics.state.geo.lon = lon;
  physics.state.vel.set(speedKts * 0.514444, 0, 0);
  if (runwayGeom) physics.setRunwayGeometry(runwayGeom);
  physics.setMotionEnabled(true);
  physics.testEnvProfile = envProfile?.name ?? 'standard';
  physics.testEnv = await applyEnvironment(physics, lat, lon, heading, envProfile?.overrides);
  return physics;
};

const computeStats = (values) => {
  const data = values.filter(v => Number.isFinite(v));
  if (!data.length) return null;
  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((acc, v) => acc + v, 0);
  const mean = sum / data.length;
  const variance = data.reduce((acc, v) => acc + ((v - mean) ** 2), 0) / data.length;
  const idx95 = Math.floor(0.95 * (sorted.length - 1));
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    stdev: Math.sqrt(variance),
    p95: sorted[idx95]
  };
};

const updateTimeWindow = (timeState, errors, thresholds) => {
  const keys = Object.keys(thresholds);
  if (!keys.length) return timeState;
  const within = keys.every(key => Number.isFinite(errors[key]) && Math.abs(errors[key]) <= thresholds[key]);
  if (within) {
    timeState.timeWithin += SIM_DT;
    if (timeState.timeToWithin === null) timeState.timeToWithin = timeState.time;
  }
  timeState.time += SIM_DT;
  return timeState;
};

const flattenStats = (stats, prefix) => {
  const output = {};
  Object.entries(stats).forEach(([key, value]) => {
    if (!value) return;
    output[`${prefix}${key}_min`] = value.min;
    output[`${prefix}${key}_max`] = value.max;
    output[`${prefix}${key}_mean`] = value.mean;
    output[`${prefix}${key}_stdev`] = value.stdev;
    output[`${prefix}${key}_p95`] = value.p95;
  });
  return output;
};

const summarizeMetrics = (label, params, thresholds, errorsSamples, controlSamples, timeState) => {
  const errorStats = Object.fromEntries(Object.entries(errorsSamples).map(([key, values]) => [key, computeStats(values)]));
  const controlStats = Object.fromEntries(Object.entries(controlSamples).map(([key, values]) => [key, computeStats(values)]));
  console.log(`AP PARAMS ${label} ${JSON.stringify(params)}`);
  console.log(`AP THRESHOLDS ${label} ${JSON.stringify(thresholds)}`);
  console.log(`AP ERROR_STATS ${label} ${JSON.stringify(errorStats)}`);
  console.log(`AP CONTROL_STATS ${label} ${JSON.stringify(controlStats)}`);
  console.log(`AP TIME_STATS ${label} ${JSON.stringify(timeState)}`);
  const row = {
    scenario: label,
    airport: params.airport ?? '',
    runway: params.runway ?? '',
    airspace: params.profile ?? '',
    dt_s: params.dt_s,
    duration_s: params.duration_s,
    target_speed: params.targets?.speed ?? '',
    target_vs: params.targets?.vs ?? '',
    target_altitude: params.targets?.altitude ?? '',
    target_heading: params.targets?.heading ?? '',
    windSpeed: params.env?.windSpeed ?? '',
    windDirection: params.env?.windDirection ?? '',
    windGust: params.env?.windGust ?? '',
    windShear: params.env?.windShear ?? '',
    turbulence: params.env?.turbulence ?? '',
    precipitation: params.env?.precipitation ?? '',
    temperature: params.env?.temperature ?? '',
    cloudCover: params.env?.cloudCover ?? '',
    time_to_within_s: timeState.timeToWithin ?? '',
    time_within_s: timeState.timeWithin ?? '',
    time_total_s: timeState.time ?? '',
    capture_ratio: timeState.time ? timeState.timeWithin / timeState.time : ''
  };
  Object.entries(thresholds).forEach(([key, value]) => {
    row[`thresh_${key}`] = value;
  });
  Object.assign(row, flattenStats(errorStats, 'err_'));
  Object.assign(row, flattenStats(controlStats, 'ctl_'));
  recordCsvRow(row);
};

const getHeadingDeg = (state) => {
  const psi = state.orientation?.psi ?? 0;
  return (psi * toDeg + 360) % 360;
};

const computeRunwayMetrics = (geom, state) => {
  const lat = state.position?.latitude ?? 0;
  const lon = state.position?.longitude ?? 0;
  const threshold = geom.thresholdStart;
  const runwayHeading = geom.heading;
  const latRad = threshold.latitude * toRad;
  const metersPerLat = 111132.92;
  const metersPerLon = 111412.84 * Math.cos(latRad);
  const dx = (lat - threshold.latitude) * metersPerLat;
  const dy = (lon - threshold.longitude) * metersPerLon;
  const rH = runwayHeading * toRad;
  const ux = Math.cos(rH);
  const uy = Math.sin(rH);
  const along = dx * ux + dy * uy;
  const cross = -dx * uy + dy * ux;
  return {
    distAlongFt: along * 3.28084,
    distCrossFt: cross * 3.28084
  };
};

const extractControls = (state) => {
  const controls = state.controls || {};
  const elevator = Number.isFinite(controls.pitch) ? controls.pitch : 0;
  const aileron = Number.isFinite(controls.roll) ? controls.roll : 0;
  const rudder = Number.isFinite(controls.yaw) ? controls.yaw : 0;
  const trim = Number.isFinite(controls.trim) ? controls.trim : 0;
  const throttle = Number.isFinite(controls.throttle) ? controls.throttle : 0;
  const effort = Math.hypot(elevator, aileron, rudder, trim);
  return { throttle, elevator, aileron, rudder, trim, effort };
};

test('LNAV intercepts course with heading correction', async () => {
  for (const airportCase of AIRPORT_CASES) {
    const geom = airportService.getRunwayGeometry(airportCase.code, airportCase.runway);
    assert.ok(geom);
    for (const profile of AIRSPACE_PROFILES) {
      const approach = buildApproachState(geom, 12, 2, 400);
      const physics = await buildPhysics({
        lat: approach.latitude,
        lon: approach.longitude,
        altitudeFt: approach.altitude,
        heading: (geom.heading + 40) % 360,
        speedKts: 210,
        runwayGeom: geom,
        envProfile: profile
      });
      physics.autopilot.setNavigationPlan({
        fix: { latitude: geom.thresholdStart.latitude, longitude: geom.thresholdStart.longitude, altitude: 3000 },
        inboundCourseDeg: geom.heading,
        leadBankDeg: 25
      });
      physics.setAutopilot(true, { mode: 'LNAV', speed: 210, altitude: 3000, heading: (geom.heading + 40) % 360 });
      const durationSec = 8;
      const steps = Math.round(durationSec / SIM_DT);
      const thresholds = { cross_ft: 2000, heading_err_deg: 15 };
      const errorsSamples = { cross_ft: [], heading_err_deg: [] };
      const controlSamples = { effort: [], throttle: [], elevator: [], aileron: [], rudder: [], trim: [] };
      const timeState = { time: 0, timeWithin: 0, timeToWithin: null };
      let state = null;
      for (let i = 0; i < steps; i += 1) {
        state = physics.update({ throttle: 0.6, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0.3, gear: false }, SIM_DT);
        const metrics = computeRunwayMetrics(geom, state);
        const headingErr = Math.abs(((getHeadingDeg(state) - geom.heading + 540) % 360) - 180);
        const errors = { cross_ft: metrics.distCrossFt, heading_err_deg: headingErr };
        errorsSamples.cross_ft.push(errors.cross_ft);
        errorsSamples.heading_err_deg.push(errors.heading_err_deg);
        const controls = extractControls(state);
        controlSamples.effort.push(controls.effort);
        controlSamples.throttle.push(controls.throttle);
        controlSamples.elevator.push(controls.elevator);
        controlSamples.aileron.push(controls.aileron);
        controlSamples.rudder.push(controls.rudder);
        controlSamples.trim.push(controls.trim);
        updateTimeWindow(timeState, errors, thresholds);
      }
      const lnav = state.autopilotDebug?.lnav;
      assert.ok(lnav);
      const headingDelta = Math.abs(((state.autopilotTargets.heading - geom.heading + 540) % 360) - 180);
      assert.ok(headingDelta > 0.1);
      summarizeMetrics(
        'lnav_intercept',
        {
          dt_s: SIM_DT,
          duration_s: durationSec,
          targets: state.autopilotTargets,
          env: physics.testEnv,
          airport: airportCase.code,
          runway: geom.runwayName,
          profile: physics.testEnvProfile
        },
        thresholds,
        errorsSamples,
        controlSamples,
        timeState
      );
    }
  }
});

test('VNAV drives climb to altitude constraint in LNAV', async () => {
  for (const airportCase of AIRPORT_CASES) {
    const geom = airportService.getRunwayGeometry(airportCase.code, airportCase.runway);
    assert.ok(geom);
    for (const profile of AIRSPACE_PROFILES) {
      const approach = buildApproachState(geom, 15, 1, -500);
      const physics = await buildPhysics({
        lat: approach.latitude,
        lon: approach.longitude,
        altitudeFt: approach.altitude,
        heading: (geom.heading + 20) % 360,
        speedKts: 220,
        runwayGeom: geom,
        envProfile: profile
      });
      physics.autopilot.setNavigationPlan({
        fix: { latitude: geom.thresholdStart.latitude, longitude: geom.thresholdStart.longitude, altitude: 8000 },
        inboundCourseDeg: geom.heading,
        leadBankDeg: 25
      });
      physics.setAutopilot(true, { mode: 'LNAV', speed: 220, altitude: 8000, heading: (geom.heading + 20) % 360 });
      const durationSec = 6;
      const steps = Math.round(durationSec / SIM_DT);
      const thresholds = { alt_err_ft: 300, vs_err_fpm: 200 };
      const errorsSamples = { alt_err_ft: [], vs_err_fpm: [] };
      const controlSamples = { effort: [], throttle: [], elevator: [], aileron: [], rudder: [], trim: [] };
      const timeState = { time: 0, timeWithin: 0, timeToWithin: null };
      let state = null;
      for (let i = 0; i < steps; i += 1) {
        state = physics.update({ throttle: 0.7, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0.2, gear: false }, SIM_DT);
        const altErr = 8000 - (state.position?.z ?? 0);
        const vsErr = (state.verticalSpeed ?? 0) - (state.autopilotTargets?.vs ?? 0);
        const errors = { alt_err_ft: altErr, vs_err_fpm: vsErr };
        errorsSamples.alt_err_ft.push(errors.alt_err_ft);
        errorsSamples.vs_err_fpm.push(errors.vs_err_fpm);
        const controls = extractControls(state);
        controlSamples.effort.push(controls.effort);
        controlSamples.throttle.push(controls.throttle);
        controlSamples.elevator.push(controls.elevator);
        controlSamples.aileron.push(controls.aileron);
        controlSamples.rudder.push(controls.rudder);
        controlSamples.trim.push(controls.trim);
        updateTimeWindow(timeState, errors, thresholds);
      }
      assert.ok(state.autopilotTargets.vs > 0);
      summarizeMetrics(
        'vnav_climb',
        {
          dt_s: SIM_DT,
          duration_s: durationSec,
          targets: state.autopilotTargets,
          env: physics.testEnv,
          airport: airportCase.code,
          runway: geom.runwayName,
          profile: physics.testEnvProfile
        },
        thresholds,
        errorsSamples,
        controlSamples,
        timeState
      );
    }
  }
});

test('Climb and descent commands produce expected vertical speed sign', async () => {
  for (const airportCase of AIRPORT_CASES) {
    const geom = airportService.getRunwayGeometry(airportCase.code, airportCase.runway);
    assert.ok(geom);
    for (const profile of AIRSPACE_PROFILES) {
      const approach = buildApproachState(geom, 20, 0, 1000);
      const physics = await buildPhysics({
        lat: approach.latitude,
        lon: approach.longitude,
        altitudeFt: approach.altitude,
        heading: geom.heading,
        speedKts: 240,
        runwayGeom: geom,
        envProfile: profile
      });
      physics.setAutopilot(true, { mode: 'HDG', speed: 240, heading: geom.heading, vs: 1500, altitude: approach.altitude + 2000 });
      let totalVs = 0;
      let samples = 0;
      let state = null;
      const climbThresholds = { vs_err_fpm: 200 };
      const climbErrors = { vs_err_fpm: [] };
      const climbControls = { effort: [], throttle: [], elevator: [], aileron: [], rudder: [], trim: [] };
      const climbTime = { time: 0, timeWithin: 0, timeToWithin: null };
      for (let i = 0; i < Math.round(20 / SIM_DT); i += 1) {
        state = physics.update({ throttle: 0.8, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0.1, gear: false }, SIM_DT);
        totalVs += state.verticalSpeed;
        samples += 1;
        const vsErr = (state.verticalSpeed ?? 0) - (state.autopilotTargets?.vs ?? 0);
        climbErrors.vs_err_fpm.push(vsErr);
        const controls = extractControls(state);
        climbControls.effort.push(controls.effort);
        climbControls.throttle.push(controls.throttle);
        climbControls.elevator.push(controls.elevator);
        climbControls.aileron.push(controls.aileron);
        climbControls.rudder.push(controls.rudder);
        climbControls.trim.push(controls.trim);
        updateTimeWindow(climbTime, { vs_err_fpm: vsErr }, climbThresholds);
      }
      const meanVsClimb = totalVs / samples;
      console.log(`ILS METRIC climb_vs_mean_fpm=${meanVsClimb.toFixed(1)} end_vs_fpm=${state.verticalSpeed.toFixed(1)} target_vs_fpm=${state.autopilotTargets.vs}`);
      assert.ok(meanVsClimb > 100);
      summarizeMetrics(
        'climb_vs',
        {
          dt_s: SIM_DT,
          duration_s: 20,
          targets: state.autopilotTargets,
          env: physics.testEnv,
          airport: airportCase.code,
          runway: geom.runwayName,
          profile: physics.testEnvProfile
        },
        climbThresholds,
        climbErrors,
        climbControls,
        climbTime
      );
      const descendAltitude = Math.max(1000, approach.altitude - 2000);
      physics.setAutopilot(true, { mode: 'HDG', speed: 230, heading: geom.heading, vs: -1500, altitude: descendAltitude });
      totalVs = 0;
      samples = 0;
      const descThresholds = { vs_err_fpm: 200 };
      const descErrors = { vs_err_fpm: [] };
      const descControls = { effort: [], throttle: [], elevator: [], aileron: [], rudder: [], trim: [] };
      const descTime = { time: 0, timeWithin: 0, timeToWithin: null };
      for (let i = 0; i < Math.round(20 / SIM_DT); i += 1) {
        state = physics.update({ throttle: 0.5, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0.1, gear: false }, SIM_DT);
        totalVs += state.verticalSpeed;
        samples += 1;
        const vsErr = (state.verticalSpeed ?? 0) - (state.autopilotTargets?.vs ?? 0);
        descErrors.vs_err_fpm.push(vsErr);
        const controls = extractControls(state);
        descControls.effort.push(controls.effort);
        descControls.throttle.push(controls.throttle);
        descControls.elevator.push(controls.elevator);
        descControls.aileron.push(controls.aileron);
        descControls.rudder.push(controls.rudder);
        descControls.trim.push(controls.trim);
        updateTimeWindow(descTime, { vs_err_fpm: vsErr }, descThresholds);
      }
      const meanVsDescend = totalVs / samples;
      console.log(`ILS METRIC descend_vs_mean_fpm=${meanVsDescend.toFixed(1)} end_vs_fpm=${state.verticalSpeed.toFixed(1)} target_vs_fpm=${state.autopilotTargets.vs}`);
      assert.ok(meanVsDescend < -100);
      summarizeMetrics(
        'descent_vs',
        {
          dt_s: SIM_DT,
          duration_s: 20,
          targets: state.autopilotTargets,
          env: physics.testEnv,
          airport: airportCase.code,
          runway: geom.runwayName,
          profile: physics.testEnvProfile
        },
        descThresholds,
        descErrors,
        descControls,
        descTime
      );
    }
  }
});

test('Cruise altitude hold stays near zero vertical speed', async () => {
  for (const airportCase of AIRPORT_CASES) {
    const geom = airportService.getRunwayGeometry(airportCase.code, airportCase.runway);
    assert.ok(geom);
    for (const profile of AIRSPACE_PROFILES) {
      const approach = buildApproachState(geom, 25, 0, 2000);
      const physics = await buildPhysics({
        lat: approach.latitude,
        lon: approach.longitude,
        altitudeFt: 12000,
        heading: geom.heading,
        speedKts: 260,
        runwayGeom: geom,
        envProfile: profile
      });
      physics.setAutopilot(true, { mode: 'HDG', speed: 260, heading: geom.heading, vs: 0, altitude: 12000 });
      const durationSec = 15;
      const steps = Math.round(durationSec / SIM_DT);
      const thresholds = { alt_err_ft: 100, vs_fpm: 200 };
      const errorsSamples = { alt_err_ft: [], vs_fpm: [] };
      const controlSamples = { effort: [], throttle: [], elevator: [], aileron: [], rudder: [], trim: [] };
      const timeState = { time: 0, timeWithin: 0, timeToWithin: null };
      let state = null;
      for (let i = 0; i < steps; i += 1) {
        state = physics.update({ throttle: 0.6, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 0, gear: false }, SIM_DT);
        const altErr = 12000 - (state.position?.z ?? 0);
        const errors = { alt_err_ft: altErr, vs_fpm: state.verticalSpeed ?? 0 };
        errorsSamples.alt_err_ft.push(errors.alt_err_ft);
        errorsSamples.vs_fpm.push(errors.vs_fpm);
        const controls = extractControls(state);
        controlSamples.effort.push(controls.effort);
        controlSamples.throttle.push(controls.throttle);
        controlSamples.elevator.push(controls.elevator);
        controlSamples.aileron.push(controls.aileron);
        controlSamples.rudder.push(controls.rudder);
        controlSamples.trim.push(controls.trim);
        updateTimeWindow(timeState, errors, thresholds);
      }
      assert.ok(Math.abs(state.verticalSpeed) <= 800);
      summarizeMetrics(
        'cruise_hold',
        {
          dt_s: SIM_DT,
          duration_s: durationSec,
          targets: state.autopilotTargets,
          env: physics.testEnv,
          airport: airportCase.code,
          runway: geom.runwayName,
          profile: physics.testEnvProfile
        },
        thresholds,
        errorsSamples,
        controlSamples,
        timeState
      );
    }
  }
});

test('ILS approach commands descent and captures localizer', async () => {
  for (const airportCase of AIRPORT_CASES) {
    const geom = airportService.getRunwayGeometry(airportCase.code, airportCase.runway);
    assert.ok(geom);
    for (const profile of AIRSPACE_PROFILES) {
      const approach = buildApproachState(geom, 8, 0.05, 200);
      const physics = await buildPhysics({
        lat: approach.latitude,
        lon: approach.longitude,
        altitudeFt: approach.altitude,
        heading: approach.heading,
        speedKts: 145,
        runwayGeom: geom,
        envProfile: profile
      });
      physics.autopilot.setNavFrequency(geom.ilsFrequency);
      physics.setAutopilot(true, { mode: 'ILS', speed: 145, heading: geom.heading, vs: 0, altitude: 3000 });
      const durationSec = 12;
      const steps = Math.round(durationSec / SIM_DT);
      const thresholds = { loc_deg: 1.5, gs_deg: 1.5, cross_ft: 120, alt_err_ft: 60, heading_err_deg: 2, vs_err_fpm: 200 };
      const errorsSamples = { loc_deg: [], gs_deg: [], cross_ft: [], alt_err_ft: [], heading_err_deg: [], vs_err_fpm: [] };
      const controlSamples = { effort: [], throttle: [], elevator: [], aileron: [], rudder: [], trim: [] };
      const timeState = { time: 0, timeWithin: 0, timeToWithin: null };
      let state = null;
      for (let i = 0; i < steps; i += 1) {
        state = physics.update({ throttle: 0.5, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 1.0, gear: true }, SIM_DT);
        const ilsStep = state.autopilotDebug?.ils || {};
        const headingErr = Math.abs(((getHeadingDeg(state) - geom.heading + 540) % 360) - 180);
        const vsErr = (state.verticalSpeed ?? 0) - (state.autopilotTargets?.vs ?? 0);
        const errors = {
          loc_deg: ilsStep.locDeviationDeg ?? null,
          gs_deg: ilsStep.gsDeviationDeg ?? null,
          cross_ft: ilsStep.distCross ?? null,
          alt_err_ft: ilsStep.altError ?? null,
          heading_err_deg: headingErr,
          vs_err_fpm: vsErr
        };
        Object.entries(errors).forEach(([key, value]) => errorsSamples[key].push(value));
        const controls = extractControls(state);
        controlSamples.effort.push(controls.effort);
        controlSamples.throttle.push(controls.throttle);
        controlSamples.elevator.push(controls.elevator);
        controlSamples.aileron.push(controls.aileron);
        controlSamples.rudder.push(controls.rudder);
        controlSamples.trim.push(controls.trim);
        updateTimeWindow(timeState, errors, thresholds);
      }
      const ils = state.autopilotDebug?.ils || {};
      const distNm = Number.isFinite(ils.distAlong) ? ils.distAlong / 6076 : null;
      console.log(
        `ILS METRIC approach_loc_deg=${Number.isFinite(ils.locDeviationDeg) ? ils.locDeviationDeg.toFixed(3) : 'null'} ` +
        `gs_deg=${Number.isFinite(ils.gsDeviationDeg) ? ils.gsDeviationDeg.toFixed(3) : 'null'} ` +
        `cross_ft=${Number.isFinite(ils.distCross) ? ils.distCross.toFixed(1) : 'null'} ` +
        `alt_err_ft=${Number.isFinite(ils.altError) ? ils.altError.toFixed(1) : 'null'} ` +
        `dist_nm=${distNm !== null ? distNm.toFixed(3) : 'null'} ` +
        `vs_fpm=${state.verticalSpeed.toFixed(1)} target_vs_fpm=${state.autopilotTargets.vs}`
      );
      assert.ok(state.autopilotDebug?.ils?.active);
      assert.ok(state.autopilotTargets.vs < 0);
      assert.equal(state.autopilotDebug.ils.locCaptured, true);
      summarizeMetrics(
        'ils_approach',
        {
          dt_s: SIM_DT,
          duration_s: durationSec,
          targets: state.autopilotTargets,
          env: physics.testEnv,
          airport: airportCase.code,
          runway: geom.runwayName,
          profile: physics.testEnvProfile
        },
        thresholds,
        errorsSamples,
        controlSamples,
        timeState
      );
    }
  }
});

test('ILS final landing limits bank on short final', async () => {
  for (const airportCase of AIRPORT_CASES) {
    const geom = airportService.getRunwayGeometry(airportCase.code, airportCase.runway);
    assert.ok(geom);
    for (const profile of AIRSPACE_PROFILES) {
      const final = buildApproachState(geom, 0.7, 0.02, 80);
      const physics = await buildPhysics({
        lat: final.latitude,
        lon: final.longitude,
        altitudeFt: final.altitude,
        heading: final.heading,
        speedKts: 135,
        runwayGeom: geom,
        envProfile: profile
      });
      physics.autopilot.setNavFrequency(geom.ilsFrequency);
      physics.setAutopilot(true, { mode: 'ILS', speed: 135, heading: geom.heading, vs: 0, altitude: 2000 });
      const durationSec = 8;
      const steps = Math.round(durationSec / SIM_DT);
      const thresholds = { loc_deg: 1.0, gs_deg: 1.0, cross_ft: 90, alt_err_ft: 40, heading_err_deg: 1.5, roll_deg: 5 };
      const errorsSamples = { loc_deg: [], gs_deg: [], cross_ft: [], alt_err_ft: [], heading_err_deg: [], roll_deg: [] };
      const controlSamples = { effort: [], throttle: [], elevator: [], aileron: [], rudder: [], trim: [] };
      const timeState = { time: 0, timeWithin: 0, timeToWithin: null };
      let state = null;
      for (let i = 0; i < steps; i += 1) {
        state = physics.update({ throttle: 0.4, pitch: 0, roll: 0, yaw: 0, trim: 0, flaps: 1.0, gear: true }, SIM_DT);
        const ilsStep = state.autopilotDebug?.ils || {};
        const headingErr = Math.abs(((getHeadingDeg(state) - geom.heading + 540) % 360) - 180);
        const rollDegSample = state.orientation ? (state.orientation.phi * toDeg) : 0;
        const errors = {
          loc_deg: ilsStep.locDeviationDeg ?? null,
          gs_deg: ilsStep.gsDeviationDeg ?? null,
          cross_ft: ilsStep.distCross ?? null,
          alt_err_ft: ilsStep.altError ?? null,
          heading_err_deg: headingErr,
          roll_deg: rollDegSample
        };
        Object.entries(errors).forEach(([key, value]) => errorsSamples[key].push(value));
        const controls = extractControls(state);
        controlSamples.effort.push(controls.effort);
        controlSamples.throttle.push(controls.throttle);
        controlSamples.elevator.push(controls.elevator);
        controlSamples.aileron.push(controls.aileron);
        controlSamples.rudder.push(controls.rudder);
        controlSamples.trim.push(controls.trim);
        updateTimeWindow(timeState, errors, thresholds);
      }
      const ils = state.autopilotDebug?.ils || {};
      const distNm = Number.isFinite(ils.distAlong) ? ils.distAlong / 6076 : null;
      const rollDeg = state.orientation ? (state.orientation.phi * 180 / Math.PI) : 0;
      console.log(
        `ILS METRIC final_roll_deg=${rollDeg.toFixed(2)} target_roll_deg=${state.autopilotDebug?.targetRoll?.toFixed(2)} ` +
        `loc_deg=${Number.isFinite(ils.locDeviationDeg) ? ils.locDeviationDeg.toFixed(3) : 'null'} ` +
        `gs_deg=${Number.isFinite(ils.gsDeviationDeg) ? ils.gsDeviationDeg.toFixed(3) : 'null'} ` +
        `cross_ft=${Number.isFinite(ils.distCross) ? ils.distCross.toFixed(1) : 'null'} ` +
        `alt_err_ft=${Number.isFinite(ils.altError) ? ils.altError.toFixed(1) : 'null'} ` +
        `dist_nm=${distNm !== null ? distNm.toFixed(3) : 'null'}`
      );
      assert.ok(state.autopilotDebug?.ils?.active);
      assert.ok(Math.abs(state.autopilotDebug.targetRoll) <= 8);
      summarizeMetrics(
        'ils_final',
        {
          dt_s: SIM_DT,
          duration_s: durationSec,
          targets: state.autopilotTargets,
          env: physics.testEnv,
          airport: airportCase.code,
          runway: geom.runwayName,
          profile: physics.testEnvProfile
        },
        thresholds,
        errorsSamples,
        controlSamples,
        timeState
      );
    }
  }
});
