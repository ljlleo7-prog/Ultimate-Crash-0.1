import airlinesData from '../data/airlinesDatabase.json';
import { airportService } from './airportService.js';
import aircraftService from './aircraftService.js';
import { calculateDistance } from '../utils/distanceCalculator.js';

class RandomFlightService {
  constructor() {
    this.airlines = airlinesData.airlines;
  }

  // Get random airline
  getRandomAirline() {
    return this.airlines[Math.floor(Math.random() * this.airlines.length)];
  }

  // Generate random callsign based on airline
  generateRandomCallsign(airline) {
    const flightNumber = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    return `${airline.iata}${flightNumber}`;
  }

  // Get random aircraft that can handle the distance
  async getRandomAircraftForDistance(distanceNauticalMiles) {
    const allAircraft = await aircraftService.getAllAircraft();
    const suitableAircraft = allAircraft.filter(aircraft => {
      const maxRange = aircraft.range || 0;
      // Add 20% safety margin for fuel reserves
      return maxRange >= distanceNauticalMiles * 1.2;
    });

    if (suitableAircraft.length === 0) {
      // If no aircraft can handle the distance, return the one with the longest range
      return allAircraft.reduce((max, aircraft) => 
        (aircraft.range || 0) > (max.range || 0) ? aircraft : max
      );
    }

    return suitableAircraft[Math.floor(Math.random() * suitableAircraft.length)];
  }

  // Get random airports with distance validation
  async getRandomAirports() {
    const allAirports = airportService.getAllAirports();
    
    // Try up to 10 times to find valid airports
    for (let attempt = 0; attempt < 10; attempt++) {
      const departureIndex = Math.floor(Math.random() * allAirports.length);
      const arrivalIndex = Math.floor(Math.random() * allAirports.length);
      
      if (departureIndex === arrivalIndex) continue;
      
      const departure = allAirports[departureIndex];
      const arrival = allAirports[arrivalIndex];
      
      // Calculate distance
      const distance = calculateDistance(
        departure.latitude, departure.longitude,
        arrival.latitude, arrival.longitude
      );
      
      // Validate distance (avoid very short flights and extremely long ones)
      if (distance.nauticalMiles >= 100 && distance.nauticalMiles <= 8000) {
        return { departure, arrival, distance };
      }
    }
    
    // Fallback: return two major airports with reasonable distance
    const majorAirports = allAirports.filter(airport => 
      airport.iata && ['JFK', 'LAX', 'LHR', 'CDG', 'DXB', 'HND', 'SYD', 'SFO'].includes(airport.iata)
    );
    
    if (majorAirports.length >= 2) {
      const departure = majorAirports[0];
      const arrival = majorAirports[1];
      const distance = calculateDistance(
        departure.latitude, departure.longitude,
        arrival.latitude, arrival.longitude
      );
      
      return { departure, arrival, distance };
    }
    
    // Final fallback
    return {
      departure: allAirports[0],
      arrival: allAirports[1],
      distance: calculateDistance(
        allAirports[0].latitude, allAirports[0].longitude,
        allAirports[1].latitude, allAirports[1].longitude
      )
    };
  }

  // Generate random flight parameters
  async generateRandomFlightParameters() {
    const airline = this.getRandomAirline();
    const callsign = this.generateRandomCallsign(airline);
    const { departure, arrival, distance } = await this.getRandomAirports();
    const aircraft = await this.getRandomAircraftForDistance(distance.nauticalMiles);
    
    // Calculate realistic payload based on aircraft capacity
    const maxPax = aircraft.passengers || 180;
    const pax = Math.floor(Math.random() * (maxPax * 0.8)) + Math.floor(maxPax * 0.2); // 20-100% capacity
    
    const payload = Math.floor(pax * 100) + Math.floor(Math.random() * 5000); // Base + cargo
    
    // Random flight parameters
    const fuelReserve = 0.1 + (Math.random() * 0.1); // 10-20% reserve
    const cruiseHeight = Math.floor(28000 + (Math.random() * 12000)); // 28,000-40,000 ft
    
    // Random time and season
    const useRandomTime = true;
    const useRandomSeason = true;
    
    // Random difficulty
    const difficulties = ['rookie', 'amateur', 'intermediate', 'advanced', 'expert'];
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    
    return {
      airline: airline.name,
      callsign,
      aircraftModel: aircraft.model,
      pax,
      payload,
      fuelReserve,
      cruiseHeight,
      useRandomTime,
      useRandomSeason,
      difficulty,
      selectedDeparture: departure,
      selectedArrival: arrival,
      distance: distance.nauticalMiles
    };
  }

  // Validate if aircraft can handle the route
  validateAircraftForRoute(aircraftModel, departure, arrival) {
    const aircraft = aircraftService.getAircraftByModel(aircraftModel);
    if (!aircraft) return false;
    
    const distance = calculateDistance(
      departure.latitude, departure.longitude,
      arrival.latitude, arrival.longitude
    );
    
    const maxRange = aircraft.range || 0;
    return maxRange >= distance.nauticalMiles * 1.2; // 20% safety margin
  }
}

export const randomFlightService = new RandomFlightService();