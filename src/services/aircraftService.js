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

  // Calculate flight performance metrics
  calculateFlightPerformance(aircraftModel, distance, payload = 0) {
    const aircraft = this.getAircraftByModel(aircraftModel);
    if (!aircraft) {
      return null;
    }

    // Calculate fuel efficiency
    const fuelEfficiency = aircraft.typicalFuelBurn;
    const totalFuel = fuelEfficiency * distance;
    
    // Calculate range efficiency (how much of max range is used)
    const rangeEfficiency = (distance / aircraft.maxRange) * 100;
    
    // Calculate payload efficiency
    const payloadEfficiency = (payload / aircraft.maxPayload) * 100;
    
    // Calculate flight time
    const flightTimeHours = distance / aircraft.cruiseSpeed;
    
    // Performance rating based on multiple factors
    let performanceRating = 100;
    
    // Penalize for high range usage
    if (rangeEfficiency > 80) performanceRating -= 20;
    else if (rangeEfficiency > 60) performanceRating -= 10;
    
    // Penalize for high payload usage
    if (payloadEfficiency > 80) performanceRating -= 15;
    else if (payloadEfficiency > 60) performanceRating -= 5;
    
    // Bonus for fuel efficiency
    if (fuelEfficiency < 2.0) performanceRating += 10;
    else if (fuelEfficiency < 2.5) performanceRating += 5;
    
    performanceRating = Math.max(0, Math.min(100, performanceRating));

    return {
      performance: {
        rating: Math.round(performanceRating),
        rangeEfficiency: Math.round(rangeEfficiency),
        payloadEfficiency: Math.round(payloadEfficiency),
        fuelEfficiency: fuelEfficiency.toFixed(2),
        flightTime: Math.round(flightTimeHours * 60), // minutes
        totalFuel: Math.round(totalFuel),
        suitability: performanceRating >= 80 ? 'Excellent' : 
                     performanceRating >= 60 ? 'Good' : 
                     performanceRating >= 40 ? 'Fair' : 'Poor'
      }
    };
  }

  // Validate route feasibility
  validateRoute(aircraftModel, distance, payload = 0) {
    const aircraft = this.getAircraftByModel(aircraftModel);
    if (!aircraft) {
      return { isValid: false, errors: ['Aircraft not found'] };
    }

    const errors = [];
    
    // Check range
    if (distance > aircraft.maxRange) {
      errors.push(`Distance (${distance} NM) exceeds aircraft range (${aircraft.maxRange} NM)`);
    }
    
    // Check payload
    if (payload > aircraft.maxPayload) {
      errors.push(`Payload (${payload} kg) exceeds maximum (${aircraft.maxPayload} kg)`);
    }
    
    // Check fuel capacity
    const fuelRequired = aircraft.typicalFuelBurn * distance;
    if (fuelRequired > aircraft.maxFuelCapacity) {
      errors.push(`Fuel required (${Math.round(fuelRequired)} kg) exceeds capacity (${aircraft.maxFuelCapacity} kg)`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: errors.length > 0 ? ['Route may not be feasible'] : []
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
    // Return all available aircraft models instead of just 8
    return this.aircraftDatabase;
  }
}

// Create singleton instance
const aircraftService = new AircraftService();

export { aircraftService };