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
      verticalSpeed: 0, // FIXED: Start with level flight (0 FPM)
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
      
      // **NEW: Control Surfaces**
      ailerons: 0, // -1 (left) to +1 (right)
      elevator: 0, // -1 (nose down) to +1 (nose up)
      rudder: 0, // -1 (left) to +1 (right)
      airBrakes: 0, // 0 (closed) to 1 (fully open)
      
      // **NEW: Hydraulic System**
      hydraulicPressure: 3000, // psi
      hydraulicSystem: 'normal', // normal, degraded, failed
      
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
      horizontalVelocity: 280, // FIXED: Consistent with indicated airspeed
      verticalVelocity: 0, // FIXED: Start with level flight (0 ft/s)
      
      // Angular rates (degrees per second)
      pitchRate: 0,
      rollRate: 0,
      yawRate: 0,
      
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

  // Calculate all forces acting on the aircraft with proper physics
  calculateForces(dt) {
    // Use aircraft parameters if available, otherwise use defaults
    const engineCount = this.aircraftParams?.engineCount || 2;
    const maxThrust = this.aircraftParams?.maxThrust || 240000; // Default for 2 engines
    const wingArea = this.aircraftParams?.wingArea || 125; // Default wing area
    
    // Air density at altitude (kg/m³) - Standard atmospheric model
    // FIX: Correct air density formula using standard atmospheric model
    // Standard formula: ρ = ρ₀ * exp(-h/H) where H ≈ 7000m (22,966ft)
    const altitudeMeters = this.state.altitude * 0.3048; // Convert feet to meters
    const scaleHeight = 7000; // Standard atmospheric scale height in meters
    const airDensity = 1.225 * Math.exp(-altitudeMeters / scaleHeight);
    
    // Convert airspeed to m/s for force calculations
    // FIXED: Use True Airspeed (TAS) instead of Indicated Airspeed (IAS) for lift/drag calculations
    // IAS already accounts for air density, so using it would double-count density effects
    const airspeedMs = this.state.trueAirspeed * 0.5144;
    
    // THRUST FORCE - Realistic engine performance with proper altitude effects
    const avgThrust = (this.state.engineN1[0] + this.state.engineN1[1]) / 2;
    const thrustFactor = avgThrust / 100;
    
    // FIXED: More realistic altitude thrust reduction
    // Thrust reduces with altitude due to lower air density
    const altitudeDensityFactor = Math.max(0.4, Math.pow(airDensity / 1.225, 0.7));
    
    this.physicsState.thrustForce = thrustFactor * maxThrust * altitudeDensityFactor;
    
    // DRAG FORCE - Realistic aerodynamic drag with proper modeling
    let dragCoefficient = 0.012; // Clean configuration (slightly increased for realism)
    if (this.state.flaps === 1) dragCoefficient = 0.022; // Takeoff flaps
    if (this.state.flaps === 2) dragCoefficient = 0.035; // Landing flaps
    if (this.state.gear) dragCoefficient += 0.012; // Gear down
    
    // Add drag from angle of attack imbalance
    const angleOfAttack = this.calculateAngleOfAttack();
    const imbalanceDragFactor = 1.0 + (Math.abs(angleOfAttack) * 0.08); // Increased effect
    dragCoefficient *= imbalanceDragFactor;
    
    // FIXED: Remove hard-coded altitude factor - air density is already accounted for in the drag formula
    // Drag formula: Drag = 0.5 * Cd * ρ * S * V² - ρ already handles altitude effects
    
    this.physicsState.dragForce = 0.5 * dragCoefficient * airDensity * wingArea * airspeedMs * airspeedMs;
    
    // LIFT FORCE - CORRECTED FORMULA using proper aerodynamic principles
    // Calculate angle of attack in radians
    const angleOfAttackRad = angleOfAttack * Math.PI / 180;
    
    // PROPER LIFT COEFFICIENT: Cl = Cl0 + (dCl/dα) * α
    // FIXED: More realistic lift coefficients for transport aircraft
    const liftCurveSlope = 0.05; // Reduced from 0.08 - more realistic 0.05 per degree
    let liftCoefficient = 0.8 + (liftCurveSlope * angleOfAttack); // Increased Cl0 from 0.3 to 0.8
    
    // FIX: Improved stall modeling with realistic stall behavior
    const stallAngle = 15; // Typical stall angle for transport aircraft
    if (Math.abs(angleOfAttack) > stallAngle) {
      // Post-stall lift reduction - more realistic curve
      const stallFactor = Math.max(0.1, 1 - (Math.abs(angleOfAttack) - stallAngle) * 0.1); // More aggressive reduction
      liftCoefficient *= stallFactor;
      this.state.isStalling = true;
    } else {
      this.state.isStalling = false;
    }
    
    // Limit to maximum lift coefficient
    const maxLiftCoefficient = this.aircraftParams?.maxLiftCoefficient || 1.5;
    liftCoefficient = Math.max(-0.5, Math.min(maxLiftCoefficient, liftCoefficient));
    
    // Altitude effect on lift - higher altitude = lower lift due to lower air density
    const altitudeLiftFactor = Math.max(0.3, airDensity / 1.225);
    liftCoefficient *= altitudeLiftFactor;
    
    this.physicsState.liftForce = 0.5 * liftCoefficient * airDensity * wingArea * airspeedMs * airspeedMs;
    
    // DEBUG: Log lift calculation details
    if (Math.random() < 0.02) { // Log 2% of updates
      console.log(`Lift Debug: AoA=${angleOfAttack.toFixed(1)}°, ` +
                  `Cl=${liftCoefficient.toFixed(3)}, ` +
                  `ρ=${airDensity.toFixed(3)}kg/m³, ` +
                  `V=${airspeedMs.toFixed(1)}m/s, ` +
                  `S=${wingArea}m², ` +
                  `Lift=${this.physicsState.liftForce.toFixed(0)}N`);
    }
    
    // GRAVITY FORCE
    this.physicsState.gravityForce = this.physicsState.mass * 9.81;
    
    // **NEW: Control Surface Effects on Forces**
    
    // **ELEVATOR EFFECT: Pitch control moment**
    const elevatorEffect = this.state.elevator * 20000; // Nm per unit deflection
    const pitchMoment = elevatorEffect * airspeedMs * airspeedMs * airDensity;
    
    // **AILERON EFFECT: Roll control moment**
    const aileronEffect = this.state.ailerons * 15000; // Nm per unit deflection
    const rollMoment = aileronEffect * airspeedMs * airspeedMs * airDensity;
    
    // **RUDDER EFFECT: Yaw control moment**
    const rudderEffect = this.state.rudder * 10000; // Nm per unit deflection
    const yawMoment = rudderEffect * airspeedMs * airspeedMs * airDensity;
    
    // **FLAPS EFFECT: Increased lift and drag**
    let flapsLiftMultiplier = 1.0;
    let flapsDragMultiplier = 1.0;
    
    switch (this.state.flaps) {
      case 1: // Takeoff flaps
        flapsLiftMultiplier = 1.3;
        flapsDragMultiplier = 1.2;
        break;
      case 2: // Landing flaps
        flapsLiftMultiplier = 1.6;
        flapsDragMultiplier = 1.8;
        break;
      default: // Flaps up
        flapsLiftMultiplier = 1.0;
        flapsDragMultiplier = 1.0;
    }
    
    // **AIR BRAKES EFFECT: Increased drag**
    const airBrakesDragMultiplier = 1.0 + (this.state.airBrakes * 1.5);
    
    // **GEAR EFFECT: Increased drag**
    const gearDragMultiplier = this.state.gear ? 1.3 : 1.0;
    
    // Apply control surface effects to forces
    this.physicsState.liftForce *= flapsLiftMultiplier;
    this.physicsState.dragForce *= (flapsDragMultiplier * airBrakesDragMultiplier * gearDragMultiplier);
    
    // Apply control moments to angular rates
    const momentOfInertiaPitch = 100000; // kg·m²
    const momentOfInertiaRoll = 80000; // kg·m²
    const momentOfInertiaYaw = 120000; // kg·m²
    
    this.physicsState.pitchRate += (pitchMoment / momentOfInertiaPitch) * dt * (180 / Math.PI);
    this.physicsState.rollRate += (rollMoment / momentOfInertiaRoll) * dt * (180 / Math.PI);
    this.physicsState.yawRate += (yawMoment / momentOfInertiaYaw) * dt * (180 / Math.PI);
    
    // NATURAL ALTITUDE STABILITY - Enhanced stability system
    // When aircraft is near level flight, provide natural stability
    const pitchRad = this.state.pitch * Math.PI / 180;
    const stabilityFactor = Math.cos(pitchRad) * 0.2; // Increased stability
    
    // Add stability lift correction
    const stabilityLift = this.physicsState.liftForce * stabilityFactor;
    this.physicsState.liftForce += stabilityLift;
    
    // LOW ALTITUDE LIFT BOOST - Additional lift at low altitudes
    if (this.state.altitude < 10000) {
      const lowAltBoost = 1.0 + ((10000 - this.state.altitude) / 10000) * 0.4; // Up to 40% boost
      this.physicsState.liftForce *= lowAltBoost;
    }
    
    // DEBUG: Log force values for troubleshooting
    if (Math.random() < 0.01) { // Log 1% of updates to avoid spam
      console.log(`Forces - Lift: ${this.physicsState.liftForce.toFixed(0)}N, ` +
                  `Thrust: ${this.physicsState.thrustForce.toFixed(0)}N, ` +
                  `Drag: ${this.physicsState.dragForce.toFixed(0)}N, ` +
                  `Gravity: ${this.physicsState.gravityForce.toFixed(0)}N`);
    }
  }

  // Calculate angle of attack based on pitch and flight path
  calculateAngleOfAttack() {
    // FIXED: Realistic angle of attack calculation that follows flight dynamics
    // Angle of attack = pitch angle - flight path angle
    
    // Handle edge case when horizontal velocity is very low
    if (Math.abs(this.physicsState.horizontalVelocity) < 10) {
      return this.state.pitch; // When barely moving, AoA ≈ pitch angle
    }
    
    // Calculate flight path angle (gamma) in radians
    const horizontalVelocityMs = this.physicsState.horizontalVelocity * 0.5144;
    const verticalVelocityMs = this.physicsState.verticalVelocity * 0.3048; // Convert ft/s to m/s
    
    // FIX: Handle division by zero and very small velocities
    if (Math.abs(horizontalVelocityMs) < 0.1) {
      return this.state.pitch; // When barely moving horizontally, AoA ≈ pitch
    }
    
    const flightPathAngle = Math.atan2(verticalVelocityMs, horizontalVelocityMs);
    
    // Convert pitch to radians
    const pitchRad = this.state.pitch * Math.PI / 180;
    
    // Calculate angle of attack in radians, then convert to degrees
    let angleOfAttackRad = pitchRad - flightPathAngle;
    
    // Convert to degrees
    let angleOfAttackDeg = angleOfAttackRad * 180 / Math.PI;
    
    // FIXED: Realistic AoA behavior - it should naturally follow the flight path
    // The key insight: AoA should be stable and realistic, not jump to extremes
    // In normal flight, AoA should be between -5° and +15° for transport aircraft
    
    // Apply realistic limits for normal flight
    const normalAoALimit = 15;
    const normalAoAMin = -5;
    
    // Only allow extreme AoA values during actual stall conditions
    if (Math.abs(angleOfAttackDeg) > normalAoALimit && !this.state.isStalling) {
      // If not stalling, gently bring AoA back to normal range
      const correctionRate = 2.0; // Degrees per second
      const correction = Math.sign(angleOfAttackDeg) * Math.min(Math.abs(angleOfAttackDeg - normalAoALimit), correctionRate * 0.1);
      angleOfAttackDeg -= correction;
    }
    
    // Apply final limits for safety
    angleOfAttackDeg = Math.max(-30, Math.min(30, angleOfAttackDeg));
    
    // DEBUG: Log AoA calculation for troubleshooting
    if (Math.random() < 0.02) { // Log 2% of updates
      const flightPathDeg = flightPathAngle * 180 / Math.PI;
      console.log(`AoA Debug: Pitch=${this.state.pitch.toFixed(1)}°, ` +
                  `FlightPath=${flightPathDeg.toFixed(1)}°, ` +
                  `AoA=${angleOfAttackDeg.toFixed(1)}°, ` +
                  `Difference: ${(this.state.pitch - flightPathDeg).toFixed(1)}°`);
    }
    
    return angleOfAttackDeg;
  }

  // Calculate accelerations from forces with proper physics
  calculateAccelerations(dt) {
    // Convert forces to accelerations in m/s²
    
    // HORIZONTAL ACCELERATION - CORRECTED FOR DIRECTION
    // Account for aircraft orientation (pitch and roll angles)
    const pitchRad = this.state.pitch * Math.PI / 180;
    const rollRad = this.state.roll * Math.PI / 180;
    
    // Thrust components - thrust is aligned with aircraft body axis
    const thrustX = this.physicsState.thrustForce * Math.cos(pitchRad); // Forward
    const thrustZ = this.physicsState.thrustForce * Math.sin(pitchRad); // Upward
    
    // Drag force - always opposes velocity (horizontal direction)
    const dragX = this.physicsState.dragForce;
    
    // Lift force - perpendicular to velocity (upward direction)
    const liftZ = this.physicsState.liftForce;
    
    // Gravity force - always downward
    const gravityZ = -this.physicsState.gravityForce;
    
    // Net horizontal force (forward/backward)
    const netHorizontalForce = thrustX - dragX;
    this.physicsState.horizontalAcceleration = netHorizontalForce / this.physicsState.mass; // m/s²
    
    // Convert to knots per second for our velocity system
    this.physicsState.horizontalAcceleration /= 0.5144; // Convert m/s² to knots/s²
    
    // Net vertical force (up/down)
    const netVerticalForce = liftZ + thrustZ + gravityZ;
    this.physicsState.verticalAcceleration = netVerticalForce / this.physicsState.mass; // m/s²
    
    // Convert to feet per second per second
    this.physicsState.verticalAcceleration *= 3.28084; // Convert m/s² to ft/s²
    
    // FIX: Improved stability system to prevent oscillations
    // Only apply stability when aircraft is near equilibrium
    const liftWeightRatio = this.physicsState.liftForce / Math.max(1, this.physicsState.gravityForce);
    const thrustDragRatio = this.physicsState.thrustForce / Math.max(1, this.physicsState.dragForce);
    
    // Enhanced stability with smoother transitions
    if (Math.abs(liftWeightRatio - 1.0) < 0.2 && Math.abs(thrustDragRatio - 1.0) < 0.2) {
      // Near equilibrium - apply gentle stability
      const stabilityFactor = 0.99; // Very gentle stability to prevent oscillations
      this.physicsState.horizontalAcceleration *= stabilityFactor;
      this.physicsState.verticalAcceleration *= stabilityFactor;
    }
    
    // DEBUG: Log acceleration values for troubleshooting
    if (Math.random() < 0.01) { // Log 1% of updates to avoid spam
      console.log(`Accelerations - Horizontal: ${this.physicsState.horizontalAcceleration.toFixed(3)}kts/s, ` +
                  `Vertical: ${this.physicsState.verticalAcceleration.toFixed(3)}ft/s²`);
    }
  }

  // Update velocities using accelerations with proper physics
  updateVelocities(dt) {
    // Update horizontal velocity (knots) - PURE FORCE-BASED PHYSICS
    this.physicsState.horizontalVelocity += this.physicsState.horizontalAcceleration * dt;
    
    // Update vertical velocity (feet per second) - PURE FORCE-BASED PHYSICS
    this.physicsState.verticalVelocity += this.physicsState.verticalAcceleration * dt;
    
    // Apply realistic speed limits with proper altitude effects
    const maxHorizontalSpeed = this.calculateMaxSpeedAtAltitude();
    const minHorizontalSpeed = this.calculateStallSpeed() * 1.15; // Increased safety margin
    this.physicsState.horizontalVelocity = Math.max(minHorizontalSpeed, Math.min(maxHorizontalSpeed, this.physicsState.horizontalVelocity));
    
    // REALISTIC SPEED CONTROL - Enhanced thrust/drag relationship
    // When thrust > drag, speed increases; when drag > thrust, speed decreases
    const thrustDragRatio = this.physicsState.thrustForce / Math.max(1, this.physicsState.dragForce);
    
    // Natural speed stabilization - aircraft tends to maintain current speed
    if (Math.abs(thrustDragRatio - 1.0) < 0.2) { // Increased tolerance
      // Near equilibrium - provide natural speed stability
      const speedStabilityFactor = 0.98; // Reduced damping for more realistic behavior
      this.physicsState.horizontalAcceleration *= speedStabilityFactor;
    }
    
    // REALISTIC ALTITUDE CONTROL - Enhanced lift/weight relationship
    const liftWeightRatio = this.physicsState.liftForce / Math.max(1, this.physicsState.gravityForce);
    
    // Natural altitude stabilization - aircraft tends to maintain current altitude
    if (Math.abs(liftWeightRatio - 1.0) < 0.15 && Math.abs(this.state.pitch) < 8) { // Increased tolerance
      // Near equilibrium and level flight - provide natural altitude stability
      const altitudeStabilityFactor = 0.92; // Reduced damping for more realistic behavior
      this.physicsState.verticalAcceleration *= altitudeStabilityFactor;
    }
    
    // Stall detection with improved logic
    const stallSpeed = this.calculateStallSpeed();
    this.state.stallWarning = this.physicsState.horizontalVelocity < stallSpeed * 1.25; // Increased warning margin
    this.state.isStalling = this.physicsState.horizontalVelocity < stallSpeed;
    
    if (this.state.isStalling) {
      // Stall physics: reduced lift, increased drag
      this.physicsState.horizontalVelocity *= 0.998; // Slower speed decay
      this.physicsState.verticalVelocity = Math.min(this.physicsState.verticalVelocity, -8); // Controlled descent
      
      // Stall makes control difficult
      if (Math.random() < 0.1) {
        this.state.pitch += (Math.random() - 0.5) * 0.5; // Smaller oscillations
      }
    }
    
    // DEBUG: Log velocity values for troubleshooting
    if (Math.random() < 0.01) { // Log 1% of updates to avoid spam
      console.log(`Velocities - Horizontal: ${this.physicsState.horizontalVelocity.toFixed(1)}kts, ` +
                  `Vertical: ${this.physicsState.verticalVelocity.toFixed(1)}ft/s, ` +
                  `Lift/Weight: ${(liftWeightRatio * 100).toFixed(1)}%`);
    }
  }

  // Calculate maximum speed at current altitude
  calculateMaxSpeedAtAltitude() {
    const maxSpeedSeaLevel = 350; // Maximum speed at sea level
    const altitudeFactor = Math.max(0.6, 1 - (this.state.altitude / 80000));
    return maxSpeedSeaLevel * altitudeFactor;
  }

  // Calculate stall speed based on configuration
  calculateStallSpeed() {
    let baseStallSpeed = this.aircraftParams?.stallSpeed || 125;
    
    // Configuration effects
    if (this.state.flaps === 1) baseStallSpeed *= 0.85; // Takeoff flaps
    if (this.state.flaps === 2) baseStallSpeed *= 0.75; // Landing flaps
    if (this.state.gear) baseStallSpeed *= 1.05; // Gear down
    
    return baseStallSpeed;
  }

  // Update aircraft position based on velocities
  updatePosition(dt) {
    // Update altitude based on vertical velocity
    this.state.altitude += this.physicsState.verticalVelocity * dt;
    
    // Prevent negative altitude
    this.state.altitude = Math.max(0, this.state.altitude);
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

  // Calculate true airspeed from indicated airspeed
  calculateTrueAirspeed(ias) {
    // Simplified: TAS increases with altitude
    const altitudeFactor = 1 + (this.state.altitude / 40000) * 0.3;
    return ias * altitudeFactor;
  }

  // Check crash conditions
  checkCrashConditions(dt) {
    // Calculate time to crash based on vertical velocity
    if (this.physicsState.verticalVelocity < 0) {
      this.state.timeToCrash = this.state.altitude / Math.abs(this.physicsState.verticalVelocity);
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
    
    // Create separate target N1 for each engine with individual variations
    const targetN1 = this.state.engineN1.map((currentN1, index) => {
      const variation = (Math.random() - 0.5) * 0.1;
      return Math.max(0, Math.min(100, currentN1 + variation));
    });
    
    // Update each engine independently
    this.state.engineN1 = this.state.engineN1.map((currentN1, i) => {
      const diff = targetN1[i] - currentN1;
      const change = Math.sign(diff) * Math.min(Math.abs(diff), spoolRate * dt);
      return currentN1 + change;
    });
    
    // Calculate separate N2 and EGT for each engine
    this.state.engineN2 = this.state.engineN1.map(n1 => n1 * 1.12);
    
    const baseEGT = 600;
    this.state.engineEGT = this.state.engineN1.map((n1, i) => {
      const thrustEGT = n1 * 3;
      const altitudeEGT = (35000 - this.state.altitude) / 1000 * 10;
      return Math.max(0, baseEGT + thrustEGT + altitudeEGT + (Math.random() - 0.5) * 5);
    });
    
    // Fuel consumption based on both engines
    const totalN1 = this.state.engineN1.reduce((sum, n1) => sum + n1, 0);
    const fuelConsumption = totalN1 * 0.01 * dt;
    this.state.fuel = Math.max(0, this.state.fuel - fuelConsumption);
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

  // **NEW: Control Surface Methods**
  controlAilerons(position) {
    if (!this.state.hasCrashed) {
      // Apply hydraulic system effects
      const effectiveness = this.getHydraulicEffectiveness();
      this.state.ailerons = Math.max(-1, Math.min(1, position * effectiveness));
    }
  }

  controlElevator(position) {
    if (!this.state.hasCrashed) {
      // Apply hydraulic system effects
      const effectiveness = this.getHydraulicEffectiveness();
      this.state.elevator = Math.max(-1, Math.min(1, position * effectiveness));
    }
  }

  controlRudder(position) {
    if (!this.state.hasCrashed) {
      // Apply hydraulic system effects
      const effectiveness = this.getHydraulicEffectiveness();
      this.state.rudder = Math.max(-1, Math.min(1, position * effectiveness));
    }
  }

  controlAirBrakes(position) {
    if (!this.state.hasCrashed) {
      // Air brakes can still function with reduced hydraulic pressure
      const effectiveness = this.getHydraulicEffectiveness();
      this.state.airBrakes = Math.max(0, Math.min(1, position * effectiveness));
    }
  }

  // **NEW: Hydraulic System Methods**
  getHydraulicEffectiveness() {
    switch (this.state.hydraulicSystem) {
      case 'normal':
        return 1.0;
      case 'degraded':
        return 0.5; // Reduced control effectiveness
      case 'failed':
        return 0.1; // Minimal control (manual reversion)
      default:
        return 1.0;
    }
  }

  setHydraulicSystem(status) {
    this.state.hydraulicSystem = status;
    // Update hydraulic pressure based on system status
    switch (status) {
      case 'normal':
        this.state.hydraulicPressure = 3000;
        break;
      case 'degraded':
        this.state.hydraulicPressure = 1500;
        break;
      case 'failed':
        this.state.hydraulicPressure = 500;
        break;
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
        // **FIX: When disengaging AP, allow full manual control at any altitude**
        // Remove any restrictions that prevent manual control at high altitude
        console.log('AP disengaged - manual control enabled at', this.state.altitude, 'ft');
        
        // Ensure control functions can accept inputs at any altitude
        // No special restrictions needed - manual control should work everywhere
      }
    }
  }

  // Control functions - REALISTIC PHYSICS: Remove artificial limits, use force-based control
  controlPitch(amount) {
    if (!this.state.autopilot && !this.state.hasCrashed) {
      // REALISTIC CONTROL: Apply control input as a moment, not direct angle change
      const controlEffectiveness = this.state.isStalling ? 0.3 : 1.0;
      
      // Convert control input to pitch moment (torque)
      const pitchMoment = amount * controlEffectiveness * 5000; // Nm per control unit
      
      // Apply moment to pitch rate
      const momentOfInertia = 100000; // Aircraft moment of inertia (kg·m²)
      const pitchAcceleration = pitchMoment / momentOfInertia; // rad/s²
      
      // Update pitch rate (convert to degrees/s)
      this.physicsState.pitchRate += pitchAcceleration * 0.1 * (180 / Math.PI); // Small time step
      
      // Apply damping to prevent oscillations
      this.physicsState.pitchRate *= 0.95;
      
      // Limit pitch rate to realistic values (±30°/s)
      this.physicsState.pitchRate = Math.max(-30, Math.min(30, this.physicsState.pitchRate));
    }
  }

  controlRoll(amount) {
    if (!this.state.autopilot && !this.state.hasCrashed) {
      // REALISTIC CONTROL: Apply control input as a moment, not direct angle change
      const controlEffectiveness = this.state.isStalling ? 0.5 : 1.0;
      
      // Convert control input to roll moment (torque)
      const rollMoment = amount * controlEffectiveness * 3000; // Nm per control unit
      
      // Apply moment to roll rate
      const momentOfInertia = 80000; // Aircraft moment of inertia (kg·m²)
      const rollAcceleration = rollMoment / momentOfInertia; // rad/s²
      
      // Update roll rate (convert to degrees/s)
      this.physicsState.rollRate += rollAcceleration * 0.1 * (180 / Math.PI); // Small time step
      
      // Apply damping to prevent oscillations
      this.physicsState.rollRate *= 0.92;
      
      // Limit roll rate to realistic values (±60°/s)
      this.physicsState.rollRate = Math.max(-60, Math.min(60, this.physicsState.rollRate));
    }
  }

  // Update aircraft angles based on angular rates with realistic physics
  updateAngles(dt) {
    // Update pitch based on pitch rate
    this.state.pitch += this.physicsState.pitchRate * dt;
    
    // FIX: Normalize pitch angle to stay within reasonable bounds
    // Keep pitch between -180 and 180 degrees for angle of attack calculations
    if (Math.abs(this.state.pitch) > 180) {
      this.state.pitch = this.state.pitch % 360;
      if (this.state.pitch > 180) this.state.pitch -= 360;
      if (this.state.pitch < -180) this.state.pitch += 360;
    }
    
    // Update roll based on roll rate
    this.state.roll += this.physicsState.rollRate * dt;
    
    // FIX: Normalize roll angle to stay within reasonable bounds
    // Keep roll between -180 and 180 degrees
    if (Math.abs(this.state.roll) > 180) {
      this.state.roll = this.state.roll % 360;
      if (this.state.roll > 180) this.state.roll -= 360;
      if (this.state.roll < -180) this.state.roll += 360;
    }
    
    // REALISTIC AIRCRAFT STABILITY: Natural tendency to return to level flight
    // Pitch stability - aircraft naturally returns to level pitch
    const pitchStability = -this.state.pitch * 0.1; // Degrees per second per degree of pitch
    this.physicsState.pitchRate += pitchStability * dt;
    
    // Roll stability - aircraft naturally returns to level roll
    const rollStability = -this.state.roll * 0.15; // Degrees per second per degree of roll
    this.physicsState.rollRate += rollStability * dt;
    
    // SPEED EFFECTS ON CONTROL: Higher speed = more responsive controls
    const speedFactor = Math.min(1.5, this.state.indicatedAirspeed / 200);
    this.physicsState.pitchRate *= speedFactor;
    this.physicsState.rollRate *= speedFactor;
    
    // STALL EFFECTS: Reduced control effectiveness in stall
    if (this.state.isStalling) {
      this.physicsState.pitchRate *= 0.3;
      this.physicsState.rollRate *= 0.5;
    }
    
    // REALISTIC LIMITS: Aircraft can achieve extreme angles but with consequences
    // No artificial limits - let physics determine what's possible
    
    // Extreme angle effects
    if (Math.abs(this.state.pitch) > 45) {
      // High pitch angles cause speed changes
      const pitchEffect = this.state.pitch > 0 ? -0.5 : 0.5;
      this.physicsState.horizontalVelocity += pitchEffect * dt;
    }
    
    if (Math.abs(this.state.roll) > 60) {
      // High roll angles cause altitude loss
      const rollEffect = -Math.abs(this.state.roll) * 0.01;
      this.physicsState.verticalVelocity += rollEffect * dt;
    }
  }

  // Autopilot mode with P control for altitude hold and IAS hold
  updateAutopilotMode(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Calculate current angle of attack
    const currentAoA = this.calculateAngleOfAttack();
    
    // **AIRBUS ALPHA-FLOOR ANTI-STALL SYSTEM**
    // Strong, aggressive pitch control to prevent stall conditions
    const targetAoA = 2.5; // Optimal cruise angle of attack (degrees)
    const stallWarningAoA = 12.0; // Stall warning threshold
    const criticalStallAoA = 16.0; // Critical stall threshold
    
    // **ALPHA-FLOOR PROTECTION: Active pitch control to prevent stall**
    let aoaCorrection = 0;
    let stallProtectionActive = false;
    
    if (Math.abs(currentAoA) > criticalStallAoA) {
      // **CRITICAL STALL: Maximum pitch down authority**
      aoaCorrection = -15.0; // Immediate maximum nose-down pitch
      stallProtectionActive = true;
      console.log("ALPHA-FLOOR: CRITICAL STALL! Maximum pitch down applied");
    } else if (Math.abs(currentAoA) > stallWarningAoA) {
      // **STALL WARNING: Strong pitch down**
      aoaCorrection = -8.0; // Strong nose-down pitch
      stallProtectionActive = true;
      console.log("ALPHA-FLOOR: Stall warning! Strong pitch down applied");
    } else if (Math.abs(currentAoA) > 8.0) {
      // **HIGH AOA: Moderate correction**
      aoaCorrection = (targetAoA - currentAoA) * 0.3;
      stallProtectionActive = true;
    } else {
      // **NORMAL RANGE: Gentle correction**
      aoaCorrection = (targetAoA - currentAoA) * 0.05;
    }
    
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
    const targetPitchFromVS = targetVS_fts * vsToPitchGain;
    
    // **ALPHA-FLOOR PRIORITY: Stall protection overrides all other controls**
    let targetPitch;
    if (stallProtectionActive) {
      // **STALL PROTECTION ACTIVE: Ignore altitude control, prioritize AoA safety**
      targetPitch = aoaCorrection;
      console.log(`ALPHA-FLOOR: Stall protection active. Target pitch: ${targetPitch.toFixed(1)}°`);
    } else {
      // **NORMAL OPERATION: Allow natural flight dynamics with gentle guidance**
      // FIXED: Reduced altitude control authority to allow natural flight path
      const altitudePriority = 0.3; // Reduced from aggressive control
      const aoaPriority = Math.min(0.7, Math.abs(currentAoA) / stallWarningAoA);
      
      // Combine controls with natural flight dynamics
      targetPitch = targetPitchFromVS * altitudePriority + aoaCorrection * aoaPriority;
      
      // Allow aircraft to naturally follow flight path
      const flightPathAngle = Math.atan2(this.physicsState.verticalVelocity * 0.3048, 
                                        this.physicsState.horizontalVelocity * 0.5144) * 180 / Math.PI;
      const naturalPitchInfluence = 0.4; // Allow natural flight path influence
      targetPitch = targetPitch * (1 - naturalPitchInfluence) + flightPathAngle * naturalPitchInfluence;
    }
    
    // Apply pitch control with aggressive smoothing for stall protection
    const pitchError = targetPitch - this.state.pitch;
    const pitchRate = stallProtectionActive ? 3.0 : 0.5; // Faster response during stall
    this.state.pitch += Math.sign(pitchError) * Math.min(Math.abs(pitchError), pitchRate * dt);
    
    // FIXED: Only apply artificial limits during normal operation, not during stall protection
    if (!stallProtectionActive) {
      this.state.pitch = Math.max(-15, Math.min(15, this.state.pitch));
    }
    
    // **ADDITIONAL STALL PROTECTION: Increase thrust during stall conditions**
    let targetThrustAdjustment = 0;
    if (stallProtectionActive) {
      // **TOGA (Takeoff/Go-Around) thrust during stall recovery**
      targetThrustAdjustment = 15; // Additional thrust for stall recovery
      console.log("ALPHA-FLOOR: TOGA thrust applied for stall recovery");
    }
    
    // IAS hold with P control - Maintain 250 knots
    const targetIAS = 250; // Target indicated airspeed
    const iasError = targetIAS - this.state.indicatedAirspeed;
    
    // P controller for IAS with stall protection boost
    const iasKp = 0.5;
    const altitudeCompensation = 1 + (this.state.altitude / 50000) * 0.3;
    const thrustAdjustment = iasError * iasKp * altitudeCompensation + targetThrustAdjustment;
    
    // Apply thrust control to both engines
    const baseThrust = 85; // Base N1 setting for cruise
    const targetN1 = Math.max(75, Math.min(95, baseThrust + thrustAdjustment)); // Higher minimum during stall
    
    // Apply thrust with realistic engine spooling during stall
    const spoolRate = stallProtectionActive ? 5.0 : 3.0; // Faster spooling during stall
    this.state.engineN1 = this.state.engineN1.map((currentN1, index) => {
      const diff = targetN1 - currentN1;
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
    this.calculateForces(dt);
    this.calculateAccelerations(dt);
    this.updateVelocities(dt);
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

  // **FIXED: ADD TEST CONFIGURATION METHOD**
  setTestConfiguration(altitude, ias) {
    this.state.altitude = altitude;
    this.state.indicatedAirspeed = ias;
    this.state.verticalSpeed = 0; // Level flight
    this.state.pitch = altitude < 10000 ? 3 : 2; // Appropriate pitch for altitude
    this.state.roll = 0; // Level wings
    this.state.autopilot = false; // Manual control for testing
    
    // Set physics state to match
    this.physicsState.horizontalVelocity = ias;
    this.physicsState.verticalVelocity = 0;
    
    console.log(`Test configuration set: ${altitude}ft, ${ias}kts IAS`);
  }

  // Add method to get physics debug information
  getPhysicsDebugInfo() {
    const liftWeightRatio = this.physicsState.liftForce / Math.max(1, this.physicsState.gravityForce);
    const thrustDragRatio = this.physicsState.thrustForce / Math.max(1, this.physicsState.dragForce);
    
    // FIX: Use the same air density calculation as the main physics
    const altitudeMeters = this.state.altitude * 0.3048; // Convert feet to meters
    const scaleHeight = 7000; // Standard atmospheric scale height in meters
    const airDensityValue = 1.225 * Math.exp(-altitudeMeters / scaleHeight);
    
    return {
      forces: {
        lift: Math.round(this.physicsState.liftForce),
        thrust: Math.round(this.physicsState.thrustForce),
        drag: Math.round(this.physicsState.dragForce),
        gravity: Math.round(this.physicsState.gravityForce)
      },
      ratios: {
        liftWeight: (liftWeightRatio * 100).toFixed(1) + '%',
        thrustDrag: (thrustDragRatio * 100).toFixed(1) + '%'
      },
      accelerations: {
        horizontal: this.physicsState.horizontalAcceleration.toFixed(3),
        vertical: this.physicsState.verticalAcceleration.toFixed(3)
      },
      velocities: {
        horizontal: this.physicsState.horizontalVelocity.toFixed(1),
        vertical: this.physicsState.verticalVelocity.toFixed(1)
      },
      airDensity: airDensityValue.toFixed(4),
      angleOfAttack: this.calculateAngleOfAttack().toFixed(1)
    };
  }

  // **NEW: Autopilot Debug Information Method**
  getAutopilotDebugInfo() {
    const currentAoA = this.calculateAngleOfAttack();
    
    // Calculate what the autopilot would do
    const targetAoA = 2.5;
    const stallWarningAoA = 12.0;
    const criticalStallAoA = 16.0;
    
    let aoaCorrection = 0;
    let stallProtectionActive = false;
    
    if (Math.abs(currentAoA) > criticalStallAoA) {
      aoaCorrection = -15.0;
      stallProtectionActive = true;
    } else if (Math.abs(currentAoA) > stallWarningAoA) {
      aoaCorrection = -8.0;
      stallProtectionActive = true;
    } else if (Math.abs(currentAoA) > 8.0) {
      aoaCorrection = (targetAoA - currentAoA) * 0.3;
      stallProtectionActive = true;
    } else {
      aoaCorrection = (targetAoA - currentAoA) * 0.05;
    }
    
    // Calculate target pitch from altitude hold
    const targetAltitude = 35000;
    const altitudeError = targetAltitude - this.state.altitude;
    const kp = 0.001;
    const targetVS = altitudeError * kp;
    const targetVS_fts = targetVS / 60;
    const vsToPitchGain = 0.05;
    const targetPitchFromVS = targetVS_fts * vsToPitchGain;
    
    // Determine final target pitch
    let targetPitch;
    if (stallProtectionActive) {
      targetPitch = aoaCorrection;
    } else {
      const aoaPriority = Math.min(1.0, Math.abs(currentAoA) / stallWarningAoA);
      targetPitch = targetPitchFromVS * (1 - aoaPriority) + aoaCorrection * aoaPriority;
    }
    
    const pitchError = targetPitch - this.state.pitch;
    
    return {
      currentAoA: currentAoA,
      pitch: this.state.pitch,
      altitude: this.state.altitude,
      airspeed: this.state.indicatedAirspeed,
      autopilotActive: this.state.autopilot,
      stallProtectionActive: stallProtectionActive,
      targetAoA: targetAoA,
      stallWarningAoA: stallWarningAoA,
      criticalStallAoA: criticalStallAoA,
      aoaCorrection: aoaCorrection,
      targetPitch: targetPitch,
      pitchError: pitchError,
      targetPitchFromVS: targetPitchFromVS,
      altitudeError: altitudeError
    };
  }

  // Add method to set specific test conditions for debugging
  setDebugConditions(altitude, ias, pitch, thrust) {
    this.state.altitude = altitude;
    this.state.indicatedAirspeed = ias;
    this.state.pitch = pitch;
    this.state.engineN1 = [thrust, thrust];
    
    // Update physics state to match
    this.physicsState.horizontalVelocity = ias;
    this.physicsState.verticalVelocity = 0;
    
    console.log(`Debug conditions set: ${altitude}ft, ${ias}kts, ${pitch}°, ${thrust}% N1`);
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
    const targetN1 = Math.max(60, Math.min(95, baseThrust + thrustAdjustment)); // Higher minimum to 60
    
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
    this.calculateForces(dt);
    this.calculateAccelerations(dt);
    this.updateVelocities(dt);
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

  // **FIXED: ADD TEST CONFIGURATION METHOD**
  setTestConfiguration(altitude, ias) {
    this.state.altitude = altitude;
    this.state.indicatedAirspeed = ias;
    this.state.verticalSpeed = 0; // Level flight
    this.state.pitch = altitude < 10000 ? 3 : 2; // Appropriate pitch for altitude
    this.state.roll = 0; // Level wings
    this.state.autopilot = false; // Manual control for testing
    
    // Set physics state to match
    this.physicsState.horizontalVelocity = ias;
    this.physicsState.verticalVelocity = 0;
    
    console.log(`Test configuration set: ${altitude}ft, ${ias}kts IAS`);
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
        // Manual flight mode - use full physics calculations
        this.calculateForces(deltaTime / 1000);
        this.calculateAccelerations(deltaTime / 1000);
        this.updateVelocities(deltaTime / 1000);
        this.updateAngles(deltaTime / 1000); // Add realistic angle updates
      }
      
      // **FIX: Update position and display values**
      this.updatePosition(deltaTime / 1000);
      this.updateDisplayValues();
      
      // Update engine parameters
      this.updateEngineParameters(deltaTime / 1000);
      
      // Update crash detection
      this.checkCrashConditions(deltaTime / 1000);
    }
    
    return this.state;
  }

  // Add missing updateCrashDetection method for compatibility
  updateCrashDetection() {
    this.checkCrashConditions(0.1); // Use default dt
  }
}

export default FlightPhysicsService;