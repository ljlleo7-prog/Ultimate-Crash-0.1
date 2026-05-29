import { callGuardedRouteProvider } from '../routeProviderGateway.js';
import { buildReferenceCacheKey, getCachedReferenceData, setCachedReferenceData } from '../routeCacheService.js';
import { PROVIDER_STATUS, REFERENCE_DATA_TTL_MS, ROUTE_SOURCES } from '../routeTypes.js';

const provider = ROUTE_SOURCES.AIRPORT_REFERENCE;

const toNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const normalizeAirportReference = (item = {}) => {
  const latitude = toNumberOrNull(item.latitude ?? item.lat);
  const longitude = toNumberOrNull(item.longitude ?? item.lon);
  if (latitude == null || longitude == null) return null;

  return {
    id: item.id || item._id || item.identifier || item.icaoCode || item.icao || item.iataCode || item.iata || item.name || null,
    type: item.type || 'airport',
    name: item.name || item.identifier || item.icaoCode || item.icao || item.iataCode || item.iata || 'REF',
    icao: item.icao || item.icaoCode || '',
    iata: item.iata || item.iataCode || '',
    icaoCode: item.icaoCode || item.icao || '',
    iataCode: item.iataCode || item.iata || '',
    identifier: item.identifier || item.icaoCode || item.icao || item.iataCode || item.iata || item.name || '',
    city: item.city || '',
    country: item.country || item.countryCode || '',
    latitude,
    longitude,
    elevation: item.elevation ?? item.elevationFt ?? null,
    runways: Array.isArray(item.runways) ? item.runways : [],
    frequencies: Array.isArray(item.frequencies) ? item.frequencies : [],
    source: provider
  };
};

export const normalizeNavaidReference = (item = {}) => {
  const normalized = normalizeAirportReference(item);
  if (!normalized) return null;
  return {
    ...normalized,
    type: item.type || 'navaid',
    name: item.name || item.identifier || normalized.name,
    segment: 'enroute'
  };
};

const callAirportReference = async ({ requestType, payload = {}, cacheKey, ttlMs = REFERENCE_DATA_TTL_MS, debugResponse = null } = {}) => {
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
    billing: response.billing || { chargedTokens: 1 },
    airports: (response.airports || response.data?.airports || response.data || []).map(normalizeAirportReference).filter(Boolean),
    navaids: (response.navaids || response.data?.navaids || []).map(normalizeNavaidReference).filter(Boolean),
    references: (response.references || response.data?.references || []).map(normalizeAirportReference).filter(Boolean),
    source: provider
  };

  setCachedReferenceData(cacheKey, normalized);
  return normalized;
};

export const searchAirportReferences = ({ query, debugResponse = null } = {}) => callAirportReference({
  requestType: 'airport_search',
  payload: { query },
  cacheKey: buildReferenceCacheKey({ type: 'airport-search', query }),
  debugResponse
});

export const getAirportReferenceByCode = ({ code, debugResponse = null } = {}) => callAirportReference({
  requestType: 'airport_detail',
  payload: { query: code, code },
  cacheKey: buildReferenceCacheKey({ type: 'airport-detail', query: code }),
  debugResponse
});

export const getNearbyAirportReferences = ({ latitude, longitude, radiusNm = 120, debugResponse = null } = {}) => callAirportReference({
  requestType: 'nearby_airports',
  payload: { latitude, longitude, radiusNm },
  cacheKey: buildReferenceCacheKey({ type: 'nearby-airports', latitude, longitude, radiusNm }),
  debugResponse
});

export const getNavaidReferencesAlongRoute = ({ departure, arrival, samples = 4, debugResponse = null } = {}) => callAirportReference({
  requestType: 'navaid_search',
  payload: {
    origin: departure?.icao || departure?.iata,
    destination: arrival?.icao || arrival?.iata,
    departure,
    arrival,
    samples
  },
  cacheKey: buildReferenceCacheKey({ type: 'route-navaids', airport: departure, query: `${departure?.icao || departure?.iata || 'DEP'}-${arrival?.icao || arrival?.iata || 'ARR'}` }),
  debugResponse
});
