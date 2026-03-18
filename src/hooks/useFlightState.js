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

    setFlightData({
      altitude,
      airspeed: airspeeds?.trueAirspeed || 0,
      indicatedAirspeed: airspeeds?.indicatedAirspeed || 0,
      groundSpeed: airspeeds?.groundSpeed || 0,
      verticalSpeed: physicsState.verticalSpeed || 0,
      pitch: physicsState.orientation.theta * 180 / Math.PI,
      roll: physicsState.orientation.phi * 180 / Math.PI,
      heading: (physicsState.orientation.psi * 180 / Math.PI + 360) % 360,
      throttle: physicsState.controls?.throttle * 100 || 0,
      engineThrottles: physicsState.engineParams?.throttles || [0, 0],
      flapsValue: physicsState.flaps || 0,
      gearValue: physicsState.gear || false,
      fuel: physicsState.fuel || 0,
      hasCrashed: physicsState.hasCrashed,
      systems: physicsState.systems || {}
    });
  }, []);

  return { flightData, updateFromPhysics };
}
