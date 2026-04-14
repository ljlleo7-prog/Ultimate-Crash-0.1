import { useRef, useCallback } from 'react';

/**
 * useFlightControls - Manages control inputs separately
 */
export function useFlightControls(physicsService) {
  const controlsRef = useRef({
    throttle: 0,
    engineThrottles: null,
    pitch: 0,
    roll: 0,
    yaw: 0,
    trim: 0
  });

  const resolvePhysicsService = useCallback(() => (
    physicsService && typeof physicsService === 'object' && 'current' in physicsService
      ? physicsService.current
      : physicsService
  ), [physicsService]);

  const setThrottle = useCallback((value) => {
    const normalized = Math.max(-0.7, Math.min(1, value));
    controlsRef.current.throttle = normalized;
    controlsRef.current.engineThrottles = null;
  }, []);

  const setEngineThrottle = useCallback((engineIndex, value) => {
    const service = resolvePhysicsService();
    const normalized = Math.max(-0.7, Math.min(1, value));
    if (service?.setEngineThrottle) {
      service.setEngineThrottle(engineIndex, normalized);
    }

    const engineCount = service?.engines?.length || 2;
    const throttles = Array.isArray(controlsRef.current.engineThrottles)
      ? [...controlsRef.current.engineThrottles]
      : Array(engineCount).fill(controlsRef.current.throttle);

    throttles[engineIndex] = normalized;
    controlsRef.current.engineThrottles = throttles;
    controlsRef.current.throttle = normalized;
  }, [resolvePhysicsService]);

  const setPitch = useCallback((value) => {
    const normalized = Math.abs(value) <= 1 ? value : value / 100;
    controlsRef.current.pitch = normalized * 25 * Math.PI / 180;
  }, []);

  const setRoll = useCallback((value) => {
    const normalized = Math.abs(value) <= 1 ? value : value / 100;
    controlsRef.current.roll = normalized * 30 * Math.PI / 180;
  }, []);

  const setYaw = useCallback((value) => {
    controlsRef.current.yaw = value * 30 * Math.PI / 180;
  }, []);

  const setTrim = useCallback((value) => {
    const service = resolvePhysicsService();
    const normalized = Math.abs(value) <= 1 ? value : value / 100;
    const trimValue = normalized * 0.2;
    controlsRef.current.trim = trimValue;
    if (service?.setTrim) {
      service.setTrim(trimValue);
    }
  }, [resolvePhysicsService]);

  const setFlaps = useCallback((value) => {
    resolvePhysicsService()?.setFlaps?.(value);
  }, [resolvePhysicsService]);

  const setAirBrakes = useCallback((value) => {
    resolvePhysicsService()?.setAirBrakes?.(value);
  }, [resolvePhysicsService]);

  const setGear = useCallback((value) => {
    resolvePhysicsService()?.setGear?.(value);
  }, [resolvePhysicsService]);

  const getControls = useCallback(() => controlsRef.current, []);

  return {
    setThrottle,
    setEngineThrottle,
    setPitch,
    setRoll,
    setYaw,
    setTrim,
    setFlaps,
    setAirBrakes,
    setGear,
    getControls
  };
}
