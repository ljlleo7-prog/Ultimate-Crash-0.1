import { useState, useCallback } from 'react';

/**
 * useFlightState - Manages flight data state separately from physics
 */
export function useFlightState() {
  const [flightData, setFlightData] = useState({
    altitude: 0,
    airspeed: 0,
    indicatedAirspeed: 0,
    verticalSpeed: 0,
    pitch: 0,
    roll: 0,
    heading: 0,
    throttle: 0,
    flapsValue: 0,
    gearValue: true,
    systems: {}
  });

  const updateFromPhysics = useCallback((physicsState, physicsService) => {
    if (!physicsState || !physicsService) return;

    const altitude = Math.max(0, physicsState.position.z) * 3.28084;
    const airspeeds = physicsService.calculateAirspeeds();
    const engineThrottles = Array.isArray(physicsState.engineThrottles)
      ? physicsState.engineThrottles
      : (Array.isArray(physicsState.controls?.throttles)
        ? physicsState.controls.throttles
        : [physicsState.controls?.throttle ?? 0, physicsState.controls?.throttle ?? 0]);

    setFlightData({
      altitude,
      airspeed: airspeeds?.trueAirspeed ?? 0,
      indicatedAirspeed: airspeeds?.indicatedAirspeed ?? 0,
      groundSpeed: airspeeds?.groundSpeed ?? 0,
      verticalSpeed: physicsState.verticalSpeed ?? 0,
      pitch: (physicsState.orientation?.theta ?? 0) * 180 / Math.PI,
      roll: (physicsState.orientation?.phi ?? 0) * 180 / Math.PI,
      heading: ((physicsState.orientation?.psi ?? 0) * 180 / Math.PI + 360) % 360,
      throttle: (physicsState.controls?.throttle ?? 0) * 100,
      controls: physicsState.controls ?? {},
      engineThrottles,
      engineN1: Array.isArray(physicsState.engineParams?.n1) ? physicsState.engineParams.n1 : [],
      engineN2: Array.isArray(physicsState.engineParams?.n2) ? physicsState.engineParams.n2 : [],
      engineEGT: Array.isArray(physicsState.engineParams?.egt) ? physicsState.engineParams.egt : [],
      engineFuelFlow: Array.isArray(physicsState.engineParams?.fuelFlow) ? physicsState.engineParams.fuelFlow : [],
      autopilotEngaged: physicsState.autopilot?.engaged === true,
      autopilotMode: physicsState.autopilot?.mode ?? null,
      autopilotTargets: physicsState.autopilotTargets ?? physicsState.autopilot?.targets ?? null,
      autopilotDebug: physicsState.autopilotDebug ?? {},
      approachTelemetry: physicsState.approachTelemetry ?? null,
      flapsValue: physicsState.flaps ?? 0,
      gearValue: physicsState.gear ?? false,
      fuel: physicsState.fuel ?? 0,
      hasCrashed: physicsState.hasCrashed,
      systems: physicsState.systems ?? {},
      position: physicsState.position ?? null,
      derived: physicsState.derived ?? null,
      currentWaypointIndex: physicsState.currentWaypointIndex ?? 0
    });
  }, []);

  return { flightData, updateFromPhysics };
}
