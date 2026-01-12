/**
 * Simple Flight Physics Service - Animation-based simplified physics model
 * Built for rookies and amateurs with realistic flight stage animations
 * while maintaining intuitive controls and responsiveness
 */

class SimpleFlightPhysicsService {
  static DEFAULT_ENVIRONMENT = {
    DENSITY: 1.225,     // kg/m³ at sea level
    PRESSURE: 101325,   // Pa at sea level
    TEMPERATURE: 288.15, // K (15°C) at sea level
    SPEED_OF_SOUND: 340.3 // m/s at sea level
  };

  static DEFAULT_CONTROLS = {
    THROTTLE: 0.3,     // 30% thrust for takeoff preparation
    TRIM: 0,           // Initial trim wheel position
    PITCH_SENSITIVITY: 5.0,  // Pitch sensitivity multiplier
    ROLL_SENSITIVITY: 1.5,   // Roll sensitivity multiplier
    YAW_SENSITIVITY: 2.0     // Yaw sensitivity multiplier
  };

  // Flight stage specific parameters for realistic animations
  static FLIGHT_STAGE_PARAMS = {
    'push-back': {
      speedRange: [0, 5],     // m/s
      verticalSpeed: 0,       // m/s
      pitchRange: [-1, 1],    // degrees
      rollRange: [-2, 2],     // degrees
      throttleResponse: 1.0   // How responsive engine is to throttle
    },
    'taxi': {
      speedRange: [0, 15],    // m/s
      verticalSpeed: 0,       // m/s
      pitchRange: [-1, 1],    // degrees
      rollRange: [-2, 2],     // degrees
      throttleResponse: 1.0   // How responsive engine is to throttle
    },
    'take-off': {
      speedRange: [70, 100],  // m/s
      verticalSpeed: 8,       // m/s
      pitchRange: [5, 15],    // degrees
      rollRange: [-5, 5],     // degrees
      throttleResponse: 1.0   // How responsive engine is to throttle
    },
    'climb': {
      speedRange: [100, 200], // m/s
      verticalSpeed: 5,       // m/s
      pitchRange: [2, 10],    // degrees
      rollRange: [-10, 10],   // degrees
      throttleResponse: 1.0   // How responsive engine is to throttle
    },
    'cruise': {
      speedRange: [220, 240], // m/s
      verticalSpeed: 0,       // m/s (level flight)
      pitchRange: [-2, 2],    // degrees
      rollRange: [-15, 15],   // degrees
      throttleResponse: 1.0   // How responsive engine is to throttle
    },
    'descent': {
      speedRange: [180, 220], // m/s
      verticalSpeed: -4,      // m/s
      pitchRange: [-5, -1],   // degrees
      rollRange: [-10, 10],   // degrees
      throttleResponse: 1.0   // How responsive engine is to throttle
    },
    'landing': {
      speedRange: [60, 80],   // m/s
      verticalSpeed: -2,      // m/s
      pitchRange: [-3, 5],    // degrees
      rollRange: [-5, 5],     // degrees
      throttleResponse: 1.0   // How responsive engine is to throttle
    },
    'shutoff': {
      speedRange: [0, 0],     // m/s
      verticalSpeed: 0,       // m/s
      pitchRange: [0, 0],     // degrees
      rollRange: [0, 0],      // degrees
      throttleResponse: 0     // How responsive engine is to throttle
    }
  };

  constructor(aircraft) {
    this.aircraft = this.validateAircraftData(aircraft);
    this.GRAVITY = 9.81; // m/s²
    this.dt = 0.01; // Time step (10ms)

    // Force accumulators (for compatibility with realistic model)
    this.thrustForces = { x: 0, y: 0, z: 0 };

    // Initial state - on the runway with 0 speed
    this.state = {
      position: {
        x: 0,     // North position (m)
        y: 0,     // East position (m)
        z: 0      // Altitude: 0 ft (on the ground)
      },
      velocity: {
        u: 0,     // Forward velocity: 0 KTS
        v: 0,     // Rightward velocity
        w: 0      // Vertical velocity (body frame, Z-upward)
      },
      orientation: {
        phi: 0,   // Roll angle (0° = level)
        theta: 0, // Pitch angle (0° = level)
        psi: 0    // Yaw: 0° (aligned with runway)
      },
      angularRates: {
        p: 0, // Roll rate
        q: 0, // Pitch rate
        r: 0  // Yaw rate
      },
      controls: {
        throttle: this.aircraft.initialTakeoffThrottle || SimpleFlightPhysicsService.DEFAULT_CONTROLS.THROTTLE,
        pitch: 0,       // Neutral elevator
        roll: 0,        // Neutral ailerons
        yaw: 0,         // Neutral rudder
        trim: SimpleFlightPhysicsService.DEFAULT_CONTROLS.TRIM
      },
      flaps: 0,         // 0=UP, 1=TO, 2=LDG
      airBrakes: 0,     // 0=RETRACTED, 1=EXTENDED
      gear: true,       // Landing gear down for takeoff
      fuel: this.aircraft.fuelWeight || 20000
    };

    // Environment parameters
    this.environment = {
      density: SimpleFlightPhysicsService.DEFAULT_ENVIRONMENT.DENSITY,
      pressure: SimpleFlightPhysicsService.DEFAULT_ENVIRONMENT.PRESSURE,
      temperature: SimpleFlightPhysicsService.DEFAULT_ENVIRONMENT.TEMPERATURE,
      speedOfSound: SimpleFlightPhysicsService.DEFAULT_ENVIRONMENT.SPEED_OF_SOUND,
      wind: { x: 0, y: 0, z: 0 },
      windSpeedKts: Number(this.aircraft.windSpeedKts) || 0
    };

    // Flight stage tracking
    this.currentFlightStage = 'taxi'; // Initial stage (on the runway)
    this.earthFrameVerticalVelocity = 0;
    this.targetVerticalSpeed = 0;
    this.targetAltitude = this.state.position.z; // Stay at ground level initially

    // Engine parameters that respond to throttle and flight stage
    // Support variable engine counts based on aircraft data
    const engineCount = this.aircraft.engineCount || 2;
    this.engineParams = {
      n1: Array(engineCount).fill(22),     // % RPM for each engine
      n2: Array(engineCount).fill(50),     // % RPM for each engine
      egt: Array(engineCount).fill(400),   // °C for each engine
      fuelFlow: Array(engineCount).fill(1000) // kg/h for each engine
    };

    // Store previous control values for smoothing
    this.previousControls = { ...this.state.controls };
    this.previousEngineParams = { ...this.engineParams };
  }

  /**
   * Validate and enhance aircraft data with defaults
   */
  validateAircraftData(aircraft) {
    const defaults = {
      wingArea: 125,           // m²
      wingSpan: 35.8,          // m
      maxLiftCoefficient: 1.4,
      fuelWeight: 20000,
      payloadWeight: 8000,
      engineCount: 2,
      maxThrustPerEngine: 85000,
      liftCurveSlope: 5.7,
      zeroLiftDragCoefficient: 0.025,
      inducedDragFactor: 0.04,
      basicLiftCoefficient: 0.5
    };

    const validated = { ...defaults, ...aircraft };

    // Calculate total mass
    validated.emptyWeight = Number(validated.emptyWeight) || 35000;
    validated.fuelWeight = Number(validated.fuelWeight) || 20000;
    validated.payloadWeight = Number(validated.payloadWeight) || 8000;
    validated.mass = validated.emptyWeight + validated.fuelWeight + validated.payloadWeight;

    // Ensure all properties are numbers
    const numericProps = [
      'wingArea', 'wingSpan', 'maxLiftCoefficient', 'basicLiftCoefficient',
      'engineCount', 'maxThrustPerEngine', 'liftCurveSlope', 'zeroLiftDragCoefficient',
      'inducedDragFactor'
    ];

    numericProps.forEach(prop => {
      validated[prop] = Number(validated[prop]) || defaults[prop];
    });

    return validated;
  }

  /**
   * Update environment properties based on current altitude
   */
  updateEnvironmentProperties() {
    const altitude_m = this.state.position.z;
    const temperatureGradient = -0.0065; // K/m
    const temperatureSeaLevel = 288.15;   // K
    const pressureSeaLevel = 101325;      // Pa
    const densitySeaLevel = 1.225;        // kg/m³

    const temperature = Math.max(216.65, temperatureSeaLevel + temperatureGradient * altitude_m);
    const pressure = pressureSeaLevel * Math.pow(temperature / temperatureSeaLevel, -this.GRAVITY / (287.05 * temperatureGradient));
    const density = pressure / (287.05 * temperature);
    const speedOfSound = Math.sqrt(1.4 * 287.05 * temperature);

    this.environment = {
      ...this.environment,
      density: isNaN(density) ? 0.379 : density,
      pressure: isNaN(pressure) ? 23840 : pressure,
      temperature: isNaN(temperature) ? 229 : temperature,
      speedOfSound: isNaN(speedOfSound) ? 295 : speedOfSound
    };
  }

  /**
   * Detect current flight stage based on aircraft state
   */
  detectFlightStage() {
    const altitude_m = this.state.position.z;
    const altitude_ft = altitude_m * 3.28084;
    const airspeed = Math.sqrt(
      this.state.velocity.u * this.state.velocity.u +
      this.state.velocity.v * this.state.velocity.v +
      this.state.velocity.w * this.state.velocity.w
    );
    const airspeed_kts = airspeed * 1.94384;
    const throttle = this.state.controls.throttle;

    // Flight stage detection based on altitude, airspeed, and vertical velocity
    if (altitude_ft < 10 && airspeed_kts < 5) {
      return throttle > 0.1 ? 'push-back' : 'shutoff';
    } else if (altitude_ft < 100 && airspeed_kts < 40) {
      return 'taxi';
    } else if (altitude_ft < 1000 && airspeed_kts < 180 && this.earthFrameVerticalVelocity > 5) {
      return 'take-off';
    } else if (altitude_ft < 8000 && this.earthFrameVerticalVelocity > 2) {
      return 'climb';
    } else if (altitude_ft >= 8000 && Math.abs(this.earthFrameVerticalVelocity) < 1.0) {
      return 'cruise';
    } else if (altitude_ft > 1000 && this.earthFrameVerticalVelocity < -2) {
      return 'descent';
    } else if (altitude_ft < 1000 && airspeed_kts < 180 && this.earthFrameVerticalVelocity < -2) {
      return 'landing';
    } else {
      return 'cruise'; // Default to cruise for any other state
    }
  }

  /**
   * Main update loop - animation-based approach that focuses on realistic flight stage behavior
   */
  update(input = {}, dt = null) {
    const timeStep = dt || this.dt;

    // Update environment properties
    this.updateEnvironmentProperties();

    // Detect current flight stage
    this.currentFlightStage = this.detectFlightStage();

    // Get flight stage parameters for current stage
    const stageParams = SimpleFlightPhysicsService.FLIGHT_STAGE_PARAMS[this.currentFlightStage] || 
                       SimpleFlightPhysicsService.FLIGHT_STAGE_PARAMS.cruise;

    // Calculate control inputs with smoothing
    const controlInputs = this.applyManualControls(input);
    this.smoothControls(controlInputs);

    // Update engine parameters based on throttle and flight stage
    this.updateEngineParameters(stageParams);

    // Animation-based updates for realistic flight behavior
    this.updateVelocityAnimation(stageParams, timeStep);
    this.updateOrientationAnimation(stageParams, timeStep);
    this.updatePosition(timeStep);
    this.maintainAltitude(stageParams, timeStep);

    // Return updated state
    return this.getAircraftState();
  }

  /**
   * Smooth control inputs to prevent abrupt changes
   */
  smoothControls(controls) {
    const smoothingFactors = {
      throttle: 0.5,
      pitch: 0.4,
      roll: 0.4,
      yaw: 0.3,
      trim: 0.05
    };

    // Smooth each control input
    Object.keys(smoothingFactors).forEach(control => {
      if (control in controls) {
        const currentValue = this.state.controls[control];
        const targetValue = controls[control];
        const smoothingFactor = smoothingFactors[control];
        
        this.state.controls[control] = this.smoothInput(currentValue, targetValue, smoothingFactor);
      }
    });
  }

  /**
   * Update velocity based on flight stage animation parameters
   */
  updateVelocityAnimation(stageParams, dt) {
    const throttle = this.state.controls.throttle;
    const [minSpeed, maxSpeed] = stageParams.speedRange;
    
    // Base speed is mid-range of stage speed range
    const baseSpeed = (minSpeed + maxSpeed) / 2;
    
    // Adjust speed based on throttle - more throttle increases speed within stage range
    const speedOffset = (throttle - 0.5) * (maxSpeed - minSpeed) * 0.8;
    const targetSpeed = Math.max(minSpeed, Math.min(maxSpeed, baseSpeed + speedOffset));
    
    // Smoothly transition to target speed
    const speedDiff = targetSpeed - this.state.velocity.u;
    this.state.velocity.u += speedDiff * 0.005;
    
    // Add slight random variation for realism
    this.state.velocity.u += (Math.random() - 0.5) * 0.1;
    
    // Clamp to speed range
    this.state.velocity.u = Math.max(minSpeed, Math.min(maxSpeed, this.state.velocity.u));
    
    // Update vertical velocity based on flight stage and pitch input
    this.updateVerticalVelocity(stageParams, dt);
    
    // Update lateral velocity based on yaw input
    this.updateLateralVelocity(dt);
  }

  /**
   * Update vertical velocity based on flight stage and pitch input
   */
  updateVerticalVelocity(stageParams, dt) {
    const pitch = this.state.controls.pitch;
    const throttle = this.state.controls.throttle;
    
    // Base vertical speed from flight stage
    let baseVerticalSpeed = stageParams.verticalSpeed;
    
    // Adjust vertical speed based on pitch input (positive pitch = nose up = climb)
    const pitchEffect = pitch * SimpleFlightPhysicsService.DEFAULT_CONTROLS.PITCH_SENSITIVITY;
    
    // Adjust vertical speed based on throttle (more throttle = more climb capability)
    const throttleEffect = (throttle - 0.5) * 2;
    
    // Calculate target vertical velocity
    this.targetVerticalSpeed = baseVerticalSpeed + pitchEffect + throttleEffect;
    
    // Smoothly transition to target vertical speed
    const verticalSpeedDiff = this.targetVerticalSpeed - this.state.velocity.w;
    this.state.velocity.w += verticalSpeedDiff * 0.005;
    
    // Clamp vertical speed for realism
    this.state.velocity.w = Math.max(-15, Math.min(15, this.state.velocity.w));
    
    // Simple ground logic: if on ground, clamp body frame vertical velocity to 0 or positive
    if (this.isOnGround()) {
      this.state.velocity.w = Math.max(0, this.state.velocity.w);
    }
  }

  /**
   * Update lateral velocity based on yaw input
   */
  updateLateralVelocity(dt) {
    const yaw = this.state.controls.yaw;
    
    // Lateral velocity based on yaw input
    const targetLateralVelocity = yaw * 10;
    
    // Smoothly transition to target lateral velocity
    const lateralSpeedDiff = targetLateralVelocity - this.state.velocity.v;
    this.state.velocity.v += lateralSpeedDiff * 0.1;
    
    // Clamp lateral speed for realism
    this.state.velocity.v = Math.max(-10, Math.min(10, this.state.velocity.v));
  }

  /**
   * Update orientation based on flight stage animation parameters
   */
  updateOrientationAnimation(stageParams, dt) {
    const pitch = this.state.controls.pitch;
    const roll = this.state.controls.roll;
    const yaw = this.state.controls.yaw;
    
    // Get pitch and roll ranges for current flight stage
    const [minPitch, maxPitch] = stageParams.pitchRange;
    const [minRoll, maxRoll] = stageParams.rollRange;
    
    // Convert ranges from degrees to radians
    const minPitchRad = minPitch * Math.PI / 180;
    const maxPitchRad = maxPitch * Math.PI / 180;
    const minRollRad = minRoll * Math.PI / 180;
    const maxRollRad = maxRoll * Math.PI / 180;
    
    // Calculate target orientation based on controls and flight stage
    const targetPitch = pitch * SimpleFlightPhysicsService.DEFAULT_CONTROLS.PITCH_SENSITIVITY * Math.PI / 180;
    const targetRoll = roll * SimpleFlightPhysicsService.DEFAULT_CONTROLS.ROLL_SENSITIVITY * Math.PI / 180;
    const targetYaw = yaw * SimpleFlightPhysicsService.DEFAULT_CONTROLS.YAW_SENSITIVITY * Math.PI / 180;
    
    // Smoothly transition to target orientation
    this.state.angularRates.q = this.smoothInput(this.state.angularRates.q, targetPitch * 10, 0.1);
    this.state.angularRates.p = this.smoothInput(this.state.angularRates.p, targetRoll * 10, 0.1);
    this.state.angularRates.r = this.smoothInput(this.state.angularRates.r, targetYaw * 10, 0.1);
    
    // Apply damping to angular rates
    this.state.angularRates.p *= 0.98;
    this.state.angularRates.q *= 0.98;
    this.state.angularRates.r *= 0.98;
    
    // Update orientation angles
    this.state.orientation.phi += this.state.angularRates.p * dt;
    this.state.orientation.theta += this.state.angularRates.q * dt;
    this.state.orientation.psi += this.state.angularRates.r * dt;
    
    // Normalize angles
    this.state.orientation.phi = this.normalizeAngle(this.state.orientation.phi);
    this.state.orientation.theta = this.normalizeAngle(this.state.orientation.theta);
    this.state.orientation.psi = this.normalizeAngle(this.state.orientation.psi);
    
    // Clamp orientation to flight stage ranges
    this.state.orientation.theta = Math.max(minPitchRad, Math.min(maxPitchRad, this.state.orientation.theta));
    this.state.orientation.phi = Math.max(minRollRad, Math.min(maxRollRad, this.state.orientation.phi));
  }

  /**
   * Update position based on velocity and orientation
   */
  updatePosition(dt) {
    const phi = this.state.orientation.phi;
    const theta = this.state.orientation.theta;
    const psi = this.state.orientation.psi;

    const u = this.state.velocity.u;
    const v = this.state.velocity.v;
    const w = this.state.velocity.w;

    // Convert body frame velocities to earth frame
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const cosPsi = Math.cos(psi);
    const sinPsi = Math.sin(psi);

    // Body to earth frame transformation (simplified)
    const xDot = u * cosTheta * cosPsi - v * sinPsi + w * sinTheta * cosPsi;
    const yDot = u * cosTheta * sinPsi + v * cosPsi + w * sinTheta * sinPsi;
    const zDot = u * sinTheta + w * cosTheta;

    // Simple ground logic: if on ground, clamp vertical speed to 0 or positive (can't go down)
    const clampedZDot = this.isOnGround() ? Math.max(0, zDot) : zDot;

    // Store earth frame vertical velocity for flight stage detection
    this.earthFrameVerticalVelocity = clampedZDot;

    // Update position
    this.state.position.x += xDot * dt;
    this.state.position.y += yDot * dt;
    this.state.position.z += clampedZDot * dt;

    // Ensure altitude doesn't go below ground level
    this.state.position.z = Math.max(0, this.state.position.z);
  }

  /**
   * Maintain altitude during cruise flight stage
   */
  maintainAltitude(stageParams, dt) {
    // Only maintain altitude in cruise stage
    if (this.currentFlightStage !== 'cruise') {
      this.targetAltitude = this.state.position.z;
      return;
    }

    // Calculate altitude error
    const altitudeError = this.targetAltitude - this.state.position.z;
    
    // If altitude error is significant, adjust vertical velocity to correct it
    if (Math.abs(altitudeError) > 10) { // More than 10m error
      // Calculate required vertical velocity to correct altitude
      const correctionVelocity = altitudeError * 0.01;
      
      // Apply correction to vertical velocity
      this.state.velocity.w += correctionVelocity * dt * 10;
      
      // Limit correction to prevent extreme vertical speeds
      this.state.velocity.w = Math.max(-3, Math.min(3, this.state.velocity.w));
    } else {
      // If altitude is nearly correct, maintain level flight
      this.state.velocity.w *= 0.99;
    }
  }

  /**
   * Update engine parameters based on throttle and flight stage
   */
  updateEngineParameters(stageParams) {
    const throttle = this.state.controls.throttle;
    const throttleResponse = stageParams.throttleResponse;
    
    // Calculate target engine parameters based on throttle
    const targetN1 = 22 + throttle * 78 * throttleResponse;
    const targetN2 = 50 + throttle * 50 * throttleResponse;
    const targetEGT = 400 + throttle * 400 * throttleResponse;
    const targetFuelFlow = 1000 + throttle * 3000 * throttleResponse;
    
    // Smoothly transition to target parameters for realistic engine response
    // Increased smoothing factor for more gradual, delayed updates
    const smoothingFactor = 0.005;
    
    this.engineParams.n1 = this.engineParams.n1.map(n1 => 
      this.smoothInput(n1, targetN1, smoothingFactor)
    );
    
    this.engineParams.n2 = this.engineParams.n2.map(n2 => 
      this.smoothInput(n2, targetN2, smoothingFactor)
    );
    
    this.engineParams.egt = this.engineParams.egt.map(egt => 
      this.smoothInput(egt, targetEGT, smoothingFactor)
    );
    
    this.engineParams.fuelFlow = this.engineParams.fuelFlow.map(flow => 
      this.smoothInput(flow, targetFuelFlow, smoothingFactor)
    );
  }

  /**
   * Apply manual control inputs with safety limits
   */
  applyManualControls(input) {
    // Control limits to prevent extreme inputs
    return {
      pitch: -Math.max(-0.3, Math.min(0.3, typeof input.pitch === 'undefined' ? 0 : input.pitch)),
      throttle: Math.max(0, Math.min(1, typeof input.throttle === 'undefined' ? 0.55 : input.throttle)),
      roll: Math.max(-0.5, Math.min(0.5, typeof input.roll === 'undefined' ? 0 : input.roll)),
      yaw: Math.max(-0.3, Math.min(0.3, typeof input.yaw === 'undefined' ? 0 : input.yaw)),
      trim: typeof input.trim === 'undefined' ? this.state.controls.trim : input.trim
    };
  }

  /**
   * Smooth input value towards target value with given smoothing factor
   */
  smoothInput(currentValue, targetValue, smoothingFactor) {
    return currentValue + (targetValue - currentValue) * smoothingFactor;
  }

  /**
   * Normalize angle to range [-π, π]
   */
  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  /**
   * Calculate proper IAS-TAS translation based on altitude and air density
   */
  calculateAirspeeds() {
    const velocity = this.state.velocity;
    
    // True Airspeed (TAS) - actual speed through air
    const tas_ms = Math.sqrt(
      velocity.u * velocity.u +
      velocity.v * velocity.v +
      velocity.w * velocity.w
    );
    const tas_kts = tas_ms * 1.94384;

    // Indicated Airspeed (IAS) - corrected for pressure and density
    const pressureRatio = this.environment.pressure / 101325; // Ratio relative to sea level
    const densityRatio = this.environment.density / 1.225;     // Ratio relative to sea level
    
    // Correct IAS calculation based on density ratio
    const ias_ms = tas_ms * Math.sqrt(densityRatio);
    const ias_kts = ias_ms * 1.94384;

    // Calibrated Airspeed (CAS) - same as IAS in this simplified model
    const cas_kts = ias_kts;

    return {
      trueAirspeed: tas_kts,
      trueAirspeedMS: tas_ms,
      indicatedAirspeed: ias_kts,
      indicatedAirspeedMS: ias_ms,
      calibratedAirspeed: cas_kts
    };
  }

  /**
   * Get current aircraft state for display
   */
  getAircraftState() {
    const airspeeds = this.calculateAirspeeds();
    
    const heading = (this.state.orientation.psi * 180 / Math.PI + 360) % 360;
    const pitch = this.state.orientation.theta * 180 / Math.PI;
    const roll = this.state.orientation.phi * 180 / Math.PI;
    const altitude_ft = this.state.position.z * 3.28084;

    // Convert earth frame vertical velocity to ft/min
    const verticalSpeed = this.earthFrameVerticalVelocity * 196.85; // m/s to ft/min

    return {
      position: { ...this.state.position },
      velocity: { ...this.state.velocity },
      orientation: { ...this.state.orientation },
      angularRates: { ...this.state.angularRates },
      controls: { ...this.state.controls },
      flaps: this.state.flaps,
      airBrakes: this.state.airBrakes,
      gear: this.state.gear,
      fuel: this.state.fuel,
      verticalSpeed, // Add verticalSpeed at root level as expected by hook
      flightStage: this.currentFlightStage,
      engineParams: this.engineParams, // Updated engine parameters
      thrustForces: this.thrustForces, // For compatibility with realistic model
      derived: {
        heading,
        pitch,
        roll,
        altitude_ft,
        verticalSpeed,
        groundSpeed: airspeeds.trueAirspeed, // Ground speed same as TAS in this model
        airspeed: airspeeds.indicatedAirspeed, // Display IAS to user
        trueAirspeed: airspeeds.trueAirspeed,
        calibratedAirspeed: airspeeds.calibratedAirspeed
      }
    };
  }

  /**
   * Control surface setters (same interface as realistic model)
   */
  setFlaps(flaps) {
    // Get the number of flap positions from the aircraft's flap profile or default to 4
    const maxFlapPositions = this.aircraft.flapProfile?.positions?.length - 1 || 3;
    this.state.flaps = Math.max(0, Math.min(maxFlapPositions, Math.round(flaps)));
  }

  setAirBrakes(position) {
    this.state.airBrakes = Math.max(0, Math.min(1, Math.round(position)));
  }

  setGear(gear) {
    this.state.gear = !!gear;
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
   * Reset aircraft to initial state
   */
  reset() {
    this.state = {
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
        phi: 0,
        theta: 0,
        psi: 0
      },
      angularRates: {
        p: 0,
        q: 0,
        r: 0
      },
      controls: {
        throttle: SimpleFlightPhysicsService.DEFAULT_CONTROLS.THROTTLE,
        pitch: 0,
        roll: 0,
        yaw: 0,
        trim: SimpleFlightPhysicsService.DEFAULT_CONTROLS.TRIM
      },
      flaps: 0,
      airBrakes: 0,
      gear: true,       // Landing gear down for takeoff
      fuel: this.aircraft.fuelWeight || 20000
    };

    // Reset engine parameters with variable engine count support
    const engineCount = this.aircraft.engineCount || 2;
    this.engineParams = {
      n1: Array(engineCount).fill(22),
      n2: Array(engineCount).fill(50),
      egt: Array(engineCount).fill(400),
      fuelFlow: Array(engineCount).fill(1000)
    };

    this.currentFlightStage = 'taxi'; // Reset to runway stage
    this.earthFrameVerticalVelocity = 0;
    this.targetVerticalSpeed = 0;
    this.targetAltitude = this.state.position.z; // Stay at ground level initially
  }
}

export default SimpleFlightPhysicsService;
