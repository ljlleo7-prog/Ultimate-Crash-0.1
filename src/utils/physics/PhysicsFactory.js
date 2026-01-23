
import RealisticFlightPhysicsService from '../../services/RealisticFlightPhysicsService.js';
import { airportService } from '../../services/airportService.js';

export const createPhysicsService = (config, aircraftDatabase) => {
    let selectedAircraft = null;
    if (aircraftDatabase && Array.isArray(aircraftDatabase) && aircraftDatabase.length > 0) {
        if (config && (config.aircraftModel || config.model)) {
            const targetModel = config.aircraftModel || config.model;
            selectedAircraft = aircraftDatabase.find(a => a.model === targetModel) || aircraftDatabase[0];
            
            if (selectedAircraft && !selectedAircraft.maxThrustPerEngine) {
                 const dbMatch = aircraftDatabase.find(a => a.model === selectedAircraft.model);
                 if (dbMatch) {
                     selectedAircraft = { ...selectedAircraft, ...dbMatch };
                 }
            }
        } else {
            selectedAircraft = aircraftDatabase[0];
        }
    }

    const defaultAircraft = selectedAircraft 
        ? selectedAircraft 
        : {
            name: 'Boeing 737-800',
            mass: 41410,
            maxThrustPerEngine: 120000,
            engineCount: 2,
            emptyWeight: 41410,
            fuelWeight: 21800,
            payloadWeight: 8000,
            wingArea: 124.6,
            liftCurveSlope: 5.7,
            maxLiftCoefficient: 1.4,
            dragPolar: { cd0: 0.02, k: 0.04 },
            maxThrust: 170000,
            engineConfiguration: 'twin'
        };
    let finalAircraft = { ...defaultAircraft };

    if (config) {
        if (typeof config.fuelWeight === 'number' && !isNaN(config.fuelWeight) && config.fuelWeight > 0) {
            finalAircraft.fuelWeight = config.fuelWeight;
        }
        if (typeof config.payloadWeight === 'number' && !isNaN(config.payloadWeight) && config.payloadWeight >= 0) {
            finalAircraft.payloadWeight = config.payloadWeight;
        }
        if (typeof config.cruiseHeight === 'number' && !isNaN(config.cruiseHeight) && config.cruiseHeight > 0) {
            finalAircraft.initialCruiseAltitudeFt = config.cruiseHeight;
        }
        if (typeof config.windSpeedKts === 'number' && !isNaN(config.windSpeedKts)) {
            finalAircraft.windSpeedKts = config.windSpeedKts;
        }
        if (typeof config.maxThrustPerEngine === 'number' && !isNaN(config.maxThrustPerEngine) && config.maxThrustPerEngine > 0) {
            finalAircraft.maxThrustPerEngine = config.maxThrustPerEngine;
        }
        if (typeof config.airportElevation === 'number' && !isNaN(config.airportElevation)) {
            finalAircraft.airportElevation = config.airportElevation;
        }
    }

    console.log('🎮 PhysicsFactory: DEFAULT AIRCRAFT DATA:', {
        name: finalAircraft.name || 'Unknown Aircraft',
        mass: finalAircraft.mass || 0,
        thrust: finalAircraft.maxThrustPerEngine || 0
    });
    
    const { initialLatitude, initialLongitude } = config;

    const service = new RealisticFlightPhysicsService(finalAircraft, initialLatitude, initialLongitude);
    
    // Apply initial conditions from config
    if (service && typeof service.setInitialConditions === 'function') {
       const headingRad = (config.initialHeading || 0) * Math.PI / 180;
       
       service.setInitialConditions({
           latitude: initialLatitude,
           longitude: initialLongitude,
           orientation: {
               psi: headingRad,
               theta: 0,
               phi: 0
           },
           flightPlan: config.flightPlan,
           difficulty: config.difficulty,
           failureType: config.failureType
       });
    }
    
    // Runway Geometry Logic
    let targetAirport = config.departure?.iata || config.departure?.icao || config.flightPlan?.departure?.iata || config.flightPlan?.departure;
    let runwayName = config.departureRunway || config.flightPlan?.departureRunway;

    const arrCode = config.arrival?.iata || config.arrival?.icao || config.flightPlan?.arrival?.iata || config.flightPlan?.arrival;
    
    if (targetAirport && arrCode && initialLatitude && initialLongitude) {
        const dep = airportService.getAirportByCode(targetAirport);
        const arr = airportService.getAirportByCode(arrCode);
        
        if (dep && arr) {
            const distToDep = Math.sqrt(Math.pow(dep.latitude - initialLatitude, 2) + Math.pow(dep.longitude - initialLongitude, 2));
            const distToArr = Math.sqrt(Math.pow(arr.latitude - initialLatitude, 2) + Math.pow(arr.longitude - initialLongitude, 2));
            
            if (distToArr < distToDep) {
                targetAirport = arrCode;
                runwayName = config.arrivalRunway || config.flightPlan?.arrivalRunway;
            }
        }
    } else if (!targetAirport && arrCode) {
        targetAirport = arrCode;
        runwayName = config.arrivalRunway || config.flightPlan?.arrivalRunway;
    }

    if (!targetAirport && initialLatitude && initialLongitude) {
        const nearby = airportService.getAirportsWithinRadius(initialLatitude, initialLongitude, 20); 
        if (nearby && nearby.length > 0) {
             nearby.sort((a, b) => {
                 const distA = Math.pow(a.latitude - initialLatitude, 2) + Math.pow(a.longitude - initialLongitude, 2);
                 const distB = Math.pow(b.latitude - initialLatitude, 2) + Math.pow(b.longitude - initialLongitude, 2);
                 return distA - distB;
             });
             targetAirport = nearby[0].iata || nearby[0].icao;
             console.log(`🎮 PhysicsFactory: Auto-detected nearest airport: ${targetAirport}`);
        }
    }

    if (targetAirport) {
        const geometry = airportService.getRunwayGeometry(targetAirport, runwayName);
        if (geometry) {
            service.setRunwayGeometry(geometry);
        }
    }
    
    return service;
};
