import airportDatabase from '../data/airportDatabase.json';

class AirportService {
  constructor(apiKey = '') {
    this.allAirports = airportDatabase.airports;
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

  getDatabaseStats() {
    return airportDatabase.metadata.statistics;
  }
}

export const airportService = new AirportService();
export const createAirportService = (apiKey) => new AirportService(apiKey);

export default AirportService;
