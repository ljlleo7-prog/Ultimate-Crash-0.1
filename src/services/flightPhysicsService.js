// Flight Physics Service - Handles realistic aircraft flight dynamics with force-based physics

class FlightPhysicsService {
  constructor() {
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
      
      // Mass and forces
      mass: 80000, // kg (typical airliner)
      thrustForce: 0,
      dragForce: 0,
      liftForce: 0,
      gravityForce: 0
    };
    
    this.lastUpdateTime = Date.now();
  }

  // Calculate flight dynamics based on current state using force-based physics
  updateFlightDynamics(deltaTime) {
    const dt = deltaTime / 1000; // Convert to seconds
    
    // Calculate forces
    this.calculateForces(dt);
    
    // Calculate accelerations (F = ma)
    this.calculateAccelerations(dt);
    
    // Update velocities using accelerations
    this.updateVelocities(dt);
    
    // Convert velocities to display values
    this.updateDisplayValues();
    
    // Update altitude and position
    this.updatePosition(dt);
    
    // Update engine parameters with realistic variations
    this.updateEngineParameters(dt);
    
    // Check for crash conditions
    this.checkCrashConditions(dt);
    
    // Update time
    this.lastUpdateTime = Date.now();
  }

  // Update function to be called regularly
  update() {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    
    if (!this.state.hasCrashed) {
      if (this.state.autopilot) {
        // Autopilot mode - use P control for altitude hold
        this.updateAutopilotMode(deltaTime);
      } else {
        // Manual mode - full physics
        this.updateFlightDynamics(deltaTime);
      }
    }
    
    return { ...this.state };
  }

  // Autopilot mode with P control for altitude hold
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
    
    // Maintain level roll
    this.state.roll = Math.max(-5, Math.min(5, this.state.roll * 0.95)); // Dampen roll
    
    // Small random variations
    this.state.pitch += (Math.random() - 0.5) * 0.05;
    this.state.roll += (Math.random() - 0.5) * 0.02;
    
    // Use full physics in autopilot mode for realistic behavior
    this.updateFlightDynamics(deltaTime);
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
    const altitudeFactor = Math.max(0.3, 1 - (this.state.altitude / 50000));
    return 400 * altitudeFactor;
  }

  // Calculate maximum climb rate at current altitude
  calculateMaxClimbRate() {
    const altitudeFactor = Math.max(0.2, 1 - (this.state.altitude / 45000));
    return 3000 * altitudeFactor;
  }

  // Calculate stall speed based on configuration
  calculateStallSpeed() {
    let baseStallSpeed = 160;
    if (this.state.flaps === 1) baseStallSpeed = 140;
    if (this.state.flaps === 2) baseStallSpeed = 120;
    if (this.state.gear) baseStallSpeed += 5;
    return baseStallSpeed;
  }

  // Calculate true airspeed from indicated airspeed
  calculateTrueAirspeed(ias) {
    const altitudeFactor = 1 + (this.state.altitude / 35000) * 0.6;
    return ias * altitudeFactor;
  }

  // Check for crash conditions and set warnings with flashing effects
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
    } else if (this.physicsState.verticalVelocity < -33.3 && this.state.altitude <= 0) { // -2000 fpm in ft/s
      this.state.crashWarning = shouldFlash ? 'PULL UP!' : '';
    } else if (this.state.timeToCrash && this.state.timeToCrash <= 10) {
      this.state.crashWarning = shouldFlash ? 'TERRAIN!' : '';
    } else if (this.physicsState.verticalVelocity < -16.7 && this.state.timeToCrash && this.state.timeToCrash <= 20) { // -1000 fpm
      this.state.crashWarning = shouldFlash ? 'SINK RATE!' : '';
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

  // Calculate all forces acting on the aircraft
  calculateForces(dt) {
    // Thrust force (from engines)
    const avgThrust = (this.state.engineN1[0] + this.state.engineN1[1]) / 2;
    const thrustFactor = avgThrust / 100;
    
    // Maximum thrust at sea level (typical airliner)
    const maxThrust = 120000; // Newtons
    
    // Thrust reduces with altitude (air density)
    const altitudeDensityFactor = Math.max(0.3, 1 - (this.state.altitude / 50000));
    
    this.physicsState.thrustForce = thrustFactor * maxThrust * altitudeDensityFactor;
    
    // Drag force (based on airspeed and configuration)
    const airspeedKnots = this.state.indicatedAirspeed;
    const airspeedMs = airspeedKnots * 0.5144; // Convert knots to m/s
    
    // Drag coefficient (depends on configuration)
    let dragCoefficient = 0.02; // Clean configuration
    if (this.state.flaps === 1) dragCoefficient = 0.03; // Takeoff flaps
    if (this.state.flaps === 2) dragCoefficient = 0.05; // Landing flaps
    if (this.state.gear) dragCoefficient += 0.01; // Gear down
    
    // Add drag from pitch-flight path imbalance
    const flightPathAngle = Math.atan2(this.physicsState.verticalVelocity * 0.5144, this.physicsState.horizontalVelocity * 0.5144);
    const pitchRad = this.state.pitch * Math.PI / 180;
    const angleImbalance = Math.abs(pitchRad - flightPathAngle);
    
    // Higher drag when pitch and flight path are misaligned
    const imbalanceDragFactor = 1.0 + (angleImbalance * 2.0); // Up to 3x drag at 1 radian imbalance
    dragCoefficient *= imbalanceDragFactor;
    
    // Air density at altitude (kg/m³)
    const airDensity = 1.225 * Math.exp(-this.state.altitude / 9000);
    
    // Reference area (typical airliner)
    const wingArea = 125; // m²
    
    this.physicsState.dragForce = 0.5 * dragCoefficient * airDensity * wingArea * airspeedMs * airspeedMs;
    
    // Lift force (based on airspeed and angle of attack)
    const angleOfAttack = this.calculateAngleOfAttack();
    let liftCoefficient = 0.3 + (angleOfAttack * 0.05); // Simplified lift curve
    
    // Stall effects
    if (this.state.isStalling) {
      liftCoefficient *= 0.5; // Reduced lift in stall
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
    
    // Apply horizontal speed limits only (remove VS limits)
    const maxHorizontalSpeed = this.calculateMaxSpeedAtAltitude();
    this.physicsState.horizontalVelocity = Math.max(100, Math.min(maxHorizontalSpeed, this.physicsState.horizontalVelocity));
    
    // **IMPROVED ENERGY CONVERSION: Convert vertical speed to horizontal speed when pitching down**
    if (this.state.pitch < 0 && this.physicsState.verticalVelocity < 0) {
      // When pitching down with negative VS, convert potential energy to kinetic energy
      const energyConversionFactor = 0.1; // How much VS converts to IAS
      const pitchDownFactor = Math.abs(this.state.pitch) / 15; // More pitch = more conversion
      const vsMagnitude = Math.abs(this.physicsState.verticalVelocity);
      
      const speedGain = vsMagnitude * pitchDownFactor * energyConversionFactor * dt;
      this.physicsState.horizontalVelocity += speedGain;
    }
    
    // Stall detection
    const stallSpeed = this.calculateStallSpeed();
    this.state.stallWarning = this.physicsState.horizontalVelocity < stallSpeed * 1.2;
    this.state.isStalling = this.physicsState.horizontalVelocity < stallSpeed;
    
    if (this.state.isStalling) {
      // Stall physics: reduced lift, increased drag
      this.physicsState.horizontalVelocity *= 0.99; // Speed decay
      this.physicsState.verticalVelocity = Math.min(this.physicsState.verticalVelocity, -20); // Rapid descent
      
      // Stall makes control difficult
      if (Math.random() < 0.3) {
        this.state.pitch += (Math.random() - 0.5) * 2; // Random pitch oscillations
      }
    }
  }

  // Autopilot mode with P control for altitude hold
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
    
    // Maintain level roll
    this.state.roll = Math.max(-5, Math.min(5, this.state.roll * 0.95)); // Dampen roll
    
    // Small random variations
    this.state.pitch += (Math.random() - 0.5) * 0.05;
    this.state.roll += (Math.random() - 0.5) * 0.02;
    
    // Use full physics in autopilot mode for realistic behavior
    this.updateFlightDynamics(deltaTime);
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
    const altitudeFactor = Math.max(0.3, 1 - (this.state.altitude / 50000));
    return 400 * altitudeFactor;
  }

  // Calculate maximum climb rate at current altitude
  calculateMaxClimbRate() {
    const altitudeFactor = Math.max(0.2, 1 - (this.state.altitude / 45000));
    return 3000 * altitudeFactor;
  }

  // Calculate stall speed based on configuration
  calculateStallSpeed() {
    let baseStallSpeed = 160;
    if (this.state.flaps === 1) baseStallSpeed = 140;
    if (this.state.flaps === 2) baseStallSpeed = 120;
    if (this.state.gear) baseStallSpeed += 5;
    return baseStallSpeed;
  }

  // Calculate true airspeed from indicated airspeed
  calculateTrueAirspeed(ias) {
    const altitudeFactor = 1 + (this.state.altitude / 35000) * 0.6;
    return ias * altitudeFactor;
  }

  // Check for crash conditions and set warnings
  checkCrashConditions(dt) {
    if (this.physicsState.verticalVelocity < 0 && this.state.altitude > 0) {
      const descentRate = Math.abs(this.physicsState.verticalVelocity); // ft/s
      this.state.timeToCrash = this.state.altitude / descentRate;
    } else {
      this.state.timeToCrash = null;
    }
    
    if (this.state.altitude <= 0) {
      this.state.hasCrashed = true;
      this.state.crashWarning = 'CRASHED';
    } else if (this.physicsState.verticalVelocity < -33.3 && this.state.altitude <= 0) { // -2000 fpm in ft/s
      this.state.crashWarning = 'PULL UP!';
    } else if (this.state.timeToCrash && this.state.timeToCrash <= 10) {
      this.state.crashWarning = 'TERRAIN!';
    } else if (this.physicsState.verticalVelocity < -16.7 && this.state.timeToCrash && this.state.timeToCrash <= 20) { // -1000 fpm
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

  // Autopilot mode with minimal variations
  updateAutopilotMode(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Maintain stable flight
    this.state.pitch += (Math.random() - 0.5) * 0.05;
    this.state.pitch = Math.max(-2, Math.min(2, this.state.pitch));
    
    this.state.roll += (Math.random() - 0.5) * 0.02;
    this.state.roll = Math.max(-5, Math.min(5, this.state.roll));
    
    // Small vertical speed variations
    this.state.verticalSpeed += (Math.random() - 0.5) * 10;
    this.state.verticalSpeed = Math.max(-50, Math.min(50, this.state.verticalSpeed));
    
    // Calculate altitude change
    const altitudeChange = (this.state.verticalSpeed / 60) * dt;
    this.state.altitude = Math.max(0, this.state.altitude + altitudeChange);
    
    // Check for crash conditions
    this.checkCrashConditions(dt);
    
    // Update time
    this.lastUpdateTime = Date.now();
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
}

export default FlightPhysicsService;