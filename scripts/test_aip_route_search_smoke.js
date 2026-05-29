import fs from 'node:fs/promises';
import path from 'node:path';
import { calculateGreatCircleNm, searchLocalAipRoute } from '../src/services/routes/aipRouteSearch.js';

const timeout = setTimeout(() => {
  console.error('AIP route search smoke test timed out after 30s');
  process.exit(1);
}, 30_000);
timeout.unref?.();

const csvDir = path.resolve('AIP_DATA/supabase_csv');
const airportCsvPath = path.resolve('AIP_DATA/airports.csv');
const lookupCsvPath = path.join(csvDir, 'aip_route_lookup_index.csv');
const readFile = (filePath) => fs.readFile(path.isAbsolute(filePath) ? filePath : path.join(csvDir, path.basename(filePath)), 'utf8');

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
};

const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const row = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
  });
};

const loadAirports = async () => {
  const rows = parseCsv(await fs.readFile(airportCsvPath, 'utf8'));
  const airports = new Map();

  for (const row of rows) {
    const codes = [row.ident, row.icao_code, row.gps_code].filter(Boolean);
    for (const code of codes) {
      airports.set(code.toUpperCase(), {
        icao: code.toUpperCase(),
        name: row.name,
        latitude: Number(row.latitude_deg),
        longitude: Number(row.longitude_deg),
        country: row.iso_country
      });
    }
  }

  return airports;
};

const loadLookupRows = async () => parseCsv(await fs.readFile(lookupCsvPath, 'utf8'));

const hasKtoKRows = (lookupRows) => lookupRows.some((row) => /^K[A-Z0-9]{3}$/.test(row.departure_code) && /^K[A-Z0-9]{3}$/.test(row.arrival_code));

const formatNumber = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : 'n/a';

const waypointLine = (waypoint, index) => [
  `    ${String(index + 1).padStart(2, '0')}. ${waypoint.name || waypoint.label}`,
  `lat=${formatNumber(waypoint.latitude, 6)}`,
  `lon=${formatNumber(waypoint.longitude, 6)}`,
  `type=${waypoint.type || 'WAYPOINT'}`,
  waypoint.airway ? `via=${waypoint.airway}` : null,
  waypoint.frequencyKhz ? `freqKhz=${waypoint.frequencyKhz}` : null,
  waypoint.isoCountry ? `iso=${waypoint.isoCountry}` : null,
  waypoint.associatedAirport ? `assoc=${waypoint.associatedAirport}` : null,
  waypoint.sourceSystem ? `source=${waypoint.sourceSystem}` : null
].filter(Boolean).join(' | ');

const legLine = (from, to, index) => {
  const distance = calculateGreatCircleNm(from, to);
  return [
    `    ${String(index + 1).padStart(2, '0')}. ${from.name || from.label} -> ${to.name || to.label}`,
    `distanceNm=${formatNumber(distance)}`,
    to.airway ? `via=${to.airway}` : null,
    `from=(${formatNumber(from.latitude, 6)}, ${formatNumber(from.longitude, 6)})`,
    `to=(${formatNumber(to.latitude, 6)}, ${formatNumber(to.longitude, 6)})`
  ].filter(Boolean).join(' | ');
};

const formatDiagnosticEntry = (entry) => [
  entry.ident,
  entry.reason ? `reason=${entry.reason}` : null,
  entry.candidateCount ? `candidates=${entry.candidateCount}` : null,
  entry.bestIsoCountry ? `iso=${entry.bestIsoCountry}` : null,
  entry.bestRegionCode ? `region=${entry.bestRegionCode}` : null,
  Number.isFinite(entry.previousDistanceNm) ? `prevNm=${formatNumber(entry.previousDistanceNm)}` : null,
  Number.isFinite(entry.progressNm) ? `progressNm=${formatNumber(entry.progressNm)}` : null,
  Number.isFinite(entry.projectedNm) ? `projectedNm=${formatNumber(entry.projectedNm)}` : null,
  Number.isFinite(entry.coveragePercent) ? `coverage=${formatNumber(entry.coveragePercent, 1)}%` : null,
  entry.pathLength ? `pathLen=${entry.pathLength}` : null
].filter(Boolean).join(' | ');

const printDiagnosticBucket = (title, entries = [], limit = 12) => {
  if (!entries.length) return;
  console.log(`  ${title} (${entries.length}${entries.length > limit ? `, showing ${limit}` : ''}):`);
  entries.slice(0, limit).forEach((entry) => console.log(`    ${formatDiagnosticEntry(entry)}`));
};

const printRouteDiagnostics = (result) => {
  const diagnostics = result.route?.metadata?.localAipDiagnostics || result.metrics?.diagnostics;
  if (!diagnostics) return;
  const graph = diagnostics.graph || {};
  console.log(`  Search diagnostics: starts=${graph.startCount ?? 0} | goals=${graph.goalCount ?? 0} | terminals=${graph.terminalCandidates ?? 0}`);
  printDiagnosticBucket('Missing from reference data', diagnostics.missingFixes);
  printDiagnosticBucket('Present but rejected by resolver', diagnostics.rejectedFixes);
  printDiagnosticBucket('Reachable but pruned/not searched', diagnostics.prunedFixes);
  printDiagnosticBucket('Unreachable from edge index', diagnostics.unreachableFixes);
};

const printRouteDetails = (result) => {
  const waypoints = result.route?.waypoints || [];
  const sourceLegs = result.route?.metadata?.localAipLegs || [];

  console.log('  Waypoints:');
  waypoints.forEach((waypoint, index) => console.log(waypointLine(waypoint, index)));

  console.log('  Measured legs:');
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    console.log(legLine(waypoints[index], waypoints[index + 1], index));
  }

  if (sourceLegs.length) {
    console.log('  Published source legs:');
    sourceLegs.forEach((leg) => {
      console.log(`    ${String(leg.leg_sequence).padStart(2, '0')}. ${leg.from_fix} -> ${leg.to_fix} | airway=${leg.airway || 'DCT'}`);
    });
  }
};

const MAX_DISTANCE_OVER_LIMIT_PERCENT = 20;
const MIN_PUBLISHED_FIX_COVERAGE_PERCENT = 50;
const MIN_PUBLISHED_LEG_COVERAGE_PERCENT = 25;
const MIN_PUBLISHED_FIX_COVERAGE_PERCENT_Z_REGION = 25;
const MIN_PUBLISHED_LEG_COVERAGE_PERCENT_Z_REGION = 0;

const isDirectAirway = (airway = '') => {
  const normalized = String(airway || '').trim().toUpperCase();
  return !normalized || normalized === 'DCT' || normalized === 'DIRECT';
};

const isPureDirectRouting = (result) => {
  const waypoints = result.route?.waypoints || [];
  const sourceLegs = result.route?.metadata?.localAipLegs || [];
  const routeCode = result.route?.metadata?.routeCode || '';
  if (waypoints.length <= 2) return true;
  if (routeCode.startsWith('BRUTE-')) return sourceLegs.length <= 1;
  if (!sourceLegs.length) return false;
  return sourceLegs.every((leg) => isDirectAirway(leg.airway));
};

const routeSearchOptions = (overrides = {}) => ({
  csvDir,
  readFile,
  maxElapsedMs: 1500,
  maxExpandedNodes: 3000,
  maxEdgeRelaxations: 15000,
  minPublishedFixCoveragePercent: MIN_PUBLISHED_FIX_COVERAGE_PERCENT,
  minPublishedLegCoveragePercent: MIN_PUBLISHED_LEG_COVERAGE_PERCENT,
  ...overrides
});

const routeSearchOptionsZRegion = (overrides = {}) => ({
  csvDir,
  readFile,
  maxElapsedMs: 1500,
  maxExpandedNodes: 3000,
  maxEdgeRelaxations: 15000,
  minPublishedFixCoveragePercent: MIN_PUBLISHED_FIX_COVERAGE_PERCENT_Z_REGION,
  minPublishedLegCoveragePercent: MIN_PUBLISHED_LEG_COVERAGE_PERCENT_Z_REGION,
  ...overrides
});

const runRouteSearch = async (testCase, overrides = {}) => {
  const departure = airports.get(testCase.departure) || { icao: testCase.departure };
  const arrival = airports.get(testCase.arrival) || { icao: testCase.arrival };
  return searchLocalAipRoute({
    departure,
    arrival,
    options: routeSearchOptions(overrides)
  });
};

const isAcceptableRoute = (result, minFixCoverage = MIN_PUBLISHED_FIX_COVERAGE_PERCENT, minLegCoverage = MIN_PUBLISHED_LEG_COVERAGE_PERCENT, maxDistanceOverLimitPercent = MAX_DISTANCE_OVER_LIMIT_PERCENT) => {
  const metrics = result.metrics || {};
  return result.status === 'ok'
    && Number.isFinite(metrics.distanceOverLimitPercent)
    && metrics.publishedFixCoveragePercent >= minFixCoverage
    && metrics.publishedLegCoveragePercent >= minLegCoverage
    && metrics.distanceOverLimitPercent <= maxDistanceOverLimitPercent
    && !isPureDirectRouting(result);
};

const describeRouteAttempt = (testCase, result) => {
  const metrics = result.metrics || {};
  return [
    `${testCase.departure}-${testCase.arrival}`,
    `status=${result.status}`,
    `route=${result.route?.metadata?.routeCode || 'n/a'}`,
    `fixCoverage=${formatNumber(metrics.publishedFixCoveragePercent, 1)}%`,
    `legCoverage=${formatNumber(metrics.publishedLegCoveragePercent, 1)}%`,
    `resolvedFixes=${metrics.resolvedPublishedFixCount ?? 0}/${metrics.publishedFixCount ?? 0}`,
    `resolvedLegs=${metrics.resolvedPublishedLegCount ?? 0}/${metrics.publishedLegCount ?? 0}`,
    `coordMisses=${metrics.coordinateMisses ?? 0}`
  ].join(' | ');
};

const routeAttemptScore = ({ result }) => {
  const metrics = result.metrics || {};
  return [
    metrics.publishedFixCoveragePercent ?? -1,
    metrics.publishedLegCoveragePercent ?? -1,
    -(metrics.coordinateMisses ?? Infinity)
  ];
};

const compareRouteAttempts = (a, b) => {
  const scoreA = routeAttemptScore(a);
  const scoreB = routeAttemptScore(b);
  for (let index = 0; index < scoreA.length; index += 1) {
    if (scoreA[index] !== scoreB[index]) return scoreB[index] - scoreA[index];
  }
  return 0;
};

const caseFromRow = (row) => ({ departure: row.departure_code, arrival: row.arrival_code, maxExactMs: 1500 });

const findCoveredCases = async (rows, limit, minFixCoverage = MIN_PUBLISHED_FIX_COVERAGE_PERCENT, minLegCoverage = MIN_PUBLISHED_LEG_COVERAGE_PERCENT, searchOptions = routeSearchOptions, maxDistanceOverLimitPercent = MAX_DISTANCE_OVER_LIMIT_PERCENT) => {
  const cases = [];
  const attempts = [];
  const seenPairs = new Set();

  for (const row of rows) {
    const pairKey = `${row.departure_code}-${row.arrival_code}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const testCase = caseFromRow(row);
    const result = await runRouteSearch(testCase, { ...searchOptions({ useGraphFallback: false }), minPublishedFixCoveragePercent: minFixCoverage, minPublishedLegCoveragePercent: minLegCoverage });
    attempts.push({ testCase, result });
    if (isAcceptableRoute(result, minFixCoverage, minLegCoverage, maxDistanceOverLimitPercent)) cases.push(testCase);
    if (cases.length >= limit) break;
  }

  attempts.sort(compareRouteAttempts);
  return { cases, attempts: attempts.slice(0, 5) };
};

let passed = 0;
let failed = 0;
let skipped = 0;
const airports = await loadAirports();
const lookupRows = await loadLookupRows();

const zSameRegionRows = lookupRows.filter((row) => /^Z[A-Z0-9]{3}$/.test(row.departure_code) && /^Z[A-Z0-9]{3}$/.test(row.arrival_code));
const kSameRegionRows = lookupRows.filter((row) => /^K[A-Z0-9]{3}$/.test(row.departure_code) && /^K[A-Z0-9]{3}$/.test(row.arrival_code));
const kToZRows = lookupRows.filter((row) => /^K[A-Z0-9]{3}$/.test(row.departure_code) && /^Z[A-Z0-9]{3}$/.test(row.arrival_code));

const zSameRegionCoverage = await findCoveredCases(
  zSameRegionRows,
  2,
  MIN_PUBLISHED_FIX_COVERAGE_PERCENT_Z_REGION,
  MIN_PUBLISHED_LEG_COVERAGE_PERCENT_Z_REGION,
  routeSearchOptionsZRegion,
  Number.POSITIVE_INFINITY
);
const kSameRegionCoverage = hasKtoKRows(lookupRows) ? await findCoveredCases(kSameRegionRows, 2) : { cases: [], attempts: [] };
const kToZCoverage = await findCoveredCases(kToZRows, 3);

const sections = [
  {
    title: 'Z___ same-region',
    cases: zSameRegionCoverage.cases,
    attempts: zSameRegionCoverage.attempts,
    minFixCoverage: MIN_PUBLISHED_FIX_COVERAGE_PERCENT_Z_REGION,
    minLegCoverage: MIN_PUBLISHED_LEG_COVERAGE_PERCENT_Z_REGION,
    searchOptions: routeSearchOptionsZRegion,
    maxDistanceOverLimitPercent: Number.POSITIVE_INFINITY,
    required: true,
    skipMessage: 'no covered local AIP lookup rows yet'
  },
  {
    title: 'K___ same-region',
    cases: kSameRegionCoverage.cases,
    attempts: kSameRegionCoverage.attempts,
    required: false,
    skipMessage: hasKtoKRows(lookupRows) ? 'no covered local AIP lookup rows yet' : 'no local AIP lookup rows yet'
  },
  {
    title: 'K___ -> Z___ cross-region',
    cases: kToZCoverage.cases,
    attempts: kToZCoverage.attempts,
    required: true,
    skipMessage: 'no covered local AIP lookup rows yet'
  }
];

console.log('AIP route search smoke test');

for (const section of sections) {
  console.log(`\n${section.title}`);
  if (!section.cases.length) {
    if (section.required) {
      failed += 1;
      console.error(`FAIL ${section.title}: ${section.skipMessage || 'no cases configured'}`);
      if (section.attempts?.length) {
        console.log('  Best attempted routes:');
        section.attempts.forEach((attempt) => {
          console.log(`  ${describeRouteAttempt(attempt.testCase, attempt.result)}`);
          printRouteDiagnostics(attempt.result);
        });
      }
    } else {
      skipped += 1;
      console.log(`  SKIP ${section.title}: ${section.skipMessage || 'no cases configured'}`);
    }
    continue;
  }

  for (const testCase of section.cases) {
    const result = await runRouteSearch(testCase, section.searchOptions ? section.searchOptions() : {});
    const metrics = result.metrics || {};
    const label = `${testCase.departure}-${testCase.arrival}`;
    const summary = [
      label,
      `status=${result.status}`,
      `method=${metrics.method || 'none'}`,
      `route=${result.route?.metadata?.routeCode || 'n/a'}`,
      `greatCircleNm=${formatNumber(metrics.greatCircleNm)}`,
      `routedNm=${formatNumber(metrics.routedNm)}`,
      `overLimit=${formatNumber(metrics.distanceOverLimitPercent, 2)}%`,
      `fixCoverage=${formatNumber(metrics.publishedFixCoveragePercent, 1)}%`,
      `legCoverage=${formatNumber(metrics.publishedLegCoveragePercent, 1)}%`,
      `resolvedFixes=${metrics.resolvedPublishedFixCount ?? 0}/${metrics.publishedFixCount ?? 0}`,
      `resolvedLegs=${metrics.resolvedPublishedLegCount ?? 0}/${metrics.publishedLegCount ?? 0}`,
      `elapsedMs=${formatNumber(metrics.elapsedMs, 1)}`,
      `candidates=${metrics.candidateCount ?? 0}`,
      `expanded=${metrics.expandedNodes ?? 0}`,
      `relaxations=${metrics.edgeRelaxations ?? 0}`,
      `heuristics=${metrics.heuristicCalls ?? 0}`,
      `coordMisses=${metrics.coordinateMisses ?? 0}`
    ].join(' | ');

    console.log(summary);

    if (result.status === 'ok') {
      printRouteDetails(result);
      printRouteDiagnostics(result);
    }

    if (result.status !== 'ok') {
      if (section.required) {
        failed += 1;
        console.error(`FAIL ${label}: route not found`);
      } else {
        skipped += 1;
        console.log(`  SKIP ${label}: route not found in optional section`);
      }
      continue;
    }

    if (metrics.method === 'exact' && metrics.elapsedMs > testCase.maxExactMs) {
      failed += 1;
      console.error(`FAIL ${label}: exact lookup took ${metrics.elapsedMs}ms`);
      continue;
    }

    if (!Number.isFinite(metrics.distanceOverLimitPercent)) {
      failed += 1;
      console.error(`FAIL ${label}: distance quality metric missing`);
      continue;
    }

    const minFixCoverage = section.minFixCoverage ?? MIN_PUBLISHED_FIX_COVERAGE_PERCENT;
    const minLegCoverage = section.minLegCoverage ?? MIN_PUBLISHED_LEG_COVERAGE_PERCENT;

    if (metrics.publishedFixCoveragePercent < minFixCoverage) {
      failed += 1;
      console.error(`FAIL ${label}: published fix coverage is ${formatNumber(metrics.publishedFixCoveragePercent, 1)}%`);
      continue;
    }

    if (metrics.publishedLegCoveragePercent < minLegCoverage) {
      failed += 1;
      console.error(`FAIL ${label}: published leg coverage is ${formatNumber(metrics.publishedLegCoveragePercent, 1)}%`);
      continue;
    }

    const maxDistanceOverLimitPercent = section.maxDistanceOverLimitPercent ?? MAX_DISTANCE_OVER_LIMIT_PERCENT;

    if (metrics.distanceOverLimitPercent > maxDistanceOverLimitPercent) {
      failed += 1;
      console.error(`FAIL ${label}: routed distance is ${formatNumber(metrics.distanceOverLimitPercent, 2)}% over great-circle limit`);
      continue;
    }

    if (isPureDirectRouting(result)) {
      failed += 1;
      console.error(`FAIL ${label}: route is pure direct routing`);
      continue;
    }

    passed += 1;
  }
}

clearTimeout(timeout);

console.log(`\nAIP route search smoke test complete: ${passed} passed, ${failed} failed, ${skipped} skipped`);

if (passed === 0 || failed > 0) {
  process.exit(1);
}
