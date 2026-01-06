// Aircraft Service for Ultimate Crash Simulation
// Provides aircraft-specific performance data for fuel calculations

import aircraftData from '../data/aircraftDatabase.json';

class AircraftService {
  constructor() {
    // Comprehensive aircraft database with performance metrics
    this.aircraftDatabase = aircraftData.aircraft;
  }

  // Search aircraft by model, manufacturer, or code
  searchAircraft(query) {
    const searchTerm = query.toLowerCase();
    return this.aircraftDatabase.filter(aircraft =>
      aircraft.model.toLowerCase().includes(searchTerm) ||
      aircraft.manufacturer.toLowerCase().includes(searchTerm) ||
      aircraft.iata.toLowerCase().includes(searchTerm) ||
      aircraft.icao.toLowerCase().includes(searchTerm) ||
      aircraft.type.toLowerCase().includes(searchTerm)
    );
  }

  // Get aircraft by IATA code
  getAircraftByIATA(iataCode) {
    return this.aircraftDatabase.find(aircraft => aircraft.iata === iataCode.toUpperCase());
  }

  // Get aircraft by ICAO code
  getAircraftByICAO(icaoCode) {
    return this.aircraftDatabase.find(aircraft => aircraft.icao === icaoCode.toUpperCase());
  }

  // Get aircraft by model name
  getAircraftByModel(modelName) {
    return this.aircraftDatabase.find(aircraft => 
      aircraft.model.toLowerCase() === modelName.toLowerCase()
    );
  }

  // Get all aircraft models
  getAllAircraft() {
    return this.aircraftDatabase;
  }

  // Get aircraft by category
  getAircraftByCategory(category) {
    return this.aircraftDatabase.filter(aircraft => 
      aircraft.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Calculate fuel requirements for a flight
  calculateFuelRequirements(aircraftModel, distance, payload, fuelReserve = 0.05) {
    const aircraft = this.getAircraftByModel(aircraftModel);
    if (!aircraft) {
      throw new Error(`Aircraft model '${aircraftModel}' not found`);
    }

    // Calculate trip fuel based on typical fuel burn
    const tripFuel = aircraft.typicalFuelBurn * distance;
    
    // Calculate reserve fuel (5% by default)
    const reserveFuel = tripFuel * fuelReserve;
    
    // Calculate total fuel requirement
    const totalFuel = tripFuel + reserveFuel;
    
    // Check if fuel exceeds maximum capacity
    if (totalFuel > aircraft.maxFuelCapacity) {
      throw new Error(`Fuel requirement (${totalFuel.toFixed(0)} kg) exceeds maximum capacity (${aircraft.maxFuelCapacity} kg)`);
    }

    return {
      tripFuel: Math.round(tripFuel),
      reserveFuel: Math.round(reserveFuel),
      totalFuel: Math.round(totalFuel),
      maxCapacity: aircraft.maxFuelCapacity,
      fuelPercentage: Math.round((totalFuel / aircraft.maxFuelCapacity) * 100)
    };
  }

  // Calculate flight time
  calculateFlightTime(aircraftModel, distance) {
    const aircraft = this.getAircraftByModel(aircraftModel);
    if (!aircraft) {
      throw new Error(`Aircraft model '${aircraftModel}' not found`);
    }

    const flightTimeHours = distance / aircraft.cruiseSpeed;
    const hours = Math.floor(flightTimeHours);
    const minutes = Math.round((flightTimeHours - hours) * 60);

    return {
      hours,
      minutes,
      totalMinutes: Math.round(flightTimeHours * 60)
    };
  }

  // Check payload limits
  validatePayload(aircraftModel, payload) {
    const aircraft = this.getAircraftByModel(aircraftModel);
    if (!aircraft) {
      throw new Error(`Aircraft model '${aircraftModel}' not found`);
    }

    if (payload > aircraft.maxPayload) {
      throw new Error(`Payload (${payload} kg) exceeds maximum payload (${aircraft.maxPayload} kg)`);
    }

    return {
      isValid: payload <= aircraft.maxPayload,
      maxPayload: aircraft.maxPayload,
      remainingCapacity: aircraft.maxPayload - payload
    };
  }

  // Suggest suitable aircraft for a given distance
  suggestAircraftForDistance(distance, passengerCount = null) {
    return this.aircraftDatabase
      .filter(aircraft => aircraft.maxRange >= distance)
      .sort((a, b) => {
        // Prioritize aircraft that can handle the distance efficiently
        const aEfficiency = a.typicalFuelBurn * distance;
        const bEfficiency = b.typicalFuelBurn * distance;
        
        // If passenger count is provided, prioritize aircraft with sufficient capacity
        if (passengerCount) {
          const aCapacityDiff = Math.abs(a.maxPassengers - passengerCount);
          const bCapacityDiff = Math.abs(b.maxPassengers - passengerCount);
          
          if (aCapacityDiff !== bCapacityDiff) {
            return aCapacityDiff - bCapacityDiff;
          }
        }
        
        return aEfficiency - bEfficiency;
      });
  }

  // Get aircraft performance summary
  getPerformanceSummary(aircraftModel) {
    const aircraft = this.getAircraftByModel(aircraftModel);
    if (!aircraft) {
      throw new Error(`Aircraft model '${aircraftModel}' not found`);
    }

    return {
      model: aircraft.model,
      manufacturer: aircraft.manufacturer,
      type: aircraft.type,
      category: aircraft.category,
      maxRange: aircraft.maxRange,
      cruiseSpeed: aircraft.cruiseSpeed,
      fuelEfficiency: aircraft.typicalFuelBurn,
      maxPassengers: aircraft.maxPassengers,
      maxPayload: aircraft.maxPayload,
      takeoffDistance: aircraft.takeoffDistance,
      landingDistance: aircraft.landingDistance,
      engineType: aircraft.engineType,
      engineCount: aircraft.engineCount
    };
  }

  // Get popular aircraft models for suggestions
  getPopularAircraft() {
    const popularModels = [
      'Boeing 737-800',
      'Airbus A320-200', 
      'Boeing 777-300ER',
      'Airbus A350-900',
      'Embraer E190',
      'Cessna Citation X',
      'Boeing 747-400',
      'Airbus A380-800'
    ];
    
    return this.aircraftDatabase.filter(aircraft => 
      popularModels.includes(aircraft.model)
    );
  }
}

// Create singleton instance
const aircraftService = new AircraftService();

export { aircraftService };