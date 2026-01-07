// Flight Physics Service - Handles realistic aircraft flight dynamics

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
      
      // Autopilot
      autopilot: true,
      flightDirector: true,
      altitudeHold: true,
      headingHold: true,
      
      // Central Display
      flightPhase: 'CRUISE',
      nextWaypoint: 'WPT3',
      distanceToWaypoint: 125.4,
      timeToWaypoint: 18.2
    };
    
    this.lastUpdateTime = Date.now();
  }

  // Calculate flight dynamics based on current state
  updateFlightDynamics(deltaTime) {
    const dt = deltaTime / 1000; // Convert to seconds
    
    // Engine thrust effects
    const avgThrust = (this.state.engineN1[0] + this.state.engineN1[1]) / 2;
    const thrustFactor = avgThrust / 100;
    
    // Pitch effects on vertical speed and airspeed
    const pitchRad = this.state.pitch * Math.PI / 180;
    
    // Vertical speed calculation based on pitch and thrust
    const maxClimbRate = 3000; // feet per minute
    const maxDescentRate = 6000; // feet per minute
    
    // Pitch affects vertical speed: positive pitch = climb, negative pitch = descent
    const pitchVS = Math.sin(pitchRad) * maxClimbRate;
    
    // Thrust affects climb capability
    const thrustVS = (thrustFactor - 0.7) * 2000; // Base thrust at 70% N1
    
    // Calculate new vertical speed
    let newVS = pitchVS + thrustVS;
    
    // Limit vertical speed
    newVS = Math.max(-maxDescentRate, Math.min(maxClimbRate, newVS));
    
    // Airspeed calculation based on pitch and thrust
    const dragFactor = Math.cos(pitchRad); // Less drag when climbing/descending
    const thrustSpeed = thrustFactor * 500; // Max speed at full thrust
    const pitchSpeedEffect = Math.sin(pitchRad) * 50; // Pitch affects speed
    
    // Calculate new indicated airspeed
    let newIAS = thrustSpeed * dragFactor - pitchSpeedEffect;
    newIAS = Math.max(100, Math.min(400, newIAS));
    
    // Roll effects on heading change
    const rollRad = this.state.roll * Math.PI / 180;
    const turnRate = Math.sin(rollRad) * 3; // Degrees per second
    
    // Calculate new heading
    let newHeading = this.state.heading + (turnRate * dt);
    newHeading = newHeading % 360;
    if (newHeading < 0) newHeading += 360;
    
    // Calculate altitude change
    const altitudeChange = (this.state.verticalSpeed / 60) * dt; // FPM to feet per second
    const newAltitude = Math.max(0, this.state.altitude + altitudeChange);
    
    // Update state
    this.state.verticalSpeed = newVS;
    this.state.indicatedAirspeed = newIAS;
    this.state.heading = newHeading;
    this.state.altitude = newAltitude;
    
    // Calculate true airspeed and ground speed (simplified)
    this.state.trueAirspeed = newIAS * 1.6; // Rough conversion
    this.state.groundSpeed = this.state.trueAirspeed; // No wind for now
    
    // Update engine parameters with realistic variations
    this.updateEngineParameters(dt);
    
    // Update time
    this.lastUpdateTime = Date.now();
  }

  // Update engine parameters with realistic physics
  updateEngineParameters(dt) {
    // Engine spool-up/down dynamics
    const targetN1 = this.state.engineN1.map(n => {
      // Add small random variations
      const variation = (Math.random() - 0.5) * 0.1;
      return Math.max(0, Math.min(100, n + variation));
    });
    
    // N2 follows N1 with slight delay
    const targetN2 = targetN1.map(n1 => n1 * 1.12);
    
    // EGT based on thrust and altitude
    const baseEGT = 600;
    const thrustEGT = this.state.engineN1.map(n1 => n1 * 3);
    const altitudeEGT = (35000 - this.state.altitude) / 1000 * 10; // Cooler at higher altitude
    
    const targetEGT = targetN1.map((n1, i) => 
      Math.max(0, baseEGT + thrustEGT[i] + altitudeEGT + (Math.random() - 0.5) * 5)
    );
    
    // Fuel consumption based on thrust
    const fuelConsumption = targetN1.reduce((sum, n1) => sum + n1, 0) * 0.01 * dt;
    
    // Apply updates with smoothing
    this.state.engineN1 = targetN1;
    this.state.engineN2 = targetN2;
    this.state.engineEGT = targetEGT;
    this.state.fuel = Math.max(0, this.state.fuel - fuelConsumption);
  }

  // Control functions
  controlPitch(amount) {
    if (!this.state.autopilot) {
      this.state.pitch = Math.max(-15, Math.min(15, this.state.pitch + amount));
    }
  }

  controlRoll(amount) {
    if (!this.state.autopilot) {
      this.state.roll = Math.max(-30, Math.min(30, this.state.roll + amount));
    }
  }

  controlThrust(engineIndex, amount) {
    if (!this.state.autopilot) {
      const newN1 = Math.max(0, Math.min(100, this.state.engineN1[engineIndex] + amount));
      this.state.engineN1[engineIndex] = newN1;
    }
  }

  // Autopilot functions
  toggleAutopilot() {
    this.state.autopilot = !this.state.autopilot;
    
    if (this.state.autopilot) {
      // When engaging AP, stabilize the aircraft
      this.state.pitch = Math.max(-2, Math.min(2, this.state.pitch));
      this.state.roll = Math.max(-5, Math.min(5, this.state.roll));
      this.state.verticalSpeed = Math.max(-50, Math.min(50, this.state.verticalSpeed));
      this.state.headingHold = true;
      this.state.altitudeHold = true;
    }
  }

  // Update function to be called regularly
  update() {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    
    if (this.state.autopilot) {
      // Autopilot mode - calm variations
      this.updateAutopilotMode(deltaTime);
    } else {
      // Manual mode - full physics
      this.updateFlightDynamics(deltaTime);
    }
    
    return { ...this.state };
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
    
    // Small heading variations
    this.state.heading += (Math.random() - 0.5) * 0.05;
    this.state.heading = this.state.heading % 360;
    
    // Update engine parameters
    this.updateEngineParameters(dt);
    
    this.lastUpdateTime = Date.now();
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Set state (for initialization)
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }
}

export default FlightPhysicsService;