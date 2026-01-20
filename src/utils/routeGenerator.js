
/**
 * Generates a unique VHF frequency for ATC communications
 * Range: 118.000 to 136.975 MHz, in 25kHz steps
 */
export const generateUniqueFrequency = () => {
  const min = 118000;
  const max = 136975;
  const step = 25;
  
  // Calculate total number of steps
  const totalSteps = Math.floor((max - min) / step);
  const randomStep = Math.floor(Math.random() * (totalSteps + 1));
  
  const freqKhz = min + (randomStep * step);
  return freqKhz / 1000;
};

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

/**
 * Attempts to fetch a real flight route from FlightLabs API.
 * Fallback to geometric Great Circle route if API fails or quota exceeded.
 * @param {Object} startAirport - { iata, latitude, longitude }
 * @param {Object} endAirport - { iata, latitude, longitude }
 * @returns {Promise<Array>} List of waypoints
 */
export const generateSmartRoute = async (startAirport, endAirport) => {
    // 1. Try FlightLabs API (Placeholder for real implementation)
    // Note: FlightLabs requires an API Key. If you have one, set it here.
    // Free tier often doesn't support full routing, but we implement the logic structure.
    const FLIGHTLABS_API_KEY = ''; // Leave empty to force fallback for now
    
    if (FLIGHTLABS_API_KEY && startAirport.iata && endAirport.iata) {
        try {
            console.log(`✈️ RouteGen: Attempting FlightLabs API for ${startAirport.iata}-${endAirport.iata}...`);
            const url = `https://app.goflightlabs.com/flights?access_key=${FLIGHTLABS_API_KEY}&dep_iata=${startAirport.iata}&arr_iata=${endAirport.iata}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Status ${response.status}`);
            
            const data = await response.json();
            // Note: Actual response structure depends on specific endpoint (Routes API vs Flights API)
            // This is a hypothetical parsing logic.
            if (data && data.route && Array.isArray(data.route)) {
                console.log("✈️ RouteGen: Successfully retrieved real route!");
                return data.route.map((pt, i) => ({
                    name: pt.name || `WPT${i+1}`,
                    latitude: pt.lat,
                    longitude: pt.lon,
                    type: 'WAYPOINT',
                    frequency: generateUniqueFrequency()
                }));
            }
        } catch (error) {
            console.warn("✈️ RouteGen: FlightLabs API failed or not accessible. Falling back to Great Circle.", error);
        }
    } else {
        // console.log("✈️ RouteGen: No API Key or invalid IATA. Using Great Circle.");
    }

    // 2. Fallback: Geometric Great Circle Route (Shortest Path)
    // Add a small delay to simulate "thinking" if desired, or return immediately
    return generateRouteWaypoints(startAirport, endAirport);
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
      type: 'WAYPOINT',
      frequency: generateUniqueFrequency()
    });
  }
  
  return waypoints;
};

