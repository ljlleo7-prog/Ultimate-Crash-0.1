import { useState, useCallback, useEffect, useRef } from 'react';
import RealisticFlightPhysicsService from '../services/RealisticFlightPhysicsService.js';
import { loadAircraftData } from '../services/aircraftService.js';
import { airportService } from '../services/airportService.js';
import { usePhysicsLoop } from './usePhysicsLoop.js';
import { useFlightControls } from './useFlightControls.js';
import { useFlightState } from './useFlightState.js';
import { PhysicsCoordinator } from '../services/PhysicsCoordinator.js';

export function useAircraftPhysics(config = {}, autoStart = true) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [physicsState, setPhysicsState] = useState(null);
  const physicsServiceRef = useRef(null);
  const coordinatorRef = useRef(null);

  const { flightData, updateFromPhysics } = useFlightState();

  const handlePhysicsUpdate = useCallback((newState) => {
    if (!physicsServiceRef.current) return;

    const resolvedState = physicsServiceRef.current.getOutputState?.() ?? newState;
    if (!resolvedState) return;

    setPhysicsState(resolvedState);
    updateFromPhysics(resolvedState, physicsServiceRef.current);
  }, [updateFromPhysics]);

  const controls = useFlightControls(physicsServiceRef);

  const { startLoop, stopLoop, updatePhysics: loopUpdatePhysics, setTimeScale, timeScale } = usePhysicsLoop(
    physicsServiceRef,
    handlePhysicsUpdate
  );

  const updatePhysics = useCallback((dt = 1 / 60) => {
    if (!physicsServiceRef.current) return null;
    return loopUpdatePhysics(dt, controls.getControls ? controls.getControls() : {});
  }, [loopUpdatePhysics, controls]);

  useEffect(() => {
    if (physicsServiceRef.current) {
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        const db = await loadAircraftData().catch(() => null);
        if (cancelled || physicsServiceRef.current) return;

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

          const departureAirport = config.departure?.iata || config.departure?.icao;
          const arrivalAirport = config.arrival?.iata || config.arrival?.icao;
          const airport = config.arrivalRunway && arrivalAirport
            ? arrivalAirport
            : departureAirport || arrivalAirport;
          const runway = config.arrivalRunway || config.departureRunway;
          if (airport && runway) {
            const geometry = airportService.getRunwayGeometry(airport, runway);
            if (geometry) service.setRunwayGeometry(geometry);
          }
        }

        if (config.scenarioRestrictions?.autopilotForbidden && typeof service.setAutopilot === 'function') {
          service.setAutopilot(false);
        }

        if (cancelled || physicsServiceRef.current) return;

        // Apply initial wind so TAS ≠ GS from frame 0
        if (config.windSpeedKts != null || config.windDirection != null) {
          service.setEnvironment({
            windSpeed: config.windSpeedKts ?? 0,
            windDirection: config.windDirection ?? 0,
          });
        }

        physicsServiceRef.current = service;
        coordinatorRef.current = new PhysicsCoordinator(service);
        handlePhysicsUpdate(service.getOutputState ? service.getOutputState() : null);
        setIsInitialized(true);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }
    init();

    return () => {
      cancelled = true;
    };
  }, [
    handlePhysicsUpdate,
    config.aircraftModel,
    config.initialLatitude,
    config.initialLongitude,
    config.initialAltitude,
    config.initialSpeed,
    config.initialHeading,
    config.flightPlan,
    config.difficulty,
    config.failureType,
    config.departure,
    config.arrival,
    config.departureRunway,
    config.arrivalRunway
  ]);

  useEffect(() => {
    if (autoStart && isInitialized) startLoop();
    return () => stopLoop();
  }, [autoStart, isInitialized, startLoop, stopLoop]);

  return {
    flightData,
    physicsState,
    isInitialized,
    error,
    getCurrentOutputState: useCallback(() => {
      return physicsServiceRef.current?.getOutputState?.() ?? null;
    }, []),
    isCrashed: physicsState?.hasCrashed || physicsServiceRef.current?.crashed || false,
    physicsService: physicsServiceRef.current,
    resetAircraft: useCallback(() => {
      physicsServiceRef.current?.reset?.();
      const state = physicsServiceRef.current?.getOutputState?.();
      handlePhysicsUpdate(state);
    }, [handlePhysicsUpdate]),
    updatePhysics,
    ...controls,
    setMotionEnabled: useCallback((enabled) => {
      coordinatorRef.current?.setMotionEnabled(enabled);
    }, []),
    setEnvironment: useCallback((env) => {
      coordinatorRef.current?.updateEnvironment(env);
      const state = physicsServiceRef.current?.getOutputState?.();
      handlePhysicsUpdate(state);
    }, [handlePhysicsUpdate]),
    updateFlightPlan: useCallback((plan) => {
      physicsServiceRef.current?.updateFlightPlan(plan);
      const state = physicsServiceRef.current?.getOutputState?.();
      handlePhysicsUpdate(state);
    }, [handlePhysicsUpdate]),
    performSystemAction: useCallback((system, action, value) => {
      physicsServiceRef.current?.performSystemAction(system, action, value);
      const state = physicsServiceRef.current?.getOutputState?.();
      handlePhysicsUpdate(state);
    }, [handlePhysicsUpdate]),
    setTimeScale,
    timeScale
  };
}
