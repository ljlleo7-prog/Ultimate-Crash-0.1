import { callGuardedRouteProvider } from '../routeProviderGateway.js';
import { buildReferenceCacheKey, getCachedReferenceData, setCachedReferenceData } from '../routeCacheService.js';
import { PROVIDER_STATUS, REFERENCE_DATA_TTL_MS, ROUTE_SOURCES } from '../routeTypes.js';
import { normalizeAirportReference, normalizeNavaidReference } from './airportReferenceAdapter.js';

const provider = ROUTE_SOURCES.OUR_AIRPORTS;

const callOurAirports = async ({ requestType, payload = {}, cacheKey, ttlMs = REFERENCE_DATA_TTL_MS, debugResponse = null } = {}) => {
  const cached = getCachedReferenceData(cacheKey, ttlMs);
  if (cached) {
    return { status: PROVIDER_STATUS.OK, ...cached, cached: true, billing: cached.billing || { chargedTokens: 0 } };
  }

  const response = await callGuardedRouteProvider({
    provider,
    mockResponse: debugResponse,
    payload: { requestType, ...payload }
  });

  if (response?.status !== PROVIDER_STATUS.OK) return response;

  const normalized = {
    status: PROVIDER_STATUS.OK,
    billing: response.billing || { chargedTokens: 0 },
    airports: (response.airports || response.data?.airports || response.data || [])
      .map((airport) => normalizeAirportReference({ ...airport, source: provider }))
      .filter(Boolean),
    navaids: (response.navaids || response.data?.navaids || [])
      .map((navaid) => normalizeNavaidReference({ ...navaid, source: provider }))
      .filter(Boolean),
    references: (response.references || response.data?.references || [])
      .map((reference) => normalizeAirportReference({ ...reference, source: provider }))
      .filter(Boolean),
    source: provider
  };

  setCachedReferenceData(cacheKey, normalized);
  return normalized;
};

export const searchOurAirports = ({ query, debugResponse = null } = {}) => callOurAirports({
  requestType: 'airport_search',
  payload: { query },
  cacheKey: buildReferenceCacheKey({ type: 'ourairports-search', query }),
  debugResponse
});

export const getOurAirportByCode = ({ code, debugResponse = null } = {}) => callOurAirports({
  requestType: 'airport_detail',
  payload: { query: code, code },
  cacheKey: buildReferenceCacheKey({ type: 'ourairports-detail', query: code }),
  debugResponse
});

export const getNearbyOurAirports = ({ latitude, longitude, radiusNm = 120, debugResponse = null } = {}) => callOurAirports({
  requestType: 'nearby_airports',
  payload: { latitude, longitude, radiusNm },
  cacheKey: buildReferenceCacheKey({ type: 'ourairports-nearby', latitude, longitude, radiusNm }),
  debugResponse
});

export const getOurAirportsNavaidsAlongRoute = ({ departure, arrival, samples = 4, debugResponse = null } = {}) => callOurAirports({
  requestType: 'navaid_search',
  payload: {
    origin: departure?.icao || departure?.iata,
    destination: arrival?.icao || arrival?.iata,
    departure,
    arrival,
    samples
  },
  cacheKey: buildReferenceCacheKey({ type: 'ourairports-route-navaids', airport: departure, query: `${departure?.icao || departure?.iata || 'DEP'}-${arrival?.icao || arrival?.iata || 'ARR'}` }),
  debugResponse
});
