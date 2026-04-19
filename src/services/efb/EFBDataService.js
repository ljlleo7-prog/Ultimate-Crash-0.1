import { calculateFuelPlan } from './FuelPlanning.js';
import { calculateRouteProgress } from './RouteProgress.js';

export const calculateWindComponents = ({ windDirection, windSpeed, runwayHeading }) => {
  const windDir = Number(windDirection);
  const wind = Number(windSpeed);
  const runway = Number(runwayHeading);
  if (!Number.isFinite(windDir) || !Number.isFinite(wind) || !Number.isFinite(runway)) {
    return { headwind: null, crosswind: null };
  }
  const angle = ((windDir - runway + 540) % 360) - 180;
  return {
    headwind: wind * Math.cos(angle * Math.PI / 180),
    crosswind: wind * Math.sin(angle * Math.PI / 180),
    angle
  };
};

export const buildWeatherBriefing = ({ weatherData = {}, runwayHeading }) => {
  const visibilityMeters = Number(weatherData.visibility);
  const windSpeed = Number(weatherData.windSpeed) || 0;
  const windGust = Number(weatherData.windGust) || 0;
  const turbulence = Number(weatherData.turbulence) || 0;
  const gustSpread = Math.max(0, windGust - windSpeed);
  const wind = calculateWindComponents({
    windDirection: weatherData.windDirection,
    windSpeed,
    runwayHeading
  });

  const cautions = [];
  if (Number.isFinite(visibilityMeters) && visibilityMeters < 5000) cautions.push('Low visibility');
  if (gustSpread >= 10) cautions.push('Gust spread');
  if (turbulence >= 0.45) cautions.push('Moderate turbulence');
  if (Number.isFinite(wind.crosswind) && Math.abs(wind.crosswind) >= 20) cautions.push('High crosswind');

  return {
    temperature: Number.isFinite(Number(weatherData.temperature)) ? Number(weatherData.temperature) : null,
    humidity: Number.isFinite(Number(weatherData.humidity)) ? Number(weatherData.humidity) : null,
    pressureHpa: Number.isFinite(Number(weatherData.pressure)) ? Number(weatherData.pressure) : null,
    pressureInHg: Number.isFinite(Number(weatherData.pressureInHg)) ? Number(weatherData.pressureInHg) : null,
    windDirection: Number.isFinite(Number(weatherData.windDirection)) ? Number(weatherData.windDirection) : null,
    windSpeed,
    windGust,
    gustSpread,
    visibilityMeters: Number.isFinite(visibilityMeters) ? visibilityMeters : null,
    cloudCover: Number.isFinite(Number(weatherData.cloudCover)) ? Number(weatherData.cloudCover) : null,
    precipitation: Number.isFinite(Number(weatherData.precipitation)) ? Number(weatherData.precipitation) : null,
    turbulence,
    windComponents: wind,
    cautions,
    status: cautions.length > 0 ? 'caution' : 'normal'
  };
};

export const buildEFBData = ({ flightPlan, flightState, weatherData, aircraftData, preflightConfig, runwayHeading }) => {
  const routeProgress = calculateRouteProgress({ flightPlan, flightState });
  const fuelPlan = calculateFuelPlan({ flightState, routeProgress, preflightConfig, aircraftData });
  const weatherBriefing = buildWeatherBriefing({ weatherData, runwayHeading });

  return {
    routeProgress,
    fuelPlan,
    weatherBriefing,
    flight: {
      altitude: Number(flightState?.altitude) || 0,
      groundSpeed: Number(flightState?.groundSpeed) || 0,
      indicatedAirspeed: Number(flightState?.indicatedAirspeed) || 0,
      trueAirspeed: Number(flightState?.trueAirspeed) || 0,
      verticalSpeed: Number(flightState?.verticalSpeed) || 0,
      heading: Number(flightState?.heading) || 0
    }
  };
};
