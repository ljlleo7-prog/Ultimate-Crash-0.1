const MAX_TELEMETRY_SAMPLES = 240;
const STALE_SAMPLE_WINDOW_MS = 10000;
const TREND_SAMPLE_WINDOW = 12;

const toFiniteNumber = (value) => (Number.isFinite(value) ? value : null);

const getAbsMetric = (sample) => {
  const candidates = [
    sample?.locDeviationDeg,
    sample?.gsDeviationDeg,
    sample?.distCross,
    sample?.altError
  ].filter(Number.isFinite).map(Math.abs);

  if (!candidates.length) return null;
  return Math.max(...candidates);
};

export const buildApproachTelemetrySample = ({ ils, timestamp = Date.now() }) => {
  if (!ils || !ils.active) return null;

  return {
    timestamp,
    runway: typeof ils.runway === 'string' ? ils.runway : null,
    phase: typeof ils.phase === 'string' ? ils.phase : null,
    distAlong: toFiniteNumber(ils.distAlong),
    distCross: toFiniteNumber(ils.distCross),
    altError: toFiniteNumber(ils.altError),
    locDeviationDeg: toFiniteNumber(ils.locDeviationDeg),
    gsDeviationDeg: toFiniteNumber(ils.gsDeviationDeg),
    driftAngle: toFiniteNumber(ils.driftAngle),
    targetAltitude: toFiniteNumber(ils.targetAltitude),
    runwayEntryHeightFt: toFiniteNumber(ils.runwayEntryHeightFt),
    sinkRateFpm: toFiniteNumber(ils.sinkRateFpm),
    locCaptured: ils.locCaptured === true,
    gsCaptured: ils.gsCaptured === true
  };
};

export const appendApproachTelemetrySample = (samples, sample, options = {}) => {
  const maxSamples = Number.isInteger(options.maxSamples) ? options.maxSamples : MAX_TELEMETRY_SAMPLES;
  const staleWindowMs = Number.isFinite(options.staleWindowMs) ? options.staleWindowMs : STALE_SAMPLE_WINDOW_MS;

  if (!sample) {
    const latest = samples[samples.length - 1];
    if (!latest) return [];
    return Date.now() - latest.timestamp > staleWindowMs ? [] : samples;
  }

  const runwayChanged = samples.length > 0 && sample.runway && samples[samples.length - 1]?.runway && sample.runway !== samples[samples.length - 1].runway;
  const baseSamples = runwayChanged ? [] : samples;
  const nextSamples = [...baseSamples, sample];

  if (nextSamples.length <= maxSamples) return nextSamples;
  return nextSamples.slice(nextSamples.length - maxSamples);
};

const averageAbs = (samples, key) => {
  const values = samples.map(sample => sample?.[key]).filter(Number.isFinite).map(Math.abs);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const formatCaptureTime = (samples, predicate) => {
  if (!samples.length) return null;
  const first = samples[0]?.timestamp ?? null;
  const captured = samples.find(predicate);
  if (!captured || first === null) return null;
  return Math.max(0, (captured.timestamp - first) / 1000);
};

const getTrend = (samples) => {
  if (samples.length < 4) return 'stable';

  const recent = samples.slice(-TREND_SAMPLE_WINDOW);
  const half = Math.max(2, Math.floor(recent.length / 2));
  const older = recent.slice(0, half);
  const newer = recent.slice(-half);
  const olderMetric = older.map(getAbsMetric).filter(Number.isFinite);
  const newerMetric = newer.map(getAbsMetric).filter(Number.isFinite);

  if (!olderMetric.length || !newerMetric.length) return 'stable';

  const olderAvg = olderMetric.reduce((sum, value) => sum + value, 0) / olderMetric.length;
  const newerAvg = newerMetric.reduce((sum, value) => sum + value, 0) / newerMetric.length;
  const delta = newerAvg - olderAvg;

  if (delta < -2) return 'improving';
  if (delta > 2) return 'worsening';
  return 'stable';
};

export const summarizeApproachTelemetry = (samples) => {
  if (!Array.isArray(samples) || samples.length === 0) return null;

  const current = samples[samples.length - 1];
  const finalSample = [...samples]
    .filter(sample => Number.isFinite(sample?.distAlong))
    .sort((a, b) => Math.abs(a.distAlong) - Math.abs(b.distAlong))[0] || current;

  return {
    sampleCount: samples.length,
    current,
    trend: getTrend(samples),
    meanAbsLocDeviationDeg: averageAbs(samples, 'locDeviationDeg'),
    meanAbsGsDeviationDeg: averageAbs(samples, 'gsDeviationDeg'),
    meanAbsCrossTrackFt: averageAbs(samples, 'distCross'),
    meanAbsAltErrorFt: averageAbs(samples, 'altError'),
    locCaptureTimeSec: formatCaptureTime(samples, sample => sample.locCaptured === true),
    gsCaptureTimeSec: formatCaptureTime(samples, sample => sample.gsCaptured === true),
    locCaptured: samples.some(sample => sample.locCaptured === true),
    gsCaptured: samples.some(sample => sample.gsCaptured === true),
    final: finalSample
  };
};
