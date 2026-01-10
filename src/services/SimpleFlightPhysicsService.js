/**
 * Simple Flight Physics Service - Kinematics-based simplified physics model
 * Built for rookies and amateurs with simplified linear/quadratic approximations
 * while maintaining realistic visual appearance
 */

class SimpleFlightPhysicsService {
  static DEFAULT_ENVIRONMENT = {
    DENSITY: 0.379,     // kg/m³ at FL350
    PRESSURE: 23840,   // Pa at FL350
    TEMPERATURE: 229,   // K at FL350
    SPEED_OF_SOUND: 295 // m/s at FL350
  };

  static DEFAULT_CONTROLS = {
    THROTTLE: 0.55, // 55% thrust for cruise
    TRIM: 20     // Initial trim wheel position
  };

  constructor(aircraft) {
    this.aircraft = this.validateAircraftData(aircraft);
    this.GRAVITY = 9.81; // m/s²
    this.dt = 0.01; // Time step (10ms)

    // Initial state - level cruise at FL350, 450 KTS
    this.state = {
      position: {
        x: 0,     // North position (m)
        y: 0,     // East position (m)
        z: 10668  // Altitude: 35,000 ft = 10,668 m (POSITIVE = above ground level)
      },
      velocity: {
        u: 231.5, // Forward velocity (450 KTS TAS)
        v: 0,     // Rightward velocity
        w: 0      // Vertical velocity (body frame, Z-upward)
      },
      orientation: {
        phi: 0,   // Roll angle (0° = level)
        theta: 0.05, // Initial pitch
        psi: 0    // Yaw: 0° (flying North)
      },
      angularRates: {
        p: 0, // Roll rate
        q: 0, // Pitch rate
        r: 0  // Yaw rate
      },
      controls: {
        throttle: this.aircraft.initialCruiseThrottle || SimpleFlightPhysicsService.DEFAULT_CONTROLS.THROTTLE,
        pitch: 0,       // Neutral elevator
        roll: 0,        // Neutral ailerons
        yaw: 0,         // Neutral rudder
        trim: SimpleFlightPhysicsService.DEFAULT_CONTROLS.TRIM
      },
      flaps: 0,         // 0=UP, 1=TO, 2=LDG
      airBrakes: 0,     // 0=RETRACTED, 1=EXTENDED
      gear: false,       // Landing gear
      fuel: this.aircraft.fuelWeight || 2000
    };

    // Environment parameters
    this.environment = {
      density: SimpleFlightPhysicsService.DEFAULT_ENVIRONMENT.DENSITY,
      pressure: SimpleFlightPhysicsService.DEFAULT_ENVIRONMENT.PRESSURE,
      temperature: SimpleFlightPhysicsService.DEFAULT_ENVIRONMENT.TEMPERATURE,
      speedOfSound: SimpleFlightPhysicsService.DEFAULT_ENVIRONMENT.SPEED_OF_SOUND,
      wind: { x: 0, y: 0, z: 0 }
    };

    // Flight stage tracking
    this.currentFlightStage = 'cruise'; // Initial stage
    this.earthFrameVerticalVelocity = 0;

    // Store previous control values
    this.previousControls = { ...this.state.controls };
  }

  /**
   * Validate and enhance aircraft data with defaults
   */
  validateAircraftData(aircraft) {
    const defaults = {
      wingArea: 125,           // m²
      wingSpan: 35.8,           // m
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
    const temperatureSeaLevel = 288.15; // K
    const pressureSeaLevel = 101325; // Pa
    const densitySeaLevel = 1.225; // kg/m³

    const temperature = temperatureSeaLevel + temperatureGradient * altitude_m;
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

    // Simple flight stage detection using linear thresholds
    if (altitude_ft < 10 && airspeed_kts < 5) {
      return throttle > 0.1 ? 'push-back' : 'shutoff';
    } else if (altitude_ft < 100 && airspeed_kts < 40) {
      return 'taxi';
    } else if (altitude_ft < 1000 && airspeed_kts < 150 && this.earthFrameVerticalVelocity > 5) {
      return 'take-off';
    } else if (altitude_ft < 10000 && this.earthFrameVerticalVelocity > 5) {
      return 'climb';
    } else if (altitude_ft > 10000 && Math.abs(this.earthFrameVerticalVelocity) < 1) {
      return 'cruise';
    } else if (altitude_ft > 1000 && this.earthFrameVerticalVelocity < -5) {
      return 'descent';
    } else if (altitude_ft < 1000 && airspeed_kts < 150 && this.earthFrameVerticalVelocity < -5) {
      return 'landing';
    } else {
      return 'cruise'; // Default to cruise for any other state
    }
  }

  /**
   * Update physics state using simplified kinematics
   */
  update(input = {}, dt = null) {
    const timeStep = dt || this.dt;

    // Update environment properties
    this.updateEnvironmentProperties();

    // Detect current flight stage
    this.currentFlightStage = this.detectFlightStage();

    // Calculate control inputs
    const controlInputs = this.applyManualControls(input);

    // Apply input smoothing
    this.state.controls.throttle = this.smoothInput(this.state.controls.throttle, controlInputs.throttle, 0.5);
    this.state.controls.pitch = this.smoothInput(this.state.controls.pitch, controlInputs.pitch, 0.4);
    this.state.controls.roll = this.smoothInput(this.state.controls.roll, controlInputs.roll, 0.4);
    this.state.controls.yaw = this.smoothInput(this.state.controls.yaw, controlInputs.yaw, 0.3);
    this.state.controls.trim = this.smoothInput(this.state.controls.trim, controlInputs.trim || 0, 0.05);

    // Simplified kinematics updates
    this.updateVelocity(controlInputs, timeStep);
    this.updateOrientation(controlInputs, timeStep);
    this.updatePosition(timeStep);

    // Return updated state
    return this.getAircraftState();
  }

  /**
   * Update velocity using simplified linear/quadratic relationships
   */
  updateVelocity(controls, dt) {
    const throttle = controls.throttle;
    const pitch = controls.pitch;
    const roll = controls.roll;
    const yaw = controls.yaw;

    // Simplified thrust calculation (linear relationship)
    const maxThrust = this.aircraft.engineCount * this.aircraft.maxThrustPerEngine;
    const thrust = throttle * maxThrust;

    // Simplified drag (quadratic in velocity)
    const airspeed = Math.sqrt(
      this.state.velocity.u * this.state.velocity.u +
      this.state.velocity.v * this.state.velocity.v +
      this.state.velocity.w * this.state.velocity.w
    );
    const drag = 0.5 * this.environment.density * airspeed * airspeed * this.aircraft.wingArea * this.aircraft.zeroLiftDragCoefficient;

    // Simplified acceleration (linear)
    const accelerationX = (thrust - drag) / this.aircraft.mass;

    // Update forward velocity (u)
    this.state.velocity.u += accelerationX * dt;
    this.state.velocity.u = Math.max(0, this.state.velocity.u); // No negative forward speed

    // Simplified vertical velocity (w) based on pitch and flight stage
    let verticalAccel = 0;
    if (this.currentFlightStage === 'take-off' || this.currentFlightStage === 'climb') {
      verticalAccel = 1.5 * throttle; // Strong upward acceleration during climb
    } else if (this.currentFlightStage === 'descent' || this.currentFlightStage === 'landing') {
      verticalAccel = -1.0 * (1 - throttle); // Downward acceleration based on throttle reduction
    } else {
      // Cruise - simple trim adjustment
      verticalAccel = 0.5 * pitch;
    }

    // Apply vertical acceleration with limits
    this.state.velocity.w += verticalAccel * dt;
    this.state.velocity.w = Math.max(-20, Math.min(20, this.state.velocity.w)); // Limit vertical speed

    // Simplified lateral velocity (v) based on yaw
    this.state.velocity.v += yaw * 10 * dt;
    this.state.velocity.v = Math.max(-10, Math.min(10, this.state.velocity.v)); // Limit lateral speed

    // Apply flight stage specific velocity adjustments
    this.applyFlightStageVelocityAdjustments();
  }

  /**
   * Apply flight stage specific velocity adjustments
   */
  applyFlightStageVelocityAdjustments() {
    switch (this.currentFlightStage) {
      case 'push-back':
        this.state.velocity.u = Math.max(0, Math.min(5, this.state.velocity.u)); // Max 5 m/s push-back
        break;
      case 'taxi':
        this.state.velocity.u = Math.max(0, Math.min(15, this.state.velocity.u)); // Max 15 m/s taxi
        break;
      case 'take-off':
        // Gradually increase speed during take-off
        const takeoffSpeed = 75; // m/s (146 kts)
        if (this.state.velocity.u < takeoffSpeed) {
          this.state.velocity.u += 0.5; // Constant acceleration during take-off
        }
        break;
      case 'landing':
        // Gradually decrease speed during landing
        const landingSpeed = 50; // m/s (97 kts)
        if (this.state.velocity.u > landingSpeed) {
          this.state.velocity.u -= 0.3; // Constant deceleration during landing
        }
        break;
      case 'cruise':
        // Maintain cruise speed with simple linear adjustment
        const cruiseSpeed = 231.5; // m/s (450 kts)
        const speedDiff = cruiseSpeed - this.state.velocity.u;
        this.state.velocity.u += speedDiff * 0.01; // Slow adjustment to cruise speed
        break;
    }
  }

  /**
   * Update orientation using simplified angular kinematics
   */
  updateOrientation(controls, dt) {
    const pitch = controls.pitch;
    const roll = controls.roll;
    const yaw = controls.yaw;

    // Simplified angular rate calculations (linear relationships)
    const pitchRate = pitch * 2; // Linear pitch response
    const rollRate = roll * 3;   // Linear roll response
    const yawRate = yaw * 2;     // Linear yaw response

    // Update angular rates
    this.state.angularRates.p = rollRate;
    this.state.angularRates.q = pitchRate;
    this.state.angularRates.r = yawRate;

    // Apply damping
    this.state.angularRates.p *= 0.99;
    this.state.angularRates.q *= 0.99;
    this.state.angularRates.r *= 0.99;

    // Update orientation (simple integration)
    this.state.orientation.phi += this.state.angularRates.p * dt;
    this.state.orientation.theta += this.state.angularRates.q * dt;
    this.state.orientation.psi += this.state.angularRates.r * dt;

    // Normalize angles
    this.state.orientation.phi = this.normalizeAngle(this.state.orientation.phi);
    this.state.orientation.theta = this.normalizeAngle(this.state.orientation.theta);
    this.state.orientation.psi = this.normalizeAngle(this.state.orientation.psi);

    // Apply flight stage specific orientation limits
    this.applyFlightStageOrientationLimits();
  }

  /**
   * Apply flight stage specific orientation limits
   */
  applyFlightStageOrientationLimits() {
    // Simple linear limits for realistic appearance
    switch (this.currentFlightStage) {
      case 'take-off':
        // Limit pitch up during take-off
        this.state.orientation.theta = Math.max(0, Math.min(Math.PI/12, this.state.orientation.theta)); // Max 15° up
        break;
      case 'landing':
        // Limit pitch to landing attitude
        this.state.orientation.theta = Math.max(-Math.PI/24, Math.min(Math.PI/12, this.state.orientation.theta)); // -7.5° to +15°
        break;
      case 'taxi':
      case 'push-back':
        // Keep level during ground operations
        this.state.orientation.phi = Math.max(-Math.PI/36, Math.min(Math.PI/36, this.state.orientation.phi)); // ±5° roll
        this.state.orientation.theta = Math.max(-Math.PI/36, Math.min(Math.PI/36, this.state.orientation.theta)); // ±5° pitch
        break;
      default:
        // General flight limits
        this.state.orientation.phi = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.state.orientation.phi)); // ±90° roll
        this.state.orientation.theta = Math.max(-Math.PI/6, Math.min(Math.PI/6, this.state.orientation.theta)); // ±30° pitch
    }
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

    // Simplified body to earth frame transformation
    const xDot = u * Math.cos(theta) + w * Math.sin(theta);
    const yDot = v;
    const zDot = w * Math.cos(theta) - u * Math.sin(theta);

    // Store earth frame vertical velocity
    this.earthFrameVerticalVelocity = zDot;

    // Update position
    this.state.position.x += xDot * dt;
    this.state.position.y += yDot * dt;
    this.state.position.z += zDot * dt;

    // Ensure altitude doesn't go below ground level
    this.state.position.z = Math.max(0, this.state.position.z);
  }

  /**
   * Apply manual control inputs with safety limits
   */
  applyManualControls(input) {
    // Simple linear limits
    return {
      pitch: Math.max(-0.3, Math.min(0.3, typeof input.pitch === 'undefined' ? 0 : input.pitch)),
      throttle: Math.max(0, Math.min(1, typeof input.throttle === 'undefined' ? 0.55 : input.throttle)),
      roll: Math.max(-0.5, Math.min(0.5, typeof input.roll === 'undefined' ? 0 : input.roll)),
      yaw: Math.max(-0.3, Math.min(0.3, typeof input.yaw === 'undefined' ? 0 : input.yaw))
    };
  }

  /**
   * Smooth input values to prevent abrupt changes
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
   * Get current aircraft state for display
   */
  getAircraftState() {
    const velocity = this.state.velocity;
    const airspeed = Math.sqrt(
      velocity.u * velocity.u +
      velocity.v * velocity.v +
      velocity.w * velocity.w
    );

    const heading = (this.state.orientation.psi * 180 / Math.PI + 360) % 360;
    const pitch = this.state.orientation.theta * 180 / Math.PI;
    const roll = this.state.orientation.phi * 180 / Math.PI;
    const altitude_ft = this.state.position.z * 3.28084;

    // Earth frame vertical velocity for correct vertical speed
    const verticalSpeed = this.earthFrameVerticalVelocity * 196.85; // Convert m/s to ft/min

    const groundSpeed = airspeed * 1.94384; // Convert m/s to knots

    // Simulate engine parameters (simplified)
    const throttle = this.state.controls.throttle;
    const n1 = 22 + throttle * 78; // 22-100% N1
    const n2 = 50 + throttle * 50; // 50-100% N2
    const egt = 400 + throttle * 400; // 400-800°C EGT

    const engineParams = {
      n1: [n1, n1],
      n2: [n2, n2],
      egt: [egt, egt]
    };

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
      flightStage: this.currentFlightStage,
      engineParams,
      derived: {
        heading,
        pitch,
        roll,
        altitude_ft,
        verticalSpeed,
        groundSpeed,
        airspeed: airspeed * 1.94384 // knots
      }
    };
  }

  /**
   * Calculate airspeeds (simplified)
   */
  calculateAirspeeds() {
    const velocity = this.state.velocity;
    const tas_ms = Math.sqrt(
      velocity.u * velocity.u +
      velocity.v * velocity.v +
      velocity.w * velocity.w
    );
    const tas_kts = tas_ms * 1.94384;

    // Simplified IAS calculation
    const altitude_m = this.state.position.z;
    const densityRatio = Math.max(0.3, 1 - (altitude_m * 0.00003));
    const ias_ms = tas_ms * Math.sqrt(densityRatio);
    const ias_kts = ias_ms * 1.94384;

    return {
      trueAirspeed: tas_kts,
      trueAirspeedMS: tas_ms,
      indicatedAirspeed: ias_kts,
      indicatedAirspeedMS: ias_ms
    };
  }

  /**
   * Control surface setters (same interface as realistic model)
   */
  setFlaps(flaps) {
    this.state.flaps = Math.max(0, Math.min(2, Math.round(flaps)));
  }

  setAirBrakes(position) {
    this.state.airBrakes = Math.max(0, Math.min(1, Math.round(position)));
  }

  setGear(gear) {
    this.state.gear = !!gear;
  }

  /**
   * Reset aircraft to initial state
   */
  reset() {
    this.state = {
      position: {
        x: 0,
        y: 0,
        z: 10668
      },
      velocity: {
        u: 231.5,
        v: 0,
        w: 0
      },
      orientation: {
        phi: 0,
        theta: 0.05,
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
      gear: false,
      fuel: this.aircraft.fuelWeight || 2000
    };

    this.currentFlightStage = 'cruise';
    this.earthFrameVerticalVelocity = 0;
  }
}

export default SimpleFlightPhysicsService;