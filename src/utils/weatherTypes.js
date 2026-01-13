/**
 * @typedef {object} WeatherData
 * @property {number} temperature - Temperature in Celsius.
 * @property {number} windSpeed - Wind speed in knots.
 * @property {number} windGust - Wind gust speed in knots.
 * @property {number} windDirection - Wind direction in degrees (0-359).
 * @property {number} cloudCover - Cloud cover percentage (0-100).
 * @property {number} visibility - Visibility in meters.
 * @property {string} season - Current season (e.g., "summer", "winter").
 * @property {string} zuluTime - Current Zulu time (ISO 8601 format).
 */

/**
 * Enum for general weather conditions.
 * @readonly
 * @enum {string}
 */
export const WeatherCondition = {
  CLEAR: 'Clear',
  PARTLY_CLOUDY: 'Partly Cloudy',
  CLOUDY: 'Cloudy',
  OVERCAST: 'Overcast',
  FOG: 'Fog',
  MIST: 'Mist',
  RAIN: 'Rain',
  SNOW: 'Snow',
  THUNDERSTORM: 'Thunderstorm',
  WINDY: 'Windy',
};
