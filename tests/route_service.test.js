import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchFlightPlanDbRoute } from '../src/services/routes/adapters/flightPlanDbAdapter.js';
import { clearRouteCache } from '../src/services/routes/routeCacheService.js';
import { generateUnifiedRoute } from '../src/services/routes/routeService.js';
import { normalizeProviderRoute } from '../src/services/routes/routeNormalizer.js';
import { buildApproachWaypoints, mergeFlightPlanWithRoute, normalizeRouteDetails } from '../src/utils/routeDetails.js';
import { AIP_PROVIDER_MODES, PROVIDER_STATUS, ROUTE_SOURCES } from '../src/services/routes/routeTypes.js';

const VHHH = { icao: 'VHHH', iata: 'HKG', name: 'Hong Kong Intl', latitude: 22.308, longitude: 113.9185 };
const RJTT = { icao: 'RJTT', iata: 'HND', name: 'Tokyo Haneda', latitude: 35.5494, longitude: 139.7798 };
const KLAX = { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles Intl', latitude: 33.9425, longitude: -118.4081 };
const EGLL = { icao: 'EGLL', iata: 'LHR', name: 'London Heathrow', latitude: 51.47, longitude: -0.4543 };

test.beforeEach(() => {
  delete globalThis.window;
});

test('normalizes provider waypoints into unified route legs', () => {
  const route = normalizeProviderRoute({
    waypoints: [
      { name: 'OCEAN', lat: 24, lon: 120, altitude: 35000, speed: 280 },
      { name: 'TYPES', latitude: 30, longitude: 130 }
    ]
  }, {
    departure: VHHH,
    arrival: RJTT,
    source: ROUTE_SOURCES.SIMBRIEF
  });

  assert.equal(route.source, ROUTE_SOURCES.SIMBRIEF);
  assert.equal(route.waypoints.length, 2);
  assert.equal(route.legs.length, 3);
  assert.equal(route.legs[0].to, 'OCEAN');
  assert.equal(route.legs[0].altitude, 35000);
});

test('flight plan database adapter normalizes live route payloads', async () => {
  const response = await fetchFlightPlanDbRoute({
    departure: KLAX,
    arrival: EGLL,
    debugResponse: {
      status: PROVIDER_STATUS.OK,
      billing: { chargedTokens: 1 },
      data: {
        waypoints: [
          { name: 'DAG', latitude: 34.8537, longitude: -116.787, altitude: 12000 },
          { ident: 'BOS', lat: 42.3643, lon: -70.989 }
        ]
      }
    }
  });

  assert.equal(response.status, PROVIDER_STATUS.OK);
  assert.equal(response.route.source, ROUTE_SOURCES.FLIGHT_PLAN_DB);
  assert.equal(response.route.waypoints.length, 2);
  assert.equal(response.billing.chargedTokens, 1);
});

test('external-only mode falls back when guarded providers are unavailable', async () => {
  const route = await generateUnifiedRoute({
    departure: VHHH,
    arrival: RJTT,
    options: { aipProviderMode: AIP_PROVIDER_MODES.EXTERNAL_ONLY }
  });

  assert.equal(route.source, ROUTE_SOURCES.BUILT_IN);
  assert.equal(route.fallbackUsed, true);
  assert.ok(route.waypoints.length >= 4);
  assert.ok(route.debug.some((entry) => entry.status === PROVIDER_STATUS.UNAUTHENTICATED));
  assert.equal(route.billing.chargedTokens, 0);
});

test('uses first successful guarded provider for authenticated requests and records one token charge', async () => {
  const route = await generateUnifiedRoute({
    departure: KLAX,
    arrival: EGLL,
    authState: 'authenticated',
    options: { aipProviderMode: AIP_PROVIDER_MODES.EXTERNAL_ONLY },
    debugResponses: {
      fetchFlightPlanDbRoute: {
        status: PROVIDER_STATUS.OK,
        billing: { chargedTokens: 1 },
        data: {
          waypoints: [
            { name: 'DAG', latitude: 34.8537, longitude: -116.787 },
            { name: 'BOS', latitude: 42.3643, longitude: -70.989 }
          ]
        }
      }
    }
  });

  assert.equal(route.source, ROUTE_SOURCES.FLIGHT_PLAN_DB);
  assert.equal(route.fallbackUsed, false);
  assert.equal(route.billing.chargedTokens, 1);
  assert.equal(route.waypoints[0].name, 'DAG');
});

test('auth state is part of the route cache key', async () => {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
      key: (index) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      }
    }
  };

  clearRouteCache();

  const authenticatedRoute = await generateUnifiedRoute({
    departure: KLAX,
    arrival: EGLL,
    authState: 'authenticated',
    options: { aipProviderMode: AIP_PROVIDER_MODES.EXTERNAL_ONLY },
    debugResponses: {
      fetchFlightPlanDbRoute: {
        status: PROVIDER_STATUS.OK,
        billing: { chargedTokens: 1 },
        data: {
          waypoints: [{ name: 'DAG', latitude: 34.8537, longitude: -116.787 }]
        }
      }
    }
  });

  const guestRoute = await generateUnifiedRoute({
    departure: KLAX,
    arrival: EGLL,
    authState: 'guest',
    options: { aipProviderMode: AIP_PROVIDER_MODES.EXTERNAL_ONLY }
  });

  const cacheKeys = Array.from(store.keys());
  assert.equal(authenticatedRoute.source, ROUTE_SOURCES.FLIGHT_PLAN_DB);
  assert.equal(guestRoute.source, ROUTE_SOURCES.BUILT_IN);
  assert.ok(cacheKeys.some((key) => key.includes(':authenticated:')));
  assert.ok(cacheKeys.some((key) => key.includes(':guest:')));
});

test('uses reference navaids to enrich authenticated fallback routes', async () => {
  const route = await generateUnifiedRoute({
    departure: VHHH,
    arrival: RJTT,
    authState: 'authenticated',
    options: { aipProviderMode: AIP_PROVIDER_MODES.EXTERNAL_ONLY },
    debugResponses: {
      fetchFlightPlanDbRoute: {
        status: PROVIDER_STATUS.PROVIDER_FAILED,
        message: 'No provider route available.',
        billing: { chargedTokens: 0 }
      },
      getNavaidReferencesAlongRoute: {
        status: PROVIDER_STATUS.OK,
        billing: { chargedTokens: 1 },
        navaids: [
          { identifier: 'ELATO', name: 'ELATO', latitude: 25.1, longitude: 122.2, type: 'FIX' },
          { identifier: 'SADLI', name: 'SADLI', latitude: 29.8, longitude: 130.4, type: 'FIX' }
        ]
      }
    }
  });

  assert.equal(route.source, ROUTE_SOURCES.AIRPORT_REFERENCE);
  assert.equal(route.fallbackUsed, true);
  assert.equal(route.waypoints[0].name, 'ELATO');
  assert.equal(route.waypoints[1].name, 'SADLI');
  assert.equal(route.billing.chargedTokens, 1);
});

test('uses published procedure data when the procedure provider succeeds', async () => {
  const route = await generateUnifiedRoute({
    departure: KLAX,
    arrival: EGLL,
    authState: 'authenticated',
    options: { aipProviderMode: AIP_PROVIDER_MODES.EXTERNAL_ONLY },
    debugResponses: {
      fetchFlightPlanDbRoute: {
        status: PROVIDER_STATUS.OK,
        billing: { chargedTokens: 1 },
        data: {
          waypoints: [{ name: 'DAG', latitude: 34.8537, longitude: -116.787 }]
        }
      },
      fetchProcedureData: {
        status: PROVIDER_STATUS.OK,
        billing: { chargedTokens: 1 },
        data: {
          sid: {
            name: 'REAL1D',
            waypoints: [{ name: 'SIDFIX', latitude: 34.1, longitude: -117.9, altitude: 5000 }]
          },
          enroute: {
            name: 'ENROUTE',
            waypoints: [{ name: 'ENRFIX', latitude: 40, longitude: -80, altitude: 35000 }]
          },
          star: {
            name: 'REAL2A',
            waypoints: [{ name: 'STARFX', latitude: 51.1, longitude: -1.2, altitude: 8000 }]
          }
        }
      }
    }
  });

  assert.equal(route.sid, 'REAL1D');
  assert.equal(route.star, 'REAL2A');
  assert.equal(route.waypoints.length, 3);
  assert.equal(route.waypoints[0].segment, 'sid');
  assert.equal(route.waypoints[2].segment, 'star');
  assert.equal(route.procedureSegments.length, 3);
  assert.equal(route.billing.chargedTokens, 2);
});

test('charged provider fallbacks preserve billing metadata on the final built-in route', async () => {
  const route = await generateUnifiedRoute({
    departure: KLAX,
    arrival: EGLL,
    authState: 'authenticated',
    options: { aipProviderMode: AIP_PROVIDER_MODES.EXTERNAL_ONLY },
    debugResponses: {
      fetchFlightPlanDbRoute: {
        status: PROVIDER_STATUS.PROVIDER_FAILED,
        message: 'Provider outage after token charge.',
        billing: { chargedTokens: 1 }
      }
    }
  });

  assert.equal(route.source, ROUTE_SOURCES.BUILT_IN);
  assert.equal(route.fallbackUsed, true);
  assert.equal(route.billing.chargedTokens, 1);
  assert.ok(route.debug.some((entry) => entry.status === PROVIDER_STATUS.PROVIDER_FAILED));
});

test('normalizes prebuilt approach fixes without duplicating them', () => {
  const approachWaypoints = buildApproachWaypoints(EGLL, KLAX, '27R');
  const normalized = normalizeRouteDetails({
    landingRunway: '27R',
    waypoints: [
      { name: 'DAG', latitude: 34.8537, longitude: -116.787 },
      ...approachWaypoints
    ],
    routeObject: {
      source: ROUTE_SOURCES.FLIGHT_PLAN_DB,
      legs: [{ from: 'KLAX', to: 'DAG', sequence: 1 }]
    }
  }, KLAX, EGLL);

  const finalFixes = normalized.waypoints.filter((waypoint) => waypoint.name === 'FINAL');
  const runwayFixes = normalized.waypoints.filter((waypoint) => waypoint.name === '27R');

  assert.equal(finalFixes.length, 1);
  assert.equal(runwayFixes.length, 1);

  const normalizedAgain = normalizeRouteDetails(normalized, KLAX, EGLL);
  assert.equal(normalizedAgain.waypoints.filter((waypoint) => waypoint.name === 'FINAL').length, 1);
  assert.equal(normalizedAgain.waypoints.filter((waypoint) => waypoint.name === '27R').length, 1);
});

test('mergeFlightPlanWithRoute preserves route metadata and prefers normalized route waypoints', () => {
  const merged = mergeFlightPlanWithRoute({
    waypoints: [{ name: 'OLD', latitude: 0, longitude: 0 }],
    routeSource: 'Legacy',
    routeFallbackUsed: false,
    routeBilling: { chargedTokens: 0 },
    departure: { runways: [{ name: '25L' }] },
    arrival: { runways: [{ name: '09R' }] }
  }, {
    departureRunway: '24L',
    landingRunway: '27R',
    waypoints: [{ name: 'DAG', latitude: 34.8537, longitude: -116.787 }],
    routeObject: {
      source: ROUTE_SOURCES.FLIGHT_PLAN_DB,
      fallbackUsed: true,
      billing: { chargedTokens: 1 },
      waypoints: [{ name: 'DAG', latitude: 34.8537, longitude: -116.787 }],
      procedures: { sid: { name: 'REAL1D' } },
      procedureSegments: [{ kind: 'sid', name: 'REAL1D', waypoints: [{ name: 'DAG', latitude: 34.8537, longitude: -116.787 }] }]
    },
    routeSource: ROUTE_SOURCES.FLIGHT_PLAN_DB,
    routeFallbackUsed: true,
    routeBilling: { chargedTokens: 1 },
    procedures: { sid: { name: 'REAL1D' } },
    procedureSegments: [{ kind: 'sid', name: 'REAL1D', waypoints: [{ name: 'DAG', latitude: 34.8537, longitude: -116.787 }] }]
  });

  assert.equal(merged.waypoints[0].name, 'DAG');
  assert.equal(merged.routeSource, ROUTE_SOURCES.FLIGHT_PLAN_DB);
  assert.equal(merged.routeFallbackUsed, true);
  assert.equal(merged.routeBilling.chargedTokens, 1);
  assert.equal(merged.procedures.sid.name, 'REAL1D');
  assert.equal(merged.procedureSegments[0].kind, 'sid');
  assert.deepEqual(merged.departure.runways, [{ name: '24L' }]);
  assert.deepEqual(merged.arrival.runways, [{ name: '27R' }]);
});
