
/**
 * Generates route components including SID, STAR, Waypoints, and Gates.
 */

export const generateWaypoints = (count = 3) => {
  const waypoints = [];
  for (let i = 0; i < count; i++) {
    const isFiveChar = Math.random() > 0.3; // Mostly 5-alphabet
    const length = isFiveChar ? 5 : 3;
    let waypoint = '';
    for (let j = 0; j < length; j++) {
      waypoint += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    waypoints.push(waypoint);
  }
  return waypoints;
};

export const generateSID = (firstWaypoint) => {
  if (!firstWaypoint || firstWaypoint.length < 3) return 'DEF01D';
  const prefix = firstWaypoint.substring(0, 3);
  const number = Math.floor(Math.random() * 10).toString(); // Single digit 0-9? User said 00, maybe 2 digits.
  // User said "XXX00D format (X for alphabet and 0 for number)". 
  // "XXX00D" usually means 3 letters, 2 numbers, 1 letter.
  const numPart = Math.floor(Math.random() * 90 + 10).toString(); // 10-99
  return `${prefix}${numPart}D`;
};

export const generateSTAR = (lastWaypoint) => {
  if (!lastWaypoint || lastWaypoint.length < 3) return 'ARR01A';
  const prefix = lastWaypoint.substring(0, 3);
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
  if (airport && airport.runways && Array.isArray(airport.runways) && airport.runways.length > 0) {
    return airport.runways.map(r => r.name);
  }
  if (airport && airport.runway) {
    return [airport.runway];
  }
  // Fallback generation if no data
  return ['09L', '27R', '18L', '36R'];
};

export const getRunwayHeading = (runwayName) => {
  if (!runwayName) return 0;
  // Format is typically "09L", "27R", "36", etc.
  // Extract the first 2 digits found in the string
  const match = runwayName.match(/(\d{2})/);
  if (match) {
    return parseInt(match[1]) * 10;
  }
  return 0;
};

/**
 * Calculates intermediate point on a Great Circle path
 */
function calculateIntermediatePoint(lat1, lon1, lat2, lon2, fraction) {
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;

  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  // Angular distance
  const δ = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));

  if (δ === 0) return { latitude: lat1, longitude: lon1 };

  const a = Math.sin((1 - fraction) * δ) / Math.sin(δ);
  const b = Math.sin(fraction * δ) / Math.sin(δ);

  const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
  const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
  const z = a * Math.sin(φ1) + b * Math.sin(φ2);

  const φ3 = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ3 = Math.atan2(y, x);

  return {
    latitude: toDeg(φ3),
    longitude: toDeg(λ3)
  };
}

/**
 * Generates a list of waypoints along the Great Circle route
 * @param {Object} startAirport - { latitude, longitude, iata }
 * @param {Object} endAirport - { latitude, longitude, iata }
 * @returns {Array} List of waypoints { name, latitude, longitude }
 */
export const generateRouteWaypoints = (startAirport, endAirport) => {
  if (!startAirport || !endAirport) return [];

  const R = 6371; // Earth radius in km
  const toRad = (d) => d * Math.PI / 180;
  
  const dLat = toRad(endAirport.latitude - startAirport.latitude);
  const dLon = toRad(endAirport.longitude - startAirport.longitude);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(startAirport.latitude)) * Math.cos(toRad(endAirport.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Requirement: At least 4 waypoints, and max 800km spacing
  // Calculate how many segments we need for 800km spacing
  const minSegmentsByDist = Math.ceil(distanceKm / 800);
  
  // Requirement: "route shall have at least 4 waypoints"
  // Assuming this means 4 intermediate waypoints.
  // So we need at least 5 segments.
  const numSegments = Math.max(5, minSegmentsByDist);
  
  const waypoints = [];
  
  // Generate random names for waypoints
  const names = generateWaypoints(numSegments - 1); // reuse existing name generator
  
  for (let i = 1; i < numSegments; i++) {
    const fraction = i / numSegments;
    const point = calculateIntermediatePoint(
      startAirport.latitude, 
      startAirport.longitude, 
      endAirport.latitude, 
      endAirport.longitude, 
      fraction
    );
    
    waypoints.push({
      name: names[i-1] || `WPT${i}`,
      latitude: point.latitude,
      longitude: point.longitude,
      type: 'WAYPOINT'
    });
  }
  
  return waypoints;
};

