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

  const setThrottle = useCallback((value) => {
    const normalized = Math.max(-0.7, Math.min(1, value));
    controlsRef.current.throttle = normalized;
    controlsRef.current.engineThrottles = null;
  }, []);

  const setEngineThrottle = useCallback((engineIndex, value) => {
    const normalized = Math.max(-0.7, Math.min(1, value));
    if (physicsService?.setEngineThrottle) {
      physicsService.setEngineThrottle(engineIndex, normalized);
    }

    const engineCount = physicsService?.engines?.length || 2;
    const throttles = Array.isArray(controlsRef.current.engineThrottles)
      ? [...controlsRef.current.engineThrottles]
      : Array(engineCount).fill(controlsRef.current.throttle);

    throttles[engineIndex] = normalized;
    controlsRef.current.engineThrottles = throttles;
    controlsRef.current.throttle = normalized;
  }, [physicsService]);

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
    const normalized = Math.abs(value) <= 1 ? value : value / 100;
    const trimValue = normalized * 0.2;
    controlsRef.current.trim = trimValue;
    if (physicsService?.setTrim) {
      physicsService.setTrim(trimValue);
    }
  }, [physicsService]);

  const setFlaps = useCallback((value) => {
    if (physicsService?.setFlaps) {
      physicsService.setFlaps(value);
    }
  }, [physicsService]);

  const setGear = useCallback((value) => {
    if (physicsService?.setGear) {
      physicsService.setGear(value);
    }
  }, [physicsService]);

  const getControls = useCallback(() => controlsRef.current, []);

  return {
    setThrottle,
    setEngineThrottle,
    setPitch,
    setRoll,
    setYaw,
    setTrim,
    setFlaps,
    setGear,
    getControls
  };
}
