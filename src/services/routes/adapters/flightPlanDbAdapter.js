import { normalizeProviderRoute } from '../routeNormalizer.js';
import { callGuardedRouteProvider } from '../routeProviderGateway.js';
import { PROVIDER_STATUS, ROUTE_SOURCES } from '../routeTypes.js';

const provider = ROUTE_SOURCES.FLIGHT_PLAN_DB;

export const fetchFlightPlanDbRoute = async ({ departure, arrival, aircraftType, debugResponse = null } = {}) => {
  const response = await callGuardedRouteProvider({
    provider,
    mockResponse: debugResponse,
    payload: {
      origin: departure?.icao || departure?.iata,
      destination: arrival?.icao || arrival?.iata,
      aircraftType
    }
  });

  if (response?.status !== PROVIDER_STATUS.OK) {
    return response;
  }

  const payload = response.data || response.route || response;
  return {
    status: PROVIDER_STATUS.OK,
    route: normalizeProviderRoute(payload, {
      departure,
      arrival,
      source: provider,
      billing: response.billing || { chargedTokens: 1 }
    }),
    billing: response.billing || { chargedTokens: 1 }
  };
};
