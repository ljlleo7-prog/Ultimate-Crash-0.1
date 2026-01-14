// Route utilities for generating random route data

// Generate random alphabet character
const randomChar = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return chars.charAt(Math.floor(Math.random() * chars.length));
};

// Generate random number with specified length
const randomNumber = (length) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate random waypoint (5-alphabet mostly, 3-alphabet sometimes)
export const generateWaypoint = () => {
  const isThreeChar = Math.random() < 0.3; // 30% chance of 3-character waypoints
  const length = isThreeChar ? 3 : 5;
  
  let waypoint = '';
  for (let i = 0; i < length; i++) {
    waypoint += randomChar();
  }
  
  return waypoint;
};

// Generate random SID in XXX00D format (XXX is first waypoint initials)
export const generateSID = (firstWaypoint) => {
  const prefix = firstWaypoint.substring(0, 3).toUpperCase();
  const number = randomNumber(2);
  const suffix = 'D'; // Departure
  
  return `${prefix}${number}${suffix}`;
};

// Generate random STAR in XXX00A format (XXX is last waypoint initials)
export const generateSTAR = (lastWaypoint) => {
  const prefix = lastWaypoint.substring(0, 3).toUpperCase();
  const number = randomNumber(2);
  const suffix = 'A'; // Arrival
  
  return `${prefix}${number}${suffix}`;
};

// Generate random gate
export const generateGate = () => {
  const terminal = randomChar();
  const number = Math.floor(Math.random() * 20) + 1;
  
  return `${terminal}${number}`;
};

// Generate runway from airport database
export const generateRunway = (airport) => {
  if (airport && airport.runways && airport.runways.length > 0) {
    // Get a random runway from the airport's runways
    const randomRunway = airport.runways[Math.floor(Math.random() * airport.runways.length)];
    // Extract just the runway name (e.g., "08L/26R" -> "08L")
    const runwayParts = randomRunway.name.split('/');
    return runwayParts[0]; // Return the first direction
  }
  
  // Fallback if no runway data available
  const runwayNumbers = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
  const runwayNumber = runwayNumbers[Math.floor(Math.random() * runwayNumbers.length)];
  const side = Math.random() < 0.5 ? 'L' : 'R';
  
  return `${runwayNumber}${side}`;
};

// Generate random taxiway
export const generateTaxiway = () => {
  const isSimple = Math.random() < 0.6; // 60% chance of simple taxiway (just a letter)
  
  if (isSimple) {
    return randomChar();
  } else {
    return `${randomChar()}${Math.floor(Math.random() * 5) + 1}`;
  }
};

// Generate complete route data
export const generateRandomRouteData = (departureIATA, arrivalIATA, difficulty = 'rookie', departureAirport = null, arrivalAirport = null) => {
  // Generate departure data
  const departureGates = Array.from({ length: 10 }, () => generateGate());
  const departureTaxiways = Array.from({ length: 8 }, () => generateTaxiway());
  const departureRunways = departureAirport && departureAirport.runways ? 
    departureAirport.runways.map(runway => runway.name.split('/')[0]) : 
    Array.from({ length: 4 }, () => generateRunway(null));
  
  // Generate arrival data
  const arrivalGates = Array.from({ length: 10 }, () => generateGate());
  const arrivalTaxiways = Array.from({ length: 8 }, () => generateTaxiway());
  const arrivalRunways = arrivalAirport && arrivalAirport.runways ? 
    arrivalAirport.runways.map(runway => runway.name.split('/')[0]) : 
    Array.from({ length: 4 }, () => generateRunway(null));
  
  // Generate waypoints
  const waypointCount = difficulty === 'expert' || difficulty === 'professional' ? 8 : 4;
  const waypoints = Array.from({ length: waypointCount }, () => generateWaypoint());
  
  // Generate SIDs and STARs
  const firstWaypoint = waypoints.length > 0 ? waypoints[0] : 'DEFAULT';
  const lastWaypoint = waypoints.length > 0 ? waypoints[waypoints.length - 1] : 'DEFAULT';
  
  const SIDs = Array.from({ length: 3 }, () => generateSID(firstWaypoint));
  const STARs = Array.from({ length: 3 }, () => generateSTAR(lastWaypoint));
  
  return {
    // Departure data
    departureGates,
    departureTaxiways,
    departureRunways,
    
    // SIDs and waypoints
    SIDs,
    waypoints,
    
    // STARs and arrival data
    STARs,
    arrivalRunways,
    arrivalTaxiways,
    arrivalGates,
    
    // Helper methods
    generateWaypoint
  };
};

// Generate default route data for rookie mode with skip option
export const generateDefaultRouteData = (departureIATA, arrivalIATA, departureAirport = null, arrivalAirport = null) => {
  const data = generateRandomRouteData(departureIATA, arrivalIATA, 'rookie', departureAirport, arrivalAirport);
  
  return {
    selectedDepartureGate: data.departureGates[0],
    selectedDepartureTaxiway: data.departureTaxiways[0],
    selectedDepartureRunway: data.departureRunways[0],
    selectedSID: data.SIDs[0],
    selectedWaypoints: data.waypoints,
    selectedSTAR: data.STARs[0],
    selectedArrivalRunway: data.arrivalRunways[0],
    selectedArrivalTaxiway: data.arrivalTaxiways[0],
    selectedArrivalGate: data.arrivalGates[0]
  };
};

// Validate route data according to difficulty requirements
export const validateRouteData = (routeData, difficulty) => {
  const errors = [];
  
  const requirements = {
    requireGate: difficulty !== 'rookie',
    requireRunway: difficulty !== 'rookie',
    requireSIDSTAR: difficulty === 'expert' || difficulty === 'professional',
    requireWaypoints: difficulty === 'expert' || difficulty === 'professional'
  };
  
  if (requirements.requireGate) {
    if (!routeData.selectedDepartureGate) {
      errors.push('Departure gate is required');
    }
    if (!routeData.selectedArrivalGate) {
      errors.push('Arrival gate is required');
    }
  }
  
  if (requirements.requireRunway) {
    if (!routeData.selectedDepartureRunway) {
      errors.push('Departure runway is required');
    }
    if (!routeData.selectedArrivalRunway) {
      errors.push('Arrival runway is required');
    }
  }
  
  if (requirements.requireSIDSTAR) {
    if (!routeData.selectedSID) {
      errors.push('SID is required');
    }
    if (!routeData.selectedSTAR) {
      errors.push('STAR is required');
    }
  }
  
  if (requirements.requireWaypoints && (!routeData.selectedWaypoints || routeData.selectedWaypoints.length === 0)) {
    errors.push('Waypoints are required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};