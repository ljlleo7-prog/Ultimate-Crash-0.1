import { callGuardedRouteProvider } from '../routeProviderGateway.js';
import { PROVIDER_STATUS, ROUTE_SOURCES } from '../routeTypes.js';

export const fetchOpenAipReferences = async ({ query, type = 'navaid', debugResponse = null } = {}) => {
  const response = await callGuardedRouteProvider({
    provider: ROUTE_SOURCES.OPEN_AIP,
    mockResponse: debugResponse,
    payload: { query, type }
  });

  if (response?.status !== PROVIDER_STATUS.OK) return response;

  return {
    status: PROVIDER_STATUS.OK,
    references: response.data || [],
    billing: response.billing || { chargedTokens: 1 }
  };
};
