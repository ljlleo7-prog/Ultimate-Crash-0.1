
/**
 * Simple Flight Physics Service (Rebuilt)
 * 
 * A robust, kinematics-based flight model that prioritizes "feeling" and stability
 * over strict aerodynamic accuracy. Designed to handle all flight phases
 * (Taxi, Takeoff, Climb, Cruise, Descent, Landing) and support failures.
 */
class SimpleFlightPhysicsService {
  
  constructor(aircraft) {
    this.aircraft = this.validateAircraftData(aircraft);
    
    // Physics Constants
    this.GRAVITY = 9.81;
    this.AIR_DENSITY = 1.225; // Sea level approximation
    
    // Simulation State
    this.state = {
      // Position (Earth Frame)
      position: {
        x: 0,
        y: 0,
        z: 0 // Altitude in meters
      },
      // Velocity (Body Frame: u=forward, v=right, w=down)
      velocity: {
        u: 0, // Forward (airspeed approx)
        v: 0, // Side slip
        w: 0  // Vertical (relative to aircraft floor - sink rate)
      },
      // Orientation (Euler Angles in Radians)
      orientation: {
        phi: 0,   // Roll
        theta: 0, // Pitch
        psi: 0    // Yaw
      },
      // Angular Rates (Radians/sec)
      angularRates: {
        p: 0, // Roll rate
        q: 0, // Pitch rate
        r: 0  // Yaw rate
      },
      // Controls
      controls: {
        throttle: 0,
        pitch: 0,
        roll: 0,
        yaw: 0,
        trim: 0
      },
      // Systems
      flaps: 0,      // 0 to Max Index
      gear: true,    // true = down
      airBrakes: 0,  // 0 to 1
      fuel: this.aircraft.fuelWeight || 10000,
      
      // Status
      isCrashed: false,
      onGround: true,
      stalled: false
    };

    // Engine State (Scalable)
    const engineCount = this.aircraft.engineCount || 2;
    this.engines = Array(engineCount).fill(0).map(() => ({
      n1: 0,      // Spool percentage (0-100)
      thrust: 0,  // Force in Newtons
      failed: false
    }));

    // Helper for smoothing
    this.smoothedInput = {
      pitch: 0,
      roll: 0,
      yaw: 0
    };
    
    // Crash Info
    this.crashReason = null;
  }

  validateAircraftData(aircraft) {
    // Ensure reasonable defaults
    return {
      ...aircraft,
      mass: (aircraft.emptyWeight || 40000) + (aircraft.fuelWeight || 10000) + (aircraft.payloadWeight || 0),
      wingArea: aircraft.wingArea || 125,
      maxThrustPerEngine: aircraft.maxThrustPerEngine || 120000,
      dragPolar: aircraft.dragPolar || { cd0: 0.02, k: 0.04 },
      flapProfile: aircraft.flapProfile || { positions: [0, 1, 2, 5, 10, 15, 25, 30, 40] }
    };
  }

  /**
   * Main Physics Update Loop
   * @param {Object} input - Control inputs { pitch, roll, yaw, throttle, trim }
   * @param {number} dt - Delta time in seconds
   */
  update(input, dt = 0.016) {
    if (this.state.isCrashed) return this.getAircraftState();

    // 1. Process Inputs
    this.processInputs(input, dt);

    // 2. Update Engines (Thrust)
    this.updateEngines(dt);

    // 3. Calculate Forces & Moments
    const forces = this.calculateForces();
    const moments = this.calculateMoments();

    // 4. Integrate Dynamics
    this.integrate(forces, moments, dt);

    // 5. Handle Ground Interactions (Collision, Taxi)
    this.handleGroundPhysics(dt);

    // 6. Check Limits & Crashes
    this.checkConstraints();

    return this.getAircraftState();
  }

  processInputs(input, dt) {
    // Smooth inputs to simulate control surface actuator speed / pilot delay
    const responsiveness = 5.0; // Higher = faster response
    
    this.state.controls.throttle = Math.max(0, Math.min(1, input.throttle));
    
    // Apply deadzone and smooth
    const deadzone = 0.05;
    const rawPitch = Math.abs(input.pitch) < deadzone ? 0 : input.pitch;
    const rawRoll = Math.abs(input.roll) < deadzone ? 0 : input.roll;
    const rawYaw = Math.abs(input.yaw) < deadzone ? 0 : input.yaw;

    this.smoothedInput.pitch += (rawPitch - this.smoothedInput.pitch) * responsiveness * dt;
    this.smoothedInput.roll += (rawRoll - this.smoothedInput.roll) * responsiveness * dt;
    this.smoothedInput.yaw += (rawYaw - this.smoothedInput.yaw) * responsiveness * dt;

    this.state.controls.pitch = this.smoothedInput.pitch;
    this.state.controls.roll = this.smoothedInput.roll;
    this.state.controls.yaw = this.smoothedInput.yaw;
    this.state.controls.trim = input.trim || 0;
  }

  updateEngines(dt) {
    // Spool up/down rate
    const spoolRate = 0.5; // % per second / 100
    
    this.engines.forEach((engine, index) => {
      if (engine.failed) {
        engine.n1 -= spoolRate * dt * 50; // Spool down fast
      } else {
        const target = this.state.controls.throttle * 100;
        const diff = target - engine.n1;
        engine.n1 += Math.sign(diff) * Math.min(Math.abs(diff), spoolRate * dt * 100);
      }
      
      // Clamp N1
      engine.n1 = Math.max(0, Math.min(100, engine.n1));

      // Calculate Thrust (Simplified quadratic relationship to N1)
      const thrustRatio = Math.pow(engine.n1 / 100, 1.5);
      engine.thrust = this.aircraft.maxThrustPerEngine * thrustRatio;
      
      // Altitude loss (Air is thinner)
      const densityRatio = Math.exp(-this.state.position.z / 10000);
      engine.thrust *= densityRatio;
    });
  }

  calculateForces() {
    const vSquared = this.state.velocity.u ** 2 + this.state.velocity.v ** 2 + this.state.velocity.w ** 2;
    const dynamicPressure = 0.5 * this.AIR_DENSITY * vSquared;
    
    // --- LIFT ---
    // Calculate Angle of Attack (Alpha)
    const flightPathAngle = Math.atan2(-this.state.velocity.w, this.state.velocity.u) || 0;
    const alpha = this.state.orientation.theta - flightPathAngle;
    
    // Flaps add to CL (Flaps in degrees 0-40)
    // Approx 0.02 CL per degree
    const flapLift = (this.state.flaps / 40) * 0.8; 
    
    // Base CL (Linear region)
    // CL = CL0 + CL_alpha * alpha
    // CL0 ~ 0.2 (camber)
    // CL_alpha ~ 2*PI (thin airfoil theory) -> ~6.0 per radian
    let CL = 0.2 + (alpha * 5.5) + flapLift; 
    
    // Stall logic
    // Critical AoA approx 18-20 degrees (0.31 - 0.35 rad) for modern airliners with slats
    const stallAngle = 0.35; // ~20 degrees
    if (alpha > stallAngle) { 
        // Post-stall lift drop
        CL = 0.8 * Math.sin(2 * alpha); // Simplified stall drop
        this.state.stalled = true;
    } else {
        this.state.stalled = false;
    }

    const liftForce = dynamicPressure * this.aircraft.wingArea * CL;
    
    // --- DRAG ---
    // CD = CD0 + k * CL^2
    // Flaps add Drag: 0.001 per degree?
    // Gear adds Drag: 0.02
    const flapDrag = (this.state.flaps / 40) * 0.1;
    let CD = this.aircraft.dragPolar.cd0 + (this.aircraft.dragPolar.k * CL * CL) + flapDrag;
    
    if (this.state.gear) CD += 0.025;
    CD += this.state.airBrakes * 0.08;

    const dragForce = dynamicPressure * this.aircraft.wingArea * CD;

    // --- THRUST ---
    const totalThrust = this.engines.reduce((sum, e) => sum + e.thrust, 0);

    // Forces in Body Frame
    // Fx = Thrust - Drag
    // Fz = -Lift
    
    // Note: We are ignoring the small rotation of Lift/Drag relative to body frame by Alpha
    // for simplicity, but strictly:
    // Fx = Thrust - Drag*cos(alpha) + Lift*sin(alpha)
    // Fz = -Lift*cos(alpha) - Drag*sin(alpha)
    // Since we want "feeling", let's be slightly more accurate:
    const cosAlpha = Math.cos(alpha);
    const sinAlpha = Math.sin(alpha);
    
    const Fx = totalThrust - (dragForce * cosAlpha) + (liftForce * sinAlpha);
    const Fz = -(liftForce * cosAlpha) - (dragForce * sinAlpha);
    const Fy = 0; 

    // Add Gravity (Earth Frame -> Body Frame)
    const weight = this.aircraft.mass * this.GRAVITY;
    const g_body_x = -weight * Math.sin(this.state.orientation.theta);
    const g_body_y = weight * Math.cos(this.state.orientation.theta) * Math.sin(this.state.orientation.phi);
    const g_body_z = weight * Math.cos(this.state.orientation.theta) * Math.cos(this.state.orientation.phi);

    return {
      x: Fx + g_body_x,
      y: Fy + g_body_y,
      z: Fz + g_body_z
    };
  }


  calculateMoments() {
    // --- MOMENTS (Rotational Forces) ---
    // Instead of calculating moments from forces (which requires arm lengths),
    // we use a "Target Rate" approach for better playability.
    // The pilot commands a RATE, and the plane tries to achieve it.
    
    // Stability constants (Spring back to center)
    const pitchStability = 2.0;
    const rollStability = 3.0;
    const yawStability = 1.0;

    // Control Authority (How fast we can rotate)
    const pitchAuthority = 0.5; // rad/s
    const rollAuthority = 1.0;  // rad/s
    const yawAuthority = 0.3;   // rad/s

    // Target Rates based on Input
    const targetP = this.state.controls.roll * rollAuthority;
    let targetQ = this.state.controls.pitch * pitchAuthority;
    const targetR = this.state.controls.yaw * yawAuthority;
    
    // Trim effect
    targetQ += this.state.controls.trim * 0.1;

    // Asymmetric Thrust Yaw Moment
    let yawMoment = 0;
    if (this.engines.length > 1) {
       const leftThrust = this.engines[0].thrust;
       const rightThrust = this.engines[1].thrust;
       // Assuming simple left/right split
       yawMoment = (leftThrust - rightThrust) * 0.00005; // Scaling factor
    }

    // Current rates
    const { p, q, r } = this.state.angularRates;

    // Calculate Accelerations (Torque / Inertia approx)
    // We just dampen towards target
    const inertia = 2.0; // Resistance to change
    
    const p_dot = (targetP - p - (this.state.orientation.phi * 0.1)) * inertia; // Small self-leveling in roll
    const q_dot = (targetQ - q) * inertia;
    const r_dot = (targetR - r + yawMoment) * inertia;

    return { p_dot, q_dot, r_dot };
  }

  integrate(forces, moments, dt) {
    // 1. Translational Acceleration (F=ma)
    const ax = forces.x / this.aircraft.mass;
    const ay = forces.y / this.aircraft.mass;
    const az = forces.z / this.aircraft.mass;

    // 2. Update Velocity (Body Frame)
    // u_dot = ax - q*w + r*v
    // v_dot = ay - r*u + p*w
    // w_dot = az - p*v + q*u
    
    const { u, v, w } = this.state.velocity;
    const { p, q, r } = this.state.angularRates;

    const u_dot = ax - (q * w) + (r * v);
    const v_dot = ay - (r * u) + (p * w);
    const w_dot = az - (p * v) + (q * u);

    this.state.velocity.u += u_dot * dt;
    this.state.velocity.v += v_dot * dt;
    this.state.velocity.w += w_dot * dt;

    // Damping/Air Resistance minimums
    // this.state.velocity.u *= 0.999; // Removed artificial damping, rely on Drag
    this.state.velocity.v *= 0.99; // Side slip decays fast
    // w shouldn't decay artificially, handled by lift/drag

    // 3. Update Angular Rates
    this.state.angularRates.p += moments.p_dot * dt;
    this.state.angularRates.q += moments.q_dot * dt;
    this.state.angularRates.r += moments.r_dot * dt;

    // 4. Update Orientation (Euler Integration)
    // phi_dot   = p + tan(theta)*(q*sin(phi) + r*cos(phi))
    // theta_dot = q*cos(phi) - r*sin(phi)
    // psi_dot   = (q*sin(phi) + r*cos(phi)) / cos(theta)
    
    const phi = this.state.orientation.phi;
    const theta = this.state.orientation.theta;
    const tanTheta = Math.tan(theta);
    const cosTheta = Math.cos(theta);
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    const phi_dot = p + tanTheta * (q * sinPhi + r * cosPhi);
    const theta_dot = q * cosPhi - r * sinPhi;
    const psi_dot = (q * sinPhi + r * cosPhi) / cosTheta;

    this.state.orientation.phi += phi_dot * dt;
    this.state.orientation.theta += theta_dot * dt;
    this.state.orientation.psi += psi_dot * dt;

    // 5. Update Position (Earth Frame)
    // Rotate Body Velocity to Earth Frame
    // V_earth = R_body_to_earth * V_body
    
    const cosPsi = Math.cos(this.state.orientation.psi);
    const sinPsi = Math.sin(this.state.orientation.psi);
    const sinTheta = Math.sin(theta);

    // Standard Rotation Matrix
    const d11 = cosTheta * cosPsi;
    const d12 = cosPhi * sinPsi + sinPhi * sinTheta * cosPsi; // Check this? 
    // Simplified Rotation:
    // x_dot (North)
    const x_dot = u * cosTheta * cosPsi 
                + v * (Math.sin(phi)*sinTheta*cosPsi - Math.cos(phi)*sinPsi)
                + w * (Math.cos(phi)*sinTheta*cosPsi + Math.sin(phi)*sinPsi);
    
    // y_dot (East)
    const y_dot = u * cosTheta * sinPsi
                + v * (Math.sin(phi)*sinTheta*sinPsi + Math.cos(phi)*cosPsi)
                + w * (Math.cos(phi)*sinTheta*sinPsi - Math.sin(phi)*cosPsi);

    // z_dot (Down) -> We want Altitude Dot (Up) = -z_dot
    const z_dot_down = -u * sinTheta
                     + v * Math.sin(phi) * cosTheta
                     + w * Math.cos(phi) * cosTheta;

    this.state.position.x += x_dot * dt;
    this.state.position.y += y_dot * dt;
    this.state.position.z -= z_dot_down * dt; // Altitude += Up Speed
  }

  handleGroundPhysics(dt) {
    if (this.state.position.z <= 0) {
      this.state.onGround = true;
      this.state.position.z = 0;

      // Vertical bounce/stop
      // If moving down, stop.
      // Calculate Vertical Speed in Earth Frame first
      // Approx: -u * sin(theta) + w * cos(theta)
      const v_vertical = -this.state.velocity.u * Math.sin(this.state.orientation.theta) + this.state.velocity.w * Math.cos(this.state.orientation.theta);
      
      if (v_vertical > 0) { // Moving DOWN (positive in Body Z approx, wait. Z-down means v_vertical > 0 is down)
          // We are using Altitude (Z-Up). 
          // Our integration: position.z -= z_dot_down * dt.
          // z_dot_down is positive when moving down.
          // So if z_dot_down > 0, we hit ground.
      }
      
      // Reset vertical velocity if hitting ground
      // But we need to allow rotation for takeoff
      
      // Rolling friction is constant F = mu * N
      const rollingFriction = 0.02 * this.GRAVITY; // Deceleration m/s^2
      if (this.state.velocity.u > 0) {
          this.state.velocity.u -= rollingFriction * dt;
          if (this.state.velocity.u < 0) this.state.velocity.u = 0;
      }
      
      // Brakes
      if (this.state.controls.throttle === 0 && this.state.velocity.u > 0) {
          this.state.velocity.u -= 5.0 * dt; // Braking
      }

      // Steering (Ground Yaw)
      if (Math.abs(this.state.velocity.u) > 1) {
          this.state.orientation.psi += this.state.controls.yaw * dt * 0.5;
      }
      
      // Level wings on ground
      this.state.orientation.phi *= 0.9;
      
      // Pitch constraint (prevent tail strike or early rotation)
      // Allow rotation if speed > 60 m/s (~115 kts) or if elevator is strong enough
      if (this.state.velocity.u < 60) { 
           // Damping pitch to 0
           this.state.orientation.theta *= 0.95;
           this.state.angularRates.q = 0;
           
           // If we are really slow, clamp it hard
           if (this.state.velocity.u < 30) {
               this.state.orientation.theta = 0;
           }
      }
      
      // Stop downward velocity (Body w)
      // w needs to counteract pitch contribution to keep z=0
      // simple hack: zero w if small
      this.state.velocity.w = 0;
      
    } else {
      this.state.onGround = false;
    }
  }

  checkConstraints() {
    // Ground Crash
    if (this.state.position.z <= 0) {
       // Check vertical speed for crash
       // We don't have earth-frame vertical speed handy, let's approx
       const sinkRate = this.state.velocity.w; // Approx
       if (sinkRate > 10) { // Hard landing > 10 m/s
           this.state.isCrashed = true;
           this.crashReason = "Hard Landing";
       }
       
       // Check Bank Angle
       if (Math.abs(this.state.orientation.phi) > 0.5) { // ~30 deg
           this.state.isCrashed = true;
           this.crashReason = "Wing Strike";
       }
    }
  }

  // --- Public Interface ---

  getAircraftState() {
    // Convert units for display
    const altitudeFt = this.state.position.z * 3.28084;
    const tasKts = this.state.velocity.u * 1.94384;
    const iasKts = tasKts; // Simple approximation
    
    // Vertical Speed in ft/min
    // Re-calculate earth vertical speed
    const theta = this.state.orientation.theta;
    const phi = this.state.orientation.phi;
    const u = this.state.velocity.u;
    const v = this.state.velocity.v;
    const w = this.state.velocity.w;
    
    const z_dot_down = -u * Math.sin(theta)
                     + v * Math.sin(phi) * Math.cos(theta)
                     + w * Math.cos(phi) * Math.cos(theta);
    const vsFtMin = -z_dot_down * 196.85; // m/s to ft/min

    return {
      position: this.state.position,
      velocity: this.state.velocity,
      orientation: this.state.orientation,
      angularRates: this.state.angularRates, // Added angularRates
      controls: this.state.controls,
      flaps: this.state.flaps,
      gear: this.state.gear,
      airBrakes: this.state.airBrakes,
      verticalSpeed: vsFtMin,
      hasCrashed: this.state.isCrashed,
      crashWarning: this.state.stalled ? "STALL" : "",
      engineParams: {
          n1: this.engines.map(e => e.n1),
          n2: this.engines.map(e => e.n1), // Mock N2
          egt: this.engines.map(e => 400 + e.n1 * 4),
          fuelFlow: this.engines.map(e => e.n1 * 10)
      },
      derived: {
          heading: (this.state.orientation.psi * 180 / Math.PI + 360) % 360,
          altitude_ft: altitudeFt,
          airspeed: iasKts,
          trueAirspeed: tasKts,
          groundSpeed: tasKts, // No wind in simple model yet
          verticalSpeed: vsFtMin
      }
    };
  }

  setFlaps(value) {
    this.state.flaps = value;
  }

  setGear(value) {
    this.state.gear = value;
  }
  
  setAirBrakes(value) {
      this.state.airBrakes = value;
  }
  
  setEngineThrottle(index, value) {
      // Support individual throttles if needed, though update() uses global throttle
      // We can update the global throttle based on average?
      // Or just ignore for now as update() overrides.
      // But let's set a flag or something if we want multi-throttle support.
      // For simple model, we just support main throttle.
  }
  
  // Failure Injection
  failEngine(index) {
      if (this.engines[index]) this.engines[index].failed = true;
  }

  reset() {
      this.state.position = { x: 0, y: 0, z: 0 };
      this.state.velocity = { u: 0, v: 0, w: 0 };
      this.state.orientation = { phi: 0, theta: 0, psi: 0 };
      this.state.angularRates = { p: 0, q: 0, r: 0 };
      this.state.controls.throttle = 0;
      this.state.isCrashed = false;
      this.state.onGround = true;
      this.engines.forEach(e => { e.n1 = 0; e.failed = false; });
  }
  
  calculateAirspeeds() {
      // Helper for hook compatibility
      const tas = this.state.velocity.u * 1.94384;
      return {
          trueAirspeed: tas,
          indicatedAirspeed: tas,
          calibratedAirspeed: tas
      };
  }
}

export default SimpleFlightPhysicsService;
