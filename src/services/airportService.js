// Airport Service for Ultimate Crash Simulation
// Enhanced with detailed runway data, frequencies, and aircraft performance

class AirportService {
  constructor() {
    // Free tier API key (you can replace with your own)
    this.apiKey = 'your_aviationstack_api_key_here';
    this.baseUrl = 'http://api.aviationstack.com/v1';
    
    // Cache for airport data to reduce API calls
    this.airportCache = new Map();
    
    // Enhanced fallback data with detailed runway and frequency information
    this.fallbackAirports = this.getEnhancedFallbackAirportData();
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

  // Enhanced airport search with detailed data
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
            timezone: airport.timezone,
            elevation: airport.elevation || 0,
            // Enhanced data structure
            runways: this.getRunwayData(airport.iata_code || airport.icao_code),
            frequencies: this.getFrequencyData(airport.iata_code || airport.icao_code),
            taxiwayMap: 'n/a', // Placeholder - would require complex graph data
            category: this.getAirportCategory(airport)
          }));
          
          // Cache the results
          this.airportCache.set(query.toLowerCase(), airports);
          return airports;
        }
      }
      
      // Fallback to enhanced local data if API fails
      return this.searchEnhancedFallbackAirports(query);
      
    } catch (error) {
      console.warn('API call failed, using enhanced fallback data:', error);
      return this.searchEnhancedFallbackAirports(query);
    }
  }

  // Get detailed runway data for airport
  getRunwayData(airportCode) {
    const runwayData = {
      // Major international airports with detailed runway information
      'JFK': [
        { number: '04L/22R', length: 3689, surface: 'Asphalt', category: 'Heavy' },
        { number: '04R/22L', length: 2560, surface: 'Asphalt', category: 'Heavy' },
        { number: '13L/31R', length: 3048, surface: 'Asphalt', category: 'Heavy' },
        { number: '13R/31L', length: 4423, surface: 'Asphalt', category: 'Heavy' }
      ],
      'LAX': [
        { number: '06L/24R', length: 2721, surface: 'Concrete', category: 'Heavy' },
        { number: '06R/24L', length: 3383, surface: 'Concrete', category: 'Heavy' },
        { number: '07L/25R', length: 3810, surface: 'Concrete', category: 'Heavy' },
        { number: '07R/25L', length: 3383, surface: 'Concrete', category: 'Heavy' }
      ],
      'LHR': [
        { number: '09L/27R', length: 3902, surface: 'Asphalt', category: 'Heavy' },
        { number: '09R/27L', length: 3660, surface: 'Asphalt', category: 'Heavy' }
      ],
      'CDG': [
        { number: '08L/26R', length: 4215, surface: 'Asphalt', category: 'Heavy' },
        { number: '08R/26L', length: 2700, surface: 'Asphalt', category: 'Medium' },
        { number: '09L/27R', length: 2700, surface: 'Asphalt', category: 'Medium' }
      ],
      'HND': [
        { number: '04/22', length: 3000, surface: 'Asphalt', category: 'Heavy' },
        { number: '05/23', length: 2500, surface: 'Asphalt', category: 'Medium' }
      ],
      'DXB': [
        { number: '12L/30R', length: 4000, surface: 'Asphalt', category: 'Heavy' },
        { number: '12R/30L', length: 4450, surface: 'Asphalt', category: 'Heavy' }
      ]
    };

    return runwayData[airportCode] || [
      { number: 'n/a', length: 0, surface: 'Unknown', category: 'Unknown' }
    ];
  }

  // Get radio frequency data for airport
  getFrequencyData(airportCode) {
    const frequencyData = {
      'JFK': [
        { type: 'ATIS', frequency: '127.65', description: 'Automatic Terminal Information Service' },
        { type: 'Ground', frequency: '121.90', description: 'Ground Control' },
        { type: 'Tower', frequency: '119.10', description: 'Tower Control' },
        { type: 'Approach', frequency: '124.30', description: 'Approach Control' },
        { type: 'Clearance', frequency: '121.30', description: 'Clearance Delivery' }
      ],
      'LAX': [
        { type: 'ATIS', frequency: '135.25', description: 'Automatic Terminal Information Service' },
        { type: 'Ground', frequency: '121.65', description: 'Ground Control' },
        { type: 'Tower', frequency: '120.95', description: 'Tower Control' },
        { type: 'Approach', frequency: '124.70', description: 'Approach Control' }
      ],
      'LHR': [
        { type: 'ATIS', frequency: '127.25', description: 'Automatic Terminal Information Service' },
        { type: 'Ground', frequency: '121.70', description: 'Ground Control' },
        { type: 'Tower', frequency: '118.50', description: 'Tower Control' },
        { type: 'Approach', frequency: '119.72', description: 'Approach Control' }
      ],
      'CDG': [
        { type: 'ATIS', frequency: '127.85', description: 'Automatic Terminal Information Service' },
        { type: 'Ground', frequency: '121.80', description: 'Ground Control' },
        { type: 'Tower', frequency: '118.10', description: 'Tower Control' }
      ]
    };

    return frequencyData[airportCode] || [
      { type: 'ATIS', frequency: 'n/a', description: 'Frequency data not available' }
    ];
  }

  // Determine airport category based on runway data
  getAirportCategory(airport) {
    const runways = this.getRunwayData(airport.iata_code || airport.icao_code);
    const longestRunway = Math.max(...runways.map(r => r.length));
    
    if (longestRunway >= 3000) return '4F';
    if (longestRunway >= 2400) return '4E';
    if (longestRunway >= 1800) return '4D';
    if (longestRunway >= 1200) return '4C';
    return '3C';
  }

  // Enhanced fallback airport data with detailed information
  getEnhancedFallbackAirportData() {
    return [
      // North America
      { 
        iata: 'JFK', icao: 'KJFK', name: 'John F Kennedy International Airport', 
        city: 'New York', country: 'United States', 
        latitude: 40.639751, longitude: -73.778925, timezone: 'America/New_York',
        elevation: 4, runways: this.getRunwayData('JFK'), frequencies: this.getFrequencyData('JFK'),
        taxiwayMap: 'n/a', category: '4F'
      },
      { 
        iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International Airport', 
        city: 'Los Angeles', country: 'United States', 
        latitude: 33.942536, longitude: -118.408075, timezone: 'America/Los_Angeles',
        elevation: 38, runways: this.getRunwayData('LAX'), frequencies: this.getFrequencyData('LAX'),
        taxiwayMap: 'n/a', category: '4F'
      },
      { 
        iata: 'ORD', icao: 'KORD', name: "Chicago O'Hare International Airport", 
        city: 'Chicago', country: 'United States', 
        latitude: 41.978603, longitude: -87.904842, timezone: 'America/Chicago',
        elevation: 204, runways: this.getRunwayData('ORD'), frequencies: this.getFrequencyData('ORD'),
        taxiwayMap: 'n/a', category: '4F'
      },
      
      // Europe
      { 
        iata: 'LHR', icao: 'EGLL', name: 'London Heathrow Airport', 
        city: 'London', country: 'United Kingdom', 
        latitude: 51.470022, longitude: -0.454295, timezone: 'Europe/London',
        elevation: 25, runways: this.getRunwayData('LHR'), frequencies: this.getFrequencyData('LHR'),
        taxiwayMap: 'n/a', category: '4F'
      },
      { 
        iata: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle Airport', 
        city: 'Paris', country: 'France', 
        latitude: 49.012779, longitude: 2.55, timezone: 'Europe/Paris',
        elevation: 119, runways: this.getRunwayData('CDG'), frequencies: this.getFrequencyData('CDG'),
        taxiwayMap: 'n/a', category: '4F'
      },
      
      // Asia
      { 
        iata: 'HND', icao: 'RJTT', name: 'Tokyo Haneda Airport', 
        city: 'Tokyo', country: 'Japan', 
        latitude: 35.552258, longitude: 139.779694, timezone: 'Asia/Tokyo',
        elevation: 6, runways: this.getRunwayData('HND'), frequencies: this.getFrequencyData('HND'),
        taxiwayMap: 'n/a', category: '4F'
      },
      { 
        iata: 'DXB', icao: 'OMDB', name: 'Dubai International Airport', 
        city: 'Dubai', country: 'United Arab Emirates', 
        latitude: 25.252778, longitude: 55.364444, timezone: 'Asia/Dubai',
        elevation: 19, runways: this.getRunwayData('DXB'), frequencies: this.getFrequencyData('DXB'),
        taxiwayMap: 'n/a', category: '4F'
      }
    ];
  }

  // Enhanced fallback search
  searchEnhancedFallbackAirports(query) {
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
    return this.fallbackAirports.slice(0, 20);
  }

  // Get airport by IATA code with enhanced data
  async getAirportByIATA(iataCode) {
    const airports = await this.searchAirports(iataCode);
    return airports.find(airport => airport.iata === iataCode.toUpperCase());
  }

  // Get airport by ICAO code with enhanced data
  async getAirportByICAO(icaoCode) {
    const airports = await this.searchAirports(icaoCode);
    return airports.find(airport => airport.icao === icaoCode.toUpperCase());
  }

  // Calculate distance between two airports with enhanced data
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
        units: 'nautical miles',
        runwayInfo: {
          departure: departureAirport.runways,
          arrival: arrivalAirport.runways
        },
        frequencyInfo: {
          departure: departureAirport.frequencies,
          arrival: arrivalAirport.frequencies
        }
      };
      
    } catch (error) {
      console.error('Error calculating distance:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const airportService = new AirportService();

export default AirportService;