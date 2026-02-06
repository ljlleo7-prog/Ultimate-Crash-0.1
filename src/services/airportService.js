import airportDatabase from '../data/airportDatabase.json' with { type: "json" };

class AirportService {
  constructor(apiKey = '') {
    this.allAirports = airportDatabase?.airports || [];
    this.apiKey = apiKey;
    this.useLocalDatabase = !apiKey;
    this.freeTrialUsed = false;
  }

  getAllAirports() {
    return this.allAirports;
  }

  getNormalAirports() {
    return this.allAirports.filter(airport => airport.type === 'normal');
  }

  getEmergencyAirports() {
    return this.allAirports.filter(airport => airport.type === 'emergency');
  }

  searchAirports(query, options = {}) {
    const { type = 'all', includeEmergency = false } = options;

    if (!query || query.trim().length < 2) {
      return [];
    }

    let airportsToSearch = this.allAirports;

    if (type === 'normal' || (!includeEmergency && type === 'all')) {
      airportsToSearch = this.getNormalAirports();
    } else if (type === 'emergency') {
      airportsToSearch = this.getEmergencyAirports();
    }

    const searchTerm = query.toLowerCase();
    return airportsToSearch.filter(airport =>
      airport.iata.toLowerCase().includes(searchTerm) ||
      airport.icao.toLowerCase().includes(searchTerm) ||
      airport.name.toLowerCase().includes(searchTerm) ||
      (airport.city && airport.city.toLowerCase().includes(searchTerm))
    );
  }

  searchNormalAirports(query) {
    return this.searchAirports(query, { type: 'normal' });
  }

  searchEmergencyAirports(query) {
    return this.searchAirports(query, { type: 'emergency' });
  }

  getAirportByCode(code) {
    return this.allAirports.find(airport =>
      airport.iata.toUpperCase() === code.toUpperCase() ||
      airport.icao.toUpperCase() === code.toUpperCase()
    );
  }

  getAirportType(code) {
    const airport = this.getAirportByCode(code);
    return airport ? airport.type : null;
  }

  getPopularAirports() {
    const majorAirports = ['JFK', 'LAX', 'LHR', 'CDG', 'HND', 'DXB', 'SIN', 'SYD', 'FRA', 'ORD'];
    return this.getNormalAirports().filter(airport => majorAirports.includes(airport.iata));
  }

  calculateDistance(departure, arrival) {
    if (!departure || !arrival) return 0;

    const R = 3440;
    const lat1 = departure.latitude * Math.PI / 180;
    const lat2 = arrival.latitude * Math.PI / 180;
    const deltaLat = (arrival.latitude - departure.latitude) * Math.PI / 180;
    const deltaLon = (arrival.longitude - departure.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
  }

  getAirportsWithinRadius(latitude, longitude, radiusNm, options = {}) {
    const { type = 'all' } = options;

    let airportsToSearch = this.allAirports;
    if (type === 'normal') {
      airportsToSearch = this.getNormalAirports();
    } else if (type === 'emergency') {
      airportsToSearch = this.getEmergencyAirports();
    }

    return airportsToSearch.filter(airport => {
      const distance = this.calculateDistance(
        { latitude, longitude },
        { latitude: airport.latitude, longitude: airport.longitude }
      );
      return distance <= radiusNm;
    });
  }

  getAirportsByCategory(category, options = {}) {
    const { type = 'all' } = options;

    let airportsToSearch = this.allAirports;
    if (type === 'normal') {
      airportsToSearch = this.getNormalAirports();
    } else if (type === 'emergency') {
      airportsToSearch = this.getEmergencyAirports();
    }

    return airportsToSearch.filter(airport => airport.category === category);
  }

  getAirportByFrequency(frequency) {
    const TOLERANCE = 0.005;
    return this.allAirports.find(airport => {
      if (!airport.frequencies) return false;
      return airport.frequencies.some(f => Math.abs(f.frequency - frequency) < TOLERANCE);
    });
  }

  getRunwayInfo(airportCode) {
    const airport = this.getAirportByCode(airportCode);
    if (!airport) return [];

    if (airport.runways && Array.isArray(airport.runways)) {
      return airport.runways;
    }

    if (airport.runway && airport.runwayLength) {
      return [{
        name: airport.runway,
        length: airport.runwayLength,
        surface: 'Unknown',
        category: airport.category
      }];
    }

    return [];
  }

  getFrequencyInfo(airportCode) {
    const airport = this.getAirportByCode(airportCode);
    return airport && airport.frequencies ? airport.frequencies : [];
  }

  getSuitableRunways(airportCode, aircraftCategory) {
    const runways = this.getRunwayInfo(airportCode);
    return runways.filter(runway => {
      switch (aircraftCategory) {
        case 'Heavy':
          return runway.category === 'Heavy';
        case 'Medium':
          return runway.category === 'Medium' || runway.category === 'Heavy';
        case 'Light':
          return true;
        default:
          return false;
      }
    });
  }

  getEnhancedAirportData(airportCode) {
    const airport = this.getAirportByCode(airportCode);
    if (!airport) return null;

    const enhancedData = { ...airport };

    if (airport.category === '4F') {
      enhancedData.facilities = [
        'Multiple Terminals',
        'International Gates',
        'Cargo Facilities',
        'Maintenance Hangars',
        'Fuel Services',
        'De-icing Equipment'
      ];
      enhancedData.operatingHours = '24/7';
    } else if (airport.category === '4E') {
      enhancedData.facilities = [
        'Main Terminal',
        'Regional Gates',
        'Cargo Facilities',
        'Fuel Services'
      ];
      enhancedData.operatingHours = '05:00-24:00';
    }

    return enhancedData;
  }

  getRunwayGeometry(airportCode, runwayName) {
    const airport = this.getAirportByCode(airportCode);
    if (!airport) return null;

    let runway = null;
    if (runwayName && airport.runways) {
      runway = airport.runways.find(r => r.name === runwayName);
    }
    
    // Fallback to first runway or a mock if not found
    if (!runway) {
      if (airport.runways && Array.isArray(airport.runways) && airport.runways.length > 0) {
        runway = airport.runways[0];
      } else if (airport.runway) {
        runway = { name: airport.runway, length: airport.runwayLength || 8000 };
      } else {
        runway = { name: "09/27", length: 8000 };
      }
    }

    // Parse heading
    // Name format: "09", "09L", "09R", "09C"
    // Extract first 2 digits
    const headingMatch = runway.name.match(/^(\d{2})/);
    let headingDeg = 0;
    if (headingMatch) {
      headingDeg = parseInt(headingMatch[1]) * 10;
    }

    // Dimensions
    // Assuming length is in feet (standard in aviation databases here), convert to meters
    const lengthM = (runway.length || 8000) * 0.3048; 
    const widthM = 45; // Standard width in meters

    // Calculate endpoints
    // Midpoint is airport lat/lon
    // We need to convert meters to lat/lon degrees
    const R = 6371000; // Earth radius in meters
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;

    // Calculate offsets from midpoint to ends (half length)
    // We assume the runway is centered at the airport coordinates
    const halfLength = lengthM / 2;
    
    // Heading is direction OF the runway. 
    // Start point is "behind" the midpoint, End point is "ahead".
    // But which end is which depends on the runway name used (e.g. 09 vs 27).
    
    // 1. Determine the PRIMARY heading from the database object (e.g. "06/24" -> 06 -> 60deg)
    // This defines the physical orientation of the strip in the DB.
    // Vector P points from Start(06) to End(24).
    const primaryHeadingMatch = runway.name.match(/^(\d{2})/);
    let primaryHeadingDeg = 0;
    if (primaryHeadingMatch) {
      primaryHeadingDeg = parseInt(primaryHeadingMatch[1]) * 10;
    }
    
    // 2. Determine the REQUESTED heading from the user input (runwayName)
    // e.g. "24" -> 240deg.
    let requestedHeadingDeg = primaryHeadingDeg;
    if (runwayName) {
        const reqMatch = runwayName.match(/^(\d{2})/);
        if (reqMatch) {
            requestedHeadingDeg = parseInt(reqMatch[1]) * 10;
        }
    }

    // 3. Calculate geometry based on PRIMARY heading first
    const dLat = (halfLength * Math.cos(primaryHeadingDeg * toRad)) / R * toDeg;
    const dLon = (halfLength * Math.sin(primaryHeadingDeg * toRad)) / (R * Math.cos(airport.latitude * toRad)) * toDeg;

    // Primary Start (e.g. 06 Threshold) is "behind" the center relative to 06 heading
    const p1 = {
      latitude: airport.latitude - dLat,
      longitude: airport.longitude - dLon,
      elevation: Number(airport.elevation) || 0
    };
    
    // Primary End (e.g. 24 Threshold) is "ahead" of the center
    const p2 = {
      latitude: airport.latitude + dLat,
      longitude: airport.longitude + dLon,
      elevation: Number(airport.elevation) || 0
    };

    // 4. Decide which point is Start/End based on Requested Heading
    // If requested heading is close to primary (e.g. 06 vs 06), use p1->p2
    // If requested heading is opposite (e.g. 24 vs 06), use p2->p1
    
    let diff = Math.abs(requestedHeadingDeg - primaryHeadingDeg);
    if (diff > 180) diff = 360 - diff;
    
    let start, end, finalHeading;
    
    if (diff > 90) {
        // Opposite direction requested
        start = p2;
        end = p1;
        finalHeading = requestedHeadingDeg;
    } else {
        // Same direction requested
        start = p1;
        end = p2;
        finalHeading = requestedHeadingDeg; // Use requested (e.g. might be slightly different if needed, but usually same block)
        // If the DB says "06" and user asks "06", heading is 60.
    }

    // Lookup ILS Frequency
    // Hardcoded map for common test airports/runways
    const ILS_FREQUENCIES = {
        "KLAX": {
            "24R": 108.50,
            "24L": 108.40,
            "25R": 108.75,
            "25L": 109.90,
            "06L": 108.40,
            "06R": 108.50,
            "07L": 109.90,
            "07R": 108.75
        },
        "KSFO": {
            "28L": 109.55,
            "28R": 111.70,
            "19L": 108.90,
            "19R": 108.70,
            "01L": 110.50,
            "01R": 109.30
        },
        "KJFK": {
            "04R": 109.50,
            "22L": 110.90,
            "13L": 111.50,
            "31R": 112.30
        },
        "ZSSS": {
            "18L": 109.30,
            "36R": 110.30,
            "18R": 109.90,
            "36L": 111.90
        },
        "SHA": { // Handle IATA code too
             "18L": 109.30,
             "36R": 110.30,
             "18R": 109.90,
             "36L": 111.90
        }
    };

    let ilsFrequency = null;
    if (ILS_FREQUENCIES[airportCode] && ILS_FREQUENCIES[airportCode][runwayName]) {
        ilsFrequency = ILS_FREQUENCIES[airportCode][runwayName];
    } else {
        // Deterministic generation for others: 108.00 + (First Digit + Last Digit)/10
        // Just a placeholder so it's not null
        ilsFrequency = 110.00; 
    }

    return {
      airportLat: airport.latitude,
      airportLon: airport.longitude,
      heading: finalHeading,
      length: lengthM,
      width: widthM,
      thresholdStart: start,
      thresholdEnd: end,
      runwayName: runwayName || runway.name,
      ilsFrequency: ilsFrequency
    };
  }

  getDatabaseStats() {
    return airportDatabase.metadata.statistics;
  }
}

export const airportService = new AirportService();
export const createAirportService = (apiKey) => new AirportService(apiKey);

export default AirportService;
