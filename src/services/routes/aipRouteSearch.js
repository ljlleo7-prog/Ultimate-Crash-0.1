import { createAipIndexKey, loadLocalAipCsvStore } from './aipCsvDataStore.js';
import { PROVIDER_STATUS, ROUTE_SOURCES } from './routeTypes.js';
import { aipLoadingProgress } from './aipLoadingProgress.js';

const DEFAULT_AIP_CYCLE = '2605';
const DEFAULT_OPTIONS = {
  regionCode: '*',
  aipCycle: DEFAULT_AIP_CYCLE,
  maxExpandedNodes: 4000,
  maxEdgeRelaxations: 20000,
  maxElapsedMs: 750,
  maxCandidateRoutes: 12,
  minPublishedFixCoveragePercent: 50,
  minPublishedLegCoveragePercent: 25,
  useGraphFallback: true,
  useBruteForceFallback: true,
  maxBruteForceDepth: 8,
  maxBruteForceBranches: 12,
  maxBruteForceCandidates: 24,
  maxBruteForceDistanceFactor: 1.8,
  minBruteForceProgressNm: -120,
  relaxAirwayLimitations: false
};

const getAirportCode = (airport) => {
  const candidates = [airport?.icao, airport?.ident, airport?.gpsCode, airport?.airport, airport?.code, airport?.iata]
    .map((value) => String(value || '').trim().toUpperCase())
    .filter(Boolean);
  return candidates.find((code) => /^[A-Z0-9]{4}$/.test(code)) || candidates[0] || '';
};

const toRadians = (degrees) => degrees * Math.PI / 180;

export const calculateGreatCircleNm = (from, to) => {
  if (!from || !to) return null;
  const fromLat = Number(from.latitude ?? from.latitude_deg);
  const fromLon = Number(from.longitude ?? from.longitude_deg);
  const toLat = Number(to.latitude ?? to.latitude_deg);
  const toLon = Number(to.longitude ?? to.longitude_deg);
  if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) return null;

  const radiusNm = 3440.065;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLon / 2) ** 2;
  return radiusNm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const routeDistanceNm = (points) => {
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const distance = calculateGreatCircleNm(points[index], points[index + 1]);
    if (distance === null) return null;
    total += distance;
  }
  return total;
};

const createDiagnostics = () => ({
  missingFixes: [],
  rejectedFixes: [],
  prunedFixes: [],
  unreachableFixes: [],
  graph: {
    startCount: 0,
    goalCount: 0,
    terminalCandidates: 0
  }
});

const addDiagnostic = (diagnostics, bucket, ident, detail = {}) => {
  if (!diagnostics?.[bucket]) return;
  const normalizedIdent = String(ident || '').toUpperCase();
  if (!normalizedIdent) return;
  const reason = detail.reason || '';
  const exists = diagnostics[bucket].some((entry) => entry.ident === normalizedIdent && entry.reason === reason);
  if (!exists) diagnostics[bucket].push({ ident: normalizedIdent, ...detail });
};

const createMetrics = (startedAt) => ({
  method: 'none',
  greatCircleNm: null,
  routedNm: null,
  distanceOverLimitPercent: null,
  publishedFixCoveragePercent: null,
  publishedLegCoveragePercent: null,
  publishedFixCount: 0,
  resolvedPublishedFixCount: 0,
  publishedLegCount: 0,
  resolvedPublishedLegCount: 0,
  elapsedMs: 0,
  candidateCount: 0,
  expandedNodes: 0,
  edgeRelaxations: 0,
  heuristicCalls: 0,
  coordinateMisses: 0,
  diagnostics: createDiagnostics(),
  capped: false,
  finish() {
    this.elapsedMs = Math.round((performance.now() - startedAt) * 10) / 10;
    return this;
  }
});

const getPointCandidates = (store, ident) => store.pointsByIdent.get(String(ident || '').toUpperCase()) || [];

const sourceScore = (point, regionCode) => {
  const source = String(point.source_system || '').toUpperCase();
  if (regionCode && (point.region_code === regionCode || point.iso_country === regionCode) && source.includes('AIP')) return 10;
  if (regionCode === 'US' && source.includes('FAA')) return 8;
  if (regionCode === 'CN' && point.iso_country === 'CN') return 8;
  if (source.includes('OURAIRPORTS')) return 4;
  return 0;
};

const resolvePoint = (store, ident, context = {}) => {
  const normalizedIdent = String(ident || '').toUpperCase();
  const candidates = getPointCandidates(store, normalizedIdent);
  const diagnostics = context.diagnostics || null;
  if (!candidates.length) {
    addDiagnostic(diagnostics, 'missingFixes', normalizedIdent, { reason: 'not-in-reference-points' });
    return null;
  }

  const {
    role = 'enroute',
    regionCode = '',
    previousPoint = null,
    nextPoint = null,
    departureCode = '',
    arrivalCode = ''
  } = context;

  const endpointCode = role === 'departure' ? departureCode : (role === 'arrival' ? arrivalCode : '');
  const hasContinuityContext = Boolean(previousPoint || nextPoint);
  const scored = candidates
    .map((point) => {
      const endpointMatch = endpointCode && point.ident === endpointCode && point.point_type === 'airport';
      const regionMatch = point.region_code === regionCode || point.iso_country === regionCode;
      const associatedWithEndpoint = point.associated_airport && [departureCode, arrivalCode].includes(point.associated_airport);
      const roleTypeMatch = role === 'enroute' ? point.point_type !== 'airport' : point.point_type === 'airport';
      const previousDistance = previousPoint ? calculateGreatCircleNm(previousPoint, point) : null;
      const nextDistance = nextPoint ? calculateGreatCircleNm(point, nextPoint) : null;
      const continuityDistance = hasContinuityContext
        ? (previousDistance ?? 0) + (nextDistance ?? 0)
        : Number.POSITIVE_INFINITY;

      return {
        point,
        endpointMatch,
        regionMatch,
        associatedWithEndpoint,
        roleTypeMatch,
        sourceScore: sourceScore(point, regionCode),
        previousDistance,
        nextDistance,
        continuityDistance
      };
    })
    .sort((a, b) => {
      if (a.endpointMatch !== b.endpointMatch) return Number(b.endpointMatch) - Number(a.endpointMatch);
      if (hasContinuityContext && Math.abs(a.continuityDistance - b.continuityDistance) > 1) return a.continuityDistance - b.continuityDistance;
      if (a.regionMatch !== b.regionMatch) return Number(b.regionMatch) - Number(a.regionMatch);
      if (a.associatedWithEndpoint !== b.associatedWithEndpoint) return Number(b.associatedWithEndpoint) - Number(a.associatedWithEndpoint);
      if (a.roleTypeMatch !== b.roleTypeMatch) return Number(b.roleTypeMatch) - Number(a.roleTypeMatch);
      if (a.sourceScore !== b.sourceScore) return b.sourceScore - a.sourceScore;
      return Number(Boolean(b.point.frequency_khz)) - Number(Boolean(a.point.frequency_khz));
    });

  const best = scored[0];
  const regionMismatch = regionCode && best.point.iso_country && best.point.iso_country !== regionCode && best.point.region_code !== regionCode;
  const associatedWithEndpoint = best.point.associated_airport && [departureCode, arrivalCode].includes(best.point.associated_airport);
  const nearestContextDistance = Math.min(
    best.previousDistance ?? Number.POSITIVE_INFINITY,
    best.nextDistance ?? Number.POSITIVE_INFINITY,
    best.continuityDistance ?? Number.POSITIVE_INFINITY
  );
  if (role === 'enroute' && regionMismatch && !associatedWithEndpoint && nearestContextDistance > 1200) {
    addDiagnostic(diagnostics, 'rejectedFixes', normalizedIdent, {
      reason: 'candidate-region-or-continuity-rejected',
      candidateCount: candidates.length,
      bestIsoCountry: best.point.iso_country || '',
      bestRegionCode: best.point.region_code || '',
      previousDistanceNm: best.previousDistance ?? null,
      nextDistanceNm: best.nextDistance ?? null
    });
    return null;
  }

  return best.point;
};

const waypointFromPoint = (point, index, airway = '') => ({
  name: point.ident,
  label: point.ident,
  latitude: point.latitude,
  longitude: point.longitude,
  type: point.point_type === 'airport' ? 'AIRPORT' : 'WAYPOINT',
  segment: index === 0 ? 'departure' : 'enroute',
  source: ROUTE_SOURCES.LOCAL_AIP,
  airway,
  frequencyKhz: point.frequency_khz || null,
  associatedAirport: point.associated_airport || '',
  isoCountry: point.iso_country || '',
  sourceSystem: point.source_system || ''
});

const calculateCoverage = ({ routeFixes, resolvedFixes, legs }) => {
  const resolvedIdents = new Set(resolvedFixes.map((fix) => fix.ident));
  const publishedFixCount = routeFixes.length;
  const resolvedPublishedFixCount = routeFixes.filter((fix) => resolvedIdents.has(fix.ident)).length;
  const publishedLegCount = legs.length;
  const resolvedPublishedLegCount = legs.filter((leg) => resolvedIdents.has(String(leg.from_fix || '').toUpperCase()) && resolvedIdents.has(String(leg.to_fix || '').toUpperCase())).length;

  return {
    publishedFixCount,
    resolvedPublishedFixCount,
    publishedLegCount,
    resolvedPublishedLegCount,
    publishedFixCoveragePercent: publishedFixCount ? (resolvedPublishedFixCount / publishedFixCount) * 100 : 0,
    publishedLegCoveragePercent: publishedLegCount ? (resolvedPublishedLegCount / publishedLegCount) * 100 : 0
  };
};

const buildRouteCandidate = ({ store, routeId, lookupRow = null, metrics, departureCode = '', arrivalCode = '', departurePoint = null, arrivalPoint = null }) => {
  const legs = store.legsByRouteId.get(routeId) || [];
  if (!legs.length) return null;

  const waypoints = [];
  const routeFixes = [];
  const resolvedFixes = [];
  const seen = new Set();
  const addFix = (fix, airway = '') => {
    const ident = String(fix || '').toUpperCase();
    if (!ident || seen.has(ident)) return;
    routeFixes.push({ ident, airway });
    seen.add(ident);
  };

  addFix(legs[0].from_fix, legs[0].airway);
  for (const leg of legs) {
    addFix(leg.to_fix, leg.airway);
  }

  for (const [index, fix] of routeFixes.entries()) {
    const point = resolvePoint(store, fix.ident, {
      role: 'enroute',
      regionCode: legs[index]?.region_code || lookupRow?.region_code || '',
      previousPoint: waypoints.at(-1) || departurePoint,
      nextPoint: index === routeFixes.length - 1 ? arrivalPoint : null,
      departureCode,
      arrivalCode,
      diagnostics: metrics.diagnostics
    });
    if (!point) {
      metrics.coordinateMisses += 1;
      continue;
    }
    resolvedFixes.push(fix);
    waypoints.push(waypointFromPoint(point, waypoints.length, fix.airway));
  }

  const routedNm = waypoints.length > 1 ? routeDistanceNm(waypoints) : null;
  const coverage = calculateCoverage({ routeFixes, resolvedFixes, legs });

  return {
    routeId,
    routeCode: lookupRow?.route_code || legs[0]?.route_code || routeId,
    lookupRank: Number(lookupRow?.lookup_rank || 999999),
    waypoints,
    legs,
    routedNm: routedNm ?? Number.POSITIVE_INFINITY,
    coordinateCompleteness: coverage.publishedFixCoveragePercent / 100,
    coverage
  };
};

const scoreCandidate = (candidate, options = {}) => {
  if (options.relaxAirwayLimitations) {
    const maxLegNm = Array.isArray(candidate.legs)
      ? Math.max(0, ...candidate.legs.map((leg) => Number(leg.distanceNm || 0)))
      : 0;
    return [candidate.routedNm, maxLegNm, -(candidate.coverage?.publishedFixCoveragePercent ?? 0)];
  }
  return [
    -(candidate.coverage?.publishedFixCoveragePercent ?? 0),
    -(candidate.coverage?.publishedLegCoveragePercent ?? 0),
    (candidate.coverage?.publishedFixCount ?? 0) - (candidate.coverage?.resolvedPublishedFixCount ?? 0),
    candidate.lookupRank,
    candidate.routedNm
  ];
};

const compareScores = (a, b, options = {}) => {
  const scoreA = scoreCandidate(a, options);
  const scoreB = scoreCandidate(b, options);
  for (let index = 0; index < scoreA.length; index += 1) {
    if (scoreA[index] !== scoreB[index]) return scoreA[index] - scoreB[index];
  }
  return 0;
};

const meetsCoverageThreshold = (candidate, options) => {
  const coverage = candidate.coverage || {};
  return coverage.publishedFixCoveragePercent >= options.minPublishedFixCoveragePercent
    && coverage.publishedLegCoveragePercent >= options.minPublishedLegCoveragePercent;
};

const exactLookupCandidates = ({ store, departureCode, arrivalCode, departurePoint, arrivalPoint, options, metrics }) => {
  const keys = [
    createAipIndexKey(options.regionCode, options.aipCycle, departureCode, arrivalCode),
    createAipIndexKey('*', options.aipCycle, departureCode, arrivalCode),
    createAipIndexKey(options.regionCode, '*', departureCode, arrivalCode),
    createAipIndexKey('*', '*', departureCode, arrivalCode)
  ];

  const lookupRows = [];
  const seenRouteIds = new Set();
  for (const lookupKey of keys) {
    for (const row of store.lookupByPair.get(lookupKey) || []) {
      if (seenRouteIds.has(row.route_id)) continue;
      seenRouteIds.add(row.route_id);
      lookupRows.push(row);
    }
  }

  metrics.candidateCount = lookupRows.length;
  return lookupRows
    .slice(0, options.maxCandidateRoutes)
    .map((row) => buildRouteCandidate({ store, routeId: row.route_id, lookupRow: row, metrics, departureCode, arrivalCode, departurePoint, arrivalPoint }))
    .filter(Boolean)
    .sort((a, b) => compareScores(a, b, options));
};

const exactLookup = (params) => exactLookupCandidates(params).find((candidate) => meetsCoverageThreshold(candidate, params.options)) || null;

class MinQueue {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    this.items.sort((a, b) => a.priority - b.priority);
  }

  shift() {
    return this.items.shift();
  }

  get length() {
    return this.items.length;
  }
}

const graphSearch = ({ store, departureCode, arrivalCode, arrivalPoint, options, metrics, startedAt }) => {
  const startRows = [...store.lookupByPair.values()]
    .flat()
    .filter((row) => row.departure_code === departureCode)
    .slice(0, options.maxCandidateRoutes);
  const goalRows = [...store.lookupByPair.values()]
    .flat()
    .filter((row) => row.arrival_code === arrivalCode)
    .slice(0, options.maxCandidateRoutes);

  const starts = new Set();
  const goals = new Set();
  for (const row of startRows) {
    const legs = store.legsByRouteId.get(row.route_id) || [];
    if (legs[0]?.from_fix) starts.add(legs[0].from_fix);
  }
  for (const row of goalRows) {
    const legs = store.legsByRouteId.get(row.route_id) || [];
    if (legs.at(-1)?.to_fix) goals.add(legs.at(-1).to_fix);
  }

  if (!starts.size || !goals.size) {
    if (!starts.size) addDiagnostic(metrics.diagnostics, 'unreachableFixes', departureCode, { reason: 'no-graph-start-from-departure' });
    if (!goals.size) addDiagnostic(metrics.diagnostics, 'unreachableFixes', arrivalCode, { reason: 'no-graph-goal-to-arrival' });
    return null;
  }

  metrics.diagnostics.graph.startCount = starts.size;
  metrics.diagnostics.graph.goalCount = goals.size;

  const queue = new MinQueue();
  const bestCost = new Map();

  const heuristic = (ident) => {
    metrics.heuristicCalls += 1;
    const point = resolvePoint(store, ident, { regionCode: '', role: 'enroute', previousPoint: null, nextPoint: arrivalPoint, departureCode, arrivalCode, diagnostics: metrics.diagnostics });
    if (!point || !arrivalPoint) return 0;
    return calculateGreatCircleNm(point, arrivalPoint) || 0;
  };

  for (const start of starts) {
    queue.push({ ident: start, cost: 0, priority: heuristic(start), path: [start], airways: [] });
    bestCost.set(start, 0);
  }

  while (queue.length) {
    if (performance.now() - startedAt > options.maxElapsedMs) {
      metrics.capped = true;
      return null;
    }
    if (metrics.expandedNodes >= options.maxExpandedNodes || metrics.edgeRelaxations >= options.maxEdgeRelaxations) {
      metrics.capped = true;
      return null;
    }

    const current = queue.shift();
    metrics.expandedNodes += 1;

    if (goals.has(current.ident)) {
      const waypoints = current.path.map((ident, index) => {
        const point = resolvePoint(store, ident, { regionCode: '', role: 'enroute', previousPoint: null, nextPoint: arrivalPoint, departureCode, arrivalCode, diagnostics: metrics.diagnostics });
        return point ? waypointFromPoint(point, index, current.airways[Math.max(0, index - 1)] || '') : null;
      }).filter(Boolean);
      if (waypoints.length < 2) return null;
      return {
        routeId: `GRAPH-${departureCode}-${arrivalCode}`,
        routeCode: `GRAPH-${departureCode}-${arrivalCode}`,
        waypoints,
        routedNm: routeDistanceNm(waypoints),
        coordinateCompleteness: 1
      };
    }

    for (const edge of store.edgesByFrom.get(current.ident) || []) {
      metrics.edgeRelaxations += 1;
      const fromPoint = resolvePoint(store, edge.from_fix, { regionCode: edge.region_code, role: 'enroute', previousPoint: null, nextPoint: arrivalPoint, departureCode, arrivalCode, diagnostics: metrics.diagnostics });
      const toPoint = resolvePoint(store, edge.to_fix, { regionCode: edge.region_code, role: 'enroute', previousPoint: fromPoint, nextPoint: arrivalPoint, departureCode, arrivalCode, diagnostics: metrics.diagnostics });
      if (!fromPoint || !toPoint) {
        metrics.coordinateMisses += 1;
        continue;
      }

      const legCost = calculateGreatCircleNm(fromPoint, toPoint);
      if (legCost === null) continue;
      const nextCost = current.cost + legCost;
      if (nextCost >= (bestCost.get(edge.to_fix) ?? Infinity)) continue;

      bestCost.set(edge.to_fix, nextCost);
      queue.push({
        ident: edge.to_fix,
        cost: nextCost,
        priority: nextCost + heuristic(edge.to_fix),
        path: [...current.path, edge.to_fix],
        airways: [...current.airways, edge.airway]
      });
    }
  }

  return null;
};

const getResolvedPointForGraph = (store, ident, context) => resolvePoint(store, ident, context);

const addDirectFallbackEdges = ({ edges, goals, current, options }) => {
  if (!options.relaxAirwayLimitations) return edges;
  const seen = new Set(edges.map((edge) => String(edge.to_fix || '').toUpperCase()));
  const directEdges = [];
  for (const goal of goals) {
    const normalizedGoal = String(goal || '').toUpperCase();
    if (!normalizedGoal || normalizedGoal === current.ident || current.path.includes(normalizedGoal) || seen.has(normalizedGoal)) continue;
    directEdges.push({
      from_fix: current.ident,
      to_fix: normalizedGoal,
      airway: 'DCT',
      region_code: '',
      relaxed_direct: true
    });
  }
  return [...edges, ...directEdges];
};

const distanceToArrival = (point, arrivalPoint) => {
  if (!point || !arrivalPoint) return Number.POSITIVE_INFINITY;
  return calculateGreatCircleNm(point, arrivalPoint) ?? Number.POSITIVE_INFINITY;
};

const buildPathCandidate = ({ store, path, airways, regionCode = '', departureCode = '', arrivalCode = '', departurePoint = null, arrivalPoint = null, routeId, routeCode }) => {
  const waypoints = [];
  const resolvedFixes = [];
  const legs = [];
  const routeFixes = path.map((ident, index) => ({ ident, airway: airways[Math.max(0, index - 1)] || '' }));

  for (let index = 0; index < path.length - 1; index += 1) {
    legs.push({
      route_id: routeId,
      leg_sequence: index + 1,
      from_fix: path[index],
      to_fix: path[index + 1],
      airway: airways[index] || '',
      region_code: regionCode,
      distanceNm: calculateGreatCircleNm(
        resolvePoint(store, path[index], { regionCode, role: 'enroute', previousPoint: departurePoint, nextPoint: arrivalPoint, departureCode, arrivalCode, diagnostics: null }) || departurePoint,
        resolvePoint(store, path[index + 1], { regionCode, role: 'enroute', previousPoint: departurePoint, nextPoint: arrivalPoint, departureCode, arrivalCode, diagnostics: null }) || arrivalPoint
      ) || 0
    });
  }

  for (const [index, fix] of routeFixes.entries()) {
    const point = resolvePoint(store, fix.ident, {
      role: 'enroute',
      regionCode,
      previousPoint: waypoints.at(-1) || departurePoint,
      nextPoint: index === routeFixes.length - 1 ? arrivalPoint : null,
      departureCode,
      arrivalCode,
      diagnostics: null
    });
    if (!point) continue;
    resolvedFixes.push(fix);
    waypoints.push(waypointFromPoint(point, waypoints.length, fix.airway));
  }

  const coverage = calculateCoverage({ routeFixes, resolvedFixes, legs });
  return {
    routeId,
    routeCode,
    lookupRank: 999999,
    waypoints,
    legs,
    routedNm: waypoints.length > 1 ? routeDistanceNm(waypoints) : Number.POSITIVE_INFINITY,
    coordinateCompleteness: coverage.publishedFixCoveragePercent / 100,
    coverage
  };
};

const bruteForceGraphSearch = ({ store, departureCode, arrivalCode, departurePoint, arrivalPoint, options, metrics, startedAt }) => {
  const startRows = [...store.lookupByPair.values()]
    .flat()
    .filter((row) => row.departure_code === departureCode)
    .slice(0, options.maxCandidateRoutes);
  const goalRows = [...store.lookupByPair.values()]
    .flat()
    .filter((row) => row.arrival_code === arrivalCode)
    .slice(0, options.maxCandidateRoutes);

  const starts = new Set();
  const goals = new Set();
  const regionCode = startRows[0]?.region_code || goalRows[0]?.region_code || '';
  for (const row of startRows) {
    const legs = store.legsByRouteId.get(row.route_id) || [];
    if (legs[0]?.from_fix) starts.add(String(legs[0].from_fix).toUpperCase());
  }
  for (const row of goalRows) {
    const legs = store.legsByRouteId.get(row.route_id) || [];
    if (legs.at(-1)?.to_fix) goals.add(String(legs.at(-1).to_fix).toUpperCase());
  }

  if (!starts.size || !goals.size) {
    if (!starts.size) addDiagnostic(metrics.diagnostics, 'unreachableFixes', departureCode, { reason: 'no-brute-start-from-departure' });
    if (!goals.size) addDiagnostic(metrics.diagnostics, 'unreachableFixes', arrivalCode, { reason: 'no-brute-goal-to-arrival' });
    return null;
  }

  metrics.diagnostics.graph.startCount = starts.size;
  metrics.diagnostics.graph.goalCount = goals.size;

  const greatCircleNm = calculateGreatCircleNm(departurePoint, arrivalPoint) || Number.POSITIVE_INFINITY;
  const candidates = [];
  const queue = [...starts].map((ident) => {
    const point = getResolvedPointForGraph(store, ident, { regionCode, role: 'enroute', previousPoint: departurePoint, nextPoint: arrivalPoint, departureCode, arrivalCode, diagnostics: metrics.diagnostics });
    return {
      ident,
      path: [ident],
      airways: [],
      resolvedCount: point ? 1 : 0,
      lastPoint: point || departurePoint,
      routedNm: point && departurePoint ? calculateGreatCircleNm(departurePoint, point) || 0 : 0,
      remainingNm: distanceToArrival(point || departurePoint, arrivalPoint)
    };
  });
  const bestVisit = new Map();

  while (queue.length) {
    if (performance.now() - startedAt > options.maxElapsedMs) {
      metrics.capped = true;
      break;
    }
    if (metrics.expandedNodes >= options.maxExpandedNodes || metrics.edgeRelaxations >= options.maxEdgeRelaxations) {
      metrics.capped = true;
      break;
    }

    queue.sort((a, b) => {
      const scoreA = (a.resolvedCount / a.path.length) * 100 - (a.remainingNm / 50) - (a.routedNm / 100);
      const scoreB = (b.resolvedCount / b.path.length) * 100 - (b.remainingNm / 50) - (b.routedNm / 100);
      return scoreB - scoreA;
    });
    const current = queue.shift();
    metrics.expandedNodes += 1;

    if (goals.has(current.ident) && current.path.length > 1) {
      metrics.diagnostics.graph.terminalCandidates += 1;
      candidates.push(buildPathCandidate({
        store,
        path: current.path,
        airways: current.airways,
        regionCode,
        departureCode,
        arrivalCode,
        departurePoint,
        arrivalPoint,
        routeId: `BRUTE-${departureCode}-${arrivalCode}-${candidates.length + 1}`,
        routeCode: `BRUTE-${departureCode}-${arrivalCode}`
      }));
      if (candidates.length >= options.maxBruteForceCandidates) break;
      continue;
    }

    if (current.path.length > options.maxBruteForceDepth) continue;

    const rawEdges = addDirectFallbackEdges({
      edges: store.edgesByFrom.get(current.ident) || [],
      goals,
      current,
      options
    })
      .map((edge) => {
        const toFix = String(edge.to_fix || '').toUpperCase();
        const toPoint = getResolvedPointForGraph(store, toFix, { regionCode: edge.region_code || regionCode, role: 'enroute', previousPoint: current.lastPoint, nextPoint: arrivalPoint, departureCode, arrivalCode, diagnostics: metrics.diagnostics });
        const legNm = current.lastPoint && toPoint ? calculateGreatCircleNm(current.lastPoint, toPoint) || 0 : 0;
        const remainingNm = distanceToArrival(toPoint || current.lastPoint, arrivalPoint);
        const progressNm = current.remainingNm - remainingNm;
        const projectedNm = current.routedNm + legNm + remainingNm;
        return {
          ...edge,
          to_fix: toFix,
          toPoint,
          legNm,
          remainingNm,
          progressNm,
          projectedNm,
          hasPoint: Boolean(toPoint)
        };
      })
      .filter((edge) => edge.to_fix);

    const edges = rawEdges
      .filter((edge) => {
        if (!edge.hasPoint || edge.progressNm >= options.minBruteForceProgressNm) return true;
        addDiagnostic(metrics.diagnostics, 'prunedFixes', edge.to_fix, { reason: 'insufficient-progress', progressNm: edge.progressNm });
        return false;
      })
      .filter((edge) => {
        if (!Number.isFinite(greatCircleNm) || edge.projectedNm <= greatCircleNm * options.maxBruteForceDistanceFactor) return true;
        addDiagnostic(metrics.diagnostics, 'prunedFixes', edge.to_fix, { reason: 'projected-distance-over-limit', projectedNm: edge.projectedNm });
        return false;
      })
      .sort((a, b) => {
        const scoreA = Number(a.hasPoint) * 100 + a.progressNm - (a.legNm / 20);
        const scoreB = Number(b.hasPoint) * 100 + b.progressNm - (b.legNm / 20);
        return scoreB - scoreA;
      });

    for (const edge of edges.slice(options.maxBruteForceBranches)) {
      addDiagnostic(metrics.diagnostics, 'prunedFixes', edge.to_fix, { reason: 'outside-branch-limit' });
    }

    const branchEdges = edges.slice(0, options.maxBruteForceBranches);

    for (const edge of branchEdges) {
      metrics.edgeRelaxations += 1;
      if (!edge.to_fix || current.path.includes(edge.to_fix)) {
        if (edge.to_fix && current.path.includes(edge.to_fix)) {
          addDiagnostic(metrics.diagnostics, 'prunedFixes', edge.to_fix, { reason: 'cycle-detected-in-brute-force-path' });
        }
        continue;
      }
      const nextResolvedCount = current.resolvedCount + (edge.hasPoint ? 1 : 0);
      const nextPathLength = current.path.length + 1;
      if ((nextResolvedCount / nextPathLength) * 100 < options.minPublishedFixCoveragePercent * 0.5) {
        addDiagnostic(metrics.diagnostics, 'prunedFixes', edge.to_fix, { reason: 'coverage-ratio-below-threshold', coveragePercent: (nextResolvedCount / nextPathLength) * 100 });
        continue;
      }

      const visitKey = `${edge.to_fix}|${nextPathLength}`;
      if ((bestVisit.get(visitKey) ?? -1) >= nextResolvedCount) {
        addDiagnostic(metrics.diagnostics, 'prunedFixes', edge.to_fix, { reason: 'dominated-by-better-visit', pathLength: nextPathLength });
        continue;
      }
      bestVisit.set(visitKey, nextResolvedCount);
      queue.push({
        ident: edge.to_fix,
        path: [...current.path, edge.to_fix],
        airways: [...current.airways, edge.airway || ''],
        resolvedCount: nextResolvedCount,
        lastPoint: edge.toPoint || current.lastPoint,
        routedNm: current.routedNm + edge.legNm,
        remainingNm: edge.remainingNm
      });
    }
  }

  const rankedCandidates = candidates.sort((a, b) => compareScores(a, b, options));
  return rankedCandidates;
};

const prependAppendEndpoints = ({ waypoints, departureCode, arrivalCode, departurePoint, arrivalPoint }) => {
  const next = [...waypoints];
  if (departurePoint && next[0]?.name !== departureCode) {
    next.unshift(waypointFromPoint({ ...departurePoint, ident: departureCode, point_type: 'airport' }, 0));
  }
  if (arrivalPoint && next.at(-1)?.name !== arrivalCode) {
    next.push(waypointFromPoint({ ...arrivalPoint, ident: arrivalCode, point_type: 'airport' }, next.length));
  }
  return next.map((waypoint, index) => ({
    ...waypoint,
    segment: index === 0 ? 'departure' : (index === next.length - 1 ? 'arrival' : 'enroute')
  }));
};

const buildRouteSummary = (candidate, metrics = {}) => {
  const coverage = candidate.coverage || {};
  const totalNm = Number.isFinite(candidate.routedNm) ? Math.round(candidate.routedNm) : Math.round(metrics.routedNm || 0);
  const maxLegNm = Array.isArray(candidate.legs) && candidate.legs.length
    ? Math.round(Math.max(0, ...candidate.legs.map((leg) => Number(leg.distanceNm || 0))))
    : 0;
  const fixCoverage = Math.round(coverage.publishedFixCoveragePercent ?? metrics.publishedFixCoveragePercent ?? 0);
  const legCoverage = Math.round(coverage.publishedLegCoveragePercent ?? metrics.publishedLegCoveragePercent ?? 0);
  return `${candidate.routeCode || candidate.routeId} · ${totalNm} NM${maxLegNm ? ` · max leg ${maxLegNm} NM` : ''}${fixCoverage ? ` · fixes ${fixCoverage}%` : ''}${legCoverage ? ` · legs ${legCoverage}%` : ''}`;
};

const candidateFamilyFromMethod = (method = '') => {
  if (method === 'exact') return 'indexed';
  if (method === 'brute-force') return 'brute';
  if (method === 'graph') return 'graph';
  if (method === 'relaxed') return 'relaxed';
  return method || 'local';
};

const decorateCandidate = ({ candidate, index, method, metrics, departureCode, arrivalCode, departurePoint, arrivalPoint }) => {
  const waypoints = prependAppendEndpoints({
    waypoints: candidate.waypoints,
    departureCode,
    arrivalCode,
    departurePoint,
    arrivalPoint
  });
  const routedNm = routeDistanceNm(waypoints);
  const candidateMetrics = {
    ...metrics,
    ...(candidate.coverage || {}),
    method,
    routedNm,
    distanceOverLimitPercent: metrics.greatCircleNm && routedNm ? ((routedNm / metrics.greatCircleNm) - 1) * 100 : null
  };
  const normalizedCandidate = {
    candidateId: `${candidateFamilyFromMethod(method)}-${candidate.routeId || candidate.routeCode || index}`,
    family: candidateFamilyFromMethod(method),
    routeId: candidate.routeId,
    routeCode: candidate.routeCode,
    routeString: waypoints.map((waypoint) => waypoint.name).join(' '),
    waypoints,
    legs: candidate.legs || [],
    metrics: candidateMetrics,
    coverage: candidate.coverage || null,
    source: ROUTE_SOURCES.LOCAL_AIP,
    billing: { chargedTokens: 0 }
  };
  return {
    ...normalizedCandidate,
    summary: buildRouteSummary({ ...candidate, routedNm, legs: candidate.legs || [] }, candidateMetrics)
  };
};

const dedupeCandidates = (candidates) => {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.routeString || candidate.waypoints.map((waypoint) => waypoint.name).join(' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const searchLocalAipRouteAlternatives = async ({ departure, arrival, options = {} } = {}) => {
  const startedAt = performance.now();
  const metrics = createMetrics(startedAt);
  const searchOptions = { ...DEFAULT_OPTIONS, ...options };
  const departureCode = getAirportCode(departure);
  const arrivalCode = getAirportCode(arrival);

  if (!departureCode || !arrivalCode) {
    return { status: PROVIDER_STATUS.UNAVAILABLE, message: 'Local AIP route search requires departure and arrival airport codes.', metrics: metrics.finish(), billing: { chargedTokens: 0 } };
  }

  let store;
  try {
    store = await loadLocalAipCsvStore({
      ...searchOptions,
      progressCallback: (fileName, loaded, total) => {
        if (total > 0) aipLoadingProgress.updateFile(fileName, loaded);
        else if (loaded === 0) aipLoadingProgress.startFile(fileName, 1000000);
      }
    });
    aipLoadingProgress.complete();
  } catch (error) {
    return {
      status: PROVIDER_STATUS.UNAVAILABLE,
      message: `Local AIP data unavailable: ${error.message}`,
      metrics: metrics.finish(),
      billing: { chargedTokens: 0 }
    };
  }

  const departurePoint = resolvePoint(store, departureCode, { role: 'departure', regionCode: searchOptions.regionCode, departureCode, arrivalCode }) || departure;
  const arrivalPoint = resolvePoint(store, arrivalCode, { role: 'arrival', regionCode: searchOptions.regionCode, departureCode, arrivalCode, previousPoint: departurePoint }) || arrival;
  metrics.greatCircleNm = calculateGreatCircleNm(departurePoint, arrivalPoint);

  const candidates = [];
  const exactCandidates = exactLookupCandidates({ store, departureCode, arrivalCode, departurePoint, arrivalPoint, options: searchOptions, metrics });
  for (const candidate of exactCandidates) {
    candidates.push(decorateCandidate({ candidate, index: candidates.length, method: 'exact', metrics: { ...metrics }, departureCode, arrivalCode, departurePoint, arrivalPoint }));
  }

  if (searchOptions.useBruteForceFallback && candidates.length < searchOptions.maxCandidateRoutes) {
    const bruteCandidates = bruteForceGraphSearch({ store, departureCode, arrivalCode, departurePoint, arrivalPoint, options: searchOptions, metrics, startedAt });
    for (const candidate of bruteCandidates) {
      candidates.push(decorateCandidate({ candidate, index: candidates.length, method: searchOptions.relaxAirwayLimitations ? 'relaxed' : 'brute-force', metrics: { ...metrics }, departureCode, arrivalCode, departurePoint, arrivalPoint }));
      if (candidates.length >= searchOptions.maxCandidateRoutes) break;
    }
  }

  if (searchOptions.useGraphFallback && candidates.length < searchOptions.maxCandidateRoutes) {
    const graphCandidate = graphSearch({ store, departureCode, arrivalCode, arrivalPoint, options: searchOptions, metrics, startedAt });
    if (graphCandidate) {
      candidates.push(decorateCandidate({ candidate: graphCandidate, index: candidates.length, method: 'graph', metrics: { ...metrics }, departureCode, arrivalCode, departurePoint, arrivalPoint }));
    }
  }

  const routeAlternatives = dedupeCandidates(candidates).slice(0, searchOptions.limit || searchOptions.maxCandidateRoutes);
  if (!routeAlternatives.length) {
    return { status: PROVIDER_STATUS.UNAVAILABLE, message: 'No local AIP route found for this airport pair.', metrics: metrics.finish(), billing: { chargedTokens: 0 } };
  }

  const selected = routeAlternatives[0];
  const finishedMetrics = {
    ...metrics.finish(),
    ...(selected.metrics || {}),
    candidateCount: routeAlternatives.length
  };

  return {
    status: PROVIDER_STATUS.OK,
    route: {
      waypoints: selected.waypoints,
      source: ROUTE_SOURCES.LOCAL_AIP,
      metadata: {
        routeId: selected.routeId,
        routeCode: selected.routeCode,
        routeString: selected.routeString,
        selectedRouteAlternativeId: selected.candidateId,
        routeAlternatives,
        localAipMetrics: finishedMetrics,
        localAipCoverage: selected.coverage || null,
        localAipDiagnostics: metrics.diagnostics,
        localAipLegs: selected.legs || []
      },
      billing: { chargedTokens: 0 }
    },
    routeAlternatives,
    selectedRouteAlternativeId: selected.candidateId,
    metrics: finishedMetrics,
    billing: { chargedTokens: 0 }
  };
};

export const searchLocalAipRoute = async ({ departure, arrival, options = {} } = {}) => {
  const response = await searchLocalAipRouteAlternatives({ departure, arrival, options: { ...options, limit: 1 } });
  if (response?.status !== PROVIDER_STATUS.OK) return response;
  const selected = response.routeAlternatives?.find((candidate) => candidate.candidateId === response.selectedRouteAlternativeId) || response.routeAlternatives?.[0];
  return {
    status: PROVIDER_STATUS.OK,
    route: {
      waypoints: selected?.waypoints || response.route?.waypoints || [],
      source: ROUTE_SOURCES.LOCAL_AIP,
      metadata: {
        ...(response.route?.metadata || {}),
        routeId: selected?.routeId || response.route?.metadata?.routeId || '',
        routeCode: selected?.routeCode || response.route?.metadata?.routeCode || '',
        routeString: selected?.routeString || response.route?.metadata?.routeString || '',
        localAipMetrics: response.metrics,
        localAipCoverage: selected?.coverage || response.route?.metadata?.localAipCoverage || null,
        localAipLegs: selected?.legs || response.route?.metadata?.localAipLegs || []
      },
      billing: { chargedTokens: 0 }
    },
    routeAlternatives: response.routeAlternatives || [],
    selectedRouteAlternativeId: selected?.candidateId || response.selectedRouteAlternativeId || '',
    metrics: response.metrics,
    billing: { chargedTokens: 0 }
  };
};
