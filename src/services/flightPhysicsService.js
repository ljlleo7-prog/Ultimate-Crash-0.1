// Flight Physics Service - Handles realistic aircraft flight dynamics with force-based physics

class FlightPhysicsService {
  constructor(aircraftModel = null) {
    // Load aircraft parameters from database if model is provided
    this.aircraftModel = aircraftModel;
    this.aircraftParams = this.loadAircraftParameters(aircraftModel);
    
    this.state = {
      // Navigation
      heading: 270,
      trueAirspeed: 450,
      groundSpeed: 430,
      indicatedAirspeed: 280,
      radioFreq: 121.5,
      
      // Flight Pose
      pitch: 2.5,
      roll: 0.5,
      verticalSpeed: 1200,
      altitude: 35000,
      altimeter: 29.92,
      
      // Engine
      engineN1: [85.2, 85.1],
      engineN2: [95.3, 95.2],
      engineEGT: [650, 645],
      fuel: 8500,
      
      // Systems
      flaps: 0, // 0 = up, 1 = takeoff, 2 = landing
      gear: false,
      
      // Autopilot
      autopilot: true,
      flightDirector: true,
      altitudeHold: true,
      headingHold: true,
      
      // Central Display
      flightPhase: 'CRUISE',
      nextWaypoint: 'WPT3',
      distanceToWaypoint: 125.4,
      timeToWaypoint: 18.2,
      
      // Crash Detection
      crashWarning: null,
      timeToCrash: null,
      hasCrashed: false,
      
      // Stall Detection
      isStalling: false,
      stallWarning: false
    };
    
    // Physics state (not displayed)
    this.physicsState = {
      // Velocity vectors (knots)
      horizontalVelocity: 280,
      verticalVelocity: 20, // feet per second (converted from FPM)
      
      // Acceleration vectors (knots per second)
      horizontalAcceleration: 0,
      verticalAcceleration: 0,
      
      // Mass and forces - Use aircraft parameters if available, otherwise defaults
      mass: this.aircraftParams?.mass || 80000, // kg
      thrustForce: 0,
      dragForce: 0,
      liftForce: 0,
      gravityForce: 0
    };
    
    this.lastUpdateTime = Date.now();
  }

  // Load aircraft parameters from database
  loadAircraftParameters(model) {
    if (!model) return null;
    
    try {
      // Import aircraft database
      const aircraftDatabase = require('../data/aircraftDatabase.json');
      const aircraft = aircraftDatabase.aircraft.find(a => a.model === model);
      
      if (aircraft) {
        // Use actual aircraft parameters from database
        return {
          mass: aircraft.emptyWeight + (aircraft.maxPayload * 0.7), // Realistic operating weight
          cruiseSpeed: aircraft.cruiseSpeed,
          maxRange: aircraft.maxRange,
          engineCount: aircraft.engineCount,
          engineType: aircraft.engineType,
          wingArea: aircraft.wingArea,
          wingSpan: aircraft.wingSpan,
          aspectRatio: aircraft.aspectRatio,
          maxLiftCoefficient: aircraft.maxLiftCoefficient,
          stallSpeed: aircraft.stallSpeed,
          maxOperatingMach: aircraft.maxOperatingMach,
          emptyWeight: aircraft.emptyWeight,
          maxTakeoffWeight: aircraft.maxTakeoffWeight
        };
      }
    } catch (error) {
      console.warn('Failed to load aircraft parameters for', model, error);
    }
    
    return null;
  }

  // Calculate all forces acting on the aircraft
  calculateForces(dt) {
    // Use aircraft parameters if available, otherwise use defaults
    const engineCount = this.aircraftParams?.engineCount || 2;
    const maxThrust = this.aircraftParams?.maxThrust || 240000; // Default for 2 engines
    const wingArea = this.aircraftParams?.wingArea || 125; // Default wing area
    
    // Thrust force (from engines) - IMPROVED: Single-engine thrust multiplied by engine count
    const singleEngineThrust = maxThrust / engineCount; // Newtons per engine
    
    // Calculate average thrust percentage from both engines
    const avgThrust = (this.state.engineN1[0] + this.state.engineN1[1]) / 2;
    const thrustFactor = avgThrust / 100;
    
    // Thrust reduces with altitude (air density) - IMPROVED: More realistic altitude performance
    const altitudeDensityFactor = Math.max(0.8, 1 - (this.state.altitude / 180000)); // Higher ceiling for better high-altitude performance
    
    // Ensure thrust is always positive (forward)
    this.physicsState.thrustForce = Math.max(0, thrustFactor * maxThrust * altitudeDensityFactor);
    
    // Drag force (based on airspeed and configuration) - IMPROVED: More realistic drag
    const airspeedKnots = this.state.indicatedAirspeed;
    const airspeedMs = airspeedKnots * 0.5144; // Convert knots to m/s
    
    // Drag coefficient (depends on configuration) - More realistic values
    let dragCoefficient = 0.010; // Clean configuration (improved aerodynamics)
    if (this.state.flaps === 1) dragCoefficient = 0.018; // Takeoff flaps
    if (this.state.flaps === 2) dragCoefficient = 0.030; // Landing flaps
    if (this.state.gear) dragCoefficient += 0.008; // Gear down
    
    // Add drag from pitch-flight path imbalance - More realistic
    const flightPathAngle = Math.atan2(this.physicsState.verticalVelocity * 0.5144, this.physicsState.horizontalVelocity * 0.5144);
    const pitchRad = this.state.pitch * Math.PI / 180;
    const angleImbalance = Math.abs(pitchRad - flightPathAngle);
    
    // Realistic drag when pitch and flight path are misaligned
    const imbalanceDragFactor = 1.0 + (angleImbalance * 0.8); // More realistic imbalance effect
    dragCoefficient *= imbalanceDragFactor;
    
    // Air density at altitude (kg/m³) - More realistic density model
    const airDensity = 1.225 * Math.exp(-this.state.altitude / 10000); // Standard atmospheric model
    
    this.physicsState.dragForce = 0.5 * dragCoefficient * airDensity * wingArea * airspeedMs * airspeedMs;
    
    // Lift force (based on airspeed and angle of attack) - REWRITTEN: Use aircraft parameters
    const angleOfAttack = this.calculateAngleOfAttack();
    
    // Calculate lift coefficient based on angle of attack and aircraft characteristics
    const maxLiftCoefficient = this.aircraftParams?.maxLiftCoefficient || 1.6;
    const stallSpeed = this.aircraftParams?.stallSpeed || 125;
    
    // Realistic lift curve slope (per degree)
    const liftCurveSlope = 0.08; // Typical value for transport aircraft
    
    // Calculate base lift coefficient
    let liftCoefficient = 0.1 + (angleOfAttack * liftCurveSlope);
    
    // Limit to maximum lift coefficient
    liftCoefficient = Math.min(maxLiftCoefficient * 0.9, liftCoefficient); // 90% of max for safety
    
    // High-speed compressibility effects (Mach effects)
    const mach = airspeedMs / 340; // Speed of sound at sea level
    const maxMach = this.aircraftParams?.maxOperatingMach || 0.82;
    
    if (mach > maxMach * 0.8) {
      // Compressibility drag and lift reduction
      const machFactor = Math.max(0.7, 1 - ((mach - maxMach * 0.8) / (maxMach * 0.2)));
      liftCoefficient *= machFactor;
    }
    
    // Stall effects
    if (this.state.isStalling) {
      liftCoefficient *= 0.3; // Severe lift reduction in stall
    }
    
    this.physicsState.liftForce = 0.5 * liftCoefficient * airDensity * wingArea * airspeedMs * airspeedMs;
    
    // Gravity force
    this.physicsState.gravityForce = this.physicsState.mass * 9.81; // Newtons
  }

  // Calculate angle of attack based on pitch and flight path
  calculateAngleOfAttack() {
    // Simplified: angle of attack ≈ pitch angle in level flight
    // In reality, this would be more complex with flight path angle
    const flightPathAngle = Math.atan2(this.physicsState.verticalVelocity * 0.5144, this.physicsState.horizontalVelocity * 0.5144);
    const pitchRad = this.state.pitch * Math.PI / 180;
    
    return Math.max(-10, Math.min(15, pitchRad - flightPathAngle)) * 180 / Math.PI; // Convert to degrees
  }

  // Calculate accelerations from forces
  calculateAccelerations(dt) {
    // Horizontal acceleration (thrust - drag)
    const netHorizontalForce = this.physicsState.thrustForce - this.physicsState.dragForce;
    this.physicsState.horizontalAcceleration = netHorizontalForce / this.physicsState.mass; // m/s²
    
    // Convert to knots per second for our velocity system
    this.physicsState.horizontalAcceleration /= 0.5144; // Convert m/s² to knots/s²
    
    // Vertical acceleration (lift - weight)
    const pitchRad = this.state.pitch * Math.PI / 180;
    const verticalLift = this.physicsState.liftForce * Math.cos(pitchRad);
    const verticalThrust = this.physicsState.thrustForce * Math.sin(pitchRad);
    
    const netVerticalForce = verticalLift + verticalThrust - this.physicsState.gravityForce;
    this.physicsState.verticalAcceleration = netVerticalForce / this.physicsState.mass; // m/s²
    
    // Convert to feet per second per second
    this.physicsState.verticalAcceleration *= 3.28084; // Convert m/s² to ft/s²
  }

  // Update velocities using accelerations
  updateVelocities(dt) {
    // Horizontal velocity (knots)
    this.physicsState.horizontalVelocity += this.physicsState.horizontalAcceleration * dt;
    
    // Vertical velocity (feet per second)
    this.physicsState.verticalVelocity += this.physicsState.verticalAcceleration * dt;
    
    // Apply horizontal speed limits only (remove VS limits and artificial minimum)
    const maxHorizontalSpeed = this.calculateMaxSpeedAtAltitude();
    this.physicsState.horizontalVelocity = Math.min(maxHorizontalSpeed, this.physicsState.horizontalVelocity); // REMOVED Math.max(100, ...)
    
    // **FIXED: IMPROVED ENERGY CONVERSION - Better altitude maintenance at 250kts**
    // When pitching up: convert kinetic energy to potential energy (speed loss)
    // When pitching down: convert potential energy to kinetic energy (speed gain)
    if (Math.abs(this.state.pitch) > 1.5) { // Reduced threshold for more realistic energy conversion
      const energyConversionFactor = 0.03; // More realistic conversion factor
      const pitchMagnitude = Math.abs(this.state.pitch);
      const pitchFactor = pitchMagnitude / 25; // Less pitch sensitivity
      
      if (this.state.pitch > 0 && this.physicsState.verticalVelocity > 0) {
        // Pitching up with positive VS: lose speed (energy conversion to altitude)
        const vsMagnitude = Math.abs(this.physicsState.verticalVelocity);
        const speedLoss = vsMagnitude * pitchFactor * energyConversionFactor * dt;
        this.physicsState.horizontalVelocity = Math.max(180, this.physicsState.horizontalVelocity - speedLoss); // Higher minimum speed
      } else if (this.state.pitch < 0 && this.physicsState.verticalVelocity < 0) {
        // Pitching down with negative VS: gain speed (energy conversion from altitude)
        const vsMagnitude = Math.abs(this.physicsState.verticalVelocity);
        const speedGain = vsMagnitude * pitchFactor * energyConversionFactor * dt;
        this.physicsState.horizontalVelocity += speedGain;
      }
    }
    
    // **FIXED: IMPROVED HIGH SPEED LIFT EFFECT - Better altitude maintenance**
    if (this.physicsState.horizontalVelocity > 200 && this.state.pitch >= 0) { // Lower threshold for better lift
      // High speed creates significant lift even at zero pitch
      const speedLiftFactor = (this.physicsState.horizontalVelocity - 200) / 100 * 0.15; // More realistic effect
      this.physicsState.verticalVelocity += speedLiftFactor * dt;
    }
    
    // **FIXED: ADD ALTITUDE MAINTENANCE AT 250kts IAS**
    // When at optimal cruise speed (250kts), provide natural altitude stability
    // Only apply altitude maintenance when above 10,000ft to avoid sea level issues
    if (this.state.indicatedAirspeed >= 240 && this.state.indicatedAirspeed <= 260 && this.state.altitude > 10000) {
      const targetAltitude = 35000; // Target cruise altitude
      const altitudeError = targetAltitude - this.state.altitude;
      const altitudeCorrection = altitudeError * 0.0001 * dt; // Gentle correction
      this.physicsState.verticalVelocity += altitudeCorrection;
      
      // **FIX: Add pitch stabilization at cruise altitude**
      // When near target altitude, stabilize pitch around 2 degrees
      if (Math.abs(altitudeError) < 500) { // Within 500ft of target
        const pitchError = 2 - this.state.pitch; // Target pitch of 2 degrees
        const pitchCorrection = pitchError * 0.01 * dt;
        this.state.pitch += pitchCorrection;
      }
    }
    
    // Stall detection
    const stallSpeed = this.calculateStallSpeed();
    this.state.stallWarning = this.physicsState.horizontalVelocity < stallSpeed * 1.2;
    this.state.isStalling = this.physicsState.horizontalVelocity < stallSpeed;
    
    if (this.state.isStalling) {
      // Stall physics: reduced lift, increased drag
      this.physicsState.horizontalVelocity *= 0.997; // Much slower speed decay
      this.physicsState.verticalVelocity = Math.min(this.physicsState.verticalVelocity, -12); // Slower descent
      
      // Stall makes control difficult
      if (Math.random() < 0.15) { // Reduced frequency
        this.state.pitch += (Math.random() - 0.5) * 0.8; // Smaller oscillations
      }
    }
  }

  // Convert physics velocities to display values
  updateDisplayValues() {
    // Indicated airspeed (direct from horizontal velocity)
    this.state.indicatedAirspeed = this.physicsState.horizontalVelocity;
    
    // Vertical speed (convert ft/s to FPM)
    this.state.verticalSpeed = this.physicsState.verticalVelocity * 60;
    
    // True airspeed and ground speed
    this.state.trueAirspeed = this.calculateTrueAirspeed(this.state.indicatedAirspeed);
    this.state.groundSpeed = this.state.trueAirspeed; // No wind for now
    
    // Roll effects on heading change
    const rollRad = this.state.roll * Math.PI / 180;
    const turnRate = Math.sin(rollRad) * 3; // Degrees per second
    
    // Calculate new heading
    let newHeading = this.state.heading + (turnRate * 0.1); // Using small time step
    newHeading = newHeading % 360;
    if (newHeading < 0) newHeading += 360;
    this.state.heading = newHeading;
  }

  // Update position based on velocities
  updatePosition(dt) {
    // Calculate altitude change
    const altitudeChange = this.physicsState.verticalVelocity * dt;
    const newAltitude = Math.max(0, this.state.altitude + altitudeChange);
    this.state.altitude = newAltitude;
  }

  // Calculate maximum speed at current altitude
  calculateMaxSpeedAtAltitude() {
    const altitudeFactor = Math.max(0.5, 1 - (this.state.altitude / 80000)); // Higher ceiling (from 50000 to 80000)
    return 450 * altitudeFactor; // Higher max speed (from 400 to 450)
  }

  // Calculate maximum climb rate at current altitude
  calculateMaxClimbRate() {
    const altitudeFactor = Math.max(0.4, 1 - (this.state.altitude / 60000)); // Higher ceiling (from 45000 to 60000)
    return 3500 * altitudeFactor; // Higher climb rate (from 3000 to 3500)
  }

  // Calculate stall speed based on configuration
  calculateStallSpeed() {
    // Use aircraft stall speed as base
    const baseStallSpeed = this.aircraftParams?.stallSpeed || 125;
    
    // Adjust for configuration
    let stallSpeed = baseStallSpeed;
    if (this.state.flaps === 1) stallSpeed *= 0.9; // Takeoff flaps reduce stall speed by 10%
    if (this.state.flaps === 2) stallSpeed *= 0.8; // Landing flaps reduce stall speed by 20%
    if (this.state.gear) stallSpeed *= 1.05; // Gear down increases stall speed by 5%
    
    return stallSpeed;
  }

  // Calculate true airspeed from indicated airspeed
  calculateTrueAirspeed(ias) {
    const altitudeFactor = 1 + (this.state.altitude / 35000) * 0.6;
    return ias * altitudeFactor;
  }

  // Check for crash conditions and set warnings with flashing effects - FIX GWPS LOGIC
  checkCrashConditions(dt) {
    if (this.physicsState.verticalVelocity < 0 && this.state.altitude > 0) {
      const descentRate = Math.abs(this.physicsState.verticalVelocity); // ft/s
      this.state.timeToCrash = this.state.altitude / descentRate;
    } else {
      this.state.timeToCrash = null;
    }
    
    // **ADD FLASHING EFFECTS TO ALL WARNINGS**
    const currentTime = Date.now();
    const flashInterval = 500; // Flash every 500ms
    const shouldFlash = Math.floor(currentTime / flashInterval) % 2 === 0;
    
    if (this.state.altitude <= 0) {
      this.state.hasCrashed = true;
      this.state.crashWarning = 'CRASHED';
    } else if (this.state.timeToCrash && this.state.timeToCrash <= 10) {
      // PULL UP! - 10s before impact - FIX: Always show warning, flash effect handled by CSS
      this.state.crashWarning = 'PULL UP!';
    } else if (this.state.timeToCrash && this.state.timeToCrash <= 20) {
      // TERRAIN! - 20s before impact - FIX: Always show warning, flash effect handled by CSS
      this.state.crashWarning = 'TERRAIN!';
    } else if (this.physicsState.verticalVelocity < -100) { // -6000 fpm in ft/s (100 ft/s)
      // SINK RATE! - triggered when VS < -6000 fpm - FIX: Always show warning
      this.state.crashWarning = 'SINK RATE!';
    } else {
      this.state.crashWarning = null;
    }
  }

  // Update engine parameters with realistic physics
  updateEngineParameters(dt) {
    const spoolRate = 5.0;
    
    const targetN1 = this.state.engineN1.map(n => {
      const variation = (Math.random() - 0.5) * 0.1;
      return Math.max(0, Math.min(100, n + variation));
    });
    
    this.state.engineN1 = this.state.engineN1.map((currentN1, i) => {
      const diff = targetN1[i] - currentN1;
      const change = Math.sign(diff) * Math.min(Math.abs(diff), spoolRate * dt);
      return currentN1 + change;
    });
    
    const targetN2 = this.state.engineN1.map(n1 => n1 * 1.12);
    
    const baseEGT = 600;
    const thrustEGT = this.state.engineN1.map(n1 => n1 * 3);
    const altitudeEGT = (35000 - this.state.altitude) / 1000 * 10;
    
    const targetEGT = targetN1.map((n1, i) => 
      Math.max(0, baseEGT + thrustEGT[i] + altitudeEGT + (Math.random() - 0.5) * 5)
    );
    
    const fuelConsumption = this.state.engineN1.reduce((sum, n1) => sum + n1, 0) * 0.01 * dt;
    
    this.state.engineN2 = targetN2;
    this.state.engineEGT = targetEGT;
    this.state.fuel = Math.max(0, this.state.fuel - fuelConsumption);
  }

  // Control functions
  controlPitch(amount) {
    if (!this.state.autopilot && !this.state.hasCrashed) {
      const controlEffectiveness = this.state.isStalling ? 0.3 : 1.0;
      this.state.pitch = Math.max(-15, Math.min(15, this.state.pitch + amount * controlEffectiveness));
    }
  }

  controlRoll(amount) {
    if (!this.state.autopilot && !this.state.hasCrashed) {
      const controlEffectiveness = this.state.isStalling ? 0.5 : 1.0;
      this.state.roll = Math.max(-30, Math.min(30, this.state.roll + amount * controlEffectiveness));
    }
  }

  controlThrust(engineIndex, amount) {
    if (!this.state.autopilot && !this.state.hasCrashed) {
      const newN1 = Math.max(0, Math.min(100, this.state.engineN1[engineIndex] + amount));
      this.state.engineN1[engineIndex] = newN1;
    }
  }

  // Configuration controls
  controlFlaps(position) {
    if (!this.state.hasCrashed) {
      this.state.flaps = Math.max(0, Math.min(2, position));
    }
  }

  controlGear(extended) {
    if (!this.state.hasCrashed) {
      this.state.gear = extended;
    }
  }

  // Autopilot functions - FIX IAS DROP ON DISENGAGEMENT
  toggleAutopilot() {
    if (!this.state.hasCrashed) {
      this.state.autopilot = !this.state.autopilot;
      
      if (this.state.autopilot) {
        // When engaging AP, gently transition to stable flight
        this.state.pitch = Math.max(-2, Math.min(2, this.state.pitch));
        this.state.roll = Math.max(-5, Math.min(5, this.state.roll));
        this.state.headingHold = true;
        this.state.altitudeHold = true;
      } else {
        // **FIX IAS DROP: When disengaging AP, preserve current physics state**
        // Keep all velocity and acceleration values exactly as they are
        // No reset or sudden changes to horizontal/vertical velocities
        console.log('AP disengaged - preserving physics state');
      }
    }
  }

  // Autopilot mode with P control for altitude hold and IAS hold
  updateAutopilotMode(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Altitude hold with P control
    const targetAltitude = 35000; // Target altitude to maintain
    const altitudeError = targetAltitude - this.state.altitude;
    
    // P controller for altitude
    const kp = 0.001; // Proportional gain
    const targetVS = altitudeError * kp; // Target vertical speed (FPM)
    
    // Convert target VS to ft/s
    const targetVS_fts = targetVS / 60;
    
    // Calculate required pitch to achieve target VS
    const currentAirspeed = this.state.indicatedAirspeed;
    const vsToPitchGain = 0.05; // Gain for VS to pitch conversion
    const targetPitch = targetVS_fts * vsToPitchGain;
    
    // Apply pitch control with smoothing
    const pitchError = targetPitch - this.state.pitch;
    const pitchRate = 0.5; // Degrees per second
    this.state.pitch += Math.sign(pitchError) * Math.min(Math.abs(pitchError), pitchRate * dt);
    this.state.pitch = Math.max(-10, Math.min(10, this.state.pitch));
    
    // IAS hold with P control - NEW: Maintain 250 knots
    const targetIAS = 250; // Target indicated airspeed
    const iasError = targetIAS - this.state.indicatedAirspeed;
    
    // P controller for IAS - FIX: More aggressive control at high altitudes
    const iasKp = 0.5; // Increased from 0.2 to 0.5 for better control
    
    // Additional altitude compensation for better high-altitude performance
    const altitudeCompensation = 1 + (this.state.altitude / 50000) * 0.3;
    const thrustAdjustment = iasError * iasKp * altitudeCompensation;
    
    // Apply thrust control to both engines
    const baseThrust = 85; // Base N1 setting for cruise
    const targetN1 = Math.max(60, Math.min(95, baseThrust + thrustAdjustment)); // Increased minimum to 60
    
    // Apply thrust with realistic engine spooling
    this.state.engineN1 = this.state.engineN1.map((currentN1, index) => {
      const diff = targetN1 - currentN1;
      const spoolRate = 3.0; // Increased spooling rate from 2.0 to 3.0
      const change = Math.sign(diff) * Math.min(Math.abs(diff), spoolRate * dt);
      return currentN1 + change;
    });
    
    // **THRUST IMBALANCE EFFECTS** - NEW: Imbalance causes roll and heading changes
    const thrustImbalance = this.state.engineN1[0] - this.state.engineN1[1];
    
    if (Math.abs(thrustImbalance) > 1.0) {
      // Significant imbalance - causes yaw and roll
      const imbalanceFactor = thrustImbalance * 0.1; // Roll effect gain
      
      // Apply roll due to thrust imbalance
      this.state.roll += imbalanceFactor * dt;
      
      // Apply heading change due to yaw
      const yawRate = thrustImbalance * 0.5; // Degrees per second
      this.state.heading += yawRate * dt;
      
      // Keep heading within 0-360
      this.state.heading = this.state.heading % 360;
      if (this.state.heading < 0) this.state.heading += 360;
    }
    
    // Maintain level roll (dampen any excessive roll)
    this.state.roll = Math.max(-15, Math.min(15, this.state.roll * 0.95));
    
    // Small random variations for realistic flight
    this.state.pitch += (Math.random() - 0.5) * 0.05;
    this.state.roll += (Math.random() - 0.5) * 0.02;
    
    // Use full physics in autopilot mode for realistic behavior
    this.updateFlightDynamics(deltaTime);
  }

  // Reset flight state (for restarting after crash)
  resetFlight() {
    this.state.altitude = 35000;
    this.state.verticalSpeed = 1200;
    this.state.pitch = 2.5;
    this.state.roll = 0.5;
    this.state.hasCrashed = false;
    this.state.crashWarning = null;
    this.state.timeToCrash = null;
    this.state.autopilot = true;
  }

  // Main update method called by FlightPanel
  update() {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // Update physics if not crashed
    if (!this.state.hasCrashed) {
      if (this.state.autopilot) {
        this.updateAutopilotMode(deltaTime);
      } else {
        this.updateFlightDynamics(deltaTime);
      }
      
      // Update engine parameters
      this.updateEngineParameters(deltaTime / 1000);
      
      // Update crash detection
      this.updateCrashDetection();
    }
    
    return this.state;
  }
}

export default FlightPhysicsService;