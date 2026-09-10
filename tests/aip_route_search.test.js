import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateGreatCircleNm, searchLocalAipRoute } from '../src/services/routes/aipRouteSearch.js';
import { resetLocalAipCsvStore } from '../src/services/routes/aipCsvDataStore.js';

const headers = {
  lookup: 'region_code,aip_cycle,departure_code,arrival_code,route_id,route_code,lookup_rank',
  legs: 'route_id,leg_sequence,from_fix,airway,to_fix,region_code,aip_cycle',
  points: 'point_id,region_code,aip_cycle,ident,point_type,name,latitude_deg,longitude_deg,elevation_ft,iso_country,associated_airport,frequency_khz,dme_frequency_khz,dme_channel,usage_type,power,source_system,source_file',
  edges: 'region_code,aip_cycle,from_fix,to_fix,airway,route_id,route_code,leg_sequence'
};

const fixtureReader = ({ lookup = [], legs = [], points = [], edges = [] }) => {
  const files = {
    'aip_route_lookup_index.csv': [headers.lookup, ...lookup].join('\n'),
    'aip_route_legs.csv': [headers.legs, ...legs].join('\n'),
    'aip_reference_points.csv': [headers.points, ...points].join('\n'),
    'aip_route_edge_index.csv': [headers.edges, ...edges].join('\n')
  };
  return async (filePath) => files[String(filePath).split('/').at(-1)];
};

const point = (id, region, ident, latitude, longitude) => `${id},${region},2605,${ident},waypoint,${ident},${latitude},${longitude},,${region},,,,,,,TEST,fixture`;

const search = async (fixture, departure, arrival, options = {}) => {
  resetLocalAipCsvStore();
  return searchLocalAipRoute({
    departure,
    arrival,
    options: {
      csvDir: '/fixture',
      readFile: fixtureReader(fixture),
      forceReload: true,
      useBruteForceFallback: false,
      useGraphFallback: false,
      ...options
    }
  });
};

test('selects the shortest complete published candidate instead of lookup order', async () => {
  const result = await search({
    lookup: ['XX,2605,AAAA,BBBB,LONG,LONG,1', 'XX,2605,AAAA,BBBB,SHORT,SHORT,2'],
    legs: ['LONG,1,LONG1,A1,LONG2,XX,2605', 'SHORT,1,SHORT1,A2,SHORT2,XX,2605'],
    points: [point('1', 'XX', 'LONG1', 5, 0), point('2', 'XX', 'LONG2', 5, 10), point('3', 'XX', 'SHORT1', 0, 1), point('4', 'XX', 'SHORT2', 0, 9)]
  }, { icao: 'AAAA', latitude: 0, longitude: 0 }, { icao: 'BBBB', latitude: 0, longitude: 10 }, { maxConnectorNm: 1000, maxRouteDistanceFactor: 3 });

  assert.equal(result.status, 'ok');
  assert.equal(result.route.metadata.routeCode, 'SHORT');
});

test('rejects a published route when an internal fix has no coordinates', async () => {
  const result = await search({
    lookup: ['XX,2605,AAAA,BBBB,BROKEN,BROKEN,1'],
    legs: ['BROKEN,1,FIXA,A1,HIDDEN,XX,2605', 'BROKEN,2,HIDDEN,A1,FIXB,XX,2605'],
    points: [point('1', 'XX', 'FIXA', 0, 1), point('2', 'XX', 'FIXB', 0, 9)]
  }, { icao: 'AAAA', latitude: 0, longitude: 0 }, { icao: 'BBBB', latitude: 0, longitude: 10 }, { maxConnectorNm: 1000 });

  assert.equal(result.status, 'unavailable');
});

test('resolves duplicate waypoint idents inside the route region', async () => {
  const result = await search({
    lookup: ['CN,2605,ZAAA,ZBBB,CNROUTE,CNROUTE,1'],
    legs: ['CNROUTE,1,DUPLI,A1,CNEND,CN,2605'],
    points: [point('cn-1', 'CN', 'DUPLI', 30, 101), point('us-1', 'US', 'DUPLI', 30, -100), point('cn-2', 'CN', 'CNEND', 30, 109)]
  }, { icao: 'ZAAA', latitude: 30, longitude: 100 }, { icao: 'ZBBB', latitude: 30, longitude: 110 }, { maxConnectorNm: 1000 });

  assert.equal(result.status, 'ok');
  assert.equal(result.route.waypoints.find((waypoint) => waypoint.name === 'DUPLI').longitude, 101);
});

test('segments an international-to-China socket connector into explicit DCT legs', async () => {
  const departure = { icao: 'KAAA', latitude: 35, longitude: -120 };
  const arrival = { icao: 'ZBBB', latitude: 30, longitude: 110 };
  const result = await search({
    lookup: ['CN,2605,KAAA,ZBBB,SOCKET,SOCKET,1'],
    legs: ['SOCKET,1,ENTRY,A1,CNEND,CN,2605'],
    points: [point('cn-1', 'CN', 'ENTRY', 38, 120), point('cn-2', 'CN', 'CNEND', 34, 114)]
  }, departure, arrival, { maxConnectorNm: 600, maxRouteDistanceFactor: 2 });

  assert.equal(result.status, 'ok');
  assert.ok(result.route.waypoints.some((waypoint) => waypoint.connectorKind === 'international-gateway'));
  for (let index = 0; index < result.route.waypoints.length - 1; index += 1) {
    assert.ok(calculateGreatCircleNm(result.route.waypoints[index], result.route.waypoints[index + 1]) <= 601);
  }
});
