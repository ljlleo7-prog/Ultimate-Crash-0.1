
import { generateUnifiedRoute } from '../services/routes/routeService.js';
import { generateBuiltInRouteWaypoints, generateUniqueFrequencyValue, generateWaypointNames } from '../services/routes/builtInRouteGenerator.js';

/**
 * Generates a unique VHF frequency for ATC communications
 * Range: 118.000 to 136.975 MHz, in 25kHz steps
 */
export const generateUniqueFrequency = generateUniqueFrequencyValue;

/**
 * Generates route components including SID, STAR, Waypoints, and Gates.
 */

export const generateWaypoints = generateWaypointNames;

export const generateSmartRouteDetails = async (startAirport, endAirport, options = {}) => {
    return generateUnifiedRoute({
        departure: startAirport,
        arrival: endAirport,
        aircraftType: options.aircraftType || '',
        authState: options.authState || 'guest',
        options,
        debugResponses: options.debugResponses || {}
    });
};

/**
 * Attempts to fetch a real flight route from guarded aviation providers.
 * Fallback to geometric Great Circle route if APIs are unavailable, rate-limited, unauthenticated, or out of tokens.
 * @param {Object} startAirport - { iata, icao, latitude, longitude }
 * @param {Object} endAirport - { iata, icao, latitude, longitude }
 * @returns {Promise<Array>} List of waypoints
 */
export const generateSmartRoute = async (startAirport, endAirport, options = {}) => {
    const route = await generateSmartRouteDetails(startAirport, endAirport, options);
    return Array.isArray(route?.waypoints) ? route.waypoints : generateRouteWaypoints(startAirport, endAirport);
};

export const normalizeProcedurePrefix = (waypointName) => {
  const cleaned = String(waypointName || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length >= 3) return cleaned.slice(0, 3);
  return 'DEF';
};

export const procedureMatchesWaypoint = (procedureName, waypointName) => {
  if (!procedureName || !waypointName) return false;
  return String(procedureName).toUpperCase().startsWith(normalizeProcedurePrefix(waypointName));
};

export const generateSID = (firstWaypoint) => {
  const prefix = normalizeProcedurePrefix(firstWaypoint);
  const numPart = Math.floor(Math.random() * 90 + 10).toString();
  return `${prefix}${numPart}D`;
};

export const getLastProcedureWaypoint = (waypoints = []) => {
  const normalized = Array.isArray(waypoints) ? waypoints : [];
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const waypoint = normalized[index];
    const name = typeof waypoint === 'string' ? waypoint : waypoint?.name || waypoint?.label || '';
    const type = typeof waypoint === 'string' ? 'WAYPOINT' : waypoint?.type || 'WAYPOINT';
    if (!name) continue;
    if (type === 'APPROACH_FIX' || type === 'RUNWAY_FIX') continue;
    if (String(name).toUpperCase() === 'FINAL') continue;
    return name;
  }
  return '';
};

export const generateSTAR = (lastWaypoint) => {
  const prefix = normalizeProcedurePrefix(lastWaypoint);
  const numPart = Math.floor(Math.random() * 90 + 10).toString();
  return `${prefix}${numPart}A`;
};

export const generateGate = () => {
  const terminal = String.fromCharCode(65 + Math.floor(Math.random() * 6)); // A-F
  const gateNum = Math.floor(Math.random() * 50 + 1);
  return `${terminal}${gateNum}`;
};

export const generateTaxiway = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const char1 = chars.charAt(Math.floor(Math.random() * chars.length));
  // Sometimes taxiways have numbers too, but let's stick to single letter or double letter
  return char1; 
};

export const getRunways = (airport) => {
  let runwayNames = [];
  if (airport && airport.runways && Array.isArray(airport.runways) && airport.runways.length > 0) {
    runwayNames = airport.runways.map(r => r.name);
  } else if (airport && airport.runway) {
    runwayNames = [airport.runway];
  } else {
    runwayNames = ['09L/27R', '18L/36R'];
  }

  // Split pairs into individual runways (e.g., "09L/27R" -> ["09L", "27R"])
  const individualRunways = [];
  runwayNames.forEach(name => {
    if (name.includes('/')) {
      name.split('/').forEach(part => individualRunways.push(part.trim()));
    } else if (name.includes('-')) {
      name.split('-').forEach(part => individualRunways.push(part.trim()));
    } else {
      individualRunways.push(name);
    }
  });

  return individualRunways;
};

/**
 * Extracts a heading from a runway name, handling pairs like "09L/27R"
 * @param {string} runwayName - Runway name or pair
 * @param {boolean|null} isEastward - Direction preference (true for smaller number, false for bigger)
 * @returns {number} Magnetic heading in degrees
 */
export const getRunwayHeading = (runwayName, isEastward = null) => {
  if (!runwayName) {
    console.warn('⚠️ getRunwayHeading called with empty runwayName');
    return 0;
  }

  // Handle pairs like "09L/27R" or "06R-24L"
  const parts = runwayName.split(/[\/\-]/);
  
  if (parts.length > 1 && isEastward !== null) {
    const headings = parts.map(p => {
      const match = p.match(/(\d{1,2})/);
      return match ? parseInt(match[1]) * 10 : null;
    }).filter(h => h !== null);

    if (headings.length >= 2) {
      // User: "if destination is eastward, use smaller number; if westward, use bigger number"
      headings.sort((a, b) => a - b);
      const selected = isEastward ? headings[0] : headings[headings.length - 1];
      console.log(`🧭 Runway Pair [${runwayName}] -> Preferred: ${selected} (Eastward: ${isEastward})`);
      // Return 360 instead of 0 for North
      const h = selected % 360;
      return h === 0 ? 360 : h;
    }
  }

  // Single runway or no preference
  const match = runwayName.match(/(\d{1,2})/);
  if (match) {
    const h = (parseInt(match[1]) * 10) % 360;
    return h === 0 ? 360 : h;
  }

  console.warn(`⚠️ Could not parse runway heading from: ${runwayName}`);
  return 0;
};

/**
 * Calculates intermediate point on a Great Circle path
 */
export { generateBuiltInRouteWaypoints as generateRouteWaypoints } from '../services/routes/builtInRouteGenerator.js';

