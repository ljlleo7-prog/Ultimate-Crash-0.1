/**
 * PID Controller for Autopilot Systems
 */

// Import the new multi-engine system
import { PropulsionManager } from './PropulsionManager.js';
import { ParameterValidator } from '../utils/ParameterValidator.js';
import eventBus, { EventTypes } from './eventBus.js';
class PIDController {
  constructor(kp, ki, kd, outputMin = -1, outputMax = 1) {
    this.kp = kp; // Proportional gain
    this.ki = ki; // Integral gain
    this.kd = kd; // Derivative gain
    this.outputMin = outputMin;
    this.outputMax = outputMax;
    
    this.previousError = 0;
    this.integral = 0;
    this.lastTime = 0;
  }
  
  /**
   * Calculate PID output
   * @param {number} setpoint - Target value
   * @param {number} currentValue - Current measured value
   * @param {number} dt - Time step in seconds
   * @returns {number} PID controller output
   */
  calculate(setpoint, currentValue, dt) {
    // Calculate error
    const error = setpoint - currentValue;
    
    // Calculate integral term with anti-windup
    this.integral += error * dt;
    this.integral = Math.max(-10, Math.min(10, this.integral)); // Anti-windup limit
    
    // Calculate derivative term
    const derivative = (error - this.previousError) / dt;
    this.previousError = error;
    
    // Calculate PID output
    let output = this.kp * error + this.ki * this.integral + this.kd * derivative;
    
    // Apply output limits
    output = Math.max(this.outputMin, Math.min(this.outputMax, output));
    
    return output;
  }
  
  /**
   * Reset controller state
   */
  reset() {
    this.previousError = 0;
    this.integral = 0;
  }
}

/**
 * New Flight Physics Service - Advanced 6-DOF Aircraft Dynamics with PID Autopilot
 * Implements realistic aerodynamic forces, propulsion, and flight physics
 * 
 * Key Improvements:
 * - Realistic mass calculation (empty weight + fuel + payload)
 * - Correct angle of attack calculation for cruise flight
 * - Proper aerodynamic force directions
 * - PID-controlled autopilot for altitude and speed maintenance
 * - No NaN/Infinity issues with singularity protection
 * - Database integration with complete aircraft properties
 * - Scalable multi-engine system with failure handling
 */

class NewFlightPhysicsService {
  // HARDCODED DEFAULT PARAMETERS
  static DEFAULT_ENVIRONMENT = {
    DENSITY: 1.225,     // kg/m³ at sea level
    PRESSURE: 101325,   // Pa at sea level
    TEMPERATURE: 288.15, // K (15°C) at sea level
    SPEED_OF_SOUND: 340.3 // m/s at sea level
  };

  static DEFAULT_CONTROLS = {
    THROTTLE: 0.05, // 5% idle for takeoff preparation
    TRIM: 0     // Initial trim wheel position
  };

  static DEFAULT_AUTOPILOT_LIMITS = {
    MAX_PITCH: 15 * Math.PI/180, // ±15° pitch limit
    MIN_PITCH: -5 * Math.PI/180, // Don't allow nose-down beyond -5°
    MAX_THROTTLE: 0.95,         // 95% max thrust
    MIN_THROTTLE: 0.20,          // 20% min thrust
    MAX_TRIM: 0.5,               // Max trim adjustment
    MIN_TRIM: -0.5               // Min trim adjustment
  };

  static NOSE_GEAR_PITCH_RATE_LIMIT = -0.5; // radians/s, negative for nose-down

  static DEFAULT_PID_PARAMETERS = {
    ALTITUDE: { Kp: 0.0003, Ki: 0, Kd: 0.001, min: -3, max: 3 },
    SPEED: { Kp: 0.6, Ki: 0, Kd: 0.16, min: -0.3, max: 0.3 },
    HEADING: { Kp: 0.8, Ki: 0.1, Kd: 0.3, min: -0.5, max: 0.5 },
    VS: { Kp: 0.0001, Ki: 0, Kd: 0.0002, min: -0.1, max: 0.1 }
  };

  constructor(aircraft, initialLatitude = 0, initialLongitude = 0) {
    this.aircraft = this.validateAircraftData(aircraft);
    
    // ✅ FIXED: Proper mass calculation (empty weight + fuel + payload)
    this.aircraft.mass = this.aircraft.emptyWeight + this.aircraft.fuelWeight + this.aircraft.payloadWeight;
    
    // Physics constants
    this.GRAVITY = 9.81; // m/s²
    this.AIR_DENSITY_SLA = 1.225; // kg/m³
    this.AIR_GAS_CONSTANT = 287.05; // J/(kg·K) - specific gas constant for air
    this.dt = 1 / 60; // Fixed time step for physics integration (60 Hz)
    
    // Store initial lat/lon for coordinate conversion
    this.initialLatitude = initialLatitude;
    this.initialLongitude = initialLongitude;

    // Debug tracking
    this.noseGearFailed = false;
    this.lastThrottleValue = 0.3; // Start with low throttle
    
    // ✅ NEW: Initialize scalable multi-engine system
    this.propulsionManager = new PropulsionManager({
      engineCount: this.aircraft.engineCount || 2,
      engineConfiguration: this.getEngineConfiguration(this.aircraft.engineCount || 2),
      maxThrustPerEngine: this.aircraft.maxThrustPerEngine || 120000
    });
    
    // Initial state - neutral position on the ground, ready for takeoff
    this.state = {
      position: {
        x: 0,     // North position (m)
        y: 0,     // East position (m)
        z: 0,      // Altitude in meters (0 = on ground)
        latitude: initialLatitude,
        longitude: initialLongitude
      },
      velocity: {
        u: 0,     // Forward velocity (0 KTS)
        v: 0,     // Rightward velocity
        w: 0      // Vertical velocity (body frame, Z-upward)
      },
      orientation: {
        phi: 0,   // Roll angle (0° = level)
        theta: 0, // Initial pitch 0° - level on runway
        psi: 0    // Yaw: 0° (aligned with runway)
      },
      angularRates: {
        p: 0, // Roll rate
        q: 0, // Pitch rate
        r: 0  // Yaw rate
      },
      controls: {
        throttle: NewFlightPhysicsService.DEFAULT_CONTROLS.THROTTLE, // Use default idle
        pitch: 0,       // Neutral elevator
        roll: 0,        // Neutral ailerons
        yaw: 0,         // Neutral rudder
        trim: NewFlightPhysicsService.DEFAULT_CONTROLS.TRIM
      },
      // ✅ NEW: Control surfaces state with proper defaults for takeoff
      flaps: 0,         // 0=UP, will be set to 1 (TO) by takeoff phase
      airBrakes: 0,     // 0=RETRACTED
      gear: true,       // Landing gear DOWN for takeoff
      fuel: this.aircraft.fuelWeight || 2000, // Use flight plan fuel load or default to 2000kg
      frame: 0, // Debug frame counter
      isStalling: false, // NEW: Stall status
      stallWarning: false, // NEW: Stall warning status
      debugPhysics: { // NEW: Debug physics data
        theta: null,
        dynamicPressure_q: null,
        pitchMoment_y: null,
        pitchRate_q: null,
        altitude_z: null,
        isOnGround: null
      }
    };
    
    this.flightPlan = [];
    this.currentWaypointIndex = 0;
    
    // Environment parameters at sea level (will be updated dynamically)
    this.environment = {
      density: 1.225,   // kg/m³ at sea level
      pressure: 101325, // Pa at sea level
      temperature: 288.15, // K (15°C) at sea level
      speedOfSound: 340.3, // m/s at sea level
      wind: { x: 0, y: 0, z: 0 },
      windSpeedKts: Number(this.aircraft.windSpeedKts) || 0
    };
    
    // Force and moment accumulators
    this.aeroForces = { x: 0, y: 0, z: 0 };
    this.thrustForces = { x: 0, y: 0, z: 0 };
    this.gravityForces = { x: 0, y: 0, z: 0 };
    this.totalForces = { x: 0, y: 0, z: 0 };
    
    this.aeroMoments = { x: 0, y: 0, z: 0 };
    this.totalMoments = { x: 0, y: 0, z: 0 };
    
    // Earth frame velocity components
    this.earthFrameVerticalVelocity = 0; // m/s

    
    // 🚁 PID AUTOPILOT SYSTEM
    this.autopilot = {
      enabled: false,
      engaged: false,
      mode: 'LNAV', // 'LNAV' or 'HDG'
      targets: {
        altitude: 0,
        speed: 0,
        heading: 0,
        verticalSpeed: 0
      },
      limits: {
        maxPitch: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MAX_PITCH, // ±15° pitch limit
        minPitch: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MIN_PITCH, // Don't allow nose-down beyond -5°
        maxThrottle: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MAX_THROTTLE,         // 95% max thrust
        minThrottle: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MIN_THROTTLE,          // 20% min thrust
        maxTrim: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MAX_TRIM,
        minTrim: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MIN_TRIM
      },
      unstableFrames: 0,
      disconnectAlert: ''
    };
    
    // Initialize PID Controllers with tuned parameters
    const pidParams = this.aircraft.pidParameters || NewFlightPhysicsService.DEFAULT_PID_PARAMETERS;
    
    // Ensure proper structure for PID parameters
    const altitudeParams = pidParams.altitude || pidParams.ALTITUDE || NewFlightPhysicsService.DEFAULT_PID_PARAMETERS.ALTITUDE;
    const speedParams = pidParams.speed || pidParams.SPEED || NewFlightPhysicsService.DEFAULT_PID_PARAMETERS.SPEED;
    const headingParams = pidParams.heading || pidParams.HEADING || NewFlightPhysicsService.DEFAULT_PID_PARAMETERS.HEADING;
    const vsParams = pidParams.vs || pidParams.VS || NewFlightPhysicsService.DEFAULT_PID_PARAMETERS.VS;
    
    this.pidControllers = {
      altitude: new PIDController(
        altitudeParams.Kp, // Kp - altitude error to pitch response
        altitudeParams.Ki, // Ki - eliminate steady-state error
        altitudeParams.Kd,  // Kd - damping for smooth control
        altitudeParams.min,   // min pitch
        altitudeParams.max     // max pitch
      ),
      speed: new PIDController(
        speedParams.Kp,    // Kp - speed error to throttle response
        speedParams.Ki,   // Ki - eliminate steady-state error
        speedParams.Kd,    // Kd - damping for smooth response
        speedParams.min,   // min throttle change
        speedParams.max     // max throttle change
      ),
      heading: new PIDController(
        headingParams.Kp,    // Kp - heading error to roll response
        headingParams.Ki,    // Ki - eliminate steady-state error
        headingParams.Kd,    // Kd - damping
        headingParams.min,   // min roll
        headingParams.max     // max roll
      ),
      vs: new PIDController(
        vsParams.Kp,    // Kp - VS error to trim response
        vsParams.Ki,    // Ki - eliminate steady-state error
        vsParams.Kd,    // Kd - damping
        vsParams.min,   // min trim
        vsParams.max     // max trim
      )
    };
    
    // Store previous control values for smooth transitions
    this.previousControls = { ...this.state.controls };
  }
  
  /**
   * Validate and enhance aircraft data with defaults
   */
  validateAircraftData(aircraft) {
    const defaults = {
      // Physical properties
      wingArea: 125,           // m²
      wingSpan: 35.8,           // m
      maxLiftCoefficient: 1.4,   // CLmax
      
      // Mass properties
      fuelWeight: 0,            // kg (will be calculated)
      payloadWeight: 0,         // kg (will be calculated)
      
      // Engine properties
      engineCount: 2,           // Number of engines
      maxThrustPerEngine: 120000, // N per engine
      
      // Aerodynamic coefficients
      liftCurveSlope: 5.7,       // per radian
      zeroLiftDragCoefficient: 0.025, // CD0
      inducedDragFactor: 0.04,   // k factor
      basicLiftCoefficient: 0.5, // Basic CL for clean airfoil at 0 AoA
      
      // Horizontal stabilizer properties (fallbacks)
      horizontalStabilizerArea: 25, // m² (approx 20% of wing area)
      horizontalStabilizerCL: -0.15, // Negative CL for downforce at 0 AoA
      horizontalStabilizerMomentArm: 12.5, // Moment arm from CG to stabilizer in meters
      
      // Control system - more effective power levels
      controlPower: {
        x: 1.2, // Roll power
        y: 1.5, // Pitch power
        z: 1.0  // Yaw power
      },
      
      // Moment of inertia (kg⋅m²)
      momentOfInertiaRoll: 30000,
      momentOfInertiaPitch: 50000,
      momentOfInertiaYaw: 80000
    };
    
    // Merge aircraft data with defaults
    const validated = { ...defaults, ...aircraft };
    
    // Ensure physics properties are numbers
    const numericProps = [
      'wingArea', 'wingSpan', 'maxLiftCoefficient', 'basicLiftCoefficient',
      'emptyWeight', 'fuelWeight', 'payloadWeight', 'mass', 'engineCount', 
      'maxThrustPerEngine', 'liftCurveSlope', 'zeroLiftDragCoefficient', 
      'inducedDragFactor', 'momentOfInertiaRoll', 'momentOfInertiaPitch', 
      'momentOfInertiaYaw', 'horizontalStabilizerArea', 'horizontalStabilizerCL',
      'horizontalStabilizerMomentArm', 'controlPower'
    ];
    
    numericProps.forEach(prop => {
      if (typeof validated[prop] === 'object' && prop === 'controlPower') {
        // Handle nested controlPower object
        validated.controlPower.x = Number(validated.controlPower.x) || defaults.controlPower.x;
        validated.controlPower.y = Number(validated.controlPower.y) || defaults.controlPower.y;
        validated.controlPower.z = Number(validated.controlPower.z) || defaults.controlPower.z;
      } else if (prop === 'emptyWeight') {
        // Calculate mass from weight components if not provided
        validated.emptyWeight = Number(validated.emptyWeight) || 35000; // Default 737-800 empty weight in kg
        validated.fuelWeight = Number(validated.fuelWeight) || 20000; // Default fuel weight in kg
        validated.payloadWeight = Number(validated.payloadWeight) || 8000; // Default payload weight in kg
        validated.mass = validated.emptyWeight + validated.fuelWeight + validated.payloadWeight;
      } else {
        validated[prop] = Number(validated[prop]) || defaults[prop];
      }
    });
    
    // Ensure flap profile is properly initialized with positions array
    if (!validated.flapProfile) {
      validated.flapProfile = {
        positions: [
          { angle: 0, clIncrement: 0, cdIncrement: 0, label: "UP" },
          { angle: 10, clIncrement: 0.3, cdIncrement: 0.015, label: "1" },
          { angle: 20, clIncrement: 0.6, cdIncrement: 0.035, label: "2" },
          { angle: 30, clIncrement: 1.0, cdIncrement: 0.07, label: "FULL" }
        ]
      };
    } else if (!Array.isArray(validated.flapProfile.positions)) {
      validated.flapProfile.positions = [
        { angle: 0, clIncrement: 0, cdIncrement: 0, label: "UP" },
        { angle: 10, clIncrement: 0.3, cdIncrement: 0.015, label: "1" },
        { angle: 20, clIncrement: 0.6, cdIncrement: 0.035, label: "2" },
        { angle: 30, clIncrement: 1.0, cdIncrement: 0.07, label: "FULL" }
      ];
    }

    return validated;
  }

  /**
   * Helper function for deep merging objects.
   * @param {object} target - The target object to merge into.
   * @param {object} source - The source object to merge from.
   * @returns {object} The merged object.
   */
  _deepMerge(target, source) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) && typeof target[key] === 'object' && target[key] !== null) {
          // If both are objects, recurse
          target[key] = this._deepMerge(target[key], source[key]);
        } else {
          // Otherwise, assign the value
          target[key] = source[key];
        }
      }
    }
    return target;
  }
  
  /**
   * ✅ NEW: Get engine configuration based on engine count
   */
  getEngineConfiguration(engineCount) {
    switch (engineCount) {
      case 2:
        return 'twin';
      case 3:
        return 'tri';
      case 4:
        return 'quad';
      default:
        return 'twin'; // Default to twin engine
    }
  }
  
  /**
   * Main physics update step with PID autopilot integration
   * Applies input smoothing, autopilot control, and integrates all forces
   */
  update(input = {}, dt = null) {
    // Use fixed internal time step for consistent 60 Hz simulation
    const timeStep = this.dt;
    // Handle reset input
    if (input.reset) {
      this.reset();
    }
    
    // Handle autopilot engagement/disengagement
    if (input.autopilot !== undefined) {
      this.autopilot.engaged = input.autopilot;
    }
    
    if (input.targets !== undefined) {
      this.updateAutopilotTargets(input.targets);
    }
    
    // Update environment properties based on current altitude
    this.updateEnvironmentProperties();
    
    const manualControls = this.applyManualControls(input);
    
    let controlInputs;
    if (this.autopilot.engaged) {
      const auto = this.calculateAutopilotControls(timeStep);
      controlInputs = {
        ...manualControls,
        throttle: auto.throttle,
        pitch: auto.pitch * 0.05,
        roll: auto.roll,
        yaw: auto.yaw,
        trim: auto.trim
      };
    } else {
      controlInputs = manualControls;
    }
    
    // Apply input smoothing to prevent control oscillations
     this.state.controls.throttle = this.smoothInput(this.state.controls.throttle, controlInputs.throttle, 0.5); // More responsive throttle
     this.state.controls.pitch = this.smoothInput(this.state.controls.pitch, controlInputs.pitch, 0.4); // More responsive pitch
    this.state.controls.roll = this.smoothInput(this.state.controls.roll, controlInputs.roll, 0.4); // More responsive roll
    this.state.controls.yaw = this.smoothInput(this.state.controls.yaw, controlInputs.yaw, 0.3); // More responsive yaw
    this.state.controls.trim = this.smoothInput(this.state.controls.trim, controlInputs.trim || 0, 0.05); // Keep trim slow
    
    // Calculate all forces and moments
    this.calculateAerodynamicForces();
    this.calculatePropulsionForces();
    this.calculateGravitationalForces();
    
    // Sum forces and integrate motion
    this.sumForcesAndMoments();
    this.integrateMotion(timeStep);

    // Update latitude and longitude based on new x, y position
    const { latitude, longitude } = this._convertMetersToLatLon(
      this.state.position.x,
      this.state.position.y,
      this.initialLatitude,
      this.initialLongitude
    );
    this.state.position.latitude = latitude;
    this.state.position.longitude = longitude;

    // Store debug physics data
    const airspeeds = this.calculateAirspeeds();
    const q_debug = 0.5 * this.environment.density * (airspeeds.trueAirspeedMS * airspeeds.trueAirspeedMS);
    
    // Calculate lift and pitch torque for debug
    const cl_debug = this.aircraft.basicLiftCoefficient + this.aircraft.liftCurveSlope * (this.state.orientation.theta - Math.atan2(this.state.velocity.w, this.state.velocity.u));
    const lift_debug = q_debug * Math.max(0, cl_debug) * this.aircraft.wingArea;
    
    this.state.debugPhysics = {
      theta: this.state.orientation.theta,
      dynamicPressure_q: q_debug,
      pitchMoment_y: this.moments.y,
      pitchRate_q: this.state.angularRates.q,
      altitude_z: this.state.position.z,
      isOnGround: this.isOnGround(),
      lift: lift_debug,
      pitchTorque: this.moments.y
    };

    if (this.autopilot && this.autopilot.engaged) {
      this.checkAutopilotStability();
    }

    // Return updated state
    return this.getAircraftState();
  }
  
  /**
   * Calculate autopilot control inputs using PID controllers
   */
  calculateAutopilotControls(dt = this.dt) {
    const currentVS_mps = this.earthFrameVerticalVelocity || 0;
    const currentVS_ftmin = currentVS_mps * 196.85; // Convert m/s to ft/min

    const targetVS_ftmin = this.autopilot.targets.verticalSpeed;
    const vsError_ftmin = targetVS_ftmin - currentVS_ftmin;

    const trimCommand = this.pidControllers.vs.calculate(
      targetVS_ftmin,
      currentVS_ftmin,
      dt
    );

    const limitedTrim = Math.max(
      this.autopilot.limits.minTrim,
      Math.min(this.autopilot.limits.maxTrim, this.state.controls.trim + trimCommand)
    );

    const airspeeds = this.calculateAirspeeds();
    const currentSpeed = airspeeds.indicatedAirspeedMS || 0;
    
    const throttleCommand = this.pidControllers.speed.calculate(
      this.autopilot.targets.speed, 
      currentSpeed, 
      dt
    );
    
    const limitedThrottle = Math.max(
      this.autopilot.limits.minThrottle, 
      Math.min(this.autopilot.limits.maxThrottle, this.state.controls.throttle + throttleCommand)
    );

    // --- HEADING / LNAV LOGIC ---
    let targetHeading = this.autopilot.targets.heading;

    // LNAV: Follow waypoints if flight plan exists AND mode is LNAV
    if (this.autopilot.mode === 'LNAV' && this.flightPlan && this.flightPlan.length > 0 && this.currentWaypointIndex < this.flightPlan.length) {
      const nextWaypoint = this.flightPlan[this.currentWaypointIndex];
      const currentLat = this.state.position.latitude;
      const currentLon = this.state.position.longitude;
      
      if (currentLat !== undefined && currentLon !== undefined) {
        // Calculate distance and bearing to waypoint
        const distance = this._calculateDistance(currentLat, currentLon, nextWaypoint.latitude, nextWaypoint.longitude);
        
        // Switch to next waypoint if within 2km (approx 1 NM)
        if (distance < 2000) {
           this.currentWaypointIndex++;
           // If we have more waypoints, recalculate for the new one immediately
           if (this.currentWaypointIndex < this.flightPlan.length) {
             const newNext = this.flightPlan[this.currentWaypointIndex];
             targetHeading = this._calculateBearing(currentLat, currentLon, newNext.latitude, newNext.longitude);
           }
        } else {
           targetHeading = this._calculateBearing(currentLat, currentLon, nextWaypoint.latitude, nextWaypoint.longitude);
        }
        
        // Update target heading for UI display but keep internal separate if needed
        // For now, we update it so the HDG bug moves to where the plane is going
        this.autopilot.targets.heading = targetHeading;
      }
    }

    // Heading Control (Bank Angle Limit: 15 degrees)
    const currentHeading = (this.state.orientation.psi * 180 / Math.PI + 360) % 360;
    let headingError = targetHeading - currentHeading;
    
    // Normalize error to [-180, 180]
    while (headingError > 180) headingError -= 360;
    while (headingError < -180) headingError += 360;
    
    // Calculate desired bank angle from heading error
    const desiredBank = Math.max(-20, Math.min(20, headingError * 0.8));
    
    // Use PID to generate aileron command to achieve desired bank
    const currentBank = this.state.orientation.phi * 180 / Math.PI;
    const bankError = desiredBank - currentBank;
    const aileronPID = this.pidControllers.heading.calculate(0, -bankError, dt);
    const limitedRoll = Math.max(-1, Math.min(1, aileronPID));
    
    // Simple yaw damper to stabilize yaw rate
    const yawDamper = Math.max(-0.3, Math.min(0.3, -this.state.angularRates.r * 0.05));

    return {
      throttle: limitedThrottle,
      pitch: 0, // Pitch is now controlled by trim when autopilot is engaged
      roll: limitedRoll,
      yaw: yawDamper,
      trim: limitedTrim
    };
  }
  
  /**
   * Apply manual control inputs with safety limits
   */
  applyManualControls(input) {
    // Use input values, but apply safety limits
    // Only use defaults if input values are explicitly undefined (not 0)
    let throttleValue = typeof input.throttle === 'undefined' ? 0.55 : input.throttle;
    
    if (isNaN(throttleValue)) {
      throttleValue = 0.55;
    }
    
    const limitedThrottle = Math.max(-0.7, Math.min(1, throttleValue));
    return {
      pitch: Math.max(this.autopilot.limits.minPitch, Math.min(this.autopilot.limits.maxPitch, typeof input.pitch === 'undefined' ? 0 : input.pitch)),
      throttle: limitedThrottle,
      roll: Math.max(-0.5, Math.min(0.5, typeof input.roll === 'undefined' ? 0 : input.roll)),
      yaw: Math.max(-0.3, Math.min(0.3, typeof input.yaw === 'undefined' ? 0 : input.yaw))
    };
  }
  
 

  /**
   * Update autopilot targets
   */
  updateAutopilotTargets(newTargets) {
    if (newTargets.altitude !== undefined) {
      this.autopilot.targets.altitude = newTargets.altitude;
    }
    if (newTargets.speed !== undefined) {
      this.autopilot.targets.speed = newTargets.speed;
    }
    if (newTargets.heading !== undefined) {
      this.autopilot.targets.heading = newTargets.heading;
    }
  }
  
  /**
   * Enable/disable autopilot with smooth transition
   */
  setAutopilot(enabled) {
    this.autopilot.enabled = enabled;  // Sync enabled field
    this.autopilot.engaged = enabled;
    
    if (enabled) {
      // Reset PID controllers for smooth engagement
      Object.values(this.pidControllers).forEach(controller => controller.reset());
    }
    

  }
  
  /**
   * Get current autopilot status
   */
  getAutopilotStatus() {
    return {
      enabled: this.autopilot.engaged,  // ✅ FIXED: Return engaged state
      engaged: this.autopilot.engaged,
      mode: this.autopilot.mode,
      targets: { ...this.autopilot.targets },
      limits: { ...this.autopilot.limits },
      controllers: {
        altitude: {
          kp: this.pidControllers.altitude.kp,
          ki: this.pidControllers.altitude.ki,
          kd: this.pidControllers.altitude.kd
        },
        speed: {
          kp: this.pidControllers.speed.kp,
          ki: this.pidControllers.speed.ki,
          kd: this.pidControllers.speed.kd
        },
      heading: {
        kp: this.pidControllers.heading.kp,
        ki: this.pidControllers.heading.ki,
        kd: this.pidControllers.heading.kd
      }
      }
    };
  }
  
  /**
   * Tune PID parameters in real-time
   */
  tunePID(controller, kp, ki, kd) {
    if (this.pidControllers[controller]) {
      this.pidControllers[controller].kp = kp;
      this.pidControllers[controller].ki = ki;
      this.pidControllers[controller].kd = kd;
      return true;
    }
    return false;
  }
  
  /**
   * Calculate aerodynamic forces using realistic physics
   */
  calculateAerodynamicForces() {
    const velocity = this.state.velocity;
    const input = this.state.controls;
    
    // Airspeed and dynamic pressure
    const airspeed = Math.sqrt(velocity.u * velocity.u + velocity.v * velocity.v + velocity.w * velocity.w);
    
    // ✅ SAFE: Prevent division by zero
    if (airspeed < 1) {
      this.aeroForces = { x: 0, y: 0, z: 0 };
      this.aeroMoments = { x: 0, y: 0, z: 0 };
      return { forces: { x: 0, y: 0, z: 0 }, moments: { x: 0, y: 0, z: 0 } };
    }
    
    const dynamicPressure = 0.5 * this.environment.density * airspeed * airspeed;
    const q = dynamicPressure;
    
    // Avoid division by zero in beta calculation
    const horizontalSpeed = Math.sqrt(velocity.u * velocity.u + velocity.w * velocity.w);
    
    // ✅ CORRECTED: Proper angle of attack calculation for cruise flight
    // For level cruise flight, aircraft needs positive AoA to generate lift
    // In cruise: aircraft pitched up ~+3°, flight path level, so AoA ≈ +3°
    const flightPathAngle = Math.atan2(velocity.w, velocity.u); // Flight path angle
    const alpha = this.state.orientation.theta - flightPathAngle; // AoA = pitch - flight path
    const beta = horizontalSpeed > 0.1 ? Math.atan2(velocity.v, horizontalSpeed) : 0;
    
    // ✅ SAFE: Normalize angles to prevent extreme values
    const safeAlpha = Math.max(-Math.PI/3, Math.min(Math.PI/3, alpha)); // ±60° limit
    const safeBeta = Math.max(-Math.PI/4, Math.min(Math.PI/4, beta)); // ±45° limit
    
    // ✅ FIXED: Use basic lift coefficient from aircraft database instead of dynamic calculation
    // Start with basic CL for clean airfoil at 0 AoA
    let cl = this.aircraft.basicLiftCoefficient;
    
    // Adjust CL based on angle of attack
    // SafeAlpha is in radians, convert to degrees for more intuitive calculations
    const aoaDegrees = safeAlpha * (180 / Math.PI);
    
    // For cruise flight: +3° pitch, level flight path → +3° AoA → positive lift
    // Apply AoA influence using lift curve slope
    const aoaInfluence = this.aircraft.liftCurveSlope * safeAlpha;
    cl += aoaInfluence;
    
    // ✅ ENHANCED: Drag coefficient with proper AoA effect
    // Cd = Cd₀ + k·Cl² + Cd_alpha·|α| (drag increases with AoA magnitude)
    // PLUS: Direct head-on area effect: sin(|α|) for frontal area increase
    const cdAlpha = 0.3; // Increased drag coefficient slope with AoA
    const frontalAreaFactor = 0.3; // Factor for frontal area increase with AoA
    
    let cd = this.aircraft.zeroLiftDragCoefficient + 
             this.aircraft.inducedDragFactor * cl * cl + 
             cdAlpha * safeAlpha * safeAlpha + // Linear increase with AoA magnitude
             frontalAreaFactor * Math.abs(Math.sin(safeAlpha)); // Head-on area effect

    // ✅ NEW: Apply flaps and airbrake effects
    const flapsResult = this.calculateFlapsEffects(cl, cd);
    cl = flapsResult.cl;
    cd = flapsResult.cd;
    
    // Ensure CL stays within reasonable limits
    cl = Math.max(0, Math.min(this.aircraft.maxLiftCoefficient, cl));

    // ✅ NEW: Stall detection logic (disabled when on ground)
    if (!this.isOnGround()) {
      const stallThreshold = 0.8; // Percentage of maxLiftCoefficient to trigger warning
      if (cl >= this.aircraft.maxLiftCoefficient) {
        this.state.isStalling = true;
        this.state.stallWarning = true;
      } else if (cl >= this.aircraft.maxLiftCoefficient * stallThreshold) {
        this.state.isStalling = false;
        this.state.stallWarning = true;
      } else {
        this.state.isStalling = false;
        this.state.stallWarning = false;
      }
    } else {
      // Reset stall status when on the ground
      this.state.isStalling = false;
      this.state.stallWarning = false;
    }
    
    const airbrakeResult = this.calculateAirbrakeEffects(cl, cd);
    cl = airbrakeResult.cl;
    cd = airbrakeResult.cd;
    
    const gearResult = this.calculateGearEffects(cl, cd);
    cl = gearResult.cl;
    cd = gearResult.cd;
    
    // ✅ NEW: Apply ground effect (increases lift when close to ground)
    const heightAboveGround = Math.max(0.1, this.state.position.z);
    const wingSpan = this.aircraft.wingSpan || 35.8;
    const groundEffectFactor = 1.0 + Math.exp(-2.0 * heightAboveGround / wingSpan) * 0.15;
    
    // Calculate aerodynamic forces
    const lift = q * cl * this.aircraft.wingArea * groundEffectFactor; // Main wing lift with ground effect
    const drag = q * cd * this.aircraft.wingArea / groundEffectFactor; // Main wing drag reduced by ground effect
    
    // ✅ NEW: Calculate horizontal stabilizer downforce
    const stabilizerLift = q * this.aircraft.horizontalStabilizerCL * this.aircraft.horizontalStabilizerArea;
    // Stabilizer lift is negative (downforce), so we'll apply it as a downward force
    const stabilizerDownforce = -stabilizerLift;
    
    // ✅ AERODYNAMIC FORCES: Lift acts perpendicular to flight path, drag along flight path
    // Body frame: X=forward, Y=right, Z=upward
    const cosAlpha = Math.cos(safeAlpha);
    const sinAlpha = Math.sin(safeAlpha);
    
    // ✅ CORRECTED: For cruise flight with proper force balance
    // - Lift has +Z component (upward) to balance weight
    // - Drag has -X component (opposing motion)  
    // - Small lift forward component for cruise efficiency
    // - Horizontal stabilizer provides downforce (-Z component)
    const Fx_aero = lift * sinAlpha - drag * cosAlpha;        // Net forward force
    const Fy_aero = q * safeBeta * (this.aircraft.sideForceCoefficient || 0.1); // Side force from sideslip
    const Fz_aero = (lift * cosAlpha + drag * sinAlpha) - stabilizerDownforce; // Net upward force (including stabilizer downforce)
    

    
    // Control surface effects
    const elevatorEffect = input.pitch * (this.aircraft.elevatorEffectiveness || 0.001) * q * this.aircraft.wingArea;
    const aileronEffect = input.roll * (this.aircraft.aileronEffectiveness || 0.0005) * q * this.aircraft.wingArea;
    const rudderEffect = input.yaw * (this.aircraft.rudderEffectiveness || 0.0003) * q * this.aircraft.wingArea;
    
    // TOTAL FORCES in aircraft body frame
    const Fx_total = Fx_aero + elevatorEffect;
    const Fy_total = Fy_aero + aileronEffect + rudderEffect;  
    const Fz_total = Fz_aero;
    
    // ✅ IMPLEMENT REALISTIC TORQUE CALCULATIONS FROM AERODYNAMIC FORCES
    // Drag acts along the flight path and creates significant pitching moments
    // when the aerodynamic center (AC) is offset from the center of gravity (CG)
    
    // Aerodynamic center is typically at 25% chord for subsonic aircraft
    
    const wingChord = this.aircraft.wingArea / this.aircraft.wingSpan; // Approximate chord length
    
    // ✅ ENHANCED: Realistic pitching moments with separate application points
    // Lift acts through AC (25% chord) → creates nose-down moment (negative)
    // Drag acts through drag center (typically more aft) → creates nose-up moment (positive)
    
    // ✅ ENHANCED: Separate moment arm calculations using aircraft-specific values from database
    const acPosition = this.aircraft.aerodynamicCenterPosition || 0.25; // Aerodynamic center position
    const cgPosition = this.aircraft.centerOfGravityPosition || 0.15; // Center of gravity position
    const dragCenterPosition = this.aircraft.dragCenterPosition || 0.75; // Drag center position
    
    // Lift moment arm: AC to CG (lift acts through AC)
    const liftMomentArm = wingChord * (cgPosition - acPosition); // AC behind CG = negative moment
    
    // ✅ ENHANCED: Drag moment arm: Drag center to CG (drag acts through drag center)
    // If drag center is aft of CG, moment arm should be POSITIVE for nose-up moment
    const dragMomentArm = wingChord * (dragCenterPosition - cgPosition); // Much larger moment arm
    
    // ✅ ENHANCED: Lift-induced pitching moment (LIFT THROUGH AC)
    // Lift acting through AC (behind CG) creates nose-down moment (negative)
    const liftPitchingMoment = lift * liftMomentArm;
    
    // ✅ CORRECT PHYSICS: Drag-induced pitching moment
    // Drag acts along flight path through drag center
    // For level flight: drag creates nose-up moment when flight path angle > 0
    const dragPitchingMoment = drag * dragMomentArm * Math.sin(flightPathAngle) * (1 + Math.abs(safeAlpha));
    
    // ✅ NEW: Horizontal stabilizer pitching moment
    // Stabilizer is located aft of CG, so its downforce creates a nose-up moment
    const stabilizerPitchingMoment = stabilizerDownforce * this.aircraft.horizontalStabilizerMomentArm;
    
    // ✅ TOTAL AERODYNAMIC PITCHING MOMENT including stabilizer
    const totalPitchingMoment = liftPitchingMoment + dragPitchingMoment + stabilizerPitchingMoment;
    
    // ✅ NEW: Nose wheel ground reaction moment
    // When on ground, the nose wheel prevents the nose from pitching down
    let noseWheelMoment = 0;
    if (this.isOnGround() && totalPitchingMoment < 0) {
      // Counteract negative (nose-down) aerodynamic moments when on ground
      noseWheelMoment = -totalPitchingMoment;
    }
    
    // ✅ FIXED: Proper elevator trim calculation with aircraft parameters
    const aerodynamicPitchingMoment = totalPitchingMoment + noseWheelMoment;
    
    // ✅ ENHANCED: Parameterized trim calculation
    // Use aircraft-specific control surface parameters (default to realistic values)
    const trimSurfaceAreaRatio = this.aircraft.trimSurfaceAreaRatio || 0.12; // Default: 12% of wing area
    const trimEffectiveness = this.aircraft.trimEffectiveness || 0.1; // Tuned down to 10%
    
    // ✅ COCKPIT TRIM CONTROL: Use trim wheel position from aircraft state
    // Display factor: trimControl / 20,000 = cockpit trim units
    const trimControl = this.state.controls.trim || 0; // Trim wheel position from cockpit
    
    // ✅ FIXED: Define controlPowerY first to avoid reference error
    const controlPowerY = this.aircraft.controlPower?.y || 1.5;
    
    // Convert trim control to elevator deflection
    // elevatorTrim represents the deflection angle needed to generate the trim moment
    const elevatorTrim = trimControl / 10000.0; // Scale trim control to radians/degrees equivalent
    
    // ✅ SAFE: Angular moments with validation
    const rollInertia = Math.max(1000, this.aircraft.momentOfInertiaRoll || 10000);
    const pitchInertia = Math.max(1000, this.aircraft.momentOfInertiaPitch || 15000);
    const yawInertia = Math.max(1000, this.aircraft.momentOfInertiaYaw || 20000);
    
    // ✅ ENHANCED: Calculate total pitching moment including trim effects
    // Multiply by dynamic pressure (q) for realistic moment generation
    // Magnify trim effect to be comparable with control surface authority
    const trimMagnification = 5; // Trim is usually less powerful than full elevator but still significant
    const trimMoment = controlPowerY * q * elevatorTrim * trimMagnification * (this.aircraft.wingArea / 10);
    const totalPitchingMomentWithTrim = aerodynamicPitchingMoment + trimMoment;
    
    // ✅ ENHANCED: Quadratic control curve for pitch and roll to increase control authority
    // This allows more precise control at low inputs and maximum authority at full deflection
    const quadraticPitch = input.pitch * Math.abs(input.pitch); // Quadratic curve for pitch
    const quadraticRoll = input.roll * Math.abs(input.roll); // Quadratic curve for roll
    
    // ✅ MAGNIFIED: Increased pitch control authority to counteract strong natural pitching moments
    const pitchMagnification = 25000; // Increased from 1.8 to 2.5 for better rotation authority
    const rollMagnification = 0.4; 
    
    // ✅ FIXED: Calculate control moments with consistent unit scaling
    // Multiply by dynamic pressure (q) for realistic moment generation
    const rollMoment = (this.aircraft.controlPower.x || 1.2) * q * quadraticRoll * rollMagnification * (this.aircraft.wingArea / 10);
    const pitchMoment = -(this.aircraft.controlPower.y || 1.5) * q * quadraticPitch * pitchMagnification * (this.aircraft.wingArea / 10) + totalPitchingMomentWithTrim; // Negative so pushing is down, pulling is up
    const yawMoment = (this.aircraft.controlPower.z || 1.0) * q * input.yaw * (this.aircraft.wingArea / 10);
    
    // ✅ CRITICAL FIX: Assign forces and moments to class properties
    this.aeroForces = { x: Fx_total, y: Fy_total, z: Fz_total };
    this.aeroMoments = { x: rollMoment, y: pitchMoment, z: yawMoment };
    
    // Update debug physics data
    this.state.debugPhysics = {
      theta: this.state.orientation.theta,
      dynamicPressure_q: q,
      pitchMoment_y: pitchMoment,
      pitchRate_q: this.state.angularRates.q,
      altitude_z: this.state.position.z,
      isOnGround: this.isOnGround(),
      lift: lift,
      pitchTorque: pitchMoment
    };
    

    

    

    
    return {
      forces: { x: Fx_total, y: Fy_total, z: Fz_total },
      moments: { x: rollMoment, y: pitchMoment, z: yawMoment }
    };
  }
  
  /**
   * ✅ UPDATED: Calculate propulsion/thrust forces using scalable multi-engine system
   */
  calculatePropulsionForces() {
    const throttle = Math.max(-0.7, Math.min(1, this.state.controls.throttle));
    const altitude_m = this.state.position.z;
    
    // Update propulsion manager with current throttle
    this.propulsionManager.setMasterThrottle(throttle);
    
    // Get proper airspeeds for Mach calculation
    const airspeeds = this.calculateAirspeeds();
    
    // Update environmental conditions
    this.propulsionManager.updateEnvironment(
      altitude_m,
      this.environment.density,
      this.environment.temperature,
      this.environment.humidity || 0.5,
      0,
      0,
      airspeeds.trueAirspeedMS
    );
    
    // Update propulsion system (includes individual engine calculations)
    const propulsionResult = this.propulsionManager.update();
    
    // Apply forces from propulsion system
    this.thrustForces = {
      x: propulsionResult.forces.x || 0,
      y: propulsionResult.forces.y || 0,
      z: propulsionResult.forces.z || 0
    };
    
    // Store individual engine data for display
    this.individualEngineData = propulsionResult.individualThrusts;

    // ✅ PASS TAS TO INDIVIDUAL ENGINES: Use airspeeds.trueAirspeedMS
    if (this.propulsionManager.engines) {
      this.propulsionManager.engines.forEach(engine => {
        engine.updateEnvironment(
          altitude_m,
          this.environment.density,
          this.environment.temperature,
          this.environment.humidity || 0.5,
          airspeeds.trueAirspeedMS
        );
      });
    }
  }
  
  /**
   * ✅ NEW: Calculate flaps effects on aerodynamics
   */
  calculateFlapsEffects(cl, cd) {
    let flapsCl = 0;
    let flapsCd = 0;
    
    // Get the flap profile from the aircraft data or use defaults if not available
    const flapProfile = this.aircraft.flapProfile || {};
    const positions = Array.isArray(flapProfile.positions) ? flapProfile.positions : [
      { angle: 0, clIncrement: 0, cdIncrement: 0, label: "UP" },
      { angle: 10, clIncrement: 0.3, cdIncrement: 0.015, label: "1" },
      { angle: 20, clIncrement: 0.6, cdIncrement: 0.035, label: "2" },
      { angle: 30, clIncrement: 1.0, cdIncrement: 0.07, label: "FULL" }
    ];
    
    // Get the current flap position index
    const flapIndex = Math.max(0, Math.min(this.state.flaps, positions.length - 1));
    const flapPosition = positions[flapIndex];
    
    // Apply the lift and drag increments from the selected flap position
    flapsCl = flapPosition.clIncrement;
    flapsCd = flapPosition.cdIncrement;
    
    // Log flap effects for debugging
    // console.log(`Flaps: Index=${flapIndex}, Angle=${flapPosition.angle}, CL_Inc=${flapsCl}, CD_Inc=${flapsCd}`);
    
    return {
      cl: cl + flapsCl,
      cd: cd + flapsCd
    };
  }
  
  /**
   * Update environment properties based on current altitude
   * Uses standard atmosphere model for accurate environmental calculations
   */
  updateEnvironmentProperties() {
    // ✅ FIXED: Use position.z as positive altitude (no negative conversion needed)
    const altitude_m = this.state.position.z; // Already positive for altitude above ground
    
    // Standard atmosphere calculations
    const temperatureGradient = -0.0065; // K/m (standard lapse rate)
    const temperatureSeaLevel = 288.15; // K (15°C)
    const pressureSeaLevel = 101325; // Pa
    const densitySeaLevel = 1.225; // kg/m³
    
    // Calculate temperature at altitude
    const temperature = temperatureSeaLevel + temperatureGradient * altitude_m;
    
    // Calculate pressure at altitude (barometric formula)
    const pressure = pressureSeaLevel * Math.pow(temperature / temperatureSeaLevel, -this.GRAVITY / (this.AIR_GAS_CONSTANT * temperatureGradient));
    
    // Calculate density at altitude
    const density = pressure / (this.AIR_GAS_CONSTANT * temperature);
    
    // Calculate speed of sound at altitude
    const speedOfSound = Math.sqrt(1.4 * this.AIR_GAS_CONSTANT * temperature);
    
    // Update environment properties
    this.environment = {
      ...this.environment,
      density: isNaN(density) ? 0.379 : density,
      pressure: isNaN(pressure) ? 23840 : pressure,
      temperature: isNaN(temperature) ? 229 : temperature,
      speedOfSound: isNaN(speedOfSound) ? 295 : speedOfSound
    };
  }
  
  /**
   * ✅ FIXED: Calculate proper IAS/TAS conversion based on altitude
   * Uses standard atmosphere model for accurate airspeed calculations
   */
  calculateAirspeeds() {
    const altitude_m = Math.max(0, this.state.position.z);
    const altitude_ft = altitude_m * 3.28084;
    
    // Standard atmosphere calculations
    const temperatureGradient = -0.0065; // K/m (standard lapse rate)
    const temperatureSeaLevel = 288.15; // K (15°C)
    const pressureSeaLevel = 101325; // Pa
    const densitySeaLevel = 1.225; // kg/m³
    
    // Calculate temperature at altitude
    const temperature = temperatureSeaLevel + temperatureGradient * altitude_m;
    const temperatureRatio = temperature / temperatureSeaLevel;
    
    // Calculate pressure at altitude (barometric formula)
    const pressure = pressureSeaLevel * Math.pow(temperatureRatio, -this.GRAVITY / (this.AIR_GAS_CONSTANT * temperatureGradient));
    
    // Calculate density at altitude
    const density = pressure / (this.AIR_GAS_CONSTANT * temperature);
    const densityRatio = density / densitySeaLevel;
    
    // Calculate TAS from current velocity
    const velocity = this.state.velocity;
    const tas_ms = Math.sqrt(velocity.u * velocity.u + velocity.v * velocity.v + velocity.w * velocity.w);
    const tas_kts = tas_ms * 1.94384;
    
    // Calculate IAS from TAS (corrected for air density)
    // IAS = TAS * sqrt(densityRatio)
    const ias_ms = tas_ms * Math.sqrt(densityRatio);
    const ias_kts = ias_ms * 1.94384;
    
    // ✅ SAFE: Ensure all values are valid numbers
    return {
      trueAirspeed: isNaN(tas_kts) ? 0 : tas_kts,
      trueAirspeedMS: isNaN(tas_ms) ? 0 : tas_ms,
      indicatedAirspeed: isNaN(ias_kts) ? 0 : ias_kts,
      indicatedAirspeedMS: isNaN(ias_ms) ? 0 : ias_ms,
      density: isNaN(density) ? 1.225 : density,
      temperature: isNaN(temperature) ? 288.15 : temperature,
      pressure: isNaN(pressure) ? 101325 : pressure,
      densityRatio: isNaN(densityRatio) ? 1.0 : densityRatio,
      altitude_ft: isNaN(altitude_ft) ? 0 : altitude_ft
    };
  }

  /**
   * ✅ FIXED: Calculate airbrake effects on aerodynamics
   */
  calculateAirbrakeEffects(cl, cd) {
    let airbrakeCd = 0;
    let airbrakeCl = 0;
    
    if (this.state.airBrakes > 0) {
      // Get the airbrake profile from the aircraft data or use defaults if not available
      const airbrakeProfile = this.aircraft.airbrakeProfile || {
        hasTwoTier: true,
        airPosition: { dragIncrement: 0.06, liftDecrement: -0.1 },
        groundPosition: { dragIncrement: 0.15, liftDecrement: -0.2 }
      };
      
      // Determine if the aircraft is on the ground or in the air
      const isOnGround = this.isOnGround();
      
      // Apply the appropriate airbrake profile based on the aircraft's state
      if (airbrakeProfile.hasTwoTier) {
        const airbrakePosition = isOnGround ? airbrakeProfile.groundPosition : airbrakeProfile.airPosition;
        airbrakeCd = airbrakePosition.dragIncrement;
        airbrakeCl = airbrakePosition.liftDecrement;
      } else {
        // For single-tier airbrakes, use air position values
        airbrakeCd = airbrakeProfile.airPosition?.dragIncrement || 0.05;
        airbrakeCl = airbrakeProfile.airPosition?.liftDecrement || -0.1;
      }
    }
    
    return {
      cl: cl + airbrakeCl,
      cd: cd + airbrakeCd
    };
  }
  
  /**
   * ✅ NEW: Calculate gear effects on aerodynamics
   */
  calculateGearEffects(cl, cd) {
    let gearCd = 0;
    
    if (this.state.gear) {
      // Landing gear down significantly increases drag
      // Typical gear drag coefficient is around 0.015 - 0.030
      gearCd = this.aircraft.gearDragCoefficient || 0.02;
    }
    
    return {
      cl: cl, // Gear usually has minimal effect on lift
      cd: cd + gearCd
    };
  }

  /**
   * ✅ NEW: Control surface setters
   */
  setFlaps(flaps) {
    // Get the number of flap positions from the aircraft's flap profile or default to 4
    const flapProfile = this.aircraft.flapProfile || { positions: [] };
    const maxFlapPositions = (flapProfile.positions?.length || 1) - 1 || 3;
    this.state.flaps = Math.max(0, Math.min(maxFlapPositions, Math.round(flaps)));

  }
  
  setAirBrakes(position) {
    this.state.airBrakes = Math.max(0, Math.min(1, Math.round(position)));

  }
  
  setGear(gear) {
    // Prevent gear retraction if on the ground
    if (!gear && this.isOnGround()) return;
    this.state.gear = gear;
  }
  
  /**
   * Calculate gravitational forces with CORRECT physics
   * Aircraft body frame: X=forward, Y=right, Z=upward
   * Earth frame: X=forward, Y=right, Z=upward
   */
  calculateGravitationalForces() {
    const weight = this.aircraft.mass * this.GRAVITY;
    
    const phi = this.state.orientation.phi;   // Roll angle
    const theta = this.state.orientation.theta; // Pitch angle  
    
    // ✅ COORDINATE SYSTEM DEFINITION:
    // Earth Frame: X=north, Y=east, Z=upward (positive up)
    // Body Frame: X=forward, Y=right, Z=upward (positive up)
    // Position.z is POSITIVE at altitude (since Z-upward convention)
    
    // ✅ STANDARD AEROSPACE APPROXIMATION: Gravity transformation
    // Gravity acts downward in earth frame: [0, 0, -W]
    // Transform to body frame using simplified rotation matrix
    
    // For small roll angles (coordinated flight), gravity transformation:
    // Forward component: -W * sin(θ) - creates nose-down moment when pitched up
    // Vertical component: -W * cos(θ) - main downward force component
    // Lateral component: 0 (for coordinated flight)
    
    this.gravityForces = {
      x: -weight * Math.sin(theta),     // Forward/backward component
      y: 0,                             // No lateral component (coordinated flight)  
      z: -weight * Math.cos(theta)      // Vertical component (downward)
    };
    
    // Gravity transformation completed
  }
  
  /**
   * Check if aircraft is on the ground
   * Criteria: altitude < ground threshold and vertical speed <= 0
   */
  isOnGround() {
    const groundThreshold = 0.1; // 10 cm above ground
    const verticalSpeedThreshold = 0.1; // m/s - aircraft is moving down or stationary
    return this.state.position.z < groundThreshold && this.earthFrameVerticalVelocity <= verticalSpeedThreshold;
  }
  
  /**
   * Calculate temperature ratio relative to sea level standard atmosphere
   * Uses ISA (International Standard Atmosphere) model
   */
  calculateTemperatureRatio(altitude_m) {
    // Standard atmosphere constants
    const seaLevelTemp = 288.15; // K
    const lapseRate = 0.0065; // K/m (temperature decrease with altitude)
    
    // ISA temperature calculation
    const temperatureK = seaLevelTemp - (lapseRate * altitude_m);
    
    // Return ratio to sea level temperature
    return temperatureK / seaLevelTemp;
  }

  /**
   * Sum all forces and moments
   */
  sumForcesAndMoments() {
    this.forces = {
      x: (this.aeroForces?.x || 0) + (this.thrustForces?.x || 0) + (this.gravityForces?.x || 0),
      y: (this.aeroForces?.y || 0) + (this.thrustForces?.y || 0) + (this.gravityForces?.y || 0),
      z: (this.aeroForces?.z || 0) + (this.thrustForces?.z || 0) + (this.gravityForces?.z || 0)
    };
    
    // Simple ground logic: if on ground, ensure vertical force is upward to prevent sinking
    if (this.isOnGround()) {
      // Set vertical force to 0 when on ground to prevent further downward acceleration
      this.forces.z = Math.max(0, this.forces.z);
    }
    
    this.moments = {
      x: (this.aeroMoments?.x || 0),
      y: (this.aeroMoments?.y || 0),
      z: (this.aeroMoments?.z || 0)
    };
  }
  
  /**
   * Integrate 6-DOF motion equations
   */
  integrateMotion(timeStep = null) {
    const dt = timeStep || this.dt;
    // Linear accelerations (F = ma)
    const ax = this.forces.x / this.aircraft.mass;
    const ay = this.forces.y / this.aircraft.mass;
    const az = this.forces.z / this.aircraft.mass;
    
    // Angular accelerations (M = I * α)
    const alphaX = this.moments.x / this.aircraft.momentOfInertiaRoll;
    const alphaY = this.moments.y / this.aircraft.momentOfInertiaPitch;
    const alphaZ = this.moments.z / this.aircraft.momentOfInertiaYaw;
    
    // Integrate velocities
    this.state.velocity.u += ax * dt;
    this.state.velocity.v += ay * dt;
    this.state.velocity.w += az * dt;
    
    // Integrate angular rates
    this.state.angularRates.p += alphaX * dt;
    this.state.angularRates.q += alphaY * dt;
    this.state.angularRates.r += alphaZ * dt;

    // ✅ NEW: Ground pitch clamping logic
    if (this.isOnGround()) {
      // If pitch is negative, clamp it to 0 and reset angular rates and moments
      if (this.state.orientation.theta < 0) {
        this.state.orientation.theta = 0;
        this.state.angularRates.q = 0; // Clamp pitch angular speed
        this.moments.y = 0; // Clamp pitch angular torque
      }
    }
    
    // ✅ ENHANCED: Variable angular damping based on pitch angle to prevent tailspins
    // Increase damping at extreme pitch angles to prevent uncontrollable spins
    const pitchAngle = Math.abs(this.state.orientation.theta); // Absolute pitch angle in radians
    const extremePitchThreshold = Math.PI / 6; // 30 degrees
    const maxDamping = 0.99; // Stronger damping at extreme angles
    const minDamping = 0.996; // Normal damping at moderate angles
    
    // Calculate damping factor based on pitch angle
    const dampingFactor = pitchAngle > extremePitchThreshold 
      ? maxDamping 
      : minDamping + (maxDamping - minDamping) * (pitchAngle / extremePitchThreshold);
    
    // Apply variable damping to angular rates
    this.state.angularRates.p *= dampingFactor;  // Roll damping
    this.state.angularRates.q *= dampingFactor;  // Pitch damping
    this.state.angularRates.r *= dampingFactor;  // Yaw damping
    
    // ✅ ADDITIONAL: Prevent divergent spins by limiting maximum angular rates
    const maxAngularRate = Math.PI; // 180 degrees per second limit
    this.state.angularRates.p = Math.max(-maxAngularRate, Math.min(maxAngularRate, this.state.angularRates.p));
    this.state.angularRates.q = Math.max(-maxAngularRate, Math.min(maxAngularRate, this.state.angularRates.q));
    this.state.angularRates.r = Math.max(-maxAngularRate, Math.min(maxAngularRate, this.state.angularRates.r));
    
    // Update orientation using body rates
    const p = this.state.angularRates.p;
    const q = this.state.angularRates.q;
    const r = this.state.angularRates.r;
    const phi = this.state.orientation.phi;
    const theta = this.state.orientation.theta;
    const psi = this.state.orientation.psi;
    
    // ✅ CRITICAL FIX: Prevent Euler angle singularities
    // Limit pitch angle to prevent division by zero in psiDot calculation
    const safeTheta = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, theta));
    
    // Euler angle rates with singularity protection
    const phiDot = p + Math.tan(safeTheta) * (q * Math.sin(phi) + r * Math.cos(phi));
    const thetaDot = q * Math.cos(phi) - r * Math.sin(phi);
    const psiDot = (q * Math.sin(phi) + r * Math.cos(phi)) / Math.cos(safeTheta);
    
    // Integrate Euler angles
    this.state.orientation.phi += phiDot * dt;
    this.state.orientation.theta += thetaDot * dt;
    this.state.orientation.psi += psiDot * dt;

    // ✅ GROUND REACTION: Prevent pitching down into the ground
    if (this.isOnGround()) {
      // Nose gear failure condition
      if (this.state.angularRates.q < NewFlightPhysicsService.NOSE_GEAR_PITCH_RATE_LIMIT) {
        if (!this.noseGearFailed) { // Only dispatch event once
          this.noseGearFailed = true;
          eventBus.dispatch(EventTypes.FAILURE_OCCURRED, {
            type: 'Nose Gear Failure',
            message: 'Nose gear has failed due to excessive pitch rate on ground!',
            severity: 'critical'
          });
        }
      }

      if (this.noseGearFailed) {
        // Force nose down if gear failed
        this.state.orientation.theta = Math.min(this.state.orientation.theta, -0.2); // -0.2 radians is about -11 degrees
        if (this.state.angularRates.q < 0) { // Prevent pitching down if nose gear failed
          this.state.angularRates.q = 0;
        }
      } else { // Normal ground clamping when nose gear is not failed
        // Clamp pitch to non-negative
        if (this.state.orientation.theta < 0) {
          this.state.orientation.theta = 0;
        }
        // Clamp negative angular rates if pitch is at or below zero
        if (this.state.orientation.theta <= 0 && this.state.angularRates.q < 0) {
          this.state.angularRates.q = 0;
        }
        // Clamp negative pitching moments if pitch is at or below zero
        if (this.state.orientation.theta <= 0 && this.moments.y < 0) {
          this.moments.y = 0;
        }
      }
    }
    
    // Normalize angles
    this.state.orientation.phi = this.normalizeAngle(this.state.orientation.phi);
    this.state.orientation.theta = this.normalizeAngle(this.state.orientation.theta);
    this.state.orientation.psi = this.normalizeAngle(this.state.orientation.psi);
    
    // Update position
    this.updatePosition(dt);
  }
  
  /**
   * Transform body velocities to earth frame and update position
   * Both body and earth frame: X=forward, Y=right, Z=upward
   */
  updatePosition(dt = null) {
    const timeStep = dt || this.dt;
    const phi = this.state.orientation.phi;
    const theta = this.state.orientation.theta;
    const psi = this.state.orientation.psi;
    
    const u = this.state.velocity.u;   // Forward velocity (body frame)
    const v = this.state.velocity.v;   // Rightward velocity (body frame)
    const w = this.state.velocity.w;   // Upward velocity (body frame)
    
    // ✅ CRITICAL FIX: Body to earth frame transformation
    // All frames use Z=upward convention, so proper transformation
    const xDot = u * Math.cos(theta) * Math.cos(psi) + 
                 v * (Math.sin(phi) * Math.sin(theta) * Math.cos(psi) - Math.cos(phi) * Math.sin(psi)) +
                 w * (Math.cos(phi) * Math.sin(theta) * Math.cos(psi) + Math.sin(phi) * Math.sin(psi));
    
    const yDot = u * Math.cos(theta) * Math.sin(psi) + 
                 v * (Math.sin(phi) * Math.sin(theta) * Math.sin(psi) + Math.cos(phi) * Math.cos(psi)) +
                 w * (Math.cos(phi) * Math.sin(theta) * Math.sin(psi) - Math.sin(phi) * Math.cos(psi));
    
    // ✅ CRITICAL FIX: Corrected Z-axis transformation for proper climb/descent indication
    // When theta > 0 (nose up), u*sin(theta) should give positive zDot (climbing)
    // When w > 0 (positive body upward), it contributes to positive zDot
    const zDot = u * Math.sin(theta) + 
                 v * Math.sin(phi) * Math.cos(theta) + 
                 w * Math.cos(phi) * Math.cos(theta);
    
    // Simple ground logic: if on ground, clamp vertical speed to 0 or positive (can't go down)
    const clampedZDot = this.isOnGround() ? Math.max(0, zDot) : zDot;

    // Store for vertical speed calculation
    this.earthFrameVerticalVelocity = clampedZDot;
    
    // Update position
    this.state.position.x += xDot * timeStep;
    this.state.position.y += yDot * timeStep;
    this.state.position.z += clampedZDot * timeStep;

    // Increment debug frame counter each time position is updated
    this.state.frame = (this.state.frame || 0) + 1;

    if (this.state.position.z < 0) {
      this.state.position.z = 0;
    }
  }
  
  /**
   * Get current aircraft state for display
   */
  getAircraftState() {
    const velocity = this.state.velocity;
    const airspeed = Math.sqrt(velocity.u * velocity.u + velocity.v * velocity.v + velocity.w * velocity.w);
    
    // Calculate derived values
    const heading = (this.state.orientation.psi * 180 / Math.PI + 360) % 360;
    const pitch = this.state.orientation.theta * 180 / Math.PI;
    const roll = this.state.orientation.phi * 180 / Math.PI;
    const altitude_ft = Math.max(0, this.state.position.z) * 3.28084;
    
    // ✅ CRITICAL: Use earth frame vertical velocity for correct vertical speed
    const earthFrameVerticalVelocity = this.earthFrameVerticalVelocity || 0;
    const verticalSpeed = earthFrameVerticalVelocity * 196.85; // Convert m/s to ft/min
    

    
    const windSpeedKts = this.environment && typeof this.environment.windSpeedKts === 'number'
      ? this.environment.windSpeedKts
      : 0;
    const groundSpeed = airspeed * 1.94384 + windSpeedKts;
    
    // Get proper IAS/TAS calculations
    const airspeeds = this.calculateAirspeeds();
    
    // Simulate engine parameters based on separate throttles and altitude
    const engineThrottle0 = Math.max(0, Math.min(1, 
      (this.state.controls.engineThrottles && this.state.controls.engineThrottles[0]) || this.state.controls.throttle || 0.47));
    const engineThrottle1 = Math.max(0, Math.min(1, 
      (this.state.controls.engineThrottles && this.state.controls.engineThrottles[1]) || this.state.controls.throttle || 0.47));
    
    // Get engine performance parameters from database
    const enginePerf = this.aircraft.enginePerformance || {};
    const minN1Idle = enginePerf.minN1Idle || 22;
    const maxN1 = enginePerf.maxN1 || 100;
    
    // Get engine parameters from propulsion manager (uses new formulas)
    const engineData = this.propulsionManager.getEngineData();
    
    // For display purposes, generate parameters for all engines based on actual engine count
    const engineCount = this.aircraft.engineCount || 2;
    const frame = this.state.frame || 0;
    
    // Generate final values with realistic vibrations
    const localVibrationScale = 2;
    
    // Create arrays for each engine parameter
    const n1 = [];
    const n2 = [];
    const egt = [];
    
    // Generate parameters for each engine based on actual engine count
    for (let i = 0; i < engineCount; i++) {
      const engine = engineData[i] || {};
      const randomVibration = (Math.random() - 0.5) * localVibrationScale;
      const engineSpecificVariation = (Math.random() - 0.5) * 1.5;
      
      // Calculate parameters for this engine
      const engineN1 = Math.min(100, Math.max(minN1Idle, (engine.n1 || minN1Idle) + randomVibration + engineSpecificVariation));
      const engineN2 = Math.min(100, Math.max(50, (engine.n2 || 70) + (Math.random() - 0.5) * (localVibrationScale * 0.8) + (Math.random() - 0.5) * 2.0));
      const engineEGT = Math.min(900, Math.max(400, (engine.egt || 500) + (Math.random() - 0.5) * (localVibrationScale * 10) + (Math.random() - 0.5) * 30));
      
      // Add to arrays
      n1.push(engineN1);
      n2.push(engineN2);
      egt.push(engineEGT);
    }
    
    // Return engine parameters as arrays for backward compatibility
    const engineParams = {
      n1: n1,
      n2: n2,
      egt: egt
    };
    
    const throttle = Math.abs(this.state.controls.throttle || 0.47);
    const altitude_m = this.state.position.z;
    const totalThrust = throttle * this.aircraft.engineCount * this.aircraft.maxThrustPerEngine;
     
     // ✅ FIXED: More realistic fuel consumption calculation
     // Account for altitude efficiency effects and use more realistic SFC values
     // Typical SFC for modern turbofans at SL: ~0.000009 kg/N/s, at cruise: ~0.000015 kg/N/s
     const baseSFC = this.aircraft.specificFuelConsumption || 0.000009; // kg/N/s (Reduced for realism)
     const altitudeEfficiencyFactor = Math.max(0.4, 1 - (altitude_m * 0.000025)); // Less efficient at higher altitude
     const fuelFlow = totalThrust * baseSFC * altitudeEfficiencyFactor; // kg/s
    
    this.state.fuel = Math.max(0, (this.state.fuel !== undefined ? this.state.fuel : 100) - fuelFlow * this.dt);
    
    // Check for physics events before returning state
    this.checkPhysicsEvents(altitude_m, altitude_ft, airspeeds.trueAirspeed, airspeeds.indicatedAirspeed);
    
    return {
      // Navigation
      heading: heading,
      trueAirspeed: airspeeds.trueAirspeed,
      groundSpeed: groundSpeed,
      indicatedAirspeed: airspeeds.indicatedAirspeed,
      
      // Flight Pose
      pitch: pitch,
      roll: roll,
      verticalSpeed: verticalSpeed,
      altitude: altitude_ft,
      
      // Engine - arrays for each engine (backward compatibility)
      engineN1: engineParams.n1,
      engineN2: engineParams.n2,
      engineEGT: engineParams.egt,
      // Engine parameters object (for compatibility with SimpleFlightPhysicsService)
      engineParams: engineParams,
      fuel: this.state.fuel !== undefined ? this.state.fuel : 100,
      
      // Systems
      hydraulicPressure: 3000,
      
      // Control surfaces
      flaps: this.state.flaps,
      airBrakes: this.state.airBrakes,
      gear: this.state.gear,
      
      // Autopilot
      autopilot: this.getAutopilotStatus(),
      autopilotTargets: this.autopilot.targets,
      
      // Crash Detection
      crashWarning: this.getCrashWarning(),
      timeToCrash: this.getTimeToCrash(),
      hasCrashed: this.getCrashStatus(),
      alarms: this.getAlarms(),
      noseGearFailed: this.noseGearFailed,
      
      // Physics data for compatibility
      position: { 
        ...this.state.position,
        latitude: this.state.position.latitude,
        longitude: this.state.position.longitude
      },
      velocity: { ...this.state.velocity },
      orientation: { 
        theta: this.state.orientation.theta,
        phi: this.state.orientation.phi,
        psi: this.state.orientation.psi
      },
      airspeed_kts: airspeeds.trueAirspeed,
      airspeed_ms: airspeed,
      altitude_ft: altitude_ft,
      forces: { ...this.forces },
      moments: { ...this.moments },
      aeroForces: { ...this.aeroForces },
      thrustForces: { ...this.thrustForces },
      gravityForces: { ...this.gravityForces },
      
      // Environmental data
      density: airspeeds.density,
      temperature: airspeeds.temperature,
      pressure: airspeeds.pressure,
      densityRatio: airspeeds.densityRatio,
      frame,
      // Debug Physics
      debugPhysics: this.state.debugPhysics
    };
  }
  
  /**
   * Get crash warning status
   */
  getCrashWarning() {
    if (this.autopilot && typeof this.autopilot.disconnectAlert === 'string' && this.autopilot.disconnectAlert) {
      const alert = this.autopilot.disconnectAlert;
      this.autopilot.disconnectAlert = '';
      return alert;
    }
    const altitude_m = this.state.position.z;
    const verticalSpeed_ftmin = this.earthFrameVerticalVelocity * 196.85; // Convert m/s to ft/min
    const timeToCrash = this.getTimeToCrash();
    const airspeeds = this.calculateAirspeeds();
    const indicatedAirspeed = airspeeds.indicatedAirspeed || 0;
    const pitchDeg = this.state.orientation.theta * 180 / Math.PI;
    const bankDeg = Math.abs(this.state.orientation.phi * 180 / Math.PI);
    const stallSpeed = this.aircraft.stallSpeed || 125;

    if (this.earthFrameVerticalVelocity * 196.85 < -2000) {
      return 'SINKRATE';
    }

    if (timeToCrash !== null && timeToCrash <= 20 && verticalSpeed_ftmin < -1000) {
      return 'TERRAIN';
    }

    if (timeToCrash !== null && timeToCrash <= 10 && verticalSpeed_ftmin < -1000) {
      return 'PULL UP';
    }

    if (bankDeg > 45) {
      return 'BANK ANGLE';
    }

    if (indicatedAirspeed < stallSpeed || Math.abs(pitchDeg) > 30) {
      return 'STALL';
    }

    return '';
  }

  checkAutopilotStability() {
    const altitude_m = Math.max(0, this.state.position.z);
    const altitude_ft = altitude_m * 3.28084;
    const targetAltitude_m = this.autopilot && this.autopilot.targets && typeof this.autopilot.targets.altitude === 'number'
      ? this.autopilot.targets.altitude
      : altitude_m;
    const targetAltitude_ft = targetAltitude_m * 3.28084;
    const altitudeErrorFt = targetAltitude_ft - altitude_ft;
    const airspeeds = this.calculateAirspeeds();
    const ias_kts = airspeeds.indicatedAirspeed || 0;
    const targetSpeed_ms = this.autopilot && this.autopilot.targets && typeof this.autopilot.targets.speed === 'number'
      ? this.autopilot.targets.speed
      : airspeeds.indicatedAirspeedMS || 0;
    const targetSpeed_kts = targetSpeed_ms * 1.94384;
    const speedErrorKts = targetSpeed_kts - ias_kts;
    const pitchDeg = this.state.orientation.theta * 180 / Math.PI;
    const bankDeg = Math.abs(this.state.orientation.phi * 180 / Math.PI);
    const verticalSpeedFtMin = (this.earthFrameVerticalVelocity || 0) * 196.85;
    const trimControl = this.state.controls.trim || 0;
    const throttle = this.state.controls.throttle !== undefined ? this.state.controls.throttle : 0;
    const trimUnits = trimControl / 20000;
    const trimLimit = 20;
    const trimSaturated = Math.abs(trimUnits) >= trimLimit - 0.5;
    const minThrottle = this.autopilot.limits && typeof this.autopilot.limits.minThrottle === 'number'
      ? this.autopilot.limits.minThrottle
      : 0.2;
    const maxThrottle = this.autopilot.limits && typeof this.autopilot.limits.maxThrottle === 'number'
      ? this.autopilot.limits.maxThrottle
      : 0.95;
    const throttleSaturated = throttle <= minThrottle + 0.02 || throttle >= maxThrottle - 0.02;
    let unstable = false;
    if (Math.abs(altitudeErrorFt) > 5000) unstable = true;
    if (Math.abs(speedErrorKts) > 100) unstable = true;
    if (Math.abs(pitchDeg) > 35) unstable = true;

  }
  
  /**
   * Calculate time to crash based on current trajectory
   */
  getTimeToCrash() {
    // ✅ FIXED: Use position.z as positive altitude above ground
    if (this.state.position.z < 50) return 0; // Already crashed or very low
    if (this.state.velocity.w < -5) {
      // Calculate time to reach ground level (z = 0)
      const timeToGround = this.state.position.z / Math.abs(this.state.velocity.w);
      return Math.max(0, timeToGround);
    }
    return null;
  }
  
  /**
   * Get crash status
   */
  getCrashStatus() {
    const altitude_m = this.state.position.z;
    const verticalSpeed_ftmin = (this.earthFrameVerticalVelocity || 0) * 196.85;

    const airspeeds = this.calculateAirspeeds();
    const tas_ms = airspeeds.trueAirspeedMS || 0;
    const speedOfSound = this.environment.speedOfSound || NewFlightPhysicsService.DEFAULT_ENVIRONMENT.SPEED_OF_SOUND;

    const p = this.state.angularRates.p || 0;
    const q = this.state.angularRates.q || 0;
    const r = this.state.angularRates.r || 0;

    const hardLanding = altitude_m <= 0 && verticalSpeed_ftmin < -2000;
    const supersonic = tas_ms > speedOfSound;

    const maxAngularRate = this.aircraft.maxAngularRate || 3.0;
    const extremeAngular = Math.abs(p) > maxAngularRate || Math.abs(q) > maxAngularRate || Math.abs(r) > maxAngularRate;

    const mass = this.aircraft.mass || 1;
    const ax = (this.forces?.x || 0) / mass;
    const ay = (this.forces?.y || 0) / mass;
    const az = (this.forces?.z || 0) / mass;
    const accel = Math.sqrt(ax * ax + ay * ay + az * az);
    const maxAccel = 5 * this.GRAVITY;
    const extremeAccel = accel > maxAccel;

    const extremeNumeric =
      !Number.isFinite(airspeeds.indicatedAirspeed) ||
      !Number.isFinite(verticalSpeed_ftmin) ||
      !Number.isFinite(tas_ms) ||
      !Number.isFinite(p) ||
      !Number.isFinite(q) ||
      !Number.isFinite(r);

    return hardLanding || supersonic || extremeAngular || extremeAccel || extremeNumeric;
  }
  
  /**
   * Get system alarms based on current state
   */
  getAlarms() {
    const alarms = [];
    const verticalSpeed_ftmin = this.earthFrameVerticalVelocity * 196.85;
    const timeToCrash = this.getTimeToCrash();
    const airspeeds = this.calculateAirspeeds();
    const indicatedAirspeed = airspeeds.indicatedAirspeed || 0;
    const pitchDeg = this.state.orientation.theta * 180 / Math.PI;
    const bankDeg = Math.abs(this.state.orientation.phi * 180 / Math.PI);
    const stallSpeed = this.aircraft.stallSpeed || 125;

    if (verticalSpeed_ftmin < -2000) {
      alarms.push('SINKRATE');
    }

    if (timeToCrash !== null && timeToCrash <= 20 && verticalSpeed_ftmin < -1000) {
      alarms.push('TERRAIN');
    }

    if (timeToCrash !== null && timeToCrash <= 10 && verticalSpeed_ftmin < -1000) {
      alarms.push('PULL UP');
    }

    if (bankDeg > 45) {
      alarms.push('BANK ANGLE');
    }

    if (indicatedAirspeed < stallSpeed || Math.abs(pitchDeg) > 30) {
      alarms.push('STALL');
    }

    return alarms;
  }
  
  /**
   * Get velocity vector in body frame
   */
  getVelocityVector() {
    return { ...this.state.velocity };
  }
  
  /**
   * Normalize angle to [-π, π] range
   */
  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
  
  /**
   * Smooth input changes to prevent oscillations
   */
  smoothInput(current, target, rate) {
    return current + (target - current) * rate;
  }

  /**
   * Check for critical physics events and emit appropriate events
   */
  checkPhysicsEvents(altitude_m, altitude_ft, tas_kts, ias_kts) {
    const velocity = this.state.velocity;
    const airspeed = Math.sqrt(velocity.u * velocity.u + velocity.v * velocity.v + velocity.w * velocity.w);
    
    // Calculate angle of attack for stall detection
    const flightPathAngle = Math.atan2(velocity.w, velocity.u);
    const alpha = this.state.orientation.theta - flightPathAngle;
    const aoaDegrees = alpha * (180 / Math.PI);
    
    // Stall warning thresholds
    const stallWarningAoA = 15; // degrees
    const stallAoA = 18; // degrees
    
    // High speed warning thresholds
    const highSpeedWarning = 350; // knots IAS
    const highSpeedDanger = 380; // knots IAS (VNE - never exceed speed)
    
    // Altitude warning thresholds
    const altitudeWarningLow = 1000; // feet
    const altitudeWarningVeryLow = 500; // feet
    
    // G-force warning thresholds
    const gForceWarningHigh = 2.5; // positive Gs
    const gForceWarningLow = -1.0; // negative Gs
    
    // Calculate g-forces
    const totalForce = Math.sqrt(
      this.forces.x * this.forces.x + 
      this.forces.y * this.forces.y + 
      this.forces.z * this.forces.z
    );
    const gForce = totalForce / (this.aircraft.mass * 9.81);
    
    // Stall detection
    if (aoaDegrees >= stallAoA && airspeed > 50) {
      eventBus.publishWithMetadata(EventTypes.STALL_OCCURRED, {
        aoa: aoaDegrees,
        airspeed: ias_kts,
        altitude: altitude_ft,
        timestamp: Date.now()
      });
    } else if (aoaDegrees >= stallWarningAoA && airspeed > 50) {
      eventBus.publishWithMetadata(EventTypes.STALL_WARNING, {
        aoa: aoaDegrees,
        airspeed: ias_kts,
        altitude: altitude_ft,
        timeToStall: Math.max(0, (stallAoA - aoaDegrees) / 0.5) // Estimated time in seconds
      });
    }
    
    // High speed detection
    if (ias_kts >= highSpeedDanger) {
      eventBus.publishWithMetadata(EventTypes.HIGH_SPEED_OCCURRED, {
        speed: ias_kts,
        altitude: altitude_ft,
        timestamp: Date.now()
      });
    } else if (ias_kts >= highSpeedWarning) {
      eventBus.publishWithMetadata(EventTypes.HIGH_SPEED_WARNING, {
        speed: ias_kts,
        altitude: altitude_ft,
        deltaToDanger: highSpeedDanger - ias_kts
      });
    }
    
    // Altitude warning
    if (altitude_ft < altitudeWarningVeryLow && this.state.velocity.w < 0) {
      eventBus.publishWithMetadata(EventTypes.ALTITUDE_WARNING, {
        altitude: altitude_ft,
        verticalSpeed: this.earthFrameVerticalVelocity * 196.85, // ft/min
        severity: 'critical'
      });
    } else if (altitude_ft < altitudeWarningLow && this.state.velocity.w < 0) {
      eventBus.publishWithMetadata(EventTypes.ALTITUDE_WARNING, {
        altitude: altitude_ft,
        verticalSpeed: this.earthFrameVerticalVelocity * 196.85, // ft/min
        severity: 'warning'
      });
    }
    
    // G-force warning
    if (Math.abs(gForce) >= gForceWarningHigh || gForce <= gForceWarningLow) {
      eventBus.publishWithMetadata(EventTypes.G_FORCE_WARNING, {
        gForce: gForce.toFixed(2),
        altitude: altitude_ft,
        speed: ias_kts
      });
    }
  }

  /**
   * Reset aircraft to runway conditions
   */
  reset() {
    // Reset to runway conditions (sea level, 0 speed)
    this.setInitialConditions({
      position: {
        x: 0,
        y: 0,
        z: 0  // Altitude: 0 ft (on the ground)
      },
      velocity: {
        u: 0, // Forward velocity: 0 KTS
        v: 0,
        w: 0
      },
      orientation: {
        phi: 0,   // Roll angle (0° = level)
        theta: 0, // Pitch: 0° for runway
        psi: 0    // Yaw: 0° (aligned with runway)
      },
      throttle: 0.3 // 30% thrust for takeoff preparation
    });
  }

  /**
   * Set custom initial conditions for aircraft
   */
  setInitialConditions(conditions) {
    const defaults = {
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      velocity: {
        u: 0,
        v: 0,
        w: 0
      },
      orientation: {
        phi: 0,   // Roll angle (0° = level)
        theta: 0, // Pitch: 0° for takeoff
        psi: 0    // Yaw: 0° (flying North)
      },
      throttle: 0
    };

    const config = { ...defaults, ...conditions };

    // Update state with new initial conditions
    this.state = this._deepMerge({ ...this.state }, {
      position: {
        x: config.position.x,
        y: config.position.y,
        z: config.position.z
      },
      velocity: {
        u: config.velocity.u,
        v: config.velocity.v,
        w: config.velocity.w
      },
      orientation: {
        phi: config.orientation.phi,
        theta: config.orientation.theta,
        psi: config.orientation.psi
      },
      angularRates: {
        p: 0,
        q: 0,
        r: 0
      },
      controls: {
        throttle: config.throttle,
        pitch: 0,
        roll: 0,
        yaw: 0,
        trim: config.trim || 0
      },
      flaps: config.flaps || 0,
      airBrakes: config.airBrakes || 0,
      gear: config.gear !== undefined ? config.gear : (this.state?.gear !== undefined ? this.state.gear : true),
      fuel: this.state?.fuel || (this.aircraft.fuelWeight || 2000)
    });

    // Update environment properties based on new altitude
    this.updateEnvironmentProperties();

    // Reset PID controllers for smooth transition
    Object.values(this.pidControllers).forEach(controller => controller.reset());

    // Update autopilot targets if available
    if (config.position.z !== undefined) {
      this.autopilot.targets.altitude = config.position.z;
    }
    if (config.velocity.u !== undefined) {
      this.autopilot.targets.speed = config.velocity.u;
    }
    if (config.orientation.psi !== undefined) {
      this.autopilot.targets.heading = (config.orientation.psi * 180 / Math.PI + 360) % 360;
    }
    if (Array.isArray(config.flightPlan)) {
      this.flightPlan = config.flightPlan;
      this.currentWaypointIndex = 0;
    }
  }
  
  /**
   * ✅ NEW: Individual engine control methods
   */
  
  /**
   * Set individual engine throttle
   */
  setEngineThrottle(engineIndex, throttle) {
    if (this.propulsionManager) {
      this.propulsionManager.setEngineThrottle(engineIndex, throttle);
    }
  }
  
  /**
   * Set differential throttle for asymmetric thrust
   */
  setDifferentialThrottle(differential) {
    if (this.propulsionManager) {
      this.propulsionManager.setDifferentialThrottle(differential);
    }
  }
  
  /**
   * Set elevator trim
   */
  setTrim(value) {
    this.state.controls.trim = value;
  }
  
  /**
   * Trigger engine failure
   */
  triggerEngineFailure(engineIndex, failureType = 'flameout', severity = 'major', recoveryPossible = false) {
    if (this.propulsionManager) {
      this.propulsionManager.triggerEngineFailure(engineIndex, failureType, severity, recoveryPossible);
    }
  }
  
  /**
   * Recover engine from failure
   */
  recoverEngine(engineIndex) {
    if (this.propulsionManager) {
      return this.propulsionManager.recoverEngine(engineIndex);
    }
    return false;
  }
  
  /**
   * Emergency shutdown all engines
   */
  emergencyShutdown() {
    if (this.propulsionManager) {
      this.propulsionManager.emergencyShutdown();
    }
  }
  
  /**
   * Enable/disable failure simulation
   */
  setFailureSimulation(enabled, failureRate = 0.001) {
    if (this.propulsionManager) {
      this.propulsionManager.simulateRandomFailures(enabled, failureRate);
    }
  }
  
  /**
   * Get individual engine status
   */
  getEngineStatus() {
    if (this.propulsionManager) {
      return this.propulsionManager.getStatus();
    }
    return null;
  }
  
  /**
   * Get individual engine data for display
   */
  getIndividualEngineData() {
    if (this.propulsionManager) {
      const status = this.propulsionManager.getStatus();
      return {
        engines: status.engines,
        totalThrust: status.performance.totalThrust,
        enginesRunning: status.performance.enginesRunning,
        thrustAsymmetry: status.performance.thrustAsymmetry,
        efficiency: status.performance.efficiency
      };
    }
    return null;
  }

  /**
   * Converts x (North) and y (East) positions in meters relative to an initial
   * latitude and longitude into new latitude and longitude coordinates.
   * Uses a simplified equirectangular projection for small distances.
   * @param {number} x_meters - Northward distance in meters.
   * @param {number} y_meters - Eastward distance in meters.
   * @param {number} initialLat - Initial latitude in degrees.
   * @param {number} initialLon - Initial longitude in degrees.
   * @returns {{latitude: number, longitude: number}} New latitude and longitude.
   */
  _convertMetersToLatLon(x_meters, y_meters, initialLat, initialLon) {
    const earthRadius = 6378137; // Earth's radius in meters
    const latRad = (initialLat * Math.PI) / 180;

    // Calculate change in latitude
    const deltaLat = x_meters / earthRadius;
    const newLat = initialLat + (deltaLat * 180) / Math.PI;

    // Calculate change in longitude, accounting for latitude
    const deltaLon = y_meters / (earthRadius * Math.cos(latRad));
    const newLon = initialLon + (deltaLon * 180) / Math.PI;

    return { latitude: newLat, longitude: newLon };
  }

  /**
   * Calculate distance between two points in meters
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6378137; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing from point 1 to point 2 in degrees (0-360)
   */
  _calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    const θ = Math.atan2(y, x);
    const bearing = (θ * 180 / Math.PI + 360) % 360;
    return bearing;
  }
}

export default NewFlightPhysicsService;
