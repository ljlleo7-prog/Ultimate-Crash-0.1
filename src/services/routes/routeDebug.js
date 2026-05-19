import { createRouteDebugEntry } from './routeTypes.js';

export const createRouteDebugLog = () => [];

export const appendRouteDebug = (debug, entry) => {
  const nextEntry = createRouteDebugEntry(entry);
  debug.push(nextEntry);
  if (entry.status === 'ok' || entry.cached) {
    console.info(`Route provider ${entry.provider}: ${entry.message || entry.status}`);
  } else {
    console.warn(`Route provider ${entry.provider}: ${entry.message || entry.status}`);
  }
  return nextEntry;
};

export const summarizeFallback = (debug = []) => debug
  .filter((entry) => entry.fallback || entry.status !== 'ok')
  .map((entry) => `${entry.provider}:${entry.status}`)
  .join(' > ');
