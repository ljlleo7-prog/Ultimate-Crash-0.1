// Aircraft Service for Ultimate Crash Simulation
// Provides aircraft-specific performance data for fuel calculations

class AircraftService {
  constructor() {
    // Comprehensive aircraft database with performance metrics
    this.aircraftDatabase = this.getAircraftDatabase();
  }

  // Comprehensive aircraft performance database
  getAircraftDatabase() {
    return [
      // Narrow-body jets
      {
        model: 'Boeing 737-800',
        type: 'Narrow-body',
        manufacturer: 'Boeing',
        iata: '738',
        icao: 'B738',
        maxRange: 5430, // nautical miles
        cruiseSpeed: 450, // knots
        fuelConsumption: 2200, // kg/hour at cruise
        maxFuelCapacity: 26020, // kg
        maxPayload: 18900, // kg
        maxPassengers: 189,
        typicalFuelBurn: 2.4, // kg/nautical mile
        takeoffDistance: 2400, // meters
        landingDistance: 1600, // meters
        engineType: 'CFM56-7B',
        engineCount: 2,
        category: 'Medium-haul'
      },
      {
        model: 'Airbus A320-200',
        type: 'Narrow-body',
        manufacturer: 'Airbus',
        iata: '320',
        icao: 'A320',
        maxRange: 3300,
        cruiseSpeed: 447,
        fuelConsumption: 2100,
        maxFuelCapacity: 23800,
        maxPayload: 16500,
        maxPassengers: 180,
        typicalFuelBurn: 2.3,
        takeoffDistance: 2300,
        landingDistance: 1500,
        engineType: 'CFM56-5A/5B',
        engineCount: 2,
        category: 'Medium-haul'
      },
      
      // Wide-body jets
      {
        model: 'Boeing 777-300ER',
        type: 'Wide-body',
        manufacturer: 'Boeing',
        iata: '77W',
        icao: 'B77W',
        maxRange: 7930,
        cruiseSpeed: 485,
        fuelConsumption: 7500,
        maxFuelCapacity: 181280,
        maxPayload: 69850,
        maxPassengers: 396,
        typicalFuelBurn: 3.8,
        takeoffDistance: 3200,
        landingDistance: 1800,
        engineType: 'GE90-115B',
        engineCount: 2,
        category: 'Long-haul'
      },
      {
        model: 'Airbus A350-900',
        type: 'Wide-body',
        manufacturer: 'Airbus',
        iata: '359',
        icao: 'A359',
        maxRange: 8100,
        cruiseSpeed: 488,
        fuelConsumption: 5800,
        maxFuelCapacity: 141000,
        maxPayload: 53500,
        maxPassengers: 325,
        typicalFuelBurn: 2.9,
        takeoffDistance: 2800,
        landingDistance: 1600,
        engineType: 'Rolls-Royce Trent XWB',
        engineCount: 2,
        category: 'Long-haul'
      },
      
      // Regional jets
      {
        model: 'Embraer E190',
        type: 'Regional',
        manufacturer: 'Embraer',
        iata: 'E90',
        icao: 'E190',
        maxRange: 2400,
        cruiseSpeed: 447,
        fuelConsumption: 1500,
        maxFuelCapacity: 12800,
        maxPayload: 10800,
        maxPassengers: 114,
        typicalFuelBurn: 1.9,
        takeoffDistance: 1800,
        landingDistance: 1200,
        engineType: 'GE CF34-10E',
        engineCount: 2,
        category: 'Regional'
      },
      
      // Business jets
      {
        model: 'Cessna Citation X',
        type: 'Business',
        manufacturer: 'Cessna',
        iata: 'CEX',
        icao: 'C750',
        maxRange: 3430,
        cruiseSpeed: 528,
        fuelConsumption: 950,
        maxFuelCapacity: 6800,
        maxPayload: 1200,
        maxPassengers: 12,
        typicalFuelBurn: 0.8,
        takeoffDistance: 1600,
        landingDistance: 900,
        engineType: 'Rolls-Royce AE3007C',
        engineCount: 2,
        category: 'Business'
      },
      
      // Additional aircraft models
      {
        model: 'Boeing 747-400',
        type: 'Wide-body',
        manufacturer: 'Boeing',
        iata: '744',
        icao: 'B744',
        maxRange: 7260,
        cruiseSpeed: 475,
        fuelConsumption: 11000,
        maxFuelCapacity: 216840,
        maxPayload: 112760,
        maxPassengers: 416,
        typicalFuelBurn: 4.8,
        takeoffDistance: 3300,
        landingDistance: 2100,
        engineType: 'PW4000/CF6-80C2/RB211-524',
        engineCount: 4,
        category: 'Long-haul'
      },
      {
        model: 'Airbus A380-800',
        type: 'Wide-body',
        manufacturer: 'Airbus',
        iata: '388',
        icao: 'A388',
        maxRange: 8200,
        cruiseSpeed: 488,
        fuelConsumption: 13000,
        maxFuelCapacity: 323546,
        maxPayload: 152400,
        maxPassengers: 853,
        typicalFuelBurn: 5.1,
        takeoffDistance: 2900,
        landingDistance: 2000,
        engineType: 'Trent 900/GP7200',
        engineCount: 4,
        category: 'Long-haul'
      }
    ];
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

  // Calculate fuel requirements for a specific flight
  calculateFuelRequirements(aircraftModel, distance, payload, reserves = 0.1) {
    const aircraft = this.getAircraftByModel(aircraftModel);
    if (!aircraft) {
      throw new Error(`Aircraft model '${aircraftModel}' not found`);
    }

    // Basic fuel calculation based on distance and typical fuel burn
    const baseFuel = distance * aircraft.typicalFuelBurn;
    
    // Adjust for payload (higher payload = more fuel)
    const payloadFactor = Math.min(payload / aircraft.maxPayload, 1.2);
    const adjustedFuel = baseFuel * payloadFactor;
    
    // Add reserves (10% by default)
    const totalFuel = adjustedFuel * (1 + reserves);
    
    // Ensure fuel doesn't exceed maximum capacity
    const finalFuel = Math.min(totalFuel, aircraft.maxFuelCapacity);

    return {
      aircraft: aircraft.model,
      distance: distance,
      baseFuel: Math.round(baseFuel),
      payloadFactor: Math.round(payloadFactor * 100) / 100,
      adjustedFuel: Math.round(adjustedFuel),
      reserveFuel: Math.round(adjustedFuel * reserves),
      totalFuel: Math.round(finalFuel),
      maxFuelCapacity: aircraft.maxFuelCapacity,
      fuelSufficient: finalFuel <= aircraft.maxFuelCapacity,
      flightTime: Math.round((distance / aircraft.cruiseSpeed) * 60), // minutes
      units: 'kg'
    };
  }

  // Calculate flight performance metrics
  calculateFlightPerformance(aircraftModel, distance, payload) {
    const aircraft = this.getAircraftByModel(aircraftModel);
    if (!aircraft) {
      throw new Error(`Aircraft model '${aircraftModel}' not found`);
    }

    const fuelRequirements = this.calculateFuelRequirements(aircraftModel, distance, payload);
    
    return {
      aircraft: aircraft,
      fuel: fuelRequirements,
      performance: {
        rangeSufficient: distance <= aircraft.maxRange,
        payloadSufficient: payload <= aircraft.maxPayload,
        takeoffDistance: aircraft.takeoffDistance,
        landingDistance: aircraft.landingDistance,
        cruiseSpeed: aircraft.cruiseSpeed,
        estimatedFlightTime: fuelRequirements.flightTime,
        fuelEfficiency: aircraft.typicalFuelBurn // kg/nm
      }
    };
  }

  // Get aircraft by category
  getAircraftByCategory(category) {
    return this.aircraftDatabase.filter(aircraft => 
      aircraft.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Get all aircraft manufacturers
  getManufacturers() {
    return [...new Set(this.aircraftDatabase.map(aircraft => aircraft.manufacturer))];
  }

  // Get popular aircraft models (most common)
  getPopularAircraft() {
    const popularModels = ['Boeing 737-800', 'Airbus A320-200', 'Boeing 777-300ER', 'Airbus A350-900'];
    return this.aircraftDatabase.filter(aircraft => 
      popularModels.includes(aircraft.model)
    );
  }

  // Validate if aircraft can operate a specific route
  validateRoute(aircraftModel, distance, payload) {
    const performance = this.calculateFlightPerformance(aircraftModel, distance, payload);
    
    return {
      valid: performance.fuel.fuelSufficient && 
              performance.performance.rangeSufficient &&
              performance.performance.payloadSufficient,
      issues: [
        !performance.fuel.fuelSufficient ? 'Insufficient fuel capacity' : null,
        !performance.performance.rangeSufficient ? 'Exceeds maximum range' : null,
        !performance.performance.payloadSufficient ? 'Exceeds maximum payload' : null
      ].filter(Boolean),
      performance: performance
    };
  }
}

// Create singleton instance
export const aircraftService = new AircraftService();

export default AircraftService;