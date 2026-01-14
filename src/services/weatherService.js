import weatherConfig from '../config/weatherConfig.json';
import { WeatherCondition } from '../utils/weatherTypes';

/**
 * Generates a random number within a given range and distribution.
 * @param {number[]} range - [min, max]
 * @param {string} distribution - "normal", "uniform", "exponential", "lognormal"
 * @returns {number}
 */
function getRandomValue(range, distribution) {
  const [min, max] = range;
  switch (distribution) {
    case 'uniform':
      return Math.random() * (max - min) + min;
    case 'normal':
      // Using Box-Muller transform for normal distribution
      let u = 0, v = 0;
      while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
      while (v === 0) v = Math.random();
      let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      num = num / 6.0 + 0.5; // Scale to 0-1
      return num * (max - min) + min;
    case 'exponential':
      // Simple exponential distribution (can be refined)
      return min + Math.log(1 - Math.random()) * (-1 / (1 / (max - min)));
    case 'lognormal':
      // Simple lognormal (can be refined)
      let u1 = 0, v1 = 0;
      while (u1 === 0) u1 = Math.random();
      while (v1 === 0) v1 = Math.random();
      let normal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * v1);
      let lognormal = Math.exp(normal * 0.5 + Math.log((max + min) / 2) - (0.5 * 0.5) / 2); // Mean and std dev can be configured
      return Math.max(min, Math.min(max, lognormal));
    default:
      return Math.random() * (max - min) + min;
  }
}

/**
 * Applies seasonal offsets to a value.
 * @param {number} value - The base value.
 * @param {string} season - The current season.
 * @param {string} paramName - The name of the parameter (e.g., "temperature").
 * @returns {number} The value with seasonal adjustments.
 */
function applySeasonalVariation(value, season, paramName, regionalAdjustments) {
  const seasonalConfig = regionalAdjustments.seasonalVariations?.[season];
  if (!seasonalConfig) return value;

  switch (paramName) {
    case 'temperature':
      return value + (seasonalConfig.temperatureOffset || 0);
    case 'windSpeed':
    case 'windGust':
      return value * (seasonalConfig.windSpeedMultiplier || 1);
    default:
      return value;
  }
}

/**
 * Determines regional weather adjustments based on latitude and longitude.
 * @param {number} latitude - The latitude for which to get regional adjustments.
 * @param {number} longitude - The longitude for which to get regional adjustments.
 * @returns {object} An object containing regional adjustments (temperatureOffset, windSpeedMultiplier, etc.).
 */
function getRegionalWeatherAdjustments(latitude, longitude) {
  const defaultAdjustments = {
    temperatureOffset: 0,
    windSpeedMultiplier: 1,
    cloudCoverOffset: 0,
    visibilityOffset: 0,
    typicalPhenomena: "Clear skies"
  };

  const region = weatherConfig.regionalVariations.find(
    (r) =>
      latitude >= r.latitudeRange[0] &&
      latitude < r.latitudeRange[1] &&
      longitude >= r.longitudeRange[0] &&
      longitude < r.longitudeRange[1]
  );

  return region || defaultAdjustments;
}

/**
 * Generates initial weather data.
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} season
 * @param {string} zuluTime
 * @returns {WeatherData}
 */
export function generateInitialWeather(latitude, longitude, season, zuluTime) {
  const weather = {};
  const regionalAdjustments = getRegionalWeatherAdjustments(latitude, longitude);

  for (const param in weatherConfig) {
    if (weatherConfig[param].range) {
      let value = getRandomValue(weatherConfig[param].range, weatherConfig[param].distribution);
      value = applySeasonalVariation(value, season, param, regionalAdjustments);
      // Apply regional adjustments
      switch (param) {
        case 'temperature':
          value += regionalAdjustments.temperatureOffset || 0;
          break;
        case 'windSpeed':
        case 'windGust':
          value *= regionalAdjustments.windSpeedMultiplier || 1;
          break;
        case 'cloudCover':
          value += regionalAdjustments.cloudCoverOffset || 0;
          break;
        case 'visibility':
          value += regionalAdjustments.visibilityOffset || 0;
          break;
      }
      weather[param] = parseFloat(value.toFixed(2));
    }
  }

  weather.season = season;
  weather.zuluTime = zuluTime;
  weather.latitude = latitude;
  weather.longitude = longitude;
  weather.weatherCondition = getRandomWeatherCondition(regionalAdjustments.typicalPhenomena); // Assign a random initial condition

  return /** @type {WeatherData} */ (weather);
}

/**
 * Updates weather data based on a time delta.
 * @param {WeatherData} currentWeather
 * @param {number} timeDeltaMinutes - Time elapsed since last update in minutes.
 * @returns {WeatherData}
 */
export function updateWeather(currentWeather, timeDeltaMinutes) {
  const newWeather = { ...currentWeather };

  // Only update if ATIS interval has passed
  if (timeDeltaMinutes < weatherConfig.atisUpdateIntervalMinutes) {
    return newWeather;
  }

  const regionalAdjustments = getRegionalWeatherAdjustments(newWeather.latitude, newWeather.longitude);

  for (const param in weatherConfig) {
    if (weatherConfig[param].range && newWeather[param] !== undefined) {
      const config = weatherConfig[param];
      const currentValue = newWeather[param];
      const variation = getRandomValue([-config.variationSpeed, config.variationSpeed], 'uniform');
      let newValue = currentValue + variation * (timeDeltaMinutes / weatherConfig.atisUpdateIntervalMinutes);

      // Apply seasonal variation again to ensure it's always considered
      newValue = applySeasonalVariation(newValue, newWeather.season, param, regionalAdjustments);

      // Apply regional adjustments
      switch (param) {
        case 'temperature':
          newValue += regionalAdjustments.temperatureOffset || 0;
          break;
        case 'windSpeed':
        case 'windGust':
          newValue *= regionalAdjustments.windSpeedMultiplier || 1;
          break;
        case 'cloudCover':
          newValue += regionalAdjustments.cloudCoverOffset || 0;
          break;
        case 'visibility':
          newValue += regionalAdjustments.visibilityOffset || 0;
          break;
      }

      // Clamp to range
      newValue = Math.max(config.range[0], Math.min(config.range[1], newValue));
      newWeather[param] = parseFloat(newValue.toFixed(2));
    }
  }

  // Randomly change weather condition
  if (Math.random() < weatherConfig.extremeWeatherProbability * (timeDeltaMinutes / weatherConfig.atisUpdateIntervalMinutes)) {
    newWeather.weatherCondition = getRandomWeatherCondition(regionalAdjustments.typicalPhenomena);
  }

  // Update Zulu time
  const currentZuluDate = new Date(newWeather.zuluTime);
  currentZuluDate.setMinutes(currentZuluDate.getMinutes() + timeDeltaMinutes);
  newWeather.zuluTime = currentZuluDate.toISOString();

  return newWeather;
}

/**
 * Returns a random weather condition from the WeatherCondition enum, potentially biased by typical phenomena.
 * @param {string} [typicalPhenomena] - A string describing typical weather phenomena for the region.
 * @returns {WeatherCondition}
 */
function getRandomWeatherCondition(typicalPhenomena = "") {
  const conditions = Object.values(WeatherCondition);
  let weightedConditions = [];

  // Assign weights based on typical phenomena
  if (typicalPhenomena.includes("Thunderstorms") || typicalPhenomena.includes("convection")) {
    weightedConditions.push(...Array(5).fill(WeatherCondition.THUNDERSTORM));
  }
  if (typicalPhenomena.includes("rain") || typicalPhenomena.includes("monsoon")) {
    weightedConditions.push(...Array(5).fill(WeatherCondition.RAIN));
  }
  if (typicalPhenomena.includes("snow") || typicalPhenomena.includes("ice fog")) {
    weightedConditions.push(...Array(5).fill(WeatherCondition.SNOW));
  }
  if (typicalPhenomena.includes("fog") || typicalPhenomena.includes("mist")) {
    weightedConditions.push(...Array(5).fill(WeatherCondition.FOG));
  }
  if (typicalPhenomena.includes("dust") || typicalPhenomena.includes("sand")) {
    // Assuming 'Haze' or 'Mist' can represent dust/sand for now, or add a new enum if needed
    weightedConditions.push(...Array(3).fill(WeatherCondition.MIST));
  }
  if (typicalPhenomena.includes("wind") || typicalPhenomena.includes("squalls") || typicalPhenomena.includes("wind shear") || typicalPhenomena.includes("cyclone")) {
    weightedConditions.push(...Array(5).fill(WeatherCondition.WINDY));
  }
  if (typicalPhenomena.includes("Clear skies") || typicalPhenomena.includes("gentle winds")) {
    weightedConditions.push(...Array(5).fill(WeatherCondition.CLEAR));
  }
  if (typicalPhenomena.includes("cloud bands") || typicalPhenomena.includes("Overcast")) {
    weightedConditions.push(...Array(5).fill(WeatherCondition.OVERCAST));
  }

  // If no specific phenomena matched, or to add general variety, include all conditions
  if (weightedConditions.length === 0) {
    weightedConditions = conditions;
  } else {
    // Add a smaller weight for general conditions to ensure variety
    weightedConditions.push(...Array(2).fill(WeatherCondition.CLEAR));
    weightedConditions.push(...Array(2).fill(WeatherCondition.PARTLY_CLOUDY));
    weightedConditions.push(...Array(2).fill(WeatherCondition.CLOUDY));
  }

  return weightedConditions[Math.floor(Math.random() * weightedConditions.length)];
}
