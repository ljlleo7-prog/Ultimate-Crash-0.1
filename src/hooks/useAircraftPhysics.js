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
    altitude: 35000,
    airspeed: 450,
    indicatedAirspeed: 280,
    verticalSpeed: -1,
    pitch: 2.5,
    roll: 0.5,
    heading: 270,
    throttle: 47,
    elevator: 0,
    aileron: 0,
    rudder: 0,
    lift: 571.4,
    drag: 42.0,
    thrust: 56.4,
    weight: 553.3,
    cg: { x: 0, y: 0, z: 0 },
    flapsPosition: 'up',
    airBrakesPosition: 'up',
    gearPosition: 'up',
    flapsValue: 0,
    airBrakesValue: 0,
    gearValue: false
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
        
        // Get the first aircraft from the database (can be configurable later)
        const defaultAircraft = (aircraftDatabase && Array.isArray(aircraftDatabase) && aircraftDatabase.length > 0) 
          ? aircraftDatabase[0] 
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
        console.log('🎮 useAircraftPhysics: DEFAULT AIRCRAFT DATA:', {
          name: defaultAircraft.name || 'Unknown Aircraft',
          mass: defaultAircraft.mass || 0,
          thrust: defaultAircraft.maxThrustPerEngine || 0
        });
        
        // Initialize appropriate physics service based on selected model
        const service = model === 'imaginary' ? 
          new SimpleFlightPhysicsService(defaultAircraft) : 
          new NewFlightPhysicsService(defaultAircraft);
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
    let lastTime = performance.now();
    const animate = () => {
      const currentTime = performance.now();
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      console.log('🎮 PHYSICS LOOP: ANIMATION FRAME', {
        timestamp: new Date().toISOString(),
        dt,
        physicsRunning: physicsServiceRef.current ? 'AVAILABLE' : 'MISSING'
      });

      if (physicsServiceRef.current && dt > 0) {
        try {
          updatePhysics();
        } catch (err) {
          console.error('🎮 PHYSICS LOOP: UPDATE ERROR', err);
        }
      } else {
        console.warn('🎮 PHYSICS LOOP: MISSING SERVICE OR INVALID DT', {
          physicsServiceExists: !!physicsServiceRef.current,
          dt
        });
      }
      
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
    console.log('🎮 useAircraftPhysics: PHYSICS ANIMATION LOOP STARTED');
  };

  const updatePhysics = useCallback(() => {
    if (!isInitialized || !physicsServiceRef.current) {
      console.warn('⚠️ Physics update skipped - not initialized');
      return;
    }

    try {
      const physicsService = physicsServiceRef.current;
      const currentTime = Date.now();
      const dt = (currentTime - lastUpdateTimeRef.current) / 1000;
      
      // Sanitize time step to prevent extreme values
      const timeStep = Math.min(Math.max(dt, 0.001), 0.033); // Clamp between 1ms and 33ms
      
      if (timeStep < 0.001) {
        console.warn('⏱️ Physics update skipped - time step too small:', dt);
        return;
      }
      
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

      // ✅ FIXED: Use position.z as positive altitude (no negative conversion needed)
      const altitude = newState.position.z * 3.28084;
      const airspeeds = physicsService.calculateAirspeeds();
      
      const trueAirspeed = isNaN(airspeeds?.trueAirspeed) ? 450 : airspeeds.trueAirspeed;
      const indicatedAirspeed = isNaN(airspeeds?.indicatedAirspeed) ? 280 : airspeeds.indicatedAirspeed;
      
      const verticalSpeed = newState.verticalSpeed || 0;
      
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

      const newFlightData = {
        altitude: altitude,
        airspeed: trueAirspeed,
        indicatedAirspeed: indicatedAirspeed,
        verticalSpeed: verticalSpeed,
        pitch: newState.orientation.theta * 180 / Math.PI,
        roll: newState.orientation.phi * 180 / Math.PI,
        heading: newState.orientation.psi * 180 / Math.PI,
        throttle: currentControlsRef.current.throttle * 100,
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
        engineN1: newState.engineParams?.n1 !== undefined ? newState.engineParams.n1 : [22, 22],
        engineN2: newState.engineParams?.n2 !== undefined ? newState.engineParams.n2 : [45, 45],
        engineEGT: newState.engineParams?.egt !== undefined ? newState.engineParams.egt : [400, 400],
        fuel: newState.fuel !== undefined ? newState.fuel : 100
      };

      setFlightData(newFlightData);
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
    // ✅ FIXED: Don't divide by 100 - value is already in 0-1 range from new ThrustManager
    const normalizedThrottle = Math.max(0, Math.min(1, value));
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

  const resetAircraft = useCallback(() => {
    if (physicsServiceRef.current) {
      physicsServiceRef.current.reset();
    }
    
    currentControlsRef.current = {
      throttle: 0.47, // Legacy
      engineThrottles: [0.47, 0.47], // Both engines at 47% idle
      pitch: 0,
      roll: 0,
      yaw: 0
    };
    
    setFlightData({
      altitude: 35000,
      airspeed: 450,
      indicatedAirspeed: 280,
      verticalSpeed: 0,
      pitch: 0.0,
      roll: 0,
      heading: 0,
      throttle: 47, // Legacy
      engineThrottles: [47, 47], // Both engines at 47% idle
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
      gearPosition: 'up',
      flapsValue: 0,
      airBrakesValue: 0,
      gearValue: false
    });
    
    lastUpdateTimeRef.current = Date.now();
    
    console.log('🔄 Aircraft reset to cruise configuration');
  }, []);

  useEffect(() => {
    if (physicsServiceRef.current && isInitialized) {
      console.log('🔄 Initializing physics with cruise configuration');
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
    setPitch,
    setRoll,
    setYaw,
    setFlaps,
    setAirBrakes,
    setGear,
    updatePhysics,
    resetAircraft
  };
}
