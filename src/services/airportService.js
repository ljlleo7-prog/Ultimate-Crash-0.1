import airportData from '../data/airportDatabase.json';

class AirportService {
  constructor() {
    this.airports = airportData.airports;
  }

  // Get all airports
  getAllAirports() {
    return this.airports;
  }

  // Search airports by IATA, ICAO, name, or city
  searchAirports(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase();
    return this.airports.filter(airport => 
      airport.iata.toLowerCase().includes(searchTerm) ||
      airport.icao.toLowerCase().includes(searchTerm) ||
      airport.name.toLowerCase().includes(searchTerm) ||
      airport.city.toLowerCase().includes(searchTerm)
    );
  }

  // Get airport by IATA or ICAO code
  getAirportByCode(code) {
    return this.airports.find(airport => 
      airport.iata === code || airport.icao === code
    );
  }

  // Get popular airports (major international hubs)
  getPopularAirports() {
    const majorAirports = ['JFK', 'LAX', 'LHR', 'CDG', 'HND', 'DXB', 'SIN', 'SYD', 'FRA', 'ORD'];
    return this.airports.filter(airport => majorAirports.includes(airport.iata));
  }

  // Calculate distance between two airports in nautical miles
  calculateDistance(departure, arrival) {
    if (!departure || !arrival) return 0;
    
    const R = 3440; // Earth's radius in nautical miles
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

  // Get airports within a certain radius
  getAirportsWithinRadius(latitude, longitude, radiusNm) {
    return this.airports.filter(airport => {
      const distance = this.calculateDistance(
        { latitude, longitude },
        { latitude: airport.latitude, longitude: airport.longitude }
      );
      return distance <= radiusNm;
    });
  }

  // Get airports by category
  getAirportsByCategory(category) {
    return this.airports.filter(airport => airport.category === category);
  }

  // Get runway information for an airport
  getRunwayInfo(airportCode) {
    const airport = this.getAirportByCode(airportCode);
    return airport ? airport.runways : [];
  }

  // Get frequency information for an airport
  getFrequencyInfo(airportCode) {
    const airport = this.getAirportByCode(airportCode);
    return airport ? airport.frequencies : [];
  }

  // Get suitable runways for aircraft category
  getSuitableRunways(airportCode, aircraftCategory) {
    const runways = this.getRunwayInfo(airportCode);
    return runways.filter(runway => {
      switch (aircraftCategory) {
        case 'Heavy':
          return runway.category === 'Heavy';
        case 'Medium':
          return runway.category === 'Medium' || runway.category === 'Heavy';
        case 'Light':
          return true; // Light aircraft can use any runway
        default:
          return false;
      }
    });
  }

  // Enhanced fallback data for major airports
  getEnhancedAirportData(airportCode) {
    const airport = this.getAirportByCode(airportCode);
    if (!airport) return null;

    // Add additional metadata based on airport category
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
}

export const airportService = new AirportService();

export default AirportService;