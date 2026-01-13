import { useState, useCallback, useEffect, useRef } from 'react';
import NewFlightPhysicsService from '../services/newFlightPhysicsService.js';
import SimpleFlightPhysicsService from '../services/SimpleFlightPhysicsService.js';
import { loadAircraftData } from '../services/aircraftService.js';

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
    frame: 0
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
          console.log('🎮 useAircraftPhysics: AIRCRAFT DATABASE LOADED:', {
            isArray: Array.isArray(aircraftDatabase),
            length: aircraftDatabase?.length || 0,
            type: typeof aircraftDatabase,
            hasLength: 'length' in aircraftDatabase
          });
        } catch (dbError) {
          console.error('❌ Failed to load aircraft database:', dbError);
          aircraftDatabase = null;
        }
        
        let selectedAircraft = null;
        if (aircraftDatabase && Array.isArray(aircraftDatabase) && aircraftDatabase.length > 0) {
          if (config && (config.aircraftModel || config.model)) {
            const targetModel = config.aircraftModel || config.model;
            selectedAircraft = aircraftDatabase.find(a => a.model === targetModel) || aircraftDatabase[0];
          } else {
            selectedAircraft = aircraftDatabase[0];
          }
        }

        const defaultAircraft = selectedAircraft 
          ? selectedAircraft 
          : {
              name: 'Boeing 737-800',
              mass: 41410,
              maxThrustPerEngine: 85000,
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
        }

        console.log('🎮 useAircraftPhysics: DEFAULT AIRCRAFT DATA:', {
          name: finalAircraft.name || 'Unknown Aircraft',
          mass: finalAircraft.mass || 0,
          thrust: finalAircraft.maxThrustPerEngine || 0
        });
        
        const service = model === 'imaginary' ? 
          new SimpleFlightPhysicsService(finalAircraft) : 
          new NewFlightPhysicsService(finalAircraft);
        
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
        console.log('🎮 useAircraftPhysics: PHYSICS SERVICE CREATED');
        console.log('🎮 useAircraftPhysics: AIRCRAFT DATA IN PHYSICS SERVICE:', {
          basicLiftCoefficient: service?.aircraft?.basicLiftCoefficient,
          horizontalStabilizerArea: service?.aircraft?.horizontalStabilizerArea,
          horizontalStabilizerCL: service?.aircraft?.horizontalStabilizerCL,
          horizontalStabilizerMomentArm: service?.aircraft?.horizontalStabilizerMomentArm
        });
        
        physicsServiceRef.current = service;
        setIsInitialized(true);
        console.log('🎮 useAircraftPhysics: PHYSICS SERVICE INITIALIZED SUCCESSFULLY WITH DATABASE DATA');
      } catch (err) {
        console.error('🎮 useAircraftPhysics: PHYSICS SERVICE INITIALIZATION FAILED', err);
        console.error('🎮 useAircraftPhysics: ERROR STACK:', err.stack);
        setError(err.message);
      }
    }
    
    initializePhysics();
  }, [model]);

  useEffect(() => {
    console.log('🎮 useAircraftPhysics: AUTO-START EFFECT TRIGGERED', {
      autoStart,
      isInitialized,
      physicsService: !!physicsServiceRef.current,
      timestamp: new Date().toISOString()
    });

    if (autoStart && isInitialized && physicsServiceRef.current) {
      console.log('🎮 useAircraftPhysics: STARTING PHYSICS ENGINE...');
      startPhysics();
    }
  }, [autoStart, isInitialized]);

  const startPhysics = () => {
    console.log('🎮 useAircraftPhysics: STARTING PHYSICS ANIMATION LOOP...');
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
    console.log('🎮 useAircraftPhysics: PHYSICS ANIMATION LOOP STARTED');
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
      
      const throttleValue = currentControlsRef.current.throttle;
      if (isNaN(throttleValue)) {
        console.error('⚠️ Throttle is NaN in useAircraftPhysics update:', throttleValue);
      }
      
      const newState = physicsService.update({
        throttle: isNaN(throttleValue) ? 0 : throttleValue,
        pitch: currentControlsRef.current.pitch,
        roll: currentControlsRef.current.roll,
        yaw: currentControlsRef.current.yaw
      }, timeStep);

      const altitude_m = Math.max(0, newState.position.z);
      const altitude = altitude_m * 3.28084;
      const airspeeds = physicsService.calculateAirspeeds();
      
      const trueAirspeed = isNaN(airspeeds?.trueAirspeed) ? 450 : airspeeds.trueAirspeed;
      const indicatedAirspeed = isNaN(airspeeds?.indicatedAirspeed) ? 280 : airspeeds.indicatedAirspeed;
      
      const verticalSpeed = newState.verticalSpeed || 0;

      const autopilotStatus = newState.autopilot || {};
      const autopilotEngaged = !!autopilotStatus.engaged;

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
        verticalSpeed: verticalSpeed,
        pitch: newState.orientation.theta * 180 / Math.PI,
        roll: newState.orientation.phi * 180 / Math.PI,
        heading: newState.orientation.psi * 180 / Math.PI,
        throttle: actualThrottle * 100,
        elevator: currentControlsRef.current.pitch * 180 / Math.PI,
        aileron: currentControlsRef.current.roll * 180 / Math.PI,
        rudder: currentControlsRef.current.yaw * 180 / Math.PI,
        lift: physicsService.aeroForces?.z || 0,
        drag: Math.max(0, -(physicsService.aeroForces?.x || 0)),
        thrust: physicsService.thrustForces?.x || 0,
        weight: 0,
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
        hasCrashed,
        timeToCrash: typeof newState.timeToCrash === 'number' ? newState.timeToCrash : null,
        crashWarning,
        alarms,
        autopilotEngaged,
        autopilotTargets,
        debugPhysics: newState.debugPhysics
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
    const normalizedValue = Math.abs(value) <= 1 ? value : value / 100;
    currentControlsRef.current = { ...currentControlsRef.current, pitch: normalizedValue * Math.PI / 180 };
  }, []);

  const setRoll = useCallback((value) => {
    const normalizedValue = Math.abs(value) <= 1 ? value : value / 100;
    currentControlsRef.current = { ...currentControlsRef.current, roll: normalizedValue * Math.PI / 2 };
  }, []);

  const setYaw = useCallback((value) => {
    currentControlsRef.current = { ...currentControlsRef.current, yaw: value * Math.PI / 180 };
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
    if (physicsServiceRef.current && typeof physicsServiceRef.current.setTrim === 'function') {
      physicsServiceRef.current.setTrim(value);
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
    updatePhysics,
    resetAircraft
  };
}
