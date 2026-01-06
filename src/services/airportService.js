// Airport Service for Ultimate Crash Simulation
// Uses Aviationstack API for real-time airport data

class AirportService {
  constructor() {
    // Free tier API key (you can replace with your own)
    this.apiKey = 'your_aviationstack_api_key_here';
    this.baseUrl = 'http://api.aviationstack.com/v1';
    
    // Cache for airport data to reduce API calls
    this.airportCache = new Map();
    
    // Fallback data for major airports (in case API is unavailable)
    this.fallbackAirports = this.getFallbackAirportData();
  }

  // Haversine formula to calculate distance between two coordinates in nautical miles
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Search airports by IATA code, ICAO code, or name
  async searchAirports(query) {
    try {
      // Check cache first
      if (this.airportCache.has(query.toLowerCase())) {
        return this.airportCache.get(query.toLowerCase());
      }

      // Try API call first
      const response = await fetch(
        `${this.baseUrl}/airports?access_key=${this.apiKey}&search=${encodeURIComponent(query)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const airports = data.data.map(airport => ({
            iata: airport.iata_code,
            icao: airport.icao_code,
            name: airport.airport_name,
            city: airport.city_name,
            country: airport.country_name,
            latitude: parseFloat(airport.latitude),
            longitude: parseFloat(airport.longitude),
            timezone: airport.timezone
          }));
          
          // Cache the results
          this.airportCache.set(query.toLowerCase(), airports);
          return airports;
        }
      }
      
      // Fallback to local data if API fails
      return this.searchFallbackAirports(query);
      
    } catch (error) {
      console.warn('API call failed, using fallback data:', error);
      return this.searchFallbackAirports(query);
    }
  }

  // Get airport by IATA code
  async getAirportByIATA(iataCode) {
    const airports = await this.searchAirports(iataCode);
    return airports.find(airport => airport.iata === iataCode.toUpperCase());
  }

  // Get airport by ICAO code
  async getAirportByICAO(icaoCode) {
    const airports = await this.searchAirports(icaoCode);
    return airports.find(airport => airport.icao === icaoCode.toUpperCase());
  }

  // Calculate distance between two airports
  async calculateAirportDistance(departureCode, arrivalCode) {
    try {
      const departureAirport = await this.getAirportByIATA(departureCode) || 
                              await this.getAirportByICAO(departureCode);
      
      const arrivalAirport = await this.getAirportByIATA(arrivalCode) || 
                            await this.getAirportByICAO(arrivalCode);
      
      if (!departureAirport || !arrivalAirport) {
        throw new Error('One or both airports not found');
      }

      const distance = this.calculateDistance(
        departureAirport.latitude,
        departureAirport.longitude,
        arrivalAirport.latitude,
        arrivalAirport.longitude
      );

      return {
        distance: distance,
        departure: departureAirport,
        arrival: arrivalAirport,
        units: 'nautical miles'
      };
      
    } catch (error) {
      console.error('Error calculating distance:', error);
      throw error;
    }
  }

  // Fallback airport data for major international airports
  getFallbackAirportData() {
    return [
      // North America
      { iata: 'JFK', icao: 'KJFK', name: 'John F Kennedy International Airport', city: 'New York', country: 'United States', latitude: 40.639751, longitude: -73.778925, timezone: 'America/New_York' },
      { iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', latitude: 33.942536, longitude: -118.408075, timezone: 'America/Los_Angeles' },
      { iata: 'ORD', icao: 'KORD', name: "Chicago O'Hare International Airport", city: 'Chicago', country: 'United States', latitude: 41.978603, longitude: -87.904842, timezone: 'America/Chicago' },
      { iata: 'DFW', icao: 'KDFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States', latitude: 32.896828, longitude: -97.037997, timezone: 'America/Chicago' },
      { iata: 'DEN', icao: 'KDEN', name: 'Denver International Airport', city: 'Denver', country: 'United States', latitude: 39.861656, longitude: -104.673178, timezone: 'America/Denver' },
      { iata: 'SFO', icao: 'KSFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', latitude: 37.618972, longitude: -122.374889, timezone: 'America/Los_Angeles' },
      { iata: 'SEA', icao: 'KSEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States', latitude: 47.449, longitude: -122.309306, timezone: 'America/Los_Angeles' },
      { iata: 'MIA', icao: 'KMIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', latitude: 25.79325, longitude: -80.290556, timezone: 'America/New_York' },
      { iata: 'ATL', icao: 'KATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', latitude: 33.636719, longitude: -84.428067, timezone: 'America/New_York' },
      
      // Europe
      { iata: 'LHR', icao: 'EGLL', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', latitude: 51.470022, longitude: -0.454295, timezone: 'Europe/London' },
      { iata: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', latitude: 49.012779, longitude: 2.55, timezone: 'Europe/Paris' },
      { iata: 'FRA', icao: 'EDDF', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', latitude: 50.033333, longitude: 8.570556, timezone: 'Europe/Berlin' },
      { iata: 'AMS', icao: 'EHAM', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', latitude: 52.308613, longitude: 4.763889, timezone: 'Europe/Amsterdam' },
      { iata: 'MAD', icao: 'LEMD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', latitude: 40.471926, longitude: -3.56264, timezone: 'Europe/Madrid' },
      { iata: 'FCO', icao: 'LIRF', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', latitude: 41.800278, longitude: 12.238889, timezone: 'Europe/Rome' },
      { iata: 'ZRH', icao: 'LSZH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', latitude: 47.464722, longitude: 8.549167, timezone: 'Europe/Zurich' },
      
      // Asia
      { iata: 'HND', icao: 'RJTT', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', latitude: 35.552258, longitude: 139.779694, timezone: 'Asia/Tokyo' },
      { iata: 'NRT', icao: 'RJAA', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', latitude: 35.764722, longitude: 140.386389, timezone: 'Asia/Tokyo' },
      { iata: 'PEK', icao: 'ZBAA', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', latitude: 40.080111, longitude: 116.584556, timezone: 'Asia/Shanghai' },
      { iata: 'PVG', icao: 'ZSPD', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China', latitude: 31.143378, longitude: 121.805214, timezone: 'Asia/Shanghai' },
      { iata: 'HKG', icao: 'VHHH', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'China', latitude: 22.308919, longitude: 113.914603, timezone: 'Asia/Hong_Kong' },
      { iata: 'SIN', icao: 'WSSS', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', latitude: 1.359211, longitude: 103.989333, timezone: 'Asia/Singapore' },
      { iata: 'BKK', icao: 'VTBS', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', latitude: 13.681108, longitude: 100.747283, timezone: 'Asia/Bangkok' },
      { iata: 'DXB', icao: 'OMDB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', latitude: 25.252778, longitude: 55.364444, timezone: 'Asia/Dubai' },
      
      // Oceania
      { iata: 'SYD', icao: 'YSSY', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', latitude: -33.946111, longitude: 151.177222, timezone: 'Australia/Sydney' },
      { iata: 'MEL', icao: 'YMML', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', latitude: -37.673333, longitude: 144.843333, timezone: 'Australia/Melbourne' },
      
      // South America
      { iata: 'GRU', icao: 'SBGR', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', latitude: -23.435556, longitude: -46.473056, timezone: 'America/Sao_Paulo' },
      { iata: 'EZE', icao: 'SAEZ', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', country: 'Argentina', latitude: -34.822222, longitude: -58.535833, timezone: 'America/Argentina/Buenos_Aires' }
    ];
  }

  // Search fallback airports
  searchFallbackAirports(query) {
    const searchTerm = query.toLowerCase();
    return this.fallbackAirports.filter(airport => 
      airport.iata.toLowerCase().includes(searchTerm) ||
      airport.icao.toLowerCase().includes(searchTerm) ||
      airport.name.toLowerCase().includes(searchTerm) ||
      airport.city.toLowerCase().includes(searchTerm)
    );
  }

  // Get popular airports for suggestions
  getPopularAirports() {
    return this.fallbackAirports.slice(0, 20); // Return top 20 popular airports
  }
}

// Create singleton instance
export const airportService = new AirportService();

export default AirportService;