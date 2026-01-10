/**
 * PID Controller for Autopilot Systems
 */
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
 */

class NewFlightPhysicsService {
  // HARDCODED DEFAULT PARAMETERS
  static DEFAULT_ENVIRONMENT = {
    DENSITY: 0.379,     // kg/m³ at FL350
    PRESSURE: 23840,   // Pa at FL350
    TEMPERATURE: 229,   // K at FL350
    SPEED_OF_SOUND: 295 // m/s at FL350
  };

  static DEFAULT_CONTROLS = {
    THROTTLE: 0.55, // 55% thrust for cruise
    TRIM: 20       // Initial trim wheel position (displays as 11 units)
  };

  static DEFAULT_AUTOPILOT_LIMITS = {
    MAX_PITCH: 15 * Math.PI/180, // ±15° pitch limit
    MIN_PITCH: -5 * Math.PI/180, // Don't allow nose-down beyond -5°
    MAX_THROTTLE: 0.95,         // 95% max thrust
    MIN_THROTTLE: 0.20          // 20% min thrust
  };

  static DEFAULT_PID_PARAMETERS = {
    ALTITUDE: { Kp: 0.0008, Ki: 0.0001, Kd: 0.002, min: -0.3, max: 0.3 },
    SPEED: { Kp: 0.5, Ki: 0.05, Kd: 0.1, min: -0.5, max: 0.5 },
    HEADING: { Kp: 0.8, Ki: 0.1, Kd: 0.3, min: -0.5, max: 0.5 }
  };

  constructor(aircraft) {
    this.aircraft = this.validateAircraftData(aircraft);
    
    // ✅ FIXED: Proper mass calculation (empty weight + fuel + payload)
    this.aircraft.mass = this.aircraft.emptyWeight + this.aircraft.fuelWeight + this.aircraft.payloadWeight;
    
    // Physics constants
    this.GRAVITY = 9.81; // m/s²
    this.AIR_DENSITY_SLA = 1.225; // kg/m³
    this.AIR_GAS_CONSTANT = 287.05; // J/(kg·K) - specific gas constant for air
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
        theta: 0.0, // Initial pitch 0° - dynamic pitch based on torque calculations
        psi: 0    // Yaw: 0° (flying North)
      },
      angularRates: {
        p: 0, // Roll rate
        q: 0, // Pitch rate
        r: 0  // Yaw rate
      },
      controls: {
        throttle: this.aircraft.initialCruiseThrottle || NewFlightPhysicsService.DEFAULT_CONTROLS.THROTTLE, // 55% thrust for cruise
        pitch: 0,       // Neutral elevator
        roll: 0,        // Neutral ailerons
        yaw: 0,         // Neutral rudder
        trim: NewFlightPhysicsService.DEFAULT_CONTROLS.TRIM   // Initial trim wheel position (displays as 11 units)
      },
      // ✅ NEW: Control surfaces state with proper defaults
      flaps: 0,         // 0=UP, 1=TO, 2=LDG
      airBrakes: 0,     // 0=RETRACTED, 1=EXTENDED
      gear: false,       // Landing gear
      fuel: this.aircraft.fuelWeight || 2000 // Use flight plan fuel load or default to 2000kg
    };
    
    // Environment parameters (will be updated dynamically based on altitude)
    this.environment = {
      density: NewFlightPhysicsService.DEFAULT_ENVIRONMENT.DENSITY,     // kg/m³ at FL350
      pressure: NewFlightPhysicsService.DEFAULT_ENVIRONMENT.PRESSURE,   // Pa at FL350
      temperature: NewFlightPhysicsService.DEFAULT_ENVIRONMENT.TEMPERATURE,   // K at FL350
      speedOfSound: NewFlightPhysicsService.DEFAULT_ENVIRONMENT.SPEED_OF_SOUND, // m/s at FL350
      wind: { x: 0, y: 0, z: 0 }
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
      targets: {
        altitude: 10668, // 35,000 ft in meters (POSITIVE = upward from ground)
        speed: 231.5,     // 450 KTS in m/s
        heading: 0        // 0° (North)
      },
      limits: {
        maxPitch: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MAX_PITCH, // ±15° pitch limit
        minPitch: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MIN_PITCH, // Don't allow nose-down beyond -5°
        maxThrottle: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MAX_THROTTLE,         // 95% max thrust
        minThrottle: NewFlightPhysicsService.DEFAULT_AUTOPILOT_LIMITS.MIN_THROTTLE          // 20% min thrust
      }
    };
    
    // Initialize PID Controllers with tuned parameters
    const pidParams = this.aircraft.pidParameters || NewFlightPhysicsService.DEFAULT_PID_PARAMETERS;
    this.pidControllers = {
      altitude: new PIDController(
        pidParams.ALTITUDE.Kp, // Kp - altitude error to pitch response
        pidParams.ALTITUDE.Ki, // Ki - eliminate steady-state error
        pidParams.ALTITUDE.Kd,  // Kd - damping for smooth control
        pidParams.ALTITUDE.min,   // min pitch
        pidParams.ALTITUDE.max     // max pitch
      ),
      speed: new PIDController(
        pidParams.SPEED.Kp,    // Kp - speed error to throttle response
        pidParams.SPEED.Ki,   // Ki - eliminate steady-state error
        pidParams.SPEED.Kd,    // Kd - damping for smooth response
        pidParams.SPEED.min,   // min throttle change
        pidParams.SPEED.max     // max throttle change
      ),
      heading: new PIDController(
        pidParams.HEADING.Kp,    // Kp - heading error to roll response
        pidParams.HEADING.Ki,    // Ki - eliminate steady-state error
        pidParams.HEADING.Kd,    // Kd - damping
        pidParams.HEADING.min,   // min roll
        pidParams.HEADING.max     // max roll
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
      maxThrustPerEngine: 85000, // N per engine
      
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
    
    return validated;
  }
  
  /**
   * Main physics update step with PID autopilot integration
   * Applies input smoothing, autopilot control, and integrates all forces
   */
  update(input = {}, dt = null) {
    // Use provided time step if available, otherwise use internal dt
    const timeStep = dt || this.dt;
    // Handle reset input
    if (input.reset) {
      this.reset();
    }
    
    // Handle test configuration inputs
    if (input.testAltitude !== undefined || input.testIAS !== undefined) {
      this.setTestConfiguration(input.testAltitude, input.testIAS);
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
    
    // Calculate control inputs (autopilot or manual)
    const controlInputs = this.autopilot.engaged ? 
      this.calculateAutopilotControls() : 
      this.applyManualControls(input);
    
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
  
    

    
    // Return updated state
    return this.getAircraftState();
  }
  
  /**
   * Calculate autopilot control inputs using PID controllers
   */
  calculateAutopilotControls() {
    const currentAltitude = this.state.position.z;
    const currentSpeed = Math.sqrt(
      this.state.velocity.u * this.state.velocity.u + 
      this.state.velocity.v * this.state.velocity.v + 
      this.state.velocity.w * this.state.velocity.w
    );
    const currentHeading = this.state.orientation.psi;
    
    // Calculate PID outputs
    const pitchCommand = this.pidControllers.altitude.calculate(
      this.autopilot.targets.altitude, 
      currentAltitude, 
      timeStep
    );
    
    const throttleCommand = this.pidControllers.speed.calculate(
      this.autopilot.targets.speed, 
      currentSpeed, 
      timeStep
    );
    
    const rollCommand = this.pidControllers.heading.calculate(
      this.autopilot.targets.heading, 
      currentHeading, 
      timeStep
    );
    
    // ✅ FIXED: Apply control limits properly
    const limitedPitch = Math.max(
      this.autopilot.limits.minPitch, 
      Math.min(this.autopilot.limits.maxPitch, pitchCommand)
    );
    
    const limitedThrottle = Math.max(
      this.autopilot.limits.minThrottle, 
      Math.min(this.autopilot.limits.maxThrottle, this.state.controls.throttle + throttleCommand)
    );
    
    const limitedRoll = Math.max(-0.5, Math.min(0.5, rollCommand));
    
    // Add small coordination inputs for smooth flight
    const yawCoordination = -rollCommand * (this.aircraft.yawCoordinationFactor || 0.1); // Coordinated turn
    
    return {
      pitch: limitedPitch,
      throttle: limitedThrottle,
      roll: limitedRoll,
      yaw: yawCoordination
    };
  }
  
  /**
   * Apply manual control inputs with safety limits
   */
  applyManualControls(input) {
    // Use input values, but apply safety limits
    // Only use defaults if input values are explicitly undefined (not 0)
    return {
      pitch: Math.max(this.autopilot.limits.minPitch, Math.min(this.autopilot.limits.maxPitch, typeof input.pitch === 'undefined' ? 0 : input.pitch)),
      throttle: Math.max(this.autopilot.limits.minThrottle, Math.min(this.autopilot.limits.maxThrottle, typeof input.throttle === 'undefined' ? 0.55 : input.throttle)),
      roll: Math.max(-0.5, Math.min(0.5, typeof input.roll === 'undefined' ? 0 : input.roll)),
      yaw: Math.max(-0.3, Math.min(0.3, typeof input.yaw === 'undefined' ? 0 : input.yaw))
    };
  }
  
  /**
   * Set trim control from cockpit
   */
  setTrim(trimValue) {
    // Apply safety limits: trim typically ranges from -500,000 to +500,000
    const trimmedValue = Math.max(-500000, Math.min(500000, trimValue || 0));
    
    // Smoothly apply trim change to avoid sudden jolts
    this.state.controls.trim = this.smoothInput(this.state.controls.trim, trimmedValue, 0.1);
    

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
      
      // Set current values as targets to prevent sudden jumps
      this.autopilot.targets.altitude = this.state.position.z;
      this.autopilot.targets.speed = Math.sqrt(
        this.state.velocity.u * this.state.velocity.u + 
        this.state.velocity.v * this.state.velocity.v + 
        this.state.velocity.w * this.state.velocity.w
      );
      this.autopilot.targets.heading = this.state.orientation.psi;
    }
    

  }
  
  /**
   * Get current autopilot status
   */
  getAutopilotStatus() {
    return {
      enabled: this.autopilot.engaged,  // ✅ FIXED: Return engaged state
      engaged: this.autopilot.engaged,
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
    if (airspeed < 1) return { forces: { x: 0, y: 0, z: 0 }, moments: { x: 0, y: 0, z: 0 } };
    
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
    
    // Ensure CL stays within reasonable limits
    cl = Math.max(0, Math.min(this.aircraft.maxLiftCoefficient, cl));
    
    // ✅ ENHANCED: Drag coefficient with proper AoA effect
    // Cd = Cd₀ + k·Cl² + Cd_alpha·|α| (drag increases with AoA magnitude)
    // PLUS: Direct head-on area effect: sin(|α|) for frontal area increase
    const cdAlpha = 0.5; // Increased drag coefficient slope with AoA
    const frontalAreaFactor = 0.8; // Factor for frontal area increase with AoA
    
    let cd = this.aircraft.zeroLiftDragCoefficient + 
             this.aircraft.inducedDragFactor * cl * cl + 
             cdAlpha * safeAlpha * safeAlpha + // Linear increase with AoA magnitude
             frontalAreaFactor * Math.abs(Math.sin(safeAlpha)); // Head-on area effect
    
    // ✅ NEW: Apply flaps and airbrake effects
    const flapsResult = this.calculateFlapsEffects(cl, cd);
    cl = flapsResult.cl;
    cd = flapsResult.cd;
    
    const airbrakeResult = this.calculateAirbrakeEffects(cl, cd);
    cl = airbrakeResult.cl;
    cd = airbrakeResult.cd;
    
    // Calculate aerodynamic forces
    const lift = q * cl * this.aircraft.wingArea; // Main wing lift
    const drag = q * cd * this.aircraft.wingArea; // Main wing drag
    
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
    
    // ✅ FIXED: Proper elevator trim calculation with aircraft parameters
    // Trim should counteract the AERODYNAMIC pitching moment (lift + drag + stabilizer)
    // NOT the total moment that includes trim effects (circular dependency)
    const aerodynamicPitchingMoment = liftPitchingMoment + dragPitchingMoment + stabilizerPitchingMoment;
    
    // ✅ ENHANCED: Parameterized trim calculation
    // Use aircraft-specific control surface parameters (default to realistic values)
    const trimSurfaceAreaRatio = this.aircraft.trimSurfaceAreaRatio || 0.12; // Default: 12% of wing area
    const trimEffectiveness = this.aircraft.trimEffectiveness || 0.1; // Tuned down to 10%
    
    // ✅ COCKPIT TRIM CONTROL: Use trim wheel position from aircraft state
    // Display factor: trimControl / 20,000 = cockpit trim units
    const trimControl = this.state.controls.trim; // Trim wheel position from cockpit
    
    // ✅ FIXED: Define controlPowerY first to avoid reference error
    const controlPowerY = this.aircraft.controlPower?.y || 1.5;
    
    // Convert trim control to elevator deflection
    // elevatorTrim represents the deflection angle needed to generate the trim moment
    const elevatorTrim = trimControl / controlPowerY;
    
    // ✅ SAFE: Angular moments with validation
    const rollInertia = Math.max(1000, this.aircraft.momentOfInertiaRoll || 10000);
    const pitchInertia = Math.max(1000, this.aircraft.momentOfInertiaPitch || 15000);
    const yawInertia = Math.max(1000, this.aircraft.momentOfInertiaYaw || 20000);
    
    // ✅ ENHANCED: Calculate total pitching moment including trim effects
    const trimMoment = controlPowerY * q * elevatorTrim;
    const totalPitchingMomentWithTrim = aerodynamicPitchingMoment + trimMoment;
    
    // ✅ FIXED: Calculate control moments with consistent unit scaling
    // Multiply by dynamic pressure (q) for realistic moment generation
    const rollMoment = (this.aircraft.controlPower.x || 1.2) * q * input.roll;
    const pitchMoment = -(this.aircraft.controlPower.y || 1.5) * q * input.pitch + totalPitchingMomentWithTrim; //Negative so pushing is down, pulling is up
    const yawMoment = (this.aircraft.controlPower.z || 1.0) * q * input.yaw;
    
    // ✅ CRITICAL FIX: Assign forces and moments to class properties
    this.aeroForces = { x: Fx_total, y: Fy_total, z: Fz_total };
    this.aeroMoments = { x: rollMoment, y: pitchMoment, z: yawMoment };
    

    

    

    
    return {
      forces: { x: Fx_total, y: Fy_total, z: Fz_total },
      moments: { x: rollMoment, y: pitchMoment, z: yawMoment }
    };
  }
  
  /**
   * Calculate propulsion/thrust forces
   */
  calculatePropulsionForces() {
    const throttle = Math.max(0, Math.min(1, this.state.controls.throttle));
    const altitude_m = this.state.position.z;
    
    // Use engine performance curve parameters from aircraft database
    const enginePerf = this.aircraft.enginePerformance || {};
    const n1Curve = enginePerf.n1Curve || {};
    
    // Default values if not in database
    const altitudeBreakpoint = n1Curve.altitudeBreakpoint || 10000;
    const lowAltitudeSlope = n1Curve.lowAltitudeSlope || -0.0001;
    const highAltitudeSlope = n1Curve.highAltitudeSlope || -0.0003;
    const thrustExponent = n1Curve.thrustExponent || 1.1;
    
    // Calculate altitude-based derating
    let altitudeFactor;
    if (altitude_m <= altitudeBreakpoint) {
      // Low altitude: gradual derating
      altitudeFactor = 1 + (altitude_m * lowAltitudeSlope);
    } else {
      // High altitude: steeper derating
      const lowAltFactor = 1 + (altitudeBreakpoint * lowAltitudeSlope);
      const highAltDifference = altitude_m - altitudeBreakpoint;
      altitudeFactor = lowAltFactor + (highAltDifference * highAltitudeSlope);
    }
    
    // Ensure altitude factor doesn't go below 0
    altitudeFactor = Math.max(0, altitudeFactor);
    
    // Add density-based derating for realism
    const densityRatio = this.environment.density / this.AIR_DENSITY_SLA;
    const densityFactor = Math.pow(densityRatio, 0.7);
    
    // Combine factors with thrust exponent for non-linear behavior
    const totalDerating = Math.pow(altitudeFactor * densityFactor, thrustExponent);
    const maxThrustAtAltitude = this.aircraft.maxThrustPerEngine * totalDerating;
    
    const totalThrust = throttle * this.aircraft.engineCount * maxThrustAtAltitude;
    
    this.thrustForces = {
      x: totalThrust,
      y: 0,
      z: 0
    };
  }
  
  /**
   * ✅ NEW: Calculate flaps effects on aerodynamics
   */
  calculateFlapsEffects(cl, cd) {
    let flapsCl = 0;
    let flapsCd = 0;
    
    switch (this.state.flaps) {
      case 1: // Takeoff flaps
        flapsCl = 0.8; // Additional lift coefficient
        flapsCd = 0.01; // Additional drag coefficient
        break;
      case 2: // Landing flaps
        flapsCl = 1.2; // More lift for landing
        flapsCd = 0.02; // More drag for landing
        break;
      default: // Flaps up (0)
        flapsCl = 0;
        flapsCd = 0;
    }
    
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
    // ✅ FIXED: Use position.z as positive altitude (no negative conversion needed)
    const altitude_m = this.state.position.z; // Already positive for altitude above ground
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
      trueAirspeed: isNaN(tas_kts) ? 450 : tas_kts,
      trueAirspeedMS: isNaN(tas_ms) ? 231.5 : tas_ms,
      indicatedAirspeed: isNaN(ias_kts) ? 280 : ias_kts,
      indicatedAirspeedMS: isNaN(ias_ms) ? 144 : ias_ms,
      density: isNaN(density) ? 0.379 : density,
      temperature: isNaN(temperature) ? 229 : temperature,
      pressure: isNaN(pressure) ? 23840 : pressure,
      densityRatio: isNaN(densityRatio) ? 0.309 : densityRatio,
      altitude_ft: isNaN(altitude_ft) ? 35000 : altitude_ft
    };
  }

  /**
   * ✅ FIXED: Calculate airbrake effects on aerodynamics
   */
  calculateAirbrakeEffects(cl, cd) {
    let airbrakeCd = 0;
    let airbrakeCl = 0;
    
    if (this.state.airBrakes > 0) {
      // Airbrakes increase drag significantly and reduce lift
      airbrakeCd = 0.05; // Significant drag increase
      airbrakeCl = -0.1; // Lift reduction (spoiler effect)
    }
    
    return {
      cl: cl + airbrakeCl,
      cd: cd + airbrakeCd
    };
  }
  
  /**
   * ✅ NEW: Control surface setters
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
   * Sum all forces and moments
   */
  sumForcesAndMoments() {
    this.forces = {
      x: (this.aeroForces?.x || 0) + (this.thrustForces?.x || 0) + (this.gravityForces?.x || 0),
      y: (this.aeroForces?.y || 0) + (this.thrustForces?.y || 0) + (this.gravityForces?.y || 0),
      z: (this.aeroForces?.z || 0) + (this.thrustForces?.z || 0) + (this.gravityForces?.z || 0)
    };
    
    this.moments = {
      x: (this.aeroMoments?.x || 0),
      y: (this.aeroMoments?.y || 0),
      z: (this.aeroMoments?.z || 0)
    };
  }
  
  /**
   * Integrate 6-DOF motion equations
   */
  integrateMotion() {
    // Linear accelerations (F = ma)
    const ax = this.forces.x / this.aircraft.mass;
    const ay = this.forces.y / this.aircraft.mass;
    const az = this.forces.z / this.aircraft.mass;
    
    // Angular accelerations (M = I * α)
    const alphaX = this.moments.x / this.aircraft.momentOfInertiaRoll;
    const alphaY = this.moments.y / this.aircraft.momentOfInertiaPitch;
    const alphaZ = this.moments.z / this.aircraft.momentOfInertiaYaw;
    
    // Integrate velocities
    this.state.velocity.u += ax * this.dt;
    this.state.velocity.v += ay * this.dt;
    this.state.velocity.w += az * this.dt;
    
    // Integrate angular rates
    this.state.angularRates.p += alphaX * this.dt;
    this.state.angularRates.q += alphaY * this.dt;
    this.state.angularRates.r += alphaZ * this.dt;
    
    // Apply improved damping to angular rates
    this.state.angularRates.p *= 0.996;  // Increased damping from 0.992
    this.state.angularRates.q *= 0.996;  // Increased damping from 0.992
    this.state.angularRates.r *= 0.996;  // Increased damping from 0.992
    
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
    this.state.orientation.phi += phiDot * this.dt;
    this.state.orientation.theta += thetaDot * this.dt;
    this.state.orientation.psi += psiDot * this.dt;
    
    // Normalize angles
    this.state.orientation.phi = this.normalizeAngle(this.state.orientation.phi);
    this.state.orientation.theta = this.normalizeAngle(this.state.orientation.theta);
    this.state.orientation.psi = this.normalizeAngle(this.state.orientation.psi);
    
    // Update position
    this.updatePosition();
  }
  
  /**
   * Transform body velocities to earth frame and update position
   * Both body and earth frame: X=forward, Y=right, Z=upward
   */
  updatePosition() {
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
    

    
    // Store for vertical speed calculation
    this.earthFrameVerticalVelocity = zDot;
    
    // Update position
    this.state.position.x += xDot * this.dt;
    this.state.position.y += yDot * this.dt;
    this.state.position.z += zDot * this.dt;
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
    // ✅ FIXED: Use position.z as positive altitude (no negative conversion needed)
    const altitude_ft = this.state.position.z * 3.28084;
    
    // ✅ CRITICAL: Use earth frame vertical velocity for correct vertical speed
    const earthFrameVerticalVelocity = this.earthFrameVerticalVelocity || 0;
    const verticalSpeed = earthFrameVerticalVelocity * 196.85; // Convert m/s to ft/min
    

    
    const groundSpeed = airspeed * 1.94384; // Convert m/s to knots
    
    // Get proper IAS/TAS calculations
    const airspeeds = this.calculateAirspeeds();
    
    // Simulate engine parameters based on throttle and altitude
    const throttle = this.state.controls.throttle || 0.55;
    
    // Realistic engine behavior: At FL350, engines run at higher N1/N2 even at lower throttle
    // Get engine performance parameters from database
    const enginePerf = this.aircraft.enginePerformance || {};
    const minN1Idle = enginePerf.minN1Idle || 22;
    const n2Base = enginePerf.n2Base || 95;
    const egtBase = enginePerf.egtBase || 500;
    const vibrationAmplitude = enginePerf.vibrationAmplitude || 0.5;
    
    // Get engine performance curve parameters
    const n1Curve = enginePerf.n1Curve || {};
    const altitudeBreakpoint = n1Curve.altitudeBreakpoint || 12000;
    const lowAltitudeSlope = n1Curve.lowAltitudeSlope || -0.0001;
    const highAltitudeSlope = n1Curve.highAltitudeSlope || -0.0003;
    
    // Calculate altitude for derating (in meters)
    const altitude_m = this.state.position.z;
    
    // Calculate altitude-based derating for engine parameters
    let altitudeFactor;
    if (altitude_m <= altitudeBreakpoint) {
      // Low altitude: gradual derating
      altitudeFactor = 1 + (altitude_m * lowAltitudeSlope);
    } else {
      // High altitude: steeper derating (much faster above breakpoint)
      const lowAltFactor = 1 + (altitudeBreakpoint * lowAltitudeSlope);
      const highAltDifference = altitude_m - altitudeBreakpoint;
      altitudeFactor = lowAltFactor + (highAltDifference * highAltitudeSlope);
    }
    
    // Ensure altitude factor doesn't go below 0
    altitudeFactor = Math.max(0, altitudeFactor);
    
    // Add density-based derating for realism (affects engine performance)
    const densityRatio = this.environment.density / this.AIR_DENSITY_SLA;
    const densityFactor = Math.pow(densityRatio, 0.7);
    
    // Combine factors for total engine performance derating
    const totalEngineDerating = altitudeFactor * densityFactor;
    
    // More realistic N1 calculation with non-linear relationship and altitude derating
    // N1 increases rapidly at low throttle, then more slowly at higher throttle
    let baseN1;
    if (throttle < 0.2) {
      // Idle to low throttle range - limited derating to maintain idle stability
      const idleDerating = Math.max(0.9, totalEngineDerating); // Don't derate idle too much
      baseN1 = minN1Idle + ((throttle / 0.2) * (65 - minN1Idle)) * idleDerating;
    } else if (throttle < 0.6) {
      // Medium throttle range (climb/cruise)
      baseN1 = minN1Idle + ((65 - minN1Idle) + ((throttle - 0.2) / 0.4) * (90 - 65)) * totalEngineDerating;
    } else {
      // High throttle range (takeoff) - full derating effect
      const maxPossibleN1 = 100;
      const highThrottleN1 = minN1Idle + ((90 - minN1Idle) + ((throttle - 0.6) / 0.4) * (maxPossibleN1 - 90));
      baseN1 = highThrottleN1 * totalEngineDerating;
    }
    
    // Ensure baseN1 stays within realistic limits
    baseN1 = Math.max(minN1Idle, Math.min(100, baseN1));
    
    // N2 has a more linear relationship but with altitude derating
    // N2 typically has less altitude dependency than N1
    const n2Derating = Math.pow(totalEngineDerating, 0.5); // Less altitude effect on N2
    const baseN2 = n2Base - 20 + (throttle * 25) * n2Derating;
    
    // EGT increases with throttle and decreases with altitude (cooler at altitude)
    // More complex relationship: increases with throttle but decreases with air density
    const egtAltitudeFactor = Math.max(0.7, 1 + (altitude_m * -0.00005)); // EGT decreases with altitude
    const baseEGT = egtBase + (Math.pow(throttle, 1.5) * 400) * egtAltitudeFactor;
    
    // Generate random vibrations for each engine (different values for realism)
    const vibrationN1 = [
      (Math.random() - 0.5) * vibrationAmplitude,
      (Math.random() - 0.5) * vibrationAmplitude
    ];
    
    const vibrationN2 = [
      (Math.random() - 0.5) * (vibrationAmplitude * 0.8),
      (Math.random() - 0.5) * (vibrationAmplitude * 0.8)
    ];
    
    const vibrationEGT = [
      (Math.random() - 0.5) * (vibrationAmplitude * 10),
      (Math.random() - 0.5) * (vibrationAmplitude * 10)
    ];
    
    // Calculate final values with vibrations and limits
    const engineN1 = [
      Math.min(100, Math.max(minN1Idle, baseN1 + vibrationN1[0])),
      Math.min(100, Math.max(minN1Idle, baseN1 + vibrationN1[1]))
    ];
    
    const engineN2 = [
      Math.min(100, Math.max(50, baseN2 + vibrationN2[0])),
      Math.min(100, Math.max(50, baseN2 + vibrationN2[1]))
    ];
    
    const engineEGT = [
      Math.min(900, Math.max(400, baseEGT + vibrationEGT[0])),
      Math.min(900, Math.max(400, baseEGT + vibrationEGT[1]))
    ];
    
    // Simulate fuel consumption using engine performance curves
    const totalThrust = throttle * this.aircraft.engineCount * this.aircraft.maxThrustPerEngine;
    const fuelFlow = totalThrust * (this.aircraft.specificFuelConsumption || 0.00002); // kg/N/s
    this.state.fuel = Math.max(0, (this.state.fuel || 100) - fuelFlow * this.dt);
    
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
      
      // Engine - arrays for each engine
      engineN1: engineN1,
      engineN2: engineN2,
      engineEGT: engineEGT,
      fuel: this.state.fuel || 100,
      
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
      
      // Physics data for compatibility
      position: { ...this.state.position },
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
      densityRatio: airspeeds.densityRatio
    };
  }
  
  /**
   * Get crash warning status
   */
  getCrashWarning() {
    // ✅ FIXED: Use position.z as positive altitude above ground
    if (this.state.position.z <= 0) return 'TERRAIN CONTACT'; // Altitude <= 0 means at/below ground
    if (this.state.position.z < 50) return 'LOW ALTITUDE'; // Less than 50m altitude
    if (this.state.velocity.w < -10) return 'RAPID DESCENT';
    if (Math.abs(this.state.orientation.phi) > Math.PI/2) return 'EXCESSIVE BANK';
    if (Math.abs(this.state.orientation.theta) > Math.PI/3) return 'EXCESSIVE PITCH';
    return '';
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
    return this.state.position.z <= 0; // Crashed if altitude <= 0 (ground level)
  }
  
  /**
   * Get system alarms based on current state
   */
  getAlarms() {
    const alarms = [];
    
    if (this.state.position.z > -10 && this.state.position.z < 0) {
      alarms.push('LOW ALTITUDE WARNING');
    }
    
    if (Math.abs(this.state.orientation.phi) > Math.PI/3) {
      alarms.push('EXCESSIVE BANK ANGLE');
    }
    
    if (Math.abs(this.state.orientation.theta) > Math.PI/4) {
      alarms.push('EXCESSIVE PITCH ANGLE');
    }
    
    if (this.state.velocity.w < -15) {
      alarms.push('RAPID DESCENT');
    }
    
    if (this.state.fuel < 10) {
      alarms.push('LOW FUEL');
    }
    
    if (this.getAutopilotStatus() && this.state.position.z > -50) {
      alarms.push('AUTOPILOT - TERRAIN WARNING');
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
   * Reset aircraft to initial cruise state
   */
  reset() {
    // ✅ FIXED: Reset to level cruise at FL350, 450 KTS using positive altitude
    this.state = {
      position: {
        x: 0,     // North position (m)
        y: 0,     // East position (m)
        z: 10668  // Altitude: 35,000 ft = 10,668 m (POSITIVE = above ground level)
      },
      velocity: {
        u: 231.5, // Forward velocity (450 KTS TAS)
        v: 0,     // Rightward velocity
        w: 0      // Vertical velocity
      },
      orientation: {
        phi: 0,   // Roll angle (0° = level)
        theta: 0.05236, // Pitch: +3° for cruise
        psi: 0    // Yaw: 0° (flying North)
      },
      angularRates: {
        p: 0, // Roll rate
        q: 0, // Pitch rate
        r: 0  // Yaw rate
      },
      controls: {
        throttle: 0.55, // 55% thrust for cruise
        pitch: 0,       // Neutral elevator
        roll: 0,        // Neutral ailerons
        yaw: 0          // Neutral rudder
      },
      // ✅ NEW: Control surfaces state with proper defaults
      flaps: 0,         // 0=UP, 1=TO, 2=LDG
      airBrakes: 0,     // 0=RETRACTED, 1=EXTENDED
      gear: false       // Landing gear
    };
    
    // Reset PID controllers
    Object.values(this.pidControllers).forEach(controller => controller.reset());
    

    

  }
  
  /**
   * Set test configuration for specific flight conditions
   */
  setTestConfiguration(altitude_ft, ias_kts) {
    if (altitude_ft !== undefined) {
      // ✅ FIXED: Use position.z as positive altitude
      const altitude_m = altitude_ft * 0.3048;
      this.state.position.z = altitude_m;
      this.autopilot.targets.altitude = altitude_m;
    }
    
    if (ias_kts !== undefined) {
      // Convert IAS from knots to m/s
      const ias_ms = ias_kts * 0.514444;
      this.state.velocity.u = ias_ms;
      this.autopilot.targets.speed = ias_ms;
    }
    

  }
}

export default NewFlightPhysicsService;