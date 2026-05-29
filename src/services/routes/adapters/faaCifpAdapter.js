import { callGuardedRouteProvider } from '../routeProviderGateway.js';
import { PROVIDER_STATUS, ROUTE_SOURCES } from '../routeTypes.js';
import { normalizeProcedureData } from './procedureDataAdapter.js';

const provider = ROUTE_SOURCES.FAA_CIFP;

const isUsAirport = (airport = {}) => {
  const country = String(airport.country || airport.countryCode || '').toUpperCase();
  const icao = String(airport.icao || airport.icaoCode || airport.iata || '').toUpperCase();
  return country === 'US' || country === 'USA' || /^K[A-Z0-9]{3}$/.test(icao);
};

export const fetchFaaCifpProcedures = async ({ departure, arrival, departureRunway = '', landingRunway = '', aircraftType = '', debugResponse = null } = {}) => {
  if (!isUsAirport(departure) && !isUsAirport(arrival)) {
    return {
      status: PROVIDER_STATUS.UNAVAILABLE,
      message: 'FAA CIFP is US-focused and does not cover this airport pair.',
      billing: { chargedTokens: 0 }
    };
  }

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

  if (response?.status !== PROVIDER_STATUS.OK) return response;

  return {
    status: PROVIDER_STATUS.OK,
    procedureData: normalizeProcedureData({
      ...(response.data || response.procedures || response),
      metadata: {
        ...((response.data || response.procedures || response)?.metadata || {}),
        source: provider,
        cycle: response.cycle || response.data?.cycle || null
      }
    }, provider),
    billing: response.billing || { chargedTokens: 0 }
  };
};
