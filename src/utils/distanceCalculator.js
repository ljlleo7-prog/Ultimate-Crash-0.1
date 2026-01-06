// Distance calculation utilities for aviation

// Haversine formula for calculating great-circle distance
function calculateGreatCircleDistance(lat1, lon1, lat2, lon2, unit = 'nm') {
  const R = {
    km: 6371,
    mi: 3959,
    nm: 3440.065 // Nautical miles
  }[unit] || 3440.065;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Calculate flight time based on distance and average speed
function calculateFlightTime(distanceNm, averageSpeedKts = 450) {
  const hours = distanceNm / averageSpeedKts;
  const totalMinutes = Math.round(hours * 60);
  
  const flightHours = Math.floor(totalMinutes / 60);
  const flightMinutes = totalMinutes % 60;
  
  return {
    totalHours: hours,
    hours: flightHours,
    minutes: flightMinutes,
    totalMinutes: totalMinutes
  };
}

// Estimate fuel consumption based on aircraft type and distance
function estimateFuelConsumption(distanceNm, aircraftType = 'medium_jet') {
  const fuelRates = {
    small_prop: 25,    // lbs/nm
    medium_prop: 40,   // lbs/nm
    large_prop: 60,    // lbs/nm
    small_jet: 80,     // lbs/nm
    medium_jet: 120,   // lbs/nm (typical for 737/A320)
    large_jet: 200,    // lbs/nm
    widebody: 350      // lbs/nm
  };

  const rate = fuelRates[aircraftType] || 120;
  const fuelRequired = Math.round(distanceNm * rate);
  
  return {
    fuelRequired,
    rate,
    unit: 'lbs',
    aircraftType
  };
}

// Calculate required fuel including reserves
function calculateTotalFuel(distanceNm, reserveMinutes = 45, aircraftType = 'medium_jet') {
  const baseFuel = estimateFuelConsumption(distanceNm, aircraftType);
  const reserveFuel = Math.round((reserveMinutes / 60) * baseFuel.rate * 450); // Assume 450kts cruise
  
  return {
    tripFuel: baseFuel.fuelRequired,
    reserveFuel,
    totalFuel: baseFuel.fuelRequired + reserveFuel,
    ...baseFuel
  };
}

// Validate airport codes
function isValidAirportCode(code) {
  if (!code) return false;
  
  // IATA: 3 letters
  if (/^[A-Z]{3}$/.test(code.toUpperCase())) return true;
  
  // ICAO: 4 letters
  if (/^[A-Z]{4}$/.test(code.toUpperCase())) return true;
  
  return false;
}

// Format distance for display
function formatDistance(distanceNm) {
  if (distanceNm < 1) {
    return `${Math.round(distanceNm * 10) / 10} nm`;
  } else if (distanceNm < 10) {
    return `${Math.round(distanceNm * 10) / 10} nm`;
  } else if (distanceNm < 100) {
    return `${Math.round(distanceNm)} nm`;
  } else {
    return `${Math.round(distanceNm / 10) * 10} nm`;
  }
}

// Format flight time for display
function formatFlightTime(flightTime) {
  if (flightTime.hours === 0) {
    return `${flightTime.minutes}m`;
  } else if (flightTime.minutes === 0) {
    return `${flightTime.hours}h`;
  } else {
    return `${flightTime.hours}h ${flightTime.minutes}m`;
  }
}

export {
  calculateGreatCircleDistance,
  calculateFlightTime,
  estimateFuelConsumption,
  calculateTotalFuel,
  isValidAirportCode,
  formatDistance,
  formatFlightTime,
  toRadians
};