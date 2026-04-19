import { getNPCDifficultyProfile, shouldNPCIntroduceNoise } from './NPCDifficultyProfile.js';

function formatBool(value, truthy = 'ON', falsy = 'OFF') {
  if (value === undefined || value === null) return 'UNKNOWN';
  return value ? truthy : falsy;
}

function formatNumber(value, digits = 0, suffix = '') {
  return Number.isFinite(value) ? `${Number(value).toFixed(digits)}${suffix}` : 'UNKNOWN';
}

function maybeCorrupt(value, profile, importance = 'normal', transform = null) {
  if (!shouldNPCIntroduceNoise(profile, importance)) {
    return value;
  }
  return typeof transform === 'function' ? transform(value) : value;
}

export function buildNPCSystemSnapshot({ difficulty = 'intermediate', currentFreq, currentFreqType, sceneState, startupContext, activeFailures = [], physicsState, flightData }) {
  const profile = getNPCDifficultyProfile(difficulty);
  const systems = physicsState?.systems || {};
  const engines = Array.isArray(physicsState?.engines)
    ? physicsState.engines
    : Array.isArray(systems?.engines)
      ? systems.engines
      : [];

  const primaryFailure = activeFailures[0]?.type || 'none';
  const engine1N2 = engines[0]?.n2 ?? engines[0]?.state?.n2 ?? null;
  const engine2N2 = engines[1]?.n2 ?? engines[1]?.state?.n2 ?? null;
  const engine1FuelFlow = engines[0]?.fuelFlow ?? engines[0]?.state?.fuelFlow ?? null;
  const engine2FuelFlow = engines[1]?.fuelFlow ?? engines[1]?.state?.fuelFlow ?? null;

  const snapshot = {
    phase: sceneState?.phaseName || sceneState?.phaseType || 'Unknown phase',
    activeFailures: activeFailures.length,
    primaryFailure,
    radio: `${currentFreqType || 'UNKNOWN'} ${formatNumber(maybeCorrupt(currentFreq, profile, 'normal', (value) => Number(value || 0) + 0.025), 3)}`,
    altitude: formatNumber(maybeCorrupt(flightData?.altitude, profile, 'normal', (value) => Number(value || 0) + 2000), 0, ' ft'),
    airspeed: formatNumber(maybeCorrupt(flightData?.indicatedAirspeed ?? flightData?.airspeed, profile, 'normal', (value) => Number(value || 0) + 12), 0, ' kt'),
    heading: formatNumber(maybeCorrupt(flightData?.derived?.heading ?? flightData?.heading, profile, 'normal', (value) => Number(value || 0) + 15), 0, '°'),
    battery: formatBool(maybeCorrupt(systems?.electrical?.battery, profile, 'high', (value) => !value)),
    apu: `${formatBool(maybeCorrupt(systems?.apu?.running, profile, 'high', (value) => !value), 'RUN', 'OFF')} / ${formatNumber(maybeCorrupt(systems?.apu?.n2, profile, 'normal', (value) => Number(value || 0) - 8), 0, '%')}`,
    apuGenerator: formatBool(maybeCorrupt(systems?.electrical?.apuGen, profile, 'high', (value) => !value)),
    generators: `GEN1 ${formatBool(maybeCorrupt(systems?.electrical?.gen1, profile, 'high', (value) => !value))}, GEN2 ${formatBool(maybeCorrupt(systems?.electrical?.gen2, profile, 'high', (value) => !value))}`,
    hydraulicA: formatNumber(maybeCorrupt(systems?.hydraulics?.sysA?.pressure, profile, 'high', (value) => Number(value || 0) - 400), 0, ' psi'),
    hydraulicB: formatNumber(maybeCorrupt(systems?.hydraulics?.sysB?.pressure, profile, 'high', (value) => Number(value || 0) - 400), 0, ' psi'),
    fuelPumps: formatBool(maybeCorrupt((systems?.fuel?.leftPumps || systems?.fuel?.centerPumps) && (systems?.fuel?.rightPumps || systems?.fuel?.centerPumps), profile, 'normal', (value) => !value)),
    engine1: `N2 ${formatNumber(maybeCorrupt(engine1N2, profile, 'high', (value) => Number(value || 0) - 10), 0, '%')}, FF ${formatNumber(maybeCorrupt(engine1FuelFlow, profile, 'normal', (value) => Number(value || 0) * 0.8), 0)}`,
    engine2: `N2 ${formatNumber(maybeCorrupt(engine2N2, profile, 'high', (value) => Number(value || 0) - 10), 0, '%')}, FF ${formatNumber(maybeCorrupt(engine2FuelFlow, profile, 'normal', (value) => Number(value || 0) * 0.8), 0)}`,
    flaps: formatNumber(maybeCorrupt(flightData?.flaps ?? flightData?.flapsValue ?? physicsState?.controls?.flaps, profile, 'normal', (value) => Number(value || 0) + 1), 0),
    gear: formatNumber(maybeCorrupt(flightData?.gear ?? flightData?.gearValue ?? physicsState?.controls?.gear, profile, 'normal', (value) => value === 1 ? 0 : 1), 0),
    speedbrake: formatNumber(maybeCorrupt(flightData?.airBrakes ?? flightData?.airBrakesValue ?? physicsState?.controls?.airBrakes, profile, 'normal', (value) => Number(value || 0) + 0.2), 1),
    parkingBrake: formatBool(maybeCorrupt(systems?.brakes?.parkingBrake, profile, 'normal', (value) => !value), 'SET', 'RELEASED'),
    autobrake: maybeCorrupt(systems?.brakes?.autobrake || 'UNKNOWN', profile, 'normal', () => 'DISARM'),
    transponder: maybeCorrupt(systems?.transponder?.mode || 'UNKNOWN', profile, 'normal', () => 'STBY'),
    startupBlockers: startupContext?.missingItems?.length ? startupContext.missingItems.join(', ') : 'none'
  };

  return snapshot;
}

export function formatNPCSystemReport(snapshot, detail = 'full') {
  if (detail === 'brief') {
    return `Phase ${snapshot.phase}. Failures ${snapshot.activeFailures}. Radio ${snapshot.radio}. Alt ${snapshot.altitude}. IAS ${snapshot.airspeed}. Startup blockers ${snapshot.startupBlockers}.`;
  }

  return [
    `Phase ${snapshot.phase}`,
    `Failures ${snapshot.activeFailures} (${snapshot.primaryFailure})`,
    `Radio ${snapshot.radio}`,
    `Altitude ${snapshot.altitude}, IAS ${snapshot.airspeed}, heading ${snapshot.heading}`,
    `Electrical battery ${snapshot.battery}, ${snapshot.generators}, APU ${snapshot.apu}, APU gen ${snapshot.apuGenerator}`,
    `Hydraulics A ${snapshot.hydraulicA}, B ${snapshot.hydraulicB}`,
    `Fuel pumps ${snapshot.fuelPumps}, Engine 1 ${snapshot.engine1}, Engine 2 ${snapshot.engine2}`,
    `Flaps ${snapshot.flaps}, Gear ${snapshot.gear}, Speedbrake ${snapshot.speedbrake}`,
    `Autobrake ${snapshot.autobrake}, Transponder ${snapshot.transponder}, Parking brake ${snapshot.parkingBrake}`,
    `Startup blockers ${snapshot.startupBlockers}`
  ].join('. ') + '.';
}
