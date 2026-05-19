import { ROUTE_CACHE_VERSION } from './routeTypes.js';

const CACHE_PREFIX = 'ultimate-crash:routes:';

const hasLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

export const buildRouteCacheKey = ({ provider = 'route', departure, arrival, aircraftType = '', authState = 'guest', options = {} } = {}) => {
  const dep = departure?.icao || departure?.iata || departure?.airport || 'DEP';
  const arr = arrival?.icao || arrival?.iata || arrival?.airport || 'ARR';
  const optionKey = JSON.stringify({
    aircraftType,
    includeSidStar: options.includeSidStar !== false,
    routeVersion: ROUTE_CACHE_VERSION
  });
  return `${CACHE_PREFIX}${provider}:${dep}:${arr}:${authState}:${optionKey}`;
};

export const getCachedRoute = (key, ttlMs) => {
  if (!hasLocalStorage() || !key) return null;
  const entry = safeJsonParse(window.localStorage.getItem(key));
  if (!entry?.timestamp || !entry?.route) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    window.localStorage.removeItem(key);
    return null;
  }
  return entry.route;
};

export const setCachedRoute = (key, route) => {
  if (!hasLocalStorage() || !key || !route) return;
  window.localStorage.setItem(key, JSON.stringify({
    timestamp: Date.now(),
    route
  }));
};

export const clearRouteCache = () => {
  if (!hasLocalStorage()) return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(CACHE_PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));
};
