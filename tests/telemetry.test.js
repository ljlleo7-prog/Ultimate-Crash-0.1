import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildApproachTelemetrySample,
  appendApproachTelemetrySample,
  summarizeApproachTelemetry
} from '../src/utils/approachTelemetry.js';

const testResults = [];

// ─── helpers ────────────────────────────────────────────────────────────────

const makeIls = (overrides = {}) => ({
  active: true,
  runway: '24L',
  phase: 'approach',
  distAlong: 30000,
  distCross: 80,
  altError: 60,
  locDeviationDeg: 1.2,
  gsDeviationDeg: 0.8,
  driftAngle: 0.5,
  targetAltitude: 1200,
  locCaptured: false,
  gsCaptured: false,
  ...overrides
});

const makeSample = (overrides = {}, timestamp = Date.now()) =>
  buildApproachTelemetrySample({ ils: makeIls(overrides), timestamp });

const buildSamples = (count, overridesFn = () => ({}), baseTs = 1000) =>
  Array.from({ length: count }, (_, i) =>
    buildApproachTelemetrySample({ ils: makeIls(overridesFn(i)), timestamp: baseTs + i * 100 })
  );

// ─── buildApproachTelemetrySample ───────────────────────────────────────────

test('buildApproachTelemetrySample returns null when ils is inactive', () => {
  const result = buildApproachTelemetrySample({ ils: { active: false } });
  assert.equal(result, null);
});

test('buildApproachTelemetrySample returns null when ils is null', () => {
  assert.equal(buildApproachTelemetrySample({ ils: null }), null);
});

test('buildApproachTelemetrySample maps finite fields correctly', () => {
  const ts = 5000;
  const sample = buildApproachTelemetrySample({ ils: makeIls({ distCross: 42.5, altError: -30 }), timestamp: ts });
  assert.ok(sample);
  assert.equal(sample.timestamp, ts);
  assert.equal(sample.distCross, 42.5);
  assert.equal(sample.altError, -30);
  assert.equal(sample.runway, '24L');
  assert.equal(sample.locCaptured, false);
});

test('buildApproachTelemetrySample coerces non-finite values to null', () => {
  const sample = buildApproachTelemetrySample({
    ils: makeIls({ distCross: NaN, altError: Infinity, locDeviationDeg: undefined })
  });
  assert.ok(sample);
  assert.equal(sample.distCross, null);
  assert.equal(sample.altError, null);
  assert.equal(sample.locDeviationDeg, null);
});

test('buildApproachTelemetrySample captures locCaptured and gsCaptured booleans', () => {
  const sample = buildApproachTelemetrySample({ ils: makeIls({ locCaptured: true, gsCaptured: true }) });
  assert.ok(sample);
  assert.equal(sample.locCaptured, true);
  assert.equal(sample.gsCaptured, true);
});

// ─── appendApproachTelemetrySample ──────────────────────────────────────────

test('appendApproachTelemetrySample appends a valid sample', () => {
  const sample = makeSample();
  const result = appendApproachTelemetrySample([], sample);
  assert.equal(result.length, 1);
  assert.equal(result[0], sample);
});

test('appendApproachTelemetrySample returns empty array when sample is null and buffer is empty', () => {
  const result = appendApproachTelemetrySample([], null);
  assert.deepEqual(result, []);
});

test('appendApproachTelemetrySample prunes stale buffer when sample is null', () => {
  const oldSample = makeSample({}, Date.now() - 20000);
  const result = appendApproachTelemetrySample([oldSample], null, { staleWindowMs: 5000 });
  assert.deepEqual(result, []);
});

test('appendApproachTelemetrySample keeps fresh buffer when sample is null', () => {
  const freshSample = makeSample({}, Date.now() - 100);
  const result = appendApproachTelemetrySample([freshSample], null, { staleWindowMs: 5000 });
  assert.equal(result.length, 1);
});

test('appendApproachTelemetrySample caps buffer at maxSamples', () => {
  const samples = buildSamples(10, () => ({}), 1000);
  let buf = [];
  for (const s of samples) {
    buf = appendApproachTelemetrySample(buf, s, { maxSamples: 5 });
  }
  assert.equal(buf.length, 5);
  assert.equal(buf[buf.length - 1], samples[samples.length - 1]);
});

test('appendApproachTelemetrySample resets buffer on runway change', () => {
  const s1 = buildApproachTelemetrySample({ ils: makeIls({ runway: '24L' }), timestamp: 1000 });
  const s2 = buildApproachTelemetrySample({ ils: makeIls({ runway: '06R' }), timestamp: 2000 });
  let buf = appendApproachTelemetrySample([], s1);
  buf = appendApproachTelemetrySample(buf, s2);
  assert.equal(buf.length, 1);
  assert.equal(buf[0].runway, '06R');
});

// ─── summarizeApproachTelemetry ──────────────────────────────────────────────

test('summarizeApproachTelemetry returns null for empty array', () => {
  assert.equal(summarizeApproachTelemetry([]), null);
});

test('summarizeApproachTelemetry returns null for non-array', () => {
  assert.equal(summarizeApproachTelemetry(null), null);
});

test('summarizeApproachTelemetry current is last sample', () => {
  const samples = buildSamples(3, (i) => ({ distCross: i * 10 }), 1000);
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  assert.equal(summary.current, samples[2]);
});

test('summarizeApproachTelemetry computes meanAbsCrossTrackFt', () => {
  const samples = buildSamples(4, (i) => ({ distCross: (i + 1) * 10 }), 1000);
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  // |10| + |20| + |30| + |40| = 100 / 4 = 25
  assert.equal(summary.meanAbsCrossTrackFt, 25);
});

test('summarizeApproachTelemetry computes meanAbsAltErrorFt', () => {
  const samples = buildSamples(2, (i) => ({ altError: i === 0 ? -40 : 60 }), 1000);
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  assert.equal(summary.meanAbsAltErrorFt, 50);
});

test('summarizeApproachTelemetry detects locCaptured', () => {
  const samples = [
    buildApproachTelemetrySample({ ils: makeIls({ locCaptured: false }), timestamp: 1000 }),
    buildApproachTelemetrySample({ ils: makeIls({ locCaptured: true }), timestamp: 2000 })
  ];
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  assert.equal(summary.locCaptured, true);
  assert.ok(Number.isFinite(summary.locCaptureTimeSec));
  assert.ok(summary.locCaptureTimeSec >= 0);
});

test('summarizeApproachTelemetry locCaptureTimeSec is null when never captured', () => {
  const samples = buildSamples(3, () => ({ locCaptured: false }), 1000);
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  assert.equal(summary.locCaptured, false);
  assert.equal(summary.locCaptureTimeSec, null);
});

test('summarizeApproachTelemetry trend is improving when errors decrease', () => {
  // 20 samples: first half large errors, second half small errors
  const samples = buildSamples(20, (i) => ({
    distCross: i < 10 ? 200 - i * 5 : 150 - i * 10,
    locDeviationDeg: i < 10 ? 5 - i * 0.2 : 3 - i * 0.2
  }), 1000);
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  assert.equal(summary.trend, 'improving');
});

test('summarizeApproachTelemetry trend is worsening when errors increase', () => {
  const samples = buildSamples(20, (i) => ({
    distCross: i * 15,
    locDeviationDeg: i * 0.3
  }), 1000);
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  assert.equal(summary.trend, 'worsening');
});

test('summarizeApproachTelemetry trend is stable for constant errors', () => {
  const samples = buildSamples(20, () => ({ distCross: 50, locDeviationDeg: 1.0 }), 1000);
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  assert.equal(summary.trend, 'stable');
});

test('summarizeApproachTelemetry final selects closest-to-threshold sample', () => {
  const samples = [
    buildApproachTelemetrySample({ ils: makeIls({ distAlong: 30000, distCross: 200 }), timestamp: 1000 }),
    buildApproachTelemetrySample({ ils: makeIls({ distAlong: 5000, distCross: 80 }), timestamp: 2000 }),
    buildApproachTelemetrySample({ ils: makeIls({ distAlong: 15000, distCross: 120 }), timestamp: 3000 })
  ];
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  // distAlong=5000 is closest to 0 (threshold)
  assert.equal(summary.final.distCross, 80);
});

test('summarizeApproachTelemetry sampleCount matches input length', () => {
  const samples = buildSamples(7, () => ({}), 1000);
  const summary = summarizeApproachTelemetry(samples);
  assert.ok(summary);
  assert.equal(summary.sampleCount, 7);

  testResults.push({
    test: 'sampleCount_matches_input',
    samples,
    summary
  });
});

// ─── JSON export ─────────────────────────────────────────────────────────────

const improvingSamples = buildSamples(20, (i) => ({
  distCross: i < 10 ? 200 - i * 5 : 150 - i * 10,
  locDeviationDeg: i < 10 ? 5 - i * 0.2 : 3 - i * 0.2,
  altError: i < 10 ? 100 - i * 3 : 70 - i * 5,
  gsDeviationDeg: i < 10 ? 2 - i * 0.1 : 1 - i * 0.05,
  locCaptured: i >= 5,
  gsCaptured: i >= 8
}), 1000);

const worseSamples = buildSamples(20, (i) => ({
  distCross: i * 15,
  locDeviationDeg: i * 0.3,
  altError: i * 8,
  gsDeviationDeg: i * 0.2
}), 1000);

const stableSamples = buildSamples(20, () => ({
  distCross: 50,
  locDeviationDeg: 1.0,
  altError: 40,
  gsDeviationDeg: 0.8
}), 1000);

const exportData = {
  timestamp: new Date().toISOString(),
  scenarios: [
    {
      name: 'improving_approach',
      samples: improvingSamples,
      summary: summarizeApproachTelemetry(improvingSamples)
    },
    {
      name: 'worsening_approach',
      samples: worseSamples,
      summary: summarizeApproachTelemetry(worseSamples)
    },
    {
      name: 'stable_approach',
      samples: stableSamples,
      summary: summarizeApproachTelemetry(stableSamples)
    }
  ],
  testResults
};

const outputPath = process.env.TELEMETRY_JSON_OUT || 'telemetry_test_results.json';
fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
console.log(`✓ Telemetry test data exported to ${outputPath}`);

// auto-terminate
process.exit(0);
