
/**
 * Maps the internal physics state to the View Model (Flight Data) for the UI.
 */
export const mapPhysicsStateToViewModel = (newState, physicsService, currentControlsRef) => {
    if (!newState) return null;

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

    // Sync throttle from physics service if AP is engaged
    let actualThrottle = currentControlsRef.current.throttle;
    if (
        autopilotEngaged &&
        physicsService &&
        physicsService.state &&
        physicsService.state.controls &&
        typeof physicsService.state.controls.throttle === 'number'
    ) {
        actualThrottle = physicsService.state.controls.throttle;
    }

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

    return {
        altitude: altitude,
        airspeed: trueAirspeed,
        indicatedAirspeed: indicatedAirspeed,
        groundSpeed: groundSpeed,
        verticalSpeed: verticalSpeed,
        pitch: newState.orientation.theta * 180 / Math.PI,
        roll: newState.orientation.phi * 180 / Math.PI,
        heading: typeof newState.heading === 'number' ? newState.heading : (newState.orientation.psi * 180 / Math.PI + 360) % 360,
        throttle: actualThrottle * 100,
        engineThrottles: currentControlsRef.current.engineThrottles ? currentControlsRef.current.engineThrottles.map(t => t * 100) : [actualThrottle * 100, actualThrottle * 100],
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
        engineFuelFlow: newState.engineParams?.fuelFlow !== undefined ? newState.engineParams.fuelFlow : [0, 0],
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
};
