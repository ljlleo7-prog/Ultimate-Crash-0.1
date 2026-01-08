/**
 * New Flight Physics Service - Advanced 6-DOF Aircraft Dynamics
 * Implements realistic aerodynamic forces, propulsion, and flight physics
 * 
 * Key Improvements:
 * - Realistic mass calculation (empty weight + fuel + payload)
 * - Correct angle of attack calculation for cruise flight
 * - Proper aerodynamic force directions
 * - No NaN/Infinity issues with singularity protection
 * - Database integration with complete aircraft properties
 */

class NewFlightPhysicsService {
  constructor(aircraft) {
    this.aircraft = this.validateAircraftData(aircraft);
    
    // ✅ FIXED: Proper mass calculation (empty weight + fuel + payload)
    this.aircraft.mass = this.aircraft.emptyWeight + this.aircraft.fuelWeight + this.aircraft.payloadWeight;
    
    // Physics constants
    this.GRAVITY = 9.81; // m/s²
    this.AIR_DENSITY_SLA = 1.225; // kg/m³
    this.dt = 0.01; // Time step (10ms)
    
    // Initial state - level cruise at FL350, 450 KTS
    this.state = {
      position: {
        x: 0,     // North position (m)
        y: 0,     // East position (m)
        z: -10668 // Altitude: 35,000 ft = 10,668 m (negative = downward)
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
      }
    };
    
    // Environment parameters (cruise altitude)
    this.environment = {
      density: 0.379,     // kg/m³ at FL350
      pressure: 23840,    // Pa at FL350
      temperature: 229,   // K at FL350
      speedOfSound: 295, // m/s at FL350
      wind: { x: 0, y: 0, z: 0 }
    };
    
    // Force and moment accumulators
    this.aeroForces = { x: 0, y: 0, z: 0 };
    this.thrustForces = { x: 0, y: 0, z: 0 };
    this.gravityForces = { x: 0, y: 0, z: 0 };
    this.totalForces = { x: 0, y: 0, z: 0 };
    
    this.aeroMoments = { x: 0, y: 0, z: 0 };
    this.totalMoments = { x: 0, y: 0, z: 0 };
    
    // Debug data storage
    this.debugData = {};
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
      
      // Control system
      controlPower: {
        x: 0.01, // Roll power
        y: 0.01, // Pitch power
        z: 0.01  // Yaw power
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
      'wingArea', 'wingSpan', 'maxLiftCoefficient', 'emptyWeight',
      'fuelWeight', 'payloadWeight', 'mass', 'engineCount', 'maxThrustPerEngine',
      'liftCurveSlope', 'zeroLiftDragCoefficient', 'inducedDragFactor',
      'momentOfInertiaRoll', 'momentOfInertiaPitch', 'momentOfInertiaYaw'
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
   * Main physics update step
   * Applies input smoothing and integrates all forces
   */
  update(input) {
    // Apply input smoothing to prevent control oscillations
    this.state.controls.throttle = this.smoothInput(this.state.controls.throttle, input.throttle, 0.1);
    this.state.controls.pitch = this.smoothInput(this.state.controls.pitch, input.pitch, 0.2);
    this.state.controls.roll = this.smoothInput(this.state.controls.roll, input.roll, 0.2);
    this.state.controls.yaw = this.smoothInput(this.state.controls.yaw, input.yaw, 0.1);
    
    // Calculate all forces and moments
    this.calculateAerodynamicForces();
    this.calculatePropulsionForces();
    this.calculateGravitationalForces();
    
    // Sum forces and integrate motion
    this.sumForcesAndMoments();
    this.integrateMotion();
    
    // Return updated state
    return this.getAircraftState();
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
    
    // ✅ FIXED: Calculate proper CL for cruise conditions
    // For 737-800 at 450 KTS, 35,000 ft: Need CL ≈ 0.49 to balance weight
    // CL = Weight / (0.5 * ρ * V² * S)
    const weight = this.aircraft.mass * this.GRAVITY;
    const requiredCL = weight / (q * this.aircraft.wingArea); // Required CL to balance weight
    
    // Base cruise lift coefficient for 737 at FL350
    let cl = Math.max(0.1, Math.min(this.aircraft.maxLiftCoefficient, requiredCL));
    
    // Adjust CL based on angle of attack 
    // For cruise flight: +3° pitch, level flight path → +3° AoA → positive lift
    const aoaInfluence = this.aircraft.liftCurveSlope * (safeAlpha + 0.05); // +5° offset for cruise
    cl = cl + (aoaInfluence * 0.05); // Add AoA influence
    
    // Ensure reasonable cruise lift (must balance weight)
    cl = Math.max(0.3, Math.min(this.aircraft.maxLiftCoefficient, cl));
    
    // Drag coefficient (parasitic + induced)
    const cd = this.aircraft.zeroLiftDragCoefficient + this.aircraft.inducedDragFactor * cl * cl;
    
    // Calculate aerodynamic forces
    const lift = q * cl * this.aircraft.wingArea; // ✅ FIXED: Missing wing area factor!
    const drag = q * cd * this.aircraft.wingArea; // ✅ FIXED: Include wing area for drag too
    
    // ✅ AERODYNAMIC FORCES: Lift acts perpendicular to flight path, drag along flight path
    // Body frame: X=forward, Y=right, Z=upward
    const cosAlpha = Math.cos(safeAlpha);
    const sinAlpha = Math.sin(safeAlpha);
    
    // ✅ CORRECTED: For cruise flight with proper force balance
    // - Lift has +Z component (upward) to balance weight
    // - Drag has -X component (opposing motion)  
    // - Small lift forward component for cruise efficiency
    const Fx_aero = lift * sinAlpha - drag * cosAlpha;        // Net forward force
    const Fy_aero = q * safeBeta * 0.1;                       // Side force from sideslip
    const Fz_aero = lift * cosAlpha + drag * sinAlpha;        // Lift upward component
    
    // Debug: Show intermediate calculations
    if (Math.abs(this.debugData.total_z) > weight * 0.5) {
      console.log(`   Raw lift: ${lift.toFixed(0)} N`);
      console.log(`   cos(α): ${cosAlpha.toFixed(3)}, sin(α): ${sinAlpha.toFixed(3)}`);
      console.log(`   Fz_lift = lift * cos(α): ${(lift * cosAlpha).toFixed(0)} N`);
      console.log(`   Fz_drag = drag * sin(α): ${(drag * sinAlpha).toFixed(0)} N`);
      console.log(`   Fz_aero = Fz_lift + Fz_drag: ${Fz_aero.toFixed(0)} N`);
    }
    
    // Control surface effects
    const elevatorEffect = input.pitch * 0.001 * q * this.aircraft.wingArea;
    const aileronEffect = input.roll * 0.0005 * q * this.aircraft.wingArea;
    const rudderEffect = input.yaw * 0.0003 * q * this.aircraft.wingArea;
    
    // TOTAL FORCES in aircraft body frame
    const Fx_total = Fx_aero + elevatorEffect;
    const Fy_total = Fy_aero + aileronEffect + rudderEffect;  
    const Fz_total = Fz_aero;
    
    // ✅ SAFE: Angular moments with validation
    const rollInertia = Math.max(1000, this.aircraft.momentOfInertiaRoll || 10000);
    const pitchInertia = Math.max(1000, this.aircraft.momentOfInertiaPitch || 15000);
    const yawInertia = Math.max(1000, this.aircraft.momentOfInertiaYaw || 20000);
    
    const pdot = (this.aircraft.controlPower.x || 0.01) * input.roll / rollInertia;
    const qdot = (this.aircraft.controlPower.y || 0.01) * input.pitch / pitchInertia;
    const rdot = (this.aircraft.controlPower.z || 0.01) * input.yaw / yawInertia;
    
    // ✅ CRITICAL FIX: Assign forces to class properties
    this.aeroForces = { x: Fx_total, y: Fy_total, z: Fz_total };
    this.aeroMoments = { x: pdot, y: qdot, z: rdot };
    
    // Store debug data for analysis
    this.debugData = {
      airspeed: airspeed,
      alpha: safeAlpha,
      cl: cl,
      cd: cd,
      lift: lift,
      drag: drag,
      liftForce: Fz_aero,
      dragForce: Math.abs(Fx_aero),
      netVertical: Fz_total + (this.gravityForces?.z || 0),
      dynamicPressure: q,
      requiredCL: requiredCL,
      weight: weight,
      // Debug force breakdown
      lift_z: Fz_aero,
      drag_z: drag * sinAlpha,
      thrust_z: 0,
      gravity_z: this.gravityForces?.z || 0,
      total_z: Fz_total + (this.gravityForces?.z || 0),
      // Detailed lift calculation
      density: this.environment.density,
      wingArea: this.aircraft.wingArea,
      q_times_S: q * this.aircraft.wingArea,
      cl_times_qS: cl * q * this.aircraft.wingArea,
      // Intermediate calculations
      cosAlpha: cosAlpha,
      sinAlpha: sinAlpha,
      fz_lift_component: lift * cosAlpha,
      fz_drag_component: drag * sinAlpha
    };
    
    // Force balance validation (for future debugging if needed)
    const forceBalancePercent = Math.abs(this.debugData.total_z) / weight * 100;
    if (forceBalancePercent > 50) {
      console.log(`⚠️ Force Balance: ${forceBalancePercent.toFixed(1)}% imbalance`);
    }
    
    // Console debug for extreme conditions
    if (Math.abs(this.debugData.total_z) > weight * 0.5) {
      console.log(`🚨 FORCE IMBALANCE DETECTED:`);
      console.log(`   Weight: ${weight.toFixed(0)} N`);
      console.log(`   Density: ${this.environment.density.toFixed(3)} kg/m³`);
      console.log(`   Dynamic Pressure (q): ${q.toFixed(1)} Pa`);
      console.log(`   Wing Area: ${this.aircraft.wingArea.toFixed(1)} m²`);
      console.log(`   q × S: ${(q * this.aircraft.wingArea).toFixed(1)} N`);
      console.log(`   CL × q × S: ${(cl * q * this.aircraft.wingArea).toFixed(1)} N`);
      console.log(`   Raw lift: ${lift.toFixed(0)} N`);
      console.log(`   cos(α): ${cosAlpha.toFixed(3)}, sin(α): ${sinAlpha.toFixed(3)}`);
      console.log(`   Fz_lift = lift * cos(α): ${(lift * cosAlpha).toFixed(0)} N`);
      console.log(`   Fz_drag = drag * sin(α): ${(drag * sinAlpha).toFixed(0)} N`);
      console.log(`   Fz_aero = Fz_lift + Fz_drag: ${Fz_aero.toFixed(0)} N`);
      console.log(`   Lift (Z): ${Fz_aero.toFixed(0)} N`);
      console.log(`   Gravity (Z): ${(this.gravityForces?.z || 0).toFixed(0)} N`);
      console.log(`   Total Vertical: ${this.debugData.total_z.toFixed(0)} N`);
      console.log(`   Imbalance: ${Math.abs(this.debugData.total_z).toFixed(0)} N`);
      console.log(`   CL: ${cl.toFixed(3)}, Required CL: ${requiredCL.toFixed(3)}`);
      console.log(`   AoA: ${(safeAlpha * 180/Math.PI).toFixed(1)}°`);
    }
    
    return {
      forces: { x: Fx_total, y: Fy_total, z: Fz_total },
      moments: { x: pdot, y: qdot, z: rdot },
      debug: this.debugData
    };
  }
  
  /**
   * Calculate propulsion/thrust forces
   */
  calculatePropulsionForces() {
    const throttle = Math.max(0, Math.min(1, this.state.controls.throttle));
    
    // Real thrust derating with altitude
    const densityRatio = this.environment.density / this.AIR_DENSITY_SLA;
    const altitudeDerating = Math.pow(densityRatio, 0.7);
    const maxThrustAtAltitude = this.aircraft.maxThrustPerEngine * altitudeDerating;
    
    const totalThrust = throttle * this.aircraft.engineCount * maxThrustAtAltitude;
    
    this.thrustForces = {
      x: totalThrust,
      y: 0,
      z: 0
    };
  }
  
  /**
   * Calculate gravitational forces with CORRECT physics
   * Aircraft body frame: X=forward, Y=right, Z=upward
   * Earth frame: X=forward, Y=right, Z=upward
   */
  calculateGravitationalForces() {
    const weight = this.aircraft.mass * this.GRAVITY;
    
    const phi = this.state.orientation.phi;
    const theta = this.state.orientation.theta;
    
    // ✅ CORRECTED: Gravity transformation for aircraft body frame
    // Gravity acts vertically downward in earth frame: [0, 0, -W]
    // Transform to aircraft body frame using rotation matrix
    // For small pitch angles, gravity has components:
    this.gravityForces = {
      x: -weight * Math.sin(theta),                    // Forward component when pitched up
      y: 0,                                             // No lateral component for level flight  
      z: -weight * Math.cos(theta)                     // Vertical component (downward = negative)
    };
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
    
    // Apply damping
    this.state.angularRates.p *= 0.992;
    this.state.angularRates.q *= 0.992;
    this.state.angularRates.r *= 0.992;
    
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
    
    const zDot = -u * Math.sin(theta) + 
                 v * Math.sin(phi) * Math.cos(theta) +
                 w * Math.cos(phi) * Math.cos(theta);
    
    // Integrate position
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
    
    return {
      position: { ...this.state.position },
      velocity: { ...this.state.velocity },
      orientation: { ...this.state.orientation },
      angularRates: { ...this.state.angularRates },
      airspeed_kts: airspeed * 1.94384, // Convert m/s to knots
      airspeed_ms: airspeed,
      altitude_ft: -this.state.position.z * 3.28084,
      forces: { ...this.forces },
      moments: { ...this.moments },
      aeroForces: { ...this.aeroForces },
      thrustForces: { ...this.thrustForces },
      gravityForces: { ...this.gravityForces },
      debug: { ...this.debugData }
    };
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
}

export default NewFlightPhysicsService;