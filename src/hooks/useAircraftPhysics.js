import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Aircraft Physics Hook
 * Integrates the working NewFlightPhysicsService into React components
 * Provides real-time aircraft state management and physics updates
 */
export const useAircraftPhysics = (aircraftConfig, enabled = true) => {
  const [physicsState, setPhysicsState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [currentControls, setCurrentControls] = useState({
    throttle: 0.47,
    pitch: 0,
    roll: 0,
    yaw: 0
  });
  const [flightData, setFlightData] = useState({
    altitude: 0,
    airspeed: 0,
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
    cg: { x: 0, y: 0, z: 0 }
  });

  const physicsServiceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTime = useRef(Date.now());
  const lastPosition = useRef({ x: 0, y: 0, z: 0 });
  const physicsConfigRef = useRef(null);

  // Initialize physics service
  useEffect(() => {
    if (!enabled || !aircraftConfig) return;

    const initializePhysics = async () => {
      try {
        // Dynamic import to handle module loading
        const { default: NewFlightPhysicsService } = await import('../services/newFlightPhysicsService.js');
        const aircraftServiceModule = await import('../services/aircraftService');
        const aircraftService = aircraftServiceModule.default;
        
        // Get full aircraft data from database
        const fullAircraftData = aircraftService.getAircraftByModel(aircraftConfig.model);
        if (!fullAircraftData) {
          throw new Error(`Aircraft model not found: ${aircraftConfig.model}`);
        }

        // ✅ USE WORKING DATABASE INTEGRATION - Same as our simulation
        const physicsConfig = {
          // ✅ DIRECT MAPPING FROM DATABASE
          mass: aircraftConfig.mass || fullAircraftData.emptyWeight,
          emptyWeight: fullAircraftData.emptyWeight,
          fuelWeight: aircraftConfig.fuelWeight || fullAircraftData.maxFuelCapacity * 0.7,
          payloadWeight: aircraftConfig.payloadWeight || fullAircraftData.maxPayload * 0.8,
          wingArea: fullAircraftData.wingArea,
          engineCount: fullAircraftData.engineCount,
          maxThrustPerEngine: fullAircraftData.maxThrustPerEngine,
          
          // ✅ AERODYNAMIC PROPERTIES
          liftCurveSlope: fullAircraftData.liftCurveSlope,
          maxLiftCoefficient: fullAircraftData.maxLiftCoefficient,
          zeroLiftDragCoefficient: fullAircraftData.zeroLiftDragCoefficient,
          inducedDragFactor: fullAircraftData.inducedDragFactor,
          
          // ✅ CONTROL SYSTEM PROPERTIES
          controlPower: {
            x: fullAircraftData.controlPower?.x || 0.01,
            y: fullAircraftData.controlPower?.y || 0.01,
            z: fullAircraftData.controlPower?.z || 0.01
          },
          
          // ✅ MASS PROPERTIES
          momentOfInertiaRoll: fullAircraftData.momentOfInertiaRoll,
          momentOfInertiaPitch: fullAircraftData.momentOfInertiaPitch,
          momentOfInertiaYaw: fullAircraftData.momentOfInertiaYaw
        };

        console.log('🛩️ Initializing Physics Engine with database integration:');
        console.log(`   Aircraft: ${fullAircraftData.manufacturer} ${fullAircraftData.model}`);
        console.log(`   Mass: ${physicsConfig.mass.toFixed(0)} kg`);
        console.log(`   Wing Area: ${physicsConfig.wingArea.toFixed(1)} m²`);
        console.log(`   Max Thrust/Engine: ${physicsConfig.maxThrustPerEngine.toFixed(0)} kN`);

        physicsServiceRef.current = new NewFlightPhysicsService(physicsConfig);
        physicsConfigRef.current = physicsConfig;
        setIsInitialized(true);
        setError(null);
        
        console.log('✅ Aircraft physics engine initialized successfully');
      } catch (err) {
        console.error('❌ Failed to initialize physics engine:', err);
        setError(err.message);
      }
    };

    initializePhysics();

    return () => {
      if (physicsServiceRef.current) {
        physicsServiceRef.current = null;
      }
    };
  }, [aircraftConfig, enabled]);

  // Physics update loop
  const updatePhysics = useCallback((controls = null) => {
    if (!isInitialized || !physicsServiceRef.current) return;

    try {
      const physicsService = physicsServiceRef.current;
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastUpdateTime.current) / 1000; // Convert to seconds
      
      // Ensure stable time step
      const dt = Math.min(deltaTime, 0.05); // Max 50ms timestep
      
      // Update control inputs if provided
      if (controls) {
        setCurrentControls(prev => ({ ...prev, ...controls }));
      }
      
      // Update physics with current control inputs
      const newState = physicsService.update({
        throttle: currentControls.throttle,
        pitch: currentControls.pitch,
        roll: currentControls.roll,
        yaw: currentControls.yaw
      });

      // Calculate derived flight data
      const altitude = -newState.position.z * 3.28084; // Convert m to ft
      const airspeed = Math.sqrt(
        newState.velocity.u ** 2 + 
        newState.velocity.v ** 2 + 
        newState.velocity.w ** 2
      ) * 1.94384; // Convert m/s to kts
      
      const verticalSpeed = (altitude - lastPosition.current.z) / dt * 60; // fpm

      // Update flight data
      const newFlightData = {
        altitude: altitude,
        airspeed: airspeed,
        verticalSpeed: verticalSpeed,
        pitch: newState.orientation.theta * 180 / Math.PI,
        roll: newState.orientation.phi * 180 / Math.PI,
        heading: newState.orientation.psi * 180 / Math.PI,
        throttle: newState.controls.throttle * 100,
        elevator: currentControls.pitch * 180 / Math.PI,
        aileron: currentControls.roll * 180 / Math.PI,
        rudder: currentControls.yaw * 180 / Math.PI,
        lift: physicsService.debugData?.lift || 0,
        drag: physicsService.debugData?.drag || 0,
        thrust: (newState.controls.throttle * physicsConfigRef.current?.maxThrustPerEngine || 0),
        weight: physicsService.debugData?.weight || 0,
        cg: {
          x: newState.position.x,
          y: newState.position.y,
          z: newState.position.z
        }
      };

      setFlightData(newFlightData);
      setPhysicsState(newState);
      
      lastUpdateTime.current = currentTime;
      lastPosition.current = {
        x: newState.position.x,
        y: newState.position.y,
        z: altitude
      };
    } catch (err) {
      console.error('❌ Physics update error:', err);
      setError(err.message);
    }
  }, [isInitialized, currentControls]);

  // Continuous physics update loop
  useEffect(() => {
    if (!enabled || !isInitialized) return;

    const animate = () => {
      updatePhysics();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, isInitialized, updatePhysics]);

  // Control input handlers
  const setThrottle = useCallback((value) => {
    setCurrentControls(prev => ({ ...prev, throttle: value / 100 }));
  }, []);

  const setPitch = useCallback((value) => {
    setCurrentControls(prev => ({ ...prev, pitch: value * Math.PI / 180 }));
  }, []);

  const setRoll = useCallback((value) => {
    setCurrentControls(prev => ({ ...prev, roll: value * Math.PI / 180 }));
  }, []);

  const setYaw = useCallback((value) => {
    setCurrentControls(prev => ({ ...prev, yaw: value * Math.PI / 180 }));
  }, []);

  // Reset aircraft to initial state
  const resetAircraft = useCallback(() => {
    if (!physicsServiceRef.current) return;

    // Reset to cruise configuration
    physicsServiceRef.current.state.position.z = -10668; // 35,000 ft
    physicsServiceRef.current.state.velocity.u = 231.5;  // 450 KTS
    physicsServiceRef.current.state.velocity.v = 0;
    physicsServiceRef.current.state.velocity.w = 0;
    physicsServiceRef.current.state.orientation.phi = 0;
    physicsServiceRef.current.state.orientation.theta = 3.0 * Math.PI/180; // +3° pitch
    physicsServiceRef.current.state.orientation.psi = 0;
    physicsServiceRef.current.state.controls.throttle = 0.47;
    
    // Reset control inputs
    setCurrentControls({
      throttle: 0.47,
      pitch: 0,
      roll: 0,
      yaw: 0
    });
    
    setFlightData({
      altitude: 35000,
      airspeed: 450,
      verticalSpeed: 0,
      pitch: 3.0,
      roll: 0,
      heading: 0,
      throttle: 47,
      elevator: 0,
      aileron: 0,
      rudder: 0,
      lift: 0,
      drag: 0,
      thrust: 0,
      weight: 0,
      cg: { x: 0, y: 0, z: 0 }
    });

    console.log('🔄 Aircraft reset to cruise configuration');
  }, []);

  return {
    // State
    physicsState,
    flightData,
    isInitialized,
    error,
    
    // Controls
    setThrottle,
    setPitch,
    setRoll,
    setYaw,
    updatePhysics,
    
    // Utilities
    resetAircraft,
    
    // Debug info
    debugData: physicsServiceRef.current?.debugData || {}
  };
};