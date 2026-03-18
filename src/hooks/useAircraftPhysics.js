import { useState, useCallback, useEffect, useRef } from 'react';
import RealisticFlightPhysicsService from '../services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../services/aircraftService.js';
import { airportService } from '../services/airportService.js';
import { usePhysicsLoop } from './usePhysicsLoop.js';
import { useFlightControls } from './useFlightControls.js';
import { PhysicsCoordinator } from '../services/PhysicsCoordinator.js';

export function useAircraftPhysics(config = {}, autoStart = true) {
  const [flightData, setFlightData] = useState({
    altitude: 0,
    airspeed: 0,
    verticalSpeed: 0,
    pitch: 0,
    roll: 0,
    heading: 0,
    systems: {}
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const physicsServiceRef = useRef(null);
  const coordinatorRef = useRef(null);

  const updateFlightData = useCallback((newState) => {
    if (!newState || !physicsServiceRef.current) return;

    const service = physicsServiceRef.current;
    const airspeeds = service.calculateAirspeeds();

    setFlightData({
      altitude: Math.max(0, newState.position.z) * 3.28084,
      airspeed: airspeeds?.trueAirspeed || 0,
      indicatedAirspeed: airspeeds?.indicatedAirspeed || 0,
      verticalSpeed: newState.verticalSpeed || 0,
      pitch: newState.orientation.theta * 180 / Math.PI,
      roll: newState.orientation.phi * 180 / Math.PI,
      heading: (newState.orientation.psi * 180 / Math.PI + 360) % 360,
      throttle: newState.controls?.throttle * 100 || 0,
      hasCrashed: newState.hasCrashed,
      systems: newState.systems || {}
    });
  }, []);

  const controls = useFlightControls(physicsServiceRef.current);

  const updateWithControls = useCallback((newState) => {
    if (physicsServiceRef.current && controls.getControls) {
      const currentControls = controls.getControls();
      physicsServiceRef.current.update(currentControls, 1/60);
    }
    updateFlightData(newState);
  }, [controls, updateFlightData]);

  const { startLoop, stopLoop, setTimeScale } = usePhysicsLoop(
    physicsServiceRef.current,
    updateWithControls
  );

  useEffect(() => {
    async function init() {
      try {
        const db = await loadAircraftData().catch(() => null);
        const aircraft = db?.find(a => a.model === config.aircraftModel) || db?.[0] || {
          name: 'Boeing 737-800',
          mass: 41410,
          maxThrustPerEngine: 120000,
          engineCount: 2
        };

        const service = new RealisticFlightPhysicsService(
          { ...aircraft, ...config },
          config.initialLatitude,
          config.initialLongitude,
          config.difficulty
        );

        if (service.setInitialConditions) {
          service.setInitialConditions({
            latitude: config.initialLatitude,
            longitude: config.initialLongitude,
            altitude: config.initialAltitude,
            speed: config.initialSpeed,
            orientation: { psi: (config.initialHeading || 0) * Math.PI / 180, theta: 0, phi: 0 },
            flightPlan: config.flightPlan,
            difficulty: config.difficulty,
            failureType: config.failureType
          });

          const airport = config.departure?.iata || config.arrival?.iata;
          const runway = config.departureRunway || config.arrivalRunway;
          if (airport) {
            const geometry = airportService.getRunwayGeometry(airport, runway);
            if (geometry) service.setRunwayGeometry(geometry);
          }
        }

        physicsServiceRef.current = service;
        coordinatorRef.current = new PhysicsCoordinator(service);
        setIsInitialized(true);
      } catch (err) {
        setError(err.message);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (autoStart && isInitialized) startLoop();
    return () => stopLoop();
  }, [autoStart, isInitialized, startLoop, stopLoop]);

  return {
    flightData,
    isInitialized,
    error,
    physicsService: physicsServiceRef.current,
    ...controls,
    setMotionEnabled: useCallback((enabled) => {
      coordinatorRef.current?.setMotionEnabled(enabled);
    }, []),
    setEnvironment: useCallback((env) => {
      coordinatorRef.current?.updateEnvironment(env);
    }, []),
    updateFlightPlan: useCallback((plan) => {
      physicsServiceRef.current?.updateFlightPlan(plan);
    }, []),
    performSystemAction: useCallback((system, action, value) => {
      physicsServiceRef.current?.performSystemAction(system, action, value);
    }, []),
    setTimeScale
  };
}
