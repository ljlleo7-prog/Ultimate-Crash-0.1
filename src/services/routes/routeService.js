import { fetchSimBriefRoute } from './adapters/simBriefAdapter.js';
import { fetchFlightPlanDbRoute } from './adapters/flightPlanDbAdapter.js';
import { buildBuiltInRoute } from './adapters/builtInRouteAdapter.js';
import { normalizeRoute } from './routeNormalizer.js';
import { appendRouteDebug, createRouteDebugLog, summarizeFallback } from './routeDebug.js';
import { buildRouteCacheKey, getCachedRoute, setCachedRoute } from './routeCacheService.js';
import { PROVIDER_STATUS, EXTERNAL_ROUTE_TTL_MS, ROUTE_SOURCES } from './routeTypes.js';

const routeProviders = [fetchSimBriefRoute, fetchFlightPlanDbRoute];

export const generateUnifiedRoute = async ({
  departure,
  arrival,
  aircraftType = '',
  authState = 'guest',
  options = {},
  debugResponses = {}
} = {}) => {
  const cacheKey = buildRouteCacheKey({
    provider: 'route',
    departure,
    arrival,
    aircraftType,
    authState,
    options
  });

  const cached = getCachedRoute(cacheKey, EXTERNAL_ROUTE_TTL_MS);
  const debug = createRouteDebugLog();
  if (cached) {
    appendRouteDebug(debug, { provider: cached.source || ROUTE_SOURCES.BUILT_IN, status: PROVIDER_STATUS.CACHE_HIT, message: 'Route cache hit', cached: true });
    return { ...cached, debug, cached: true };
  }

  for (const providerFn of routeProviders) {
    const providerName = providerFn.name.replace('fetch', '').replace('Route', '');
    const providerResponse = await providerFn({
      departure,
      arrival,
      aircraftType,
      debugResponse: debugResponses[providerFn.name] || null
    });

    if (providerResponse?.status === PROVIDER_STATUS.OK && providerResponse.route) {
      const normalized = normalizeRoute({
        ...providerResponse.route,
        departure,
        arrival,
        source: providerResponse.route.source || providerName,
        sourceChain: [providerName],
        fallbackUsed: false,
        debug,
        billing: providerResponse.billing || null
      });
      appendRouteDebug(debug, { provider: providerName, status: PROVIDER_STATUS.OK, message: 'Route provider succeeded', billing: providerResponse.billing });
      const finalRoute = { ...normalized, debug, fallbackUsed: false, source: normalized.source || providerName };
      setCachedRoute(cacheKey, finalRoute);
      return finalRoute;
    }

    appendRouteDebug(debug, {
      provider: providerName,
      status: providerResponse?.status || PROVIDER_STATUS.PROVIDER_FAILED,
      message: providerResponse?.message || 'Route provider unavailable',
      fallback: true,
      billing: providerResponse?.billing || null
    });
  }

  const builtIn = buildBuiltInRoute({ departure, arrival, debug });
  appendRouteDebug(debug, { provider: ROUTE_SOURCES.BUILT_IN, status: PROVIDER_STATUS.OK, message: 'Using built-in fallback', fallback: true, billing: builtIn.route.billing });
  const finalRoute = {
    ...builtIn.route,
    debug,
    fallbackUsed: true,
    sourceChain: [...(builtIn.route.sourceChain || []), summarizeFallback(debug)]
  };
  setCachedRoute(cacheKey, finalRoute);
  return finalRoute;
};
