import { generateBuiltInRouteWaypoints } from '../builtInRouteGenerator.js';
import { normalizeRoute } from '../routeNormalizer.js';
import { PROVIDER_STATUS, ROUTE_SOURCES } from '../routeTypes.js';

export const buildBuiltInRoute = ({ departure, arrival, debug = [] } = {}) => {
  const waypoints = generateBuiltInRouteWaypoints(departure, arrival);
  return {
    status: PROVIDER_STATUS.OK,
    route: normalizeRoute({
      departure,
      arrival,
      waypoints,
      source: ROUTE_SOURCES.BUILT_IN,
      sourceChain: [ROUTE_SOURCES.BUILT_IN],
      fallbackUsed: true,
      debug,
      billing: { chargedTokens: 0 }
    })
  };
};
