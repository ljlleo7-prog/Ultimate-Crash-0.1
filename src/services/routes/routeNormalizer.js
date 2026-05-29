import { createRouteLeg, ROUTE_SOURCES } from './routeTypes.js';

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const normalizeWaypoint = (waypoint, index = 0, source = ROUTE_SOURCES.BUILT_IN) => {
  if (!waypoint) return null;
  if (typeof waypoint === 'string') {
    return {
      name: waypoint.toUpperCase(),
      label: waypoint.toUpperCase(),
      type: 'WAYPOINT',
      source
    };
  }

  const name = waypoint.name || waypoint.ident || waypoint.id || waypoint.code || waypoint.label || `WPT${index + 1}`;
  const latitude = toNumberOrNull(waypoint.latitude ?? waypoint.lat);
  const longitude = toNumberOrNull(waypoint.longitude ?? waypoint.lon ?? waypoint.lng);

  return {
    ...waypoint,
    name,
    label: waypoint.label || name,
    latitude,
    longitude,
    type: waypoint.type || 'WAYPOINT',
    segment: waypoint.segment || waypoint.segmentType || waypoint.procedureSegment || 'enroute',
    procedureName: waypoint.procedureName || null,
    source: waypoint.source || source
  };
};

export const waypointsToLegs = (departure, waypoints = [], arrival, source = ROUTE_SOURCES.BUILT_IN) => {
  const points = [
    normalizeWaypoint({ ...(departure || {}), name: departure?.icao || departure?.iata || departure?.airport || 'DEP', type: 'AIRPORT' }, 0, source),
    ...waypoints.map((waypoint, index) => normalizeWaypoint(waypoint, index, source)),
    normalizeWaypoint({ ...(arrival || {}), name: arrival?.icao || arrival?.iata || arrival?.airport || 'ARR', type: 'AIRPORT' }, waypoints.length + 1, source)
  ].filter(Boolean);

  const legs = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    legs.push(createRouteLeg({
      from: from.name,
      to: to.name,
      type: to.type === 'AIRPORT' ? 'arrival' : (to.type || 'fix').toLowerCase(),
      altitude: to.altitude ?? to.altitudeConstraint ?? null,
      speed: to.speed ?? null,
      source,
      provider: to.source || source,
      latitude: to.latitude,
      longitude: to.longitude,
      airway: to.airway || '',
      sequence: index + 1,
      segment: to.segment || 'enroute',
      procedureName: to.procedureName || null
    }));
  }
  return legs;
};

export const normalizeRoute = ({
  departure,
  arrival,
  waypoints = [],
  legs = null,
  source = ROUTE_SOURCES.BUILT_IN,
  sourceChain = [],
  fallbackUsed = false,
  debug = [],
  billing = null,
  metadata = {},
  procedures = null,
  procedureSegments = []
} = {}) => {
  const normalizedWaypoints = waypoints
    .map((waypoint, index) => normalizeWaypoint(waypoint, index, source))
    .filter(Boolean);

  const normalizedLegs = Array.isArray(legs) && legs.length > 0
    ? legs.map((leg, index) => createRouteLeg({ ...leg, source: leg.source || source, sequence: leg.sequence || index + 1 }))
    : waypointsToLegs(departure, normalizedWaypoints, arrival, source);

  return {
    legs: normalizedLegs,
    waypoints: normalizedWaypoints,
    source,
    sourceChain: sourceChain.length ? sourceChain : [source],
    timestamp: new Date().toISOString(),
    fallbackUsed,
    debug,
    billing,
    metadata,
    procedures,
    procedureSegments
  };
};

export const normalizeProviderRoute = (payload, context = {}) => {
  const source = context.source || payload?.source || ROUTE_SOURCES.BUILT_IN;
  const rawWaypoints = payload?.waypoints || payload?.route?.waypoints || payload?.route || [];
  const waypoints = Array.isArray(rawWaypoints)
    ? rawWaypoints.map((point, index) => normalizeWaypoint(point, index, source)).filter(Boolean)
    : parseRouteString(String(rawWaypoints || ''), source);

  return normalizeRoute({
    departure: context.departure,
    arrival: context.arrival,
    waypoints,
    source,
    sourceChain: context.sourceChain || [source],
    fallbackUsed: Boolean(context.fallbackUsed),
    debug: context.debug || [],
    billing: payload?.billing || context.billing || null,
    metadata: {
      providerPayload: payload?.metadata || null,
      routeString: payload?.routeString || (typeof rawWaypoints === 'string' ? rawWaypoints : '')
    }
  });
};

export const parseRouteString = (routeString = '', source = ROUTE_SOURCES.BUILT_IN) => String(routeString)
  .split(/[\s,]+/)
  .map((token) => token.trim().toUpperCase())
  .filter(Boolean)
  .map((name, index) => normalizeWaypoint({ name, type: 'WAYPOINT' }, index, source));
