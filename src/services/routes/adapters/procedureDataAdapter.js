import { normalizeWaypoint } from '../routeNormalizer.js';
import { callGuardedRouteProvider } from '../routeProviderGateway.js';
import { PROVIDER_STATUS, ROUTE_SOURCES } from '../routeTypes.js';

const provider = ROUTE_SOURCES.PROCEDURE_DATA;

const normalizeProcedureWaypoint = (waypoint, index, segment, procedureName, source = provider) => normalizeWaypoint({
  ...waypoint,
  segment,
  procedureName,
  type: waypoint.type || segment.toUpperCase()
}, index, source);

const normalizeProcedure = (procedure, segment, source = provider) => {
  if (!procedure) return null;
  const name = procedure.name || '';
  const waypoints = Array.isArray(procedure.waypoints)
    ? procedure.waypoints.map((waypoint, index) => normalizeProcedureWaypoint(waypoint, index, segment, name, source)).filter(Boolean)
    : [];

  return {
    ...procedure,
    name,
    segment,
    waypoints
  };
};

const buildSegments = (procedures = {}) => [
  procedures.sid ? { kind: 'sid', name: procedures.sid.name, waypoints: procedures.sid.waypoints } : null,
  procedures.enroute ? { kind: 'enroute', name: procedures.enroute.name || 'Enroute', waypoints: procedures.enroute.waypoints || [] } : null,
  procedures.star ? { kind: 'star', name: procedures.star.name, waypoints: procedures.star.waypoints } : null,
  procedures.approach ? { kind: 'approach', name: procedures.approach.name || 'Approach', waypoints: procedures.approach.waypoints || [] } : null
].filter((segment) => segment?.waypoints?.length);

export const normalizeProcedureData = (payload = {}, source = provider) => {
  const procedures = {
    sid: normalizeProcedure(payload.sid, 'sid', source),
    enroute: normalizeProcedure(payload.enroute, 'enroute', source),
    star: normalizeProcedure(payload.star, 'star', source),
    approach: normalizeProcedure(payload.approach, 'approach', source)
  };

  const procedureSegments = buildSegments(procedures);
  const waypoints = procedureSegments.flatMap((segment) => segment.waypoints);

  return {
    procedures,
    procedureSegments,
    waypoints,
    sid: procedures.sid?.name || '',
    star: procedures.star?.name || '',
    source,
    metadata: payload.metadata || {}
  };
};

export const fetchProcedureData = async ({ departure, arrival, departureRunway = '', landingRunway = '', aircraftType = '', debugResponse = null } = {}) => {
  const response = await callGuardedRouteProvider({
    provider,
    mockResponse: debugResponse,
    payload: {
      origin: departure?.icao || departure?.iata,
      destination: arrival?.icao || arrival?.iata,
      departureRunway,
      arrivalRunway: landingRunway,
      aircraftType,
      requestType: 'procedures'
    }
  });

  if (response?.status !== PROVIDER_STATUS.OK) {
    return response;
  }

  return {
    status: PROVIDER_STATUS.OK,
    procedureData: normalizeProcedureData(response.data || response.procedures || response),
    billing: response.billing || { chargedTokens: 1 }
  };
};
