import { useState, useCallback, useEffect, useRef } from 'react';
import RealisticFlightPhysicsService from '../services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../services/aircraftService.js';
import { airportService } from '../services/airportService.js';

export function useAircraftPhysics(config = {}, autoStart = true, model = 'realistic') {
  console.log('🎮 useAircraftPhysics: HOOK CALLED', {
    config,
    autoStart,
    timestamp: new Date().toISOString()
  });

  const [flightData, setFlightData] = useState({
    altitude: 0,
    airspeed: 0,
    indicatedAirspeed: 0,
    verticalSpeed: 0,
    pitch: 0,
    roll: 0,
    heading: 0,
    throttle: 0,
    elevator: 0,
    aileron: 0,
    rudder: 0,
    lift: 0,
    drag: 0,
    thrust: 0,
    weight: 0,
    cg: { x: 0, y: 0, z: 0 },
    flapsPosition: 'up',
    airBrakesPosition: 'up',
    gearPosition: 'down',
    flapsValue: 0,
    airBrakesValue: 0,
    gearValue: true,
    frame: 0,
    systems: {}
  });

  const [physicsState, setPhysicsState] = useState({
    isRunning: false,
    lastUpdate: null,
    totalUpdates: 0
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [isCrashed, setIsCrashed] = useState(false);
  
  const physicsServiceRef = useRef(null);
  const currentControlsRef = useRef({
    throttle: 0.47,
    pitch: 0,
    roll: 0,
    yaw: 0
  });
  const lastUpdateTimeRef = useRef(Date.now());
  const [timeScaleState, setTimeScaleState] = useState(1);
  const timeScaleRef = useRef(1);

  const setTimeScale = useCallback((scale) => {
    console.log(`⏩ Time Scale set to ${scale}x`);
    const s = Math.max(1, Math.floor(scale));
    timeScaleRef.current = s;
    setTimeScaleState(s);
  }, []);
  const animationFrameRef = useRef(null);

  console.log('🎮 useAircraftPhysics: STATE INITIALIZED', {
    initialFlightData: flightData.verticalSpeed,
    physicsState,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('🎮 useAircraftPhysics: INITIALIZING PHYSICS SERVICE...');
    
    async function initializePhysics() {
      try {
        // Load aircraft data from database with comprehensive error handling
        let aircraftDatabase;
        try {
          aircraftDatabase = await loadAircraftData();
          // console.log('🎮 useAircraftPhysics: AIRCRAFT DATABASE LOADED:', { ... });
        } catch (dbError) {
          console.error('❌ Failed to load aircraft database:', dbError);
          aircraftDatabase = null;
        }
        
        let selectedAircraft = null;
        if (aircraftDatabase && Array.isArray(aircraftDatabase) && aircraftDatabase.length > 0) {
          if (config && (config.aircraftModel || config.model)) {
            const targetModel = config.aircraftModel || config.model;
            // Ensure we match exact model string
            selectedAircraft = aircraftDatabase.find(a => a.model === targetModel) || aircraftDatabase[0];
            
            // Critical: Ensure maxThrustPerEngine is present. If not, try to find it in the DB again if we have a partial object
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
              maxThrustPerEngine: 120000, // Updated default from 85000
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

        console.log('🎮 useAircraftPhysics: DEFAULT AIRCRAFT DATA:', {
          name: finalAircraft.name || 'Unknown Aircraft',
          mass: finalAircraft.mass || 0,
          thrust: finalAircraft.maxThrustPerEngine || 0
        });
        
        const { initialLatitude, initialLongitude, ...restConfig } = config;

        // Use RealisticFlightPhysicsService exclusively as requested
        const service = new RealisticFlightPhysicsService(finalAircraft, initialLatitude, initialLongitude);
        
        // Apply initial conditions from config
        if (service && typeof service.setInitialConditions === 'function') {
           // Convert initialHeading (degrees) to radians for psi
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
           
           // Set Runway Geometry for Ground Status
           // Try to find target airport (Departure, Arrival, or Nearest)
           let targetAirport = config.departure?.iata || config.departure?.icao || config.flightPlan?.departure?.iata || config.flightPlan?.departure;
           let runwayName = config.departureRunway || config.flightPlan?.departureRunway;

           // Check Arrival if Departure not found, or if we are closer to arrival
           const arrCode = config.arrival?.iata || config.arrival?.icao || config.flightPlan?.arrival?.iata || config.flightPlan?.arrival;
           
           if (targetAirport && arrCode && initialLatitude && initialLongitude) {
               // If both exist, check which is closer
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

           // If still no airport, find nearest
           if (!targetAirport && initialLatitude && initialLongitude) {
                const nearby = airportService.getAirportsWithinRadius(initialLatitude, initialLongitude, 20); // 20nm radius
                if (nearby && nearby.length > 0) {
                     // Sort by distance
                     nearby.sort((a, b) => {
                         const distA = Math.pow(a.latitude - initialLatitude, 2) + Math.pow(a.longitude - initialLongitude, 2);
                         const distB = Math.pow(b.latitude - initialLatitude, 2) + Math.pow(b.longitude - initialLongitude, 2);
                         return distA - distB;
                     });
                     targetAirport = nearby[0].iata || nearby[0].icao;
                     console.log(`🎮 useAircraftPhysics: Auto-detected nearest airport: ${targetAirport}`);
                }
           }

           if (targetAirport) {
               const geometry = airportService.getRunwayGeometry(targetAirport, runwayName);
               if (geometry) {
                   service.setRunwayGeometry(geometry);
               }
           }
        }
        
        if (config && service && service.aircraft) {
          if (typeof config.payloadWeight === 'number' && !isNaN(config.payloadWeight) && config.payloadWeight >= 0) {
            service.aircraft.payloadWeight = config.payloadWeight;
          }
          if (typeof config.fuelWeight === 'number' && !isNaN(config.fuelWeight) && config.fuelWeight > 0) {
            service.aircraft.fuelWeight = config.fuelWeight;
            if (service.state && typeof service.state.fuel === 'number') {
              service.state.fuel = config.fuelWeight;
            }
          }
          if (typeof service.aircraft.emptyWeight === 'number') {
            const fuelWeight = typeof service.aircraft.fuelWeight === 'number' ? service.aircraft.fuelWeight : 0;
            const payloadWeight = typeof service.aircraft.payloadWeight === 'number' ? service.aircraft.payloadWeight : 0;
            service.aircraft.mass = service.aircraft.emptyWeight + fuelWeight + payloadWeight;
          }
        }
        // console.log('🎮 useAircraftPhysics: PHYSICS SERVICE CREATED');
        // console.log('🎮 useAircraftPhysics: AIRCRAFT DATA IN PHYSICS SERVICE:', {
        //   basicLiftCoefficient: service?.aircraft?.basicLiftCoefficient,
        //   horizontalStabilizerArea: service?.aircraft?.horizontalStabilizerArea,
        //   horizontalStabilizerCL: service?.aircraft?.horizontalStabilizerCL,
        //   horizontalStabilizerMomentArm: service?.aircraft?.horizontalStabilizerMomentArm
        // });
        
        physicsServiceRef.current = service;
        setIsInitialized(true);
        // console.log('🎮 useAircraftPhysics: PHYSICS SERVICE INITIALIZED SUCCESSFULLY WITH DATABASE DATA');
      } catch (err) {
        console.error('🎮 useAircraftPhysics: PHYSICS SERVICE INITIALIZATION FAILED', err);
        console.error('🎮 useAircraftPhysics: ERROR STACK:', err.stack);
        setError(err.message);
      }
    }
    
    initializePhysics();
  }, [model]);

  useEffect(() => {
    // console.log('🎮 useAircraftPhysics: AUTO-START EFFECT TRIGGERED', {
    //   autoStart,
    //   isInitialized,
    //   physicsService: !!physicsServiceRef.current,
    //   timestamp: new Date().toISOString()
    // });

    if (autoStart && isInitialized && physicsServiceRef.current) {
      // console.log('🎮 useAircraftPhysics: STARTING PHYSICS ENGINE...');
      startPhysics();
    }
  }, [autoStart, isInitialized]);

  const startPhysics = () => {
    // console.log('🎮 useAircraftPhysics: STARTING PHYSICS ANIMATION LOOP...');
    const targetStep = 1 / 60;
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = (currentTime - lastUpdateTimeRef.current) / 1000;

      if (physicsServiceRef.current && elapsed >= targetStep) {
        try {
          updatePhysics(targetStep, currentTime);
        } catch (err) {
          console.error('🎮 PHYSICS LOOP: UPDATE ERROR', err);
        }
      }

      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
    // console.log('🎮 useAircraftPhysics: PHYSICS ANIMATION LOOP STARTED');
  };

  const updatePhysics = useCallback((fixedDt = 1 / 60, currentTimeOverride = null) => {
    if (!isInitialized || !physicsServiceRef.current) {
      console.warn('⚠️ Physics update skipped - not initialized');
      return;
    }

    try {
      const physicsService = physicsServiceRef.current;
      const currentTime = currentTimeOverride || Date.now();
      const timeStep = fixedDt;
      const iterations = timeScaleRef.current;
      
      const throttleValue = currentControlsRef.current.throttle;
      if (isNaN(throttleValue)) {
        console.error('⚠️ Throttle is NaN in useAircraftPhysics update:', throttleValue);
      }
      
      let newState;
      
      for (let i = 0; i < iterations; i++) {
        newState = physicsService.update({
            throttle: isNaN(throttleValue) ? 0 : throttleValue,
            pitch: currentControlsRef.current.pitch,
            roll: currentControlsRef.current.roll,
            yaw: currentControlsRef.current.yaw,
            trim: currentControlsRef.current.trim || 0
        }, timeStep);
        
        if (newState.hasCrashed) break;
      }

      const altitude_m = Math.max(0, newState.position.z);
      const altitude = altitude_m * 3.28084;
      const airspeeds = physicsService.calculateAirspeeds();
      
      const trueAirspeed = isNaN(airspeeds?.trueAirspeed) ? 450 : airspeeds.trueAirspeed;
      const indicatedAirspeed = isNaN(airspeeds?.indicatedAirspeed) ? 280 : airspeeds.indicatedAirspeed;
      const groundSpeed = isNaN(airspeeds?.groundSpeed) ? 0 : airspeeds.groundSpeed;
      
      const verticalSpeed = newState.verticalSpeed || 0;

      const autopilotStatus = newState.autopilot || {};
      const autopilotEngaged = !!autopilotStatus.engaged;
      const autopilotMode = autopilotStatus.mode || 'LNAV';

      let actualThrottle = throttleValue;
      if (
        autopilotEngaged &&
        physicsService &&
        physicsService.state &&
        physicsService.state.controls &&
        typeof physicsService.state.controls.throttle === 'number'
      ) {
        actualThrottle = physicsService.state.controls.throttle;
      }

      if (autopilotEngaged) {
        currentControlsRef.current = {
          ...currentControlsRef.current,
          throttle: actualThrottle
        };
      }
      
      console.log('🔍 VERTICAL SPEED DEBUG - Full Analysis:', {
        'physics_service_update_called': !!newState,
        'newState.verticalSpeed': newState.verticalSpeed,
        'newState.position.z': newState.position?.z,
        'newState.velocity.w': newState.velocity?.w,
        'altitude_m': newState.position?.z,
        'altitude_ft': altitude,
        'verticalSpeed_ftmin': verticalSpeed,
        'timestamp': new Date().toLocaleTimeString(),
        'physics_running': isInitialized
      });
      
      const flapsState = newState.flaps !== undefined ? newState.flaps : 0;
      const airBrakesState = newState.airBrakes !== undefined ? newState.airBrakes : 0;
      const gearState = newState.gear !== undefined ? newState.gear : false;
      
      const flapsPosition = flapsState === 0 ? 'up' : 'down';
      const airBrakesPosition = airBrakesState === 0 ? 'up' : 'down';
      const gearPosition = gearState === false ? 'up' : 'down';

      const crashWarning = typeof newState.crashWarning === 'string' ? newState.crashWarning : '';
      const alarms = Array.isArray(newState.alarms) ? newState.alarms : [];
      const hasCrashed = !!newState.hasCrashed;
      const autopilotTargets = newState.autopilotTargets || autopilotStatus.targets || null;

      const newFlightData = {
        altitude: altitude,
        airspeed: trueAirspeed,
        indicatedAirspeed: indicatedAirspeed,
        groundSpeed: groundSpeed,
        verticalSpeed: verticalSpeed,
        pitch: newState.orientation.theta * 180 / Math.PI,
        roll: newState.orientation.phi * 180 / Math.PI,
        heading: typeof newState.heading === 'number' ? newState.heading : (newState.orientation.psi * 180 / Math.PI + 360) % 360,
        throttle: actualThrottle * 100,
        elevator: currentControlsRef.current.pitch * 180 / Math.PI,
        aileron: currentControlsRef.current.roll * 180 / Math.PI,
        rudder: currentControlsRef.current.yaw * 180 / Math.PI,
        lift: physicsService.aeroForces?.z || 0,
        drag: Math.max(0, -(physicsService.aeroForces?.x || 0)),
        thrust: physicsService.thrustForces?.x || 0,
        weight: 0,
        position: newState.position,
        cg: {
          x: newState.position.x,
          y: newState.position.y,
          z: newState.position.z
        },
        flapsPosition: flapsPosition,
        airBrakesPosition: airBrakesPosition,
        gearPosition: gearPosition,
        flapsValue: flapsState,
        airBrakesValue: airBrakesState,
        gearValue: gearState,
        trimValue: newState.controls?.trim || 0,
        frame: typeof newState.frame === 'number' ? newState.frame : 0,
        engineN1: newState.engineParams?.n1 !== undefined ? newState.engineParams.n1 : [22, 22],
        engineN2: newState.engineParams?.n2 !== undefined ? newState.engineParams.n2 : [45, 45],
        engineEGT: newState.engineParams?.egt !== undefined ? newState.engineParams.egt : [400, 400],
        fuel: newState.fuel !== undefined ? newState.fuel : 100,
        currentWaypointIndex: newState.currentWaypointIndex || 0,
        hasCrashed,
        timeToCrash: typeof newState.timeToCrash === 'number' ? newState.timeToCrash : null,
        crashWarning,
        alarms,
        activeWarnings: newState.activeWarnings || [],
        autopilotEngaged,
        autopilotMode,
        autopilotTargets,
        debugPhysics: newState.debugPhysics,
        systems: newState.systems || {}
      };

      setFlightData(newFlightData);
      setIsCrashed(hasCrashed);
      setPhysicsState(newState);
      
      lastUpdateTimeRef.current = currentTime;
    } catch (err) {
      console.error('❌ Physics update error:', err);
      setError(err.message);
    }
  }, [isInitialized]);

  const setThrottle = useCallback((value) => {
    if (isNaN(value)) {
      console.error('⚠️ Attempting to set throttle to NaN:', value);
      return;
    }
    const normalizedThrottle = Math.max(-0.7, Math.min(1, value));
    console.log('🎯 useAircraftPhysics: setThrottle:', {
      input: value,
      normalized: normalizedThrottle,
      percentage: (normalizedThrottle * 100).toFixed(1) + '%'
    });
    // Single throttle control for backward compatibility
    currentControlsRef.current = { 
      ...currentControlsRef.current, 
      throttle: normalizedThrottle
    };
  }, []);



  const setPitch = useCallback((value) => {
    // Input is usually -1 to 1 (normalized) or percentage
    const normalizedValue = Math.abs(value) <= 1 ? value : value / 100;
    // Map -1..1 to -25..25 degrees (approx 0.44 rad) for full deflection
    const maxDeflectionDeg = 25;
    currentControlsRef.current = { ...currentControlsRef.current, pitch: normalizedValue * maxDeflectionDeg * Math.PI / 180 };
  }, []);

  const setRoll = useCallback((value) => {
    const normalizedValue = Math.abs(value) <= 1 ? value : value / 100;
    const maxDeflectionDeg = 30; // Ailerons typically 20-30 deg
    currentControlsRef.current = { ...currentControlsRef.current, roll: normalizedValue * maxDeflectionDeg * Math.PI / 180 };
  }, []);

  const setYaw = useCallback((value) => {
    // Rudder typically 30 deg
    const maxDeflectionDeg = 30; 
    currentControlsRef.current = { ...currentControlsRef.current, yaw: value * maxDeflectionDeg * Math.PI / 180 };
  }, []);

  const setEngineThrottle = useCallback((engineIndex, value) => {
    const normalizedThrottle = Math.max(-0.7, Math.min(1, value));
    if (physicsServiceRef.current && typeof physicsServiceRef.current.setEngineThrottle === 'function') {
      physicsServiceRef.current.setEngineThrottle(engineIndex, normalizedThrottle);
    }
    const throttles = Array.isArray(currentControlsRef.current.engineThrottles)
      ? [...currentControlsRef.current.engineThrottles]
      : [normalizedThrottle, normalizedThrottle];
    if (engineIndex >= 0 && engineIndex < throttles.length) {
      throttles[engineIndex] = normalizedThrottle;
    }
    currentControlsRef.current = {
      ...currentControlsRef.current,
      engineThrottles: throttles,
      throttle: normalizedThrottle
    };
  }, []);
  // Control surface setters
  const setFlaps = useCallback((value) => {
    if (physicsServiceRef.current) {
      physicsServiceRef.current.setFlaps(value);
    }
  }, []);

  const setAirBrakes = useCallback((value) => {
    if (physicsServiceRef.current) {
      physicsServiceRef.current.setAirBrakes(value);
    }
  }, []);

  const setGear = useCallback((value) => {
    if (physicsServiceRef.current) {
      physicsServiceRef.current.setGear(value);
    }
  }, []);

  const setTrim = useCallback((value) => {
    // Trim sensitivity adjustment
    // Map -1..1 to -0.2..0.2 radians (approx +/- 11.5 degrees)
    const normalizedValue = Math.abs(value) <= 1 ? value : value / 100;
    const maxTrimRad = 0.2; 
    const scaledTrim = normalizedValue * maxTrimRad;

    if (physicsServiceRef.current && typeof physicsServiceRef.current.setTrim === 'function') {
      physicsServiceRef.current.setTrim(scaledTrim);
    }
    currentControlsRef.current = { ...currentControlsRef.current, trim: scaledTrim };
  }, []);

  const performSystemAction = useCallback((system, action, value) => {
    if (physicsServiceRef.current && typeof physicsServiceRef.current.performSystemAction === 'function') {
      physicsServiceRef.current.performSystemAction(system, action, value);
    }
  }, []);

  const updateFlightPlan = useCallback((newFlightPlan) => {
    if (physicsServiceRef.current) {
      physicsServiceRef.current.updateFlightPlan(newFlightPlan);
    }
  }, []);

  const resetAircraft = useCallback(() => {
    if (physicsServiceRef.current) {
      physicsServiceRef.current.reset();
    }
    
    currentControlsRef.current = {
      throttle: 0.05, // Starting with idle
      engineThrottles: [0.05, 0.05], // Both engines at 5% idle for takeoff preparation
      pitch: 0,
      roll: 0,
      yaw: 0
    };
    
    setFlightData({
      altitude: 0,
      airspeed: 0,
      indicatedAirspeed: 0,
      verticalSpeed: 0,
      pitch: 0.0,
      roll: 0,
      heading: 0,
      throttle: 5, // Starting with idle
      engineThrottles: [5, 5], // Both engines at 5% idle for takeoff preparation
      elevator: 0,
      aileron: 0,
      rudder: 0,
      lift: 0,
      drag: 0,
      thrust: 0,
      weight: 0,
      cg: { x: 0, y: 0, z: 0 },
      flapsPosition: 'up',
      airBrakesPosition: 'up',
      gearPosition: 'down',
      flapsValue: 0,
      airBrakesValue: 0,
      gearValue: true
    });
    
    lastUpdateTimeRef.current = Date.now();
    
    console.log('🔄 Aircraft reset to neutral configuration');
  }, []);

  useEffect(() => {
    if (physicsServiceRef.current && isInitialized) {
      console.log('🔄 Initializing physics with runway configuration');
      updatePhysics(); // Initial update without hardcoded time step
    }
  }, [isInitialized]);

  return {
    physicsState,
    flightData,
    isInitialized,
    error,
    isCrashed,
    physicsService: physicsServiceRef.current,
    setThrottle,
    setEngineThrottle,
    setPitch,
    setRoll,
    setYaw,
    setFlaps,
    setAirBrakes,
    setGear,
    setTrim,
    performSystemAction,
    setEnvironment: useCallback((envData) => {
      if (physicsServiceRef.current && typeof physicsServiceRef.current.setEnvironment === 'function') {
        physicsServiceRef.current.setEnvironment(envData);
      }
    }, []),
    updatePhysics,
    resetAircraft,
    updateFlightPlan,
    setTimeScale,
    timeScale: timeScaleState
  };
}
