import test from 'node:test';
import assert from 'node:assert/strict';
import { convertUnit, formatDuration, formatMinutes } from '../src/services/efb/UnitConversion.js';
import { calculateRouteProgress } from '../src/services/efb/RouteProgress.js';
import { calculateFuelPlan, calculateAltitudeAdvisory, getFuelFlowKgPerHour } from '../src/services/efb/FuelPlanning.js';
import { buildWeatherBriefing, calculateWindComponents, buildEFBData } from '../src/services/efb/EFBDataService.js';

test('converts units and formats durations', () => {
  assert.equal(convertUnit(100, 'nm', 'km', 'distance').toFixed(1), '185.2');
  assert.equal(convertUnit(29.92, 'inHg', 'hPa', 'pressure').toFixed(1), '1013.2');
  assert.equal(formatDuration(2.5), '2h 30m');
  assert.equal(formatMinutes(12.5), '12:30');
});

test('calculates route progress from active plan and flight state', () => {
  const flightPlan = {
    fms: {
      activePlan: {
        waypoints: [
          { ident: 'A', latitude: 0, longitude: 1 },
          { ident: 'B', latitude: 0, longitude: 2 }
        ]
      }
    }
  };
  const flightState = {
    latitude: 0,
    longitude: 0,
    groundSpeed: 120,
    currentWaypointIndex: 0
  };

  const result = calculateRouteProgress({ flightPlan, flightState });
  assert.equal(result.activeIdent, 'A');
  assert.equal(result.waypointCount, 2);
  assert.ok(result.distanceToNext > 59 && result.distanceToNext < 61);
  assert.ok(result.distanceRemaining > 119 && result.distanceRemaining < 121);
  assert.equal(result.eteNextText, '30:00');
});

test('calculates fuel plan and altitude advisory', () => {
  const routeProgress = { eteDestinationHours: 1.5 };
  const flightState = {
    fuel: 9000,
    altitude: 12000,
    verticalSpeed: 1000,
    engineFuelFlow: [0.5, 0.5]
  };
  const preflightConfig = { fuelReserve: 2500, flightPlan: { fuel: { tripFuel: 4000 } } };
  const aircraftData = { emptyWeight: 50000 };

  assert.equal(getFuelFlowKgPerHour(flightState), 3600);
  const plan = calculateFuelPlan({ flightState, routeProgress, preflightConfig, aircraftData });
  assert.equal(plan.destinationFuel, 3600);
  assert.equal(plan.reserveMargin, 1100);
  assert.equal(plan.airborneWeight, 59000);

  const advisory = calculateAltitudeAdvisory({ flightState, targetAltitude: 15000 });
  assert.equal(advisory.direction, 'climb');
  assert.equal(advisory.text, '3m 0s');
});

test('builds weather briefing and aggregate EFB data', () => {
  const wind = calculateWindComponents({ windDirection: 90, windSpeed: 20, runwayHeading: 90 });
  assert.equal(Math.round(wind.headwind), 20);
  assert.equal(Math.round(wind.crosswind), 0);

  const weatherData = {
    temperature: 18,
    humidity: 72,
    pressure: 1008,
    pressureInHg: 29.77,
    windDirection: 180,
    windSpeed: 24,
    windGust: 38,
    visibility: 4000,
    turbulence: 0.5,
    cloudCover: 70,
    precipitation: 1.2
  };
  const briefing = buildWeatherBriefing({ weatherData, runwayHeading: 90 });
  assert.equal(briefing.status, 'caution');
  assert.ok(briefing.cautions.includes('Low visibility'));
  assert.ok(briefing.cautions.includes('Gust spread'));
  assert.ok(briefing.cautions.includes('Moderate turbulence'));
  assert.ok(briefing.cautions.includes('High crosswind'));

  const efb = buildEFBData({
    flightPlan: [{ ident: 'A', latitude: 0, longitude: 1 }],
    flightState: {
      latitude: 0,
      longitude: 0,
      groundSpeed: 120,
      altitude: 10000,
      verticalSpeed: 0,
      heading: 90,
      fuel: 6000,
      engineFuelFlow: [0.4, 0.4]
    },
    weatherData,
    aircraftData: { emptyWeight: 45000 },
    preflightConfig: { fuelReserve: 2000 },
    runwayHeading: 90
  });

  assert.equal(efb.flight.altitude, 10000);
  assert.equal(efb.weatherBriefing.status, 'caution');
  assert.ok(efb.routeProgress.distanceToNext > 59 && efb.routeProgress.distanceToNext < 61);
  assert.ok(efb.fuelPlan.fuelFlowKgH > 2800 && efb.fuelPlan.fuelFlowKgH < 2900);
});
