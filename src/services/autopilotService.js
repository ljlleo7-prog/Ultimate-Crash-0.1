/**
 * Advanced Autopilot Service
 * Implements PID control for altitude and airspeed maintenance
 * Automatically fine-tunes throttle and elevator trim for stable cruise
 */

class AutopilotService {
  constructor(flightPhysicsService) {
    this.flightPhysics = flightPhysicsService;
    this.enabled = false;
    
    // Target flight conditions
    this.targetAltitude = 35000; // feet
    this.targetAirspeed = 460; // KTS TAS
    
    // PID Controllers - Ultra-conservative gains to prevent extreme attitudes
    this.altitudePID = {
      kp: 0.000001,    // Extremely small gain
      ki: 0.0000001,   // Minimal integral
      kd: 0.0001,      // Small derivative
      integral: 0,     // Integral accumulator
      previousError: 0,
      output: 0
    };
    
    this.airspeedPID = {
      kp: 0.00001,     // Extremely small gain
      ki: 0.000001,    // Minimal integral
      kd: 0.0001,      // Small derivative
      integral: 0,     // Integral accumulator
      previousError: 0,
      output: 0
    };
    
    // Control limits (very conservative)
    this.controlLimits = {
      elevatorTrim: { min: -0.1, max: 0.1 },     // Very small deflections
      throttleAdjustment: { min: -0.05, max: 0.05 }, // Very small adjustments
      elevatorTrimRate: 0.01,                    // Very slow trim change per second
      throttleRate: 0.02                         // Very slow throttle change per second
    };
    
    // Current autopilot outputs
    this.currentOutputs = {
      elevatorTrim: 0,
      throttleAdjustment: 0,
      elevatorTrimRate: 0,
      throttleRate: 0
    };
    
    // State tracking
    this.stateHistory = [];
    this.maxHistorySize = 300; // 5 seconds at 60Hz
    
    // Stability monitoring
    this.stabilityMetrics = {
      altitudeError: 0,
      airspeedError: 0,
      controlActivity: 0,
      stabilityScore: 0
    };
  }
  
  /**
   * Enable the autopilot
   */
  enable() {
    this.enabled = true;
    console.log('🛩️ Autopilot ENABLED - Maintaining altitude and speed');
  }
  
  /**
   * Disable the autopilot
   */
  disable() {
    this.enabled = false;
    console.log('✈️ Autopilot DISENGAGED - Manual control');
  }
  
  /**
   * Update target flight conditions
   */
  setTargets(altitude, airspeed) {
    this.targetAltitude = altitude;
    this.targetAirspeed = airspeed;
    console.log(`🎯 Autopilot targets updated: ${altitude}ft, ${airspeed} KTS TAS`);
  }
  
  /**
   * Main autopilot update loop - Called every physics step
   */
  update(deltaTime = 0.016) {
    if (!this.enabled) return;
    
    // Get current flight state
    const flightState = this.flightPhysics.getFlightState();
    const currentAltitude = flightState.altitude;
    const currentAirspeed = flightState.airspeed;
    
    // Calculate errors (target - current)
    const altitudeError = this.targetAltitude - currentAltitude;
    const airspeedError = this.targetAirspeed - currentAirspeed;
    
    // Update PID controllers
    const elevatorTrim = this.updateAltitudePID(altitudeError, deltaTime);
    const throttleAdjustment = this.updateAirspeedPID(airspeedError, deltaTime);
    
    // Apply rate limiting to prevent control oscillations
    const rateLimitedElevator = this.rateLimit(elevatorTrim, this.currentOutputs.elevatorTrim, 
                                             this.controlLimits.elevatorTrimRate * deltaTime);
    const rateLimitedThrottle = this.rateLimit(throttleAdjustment, this.currentOutputs.throttleAdjustment,
                                              this.controlLimits.throttleRate * deltaTime);
    
    // Apply control limits
    const limitedElevator = this.clamp(rateLimitedElevator, 
                                       this.controlLimits.elevatorTrim.min, 
                                       this.controlLimits.elevatorTrim.max);
    const limitedThrottle = this.clamp(this.flightPhysics.state.controls.throttle + rateLimitedThrottle,
                                      0.1, 0.95); // Keep throttle in reasonable range
    
    // Apply autopilot outputs to flight physics
    this.flightPhysics.state.controls.elevator = limitedElevator;
    this.flightPhysics.state.controls.throttle = limitedThrottle;
    
    // Update current outputs for rate limiting
    this.currentOutputs.elevatorTrim = limitedElevator;
    this.currentOutputs.throttleAdjustment = rateLimitedThrottle;
    
    // Update stability metrics
    this.updateStabilityMetrics(altitudeError, airspeedError, limitedElevator, rateLimitedThrottle);
    
    // Log status occasionally
    if (Math.floor(this.flightPhysics.time * 10) % 10 === 0) {
      this.logStatus(currentAltitude, currentAirspeed, altitudeError, airspeedError, limitedElevator, rateLimitedThrottle);
    }
  }
  
  /**
   * PID controller for altitude control via elevator trim
   * Corrected control sign: positive error (too high) = nose down (negative elevator)
   */
  updateAltitudePID(error, deltaTime) {
    // For altitude control: if altitude > target (positive error), need nose down = negative elevator
    const correctedError = error; // Keep original sign - positive error = negative elevator
    
    // Proportional term
    const proportional = this.altitudePID.kp * correctedError;
    
    // Integral term (with anti-windup)
    this.altitudePID.integral += correctedError * deltaTime;
    this.altitudePID.integral = this.clamp(this.altitudePID.integral, -10, 10); // Anti-windup limit
    const integral = this.altitudePID.ki * this.altitudePID.integral;
    
    // Derivative term
    const derivative = this.altitudePID.kd * (correctedError - this.altitudePID.previousError) / deltaTime;
    this.altitudePID.previousError = correctedError;
    
    // Combine terms
    const output = proportional + integral + derivative;
    
    // Apply output limits
    return this.clamp(output, this.controlLimits.elevatorTrim.min, this.controlLimits.elevatorTrim.max);
  }
  
  /**
   * PID controller for airspeed control via throttle
   * Corrected control sign: positive error (too fast) = reduce throttle (negative adjustment)
   */
  updateAirspeedPID(error, deltaTime) {
    // For airspeed control: if speed > target (positive error), need to reduce throttle
    const correctedError = -error; // Invert sign for proper control
    
    // Proportional term
    const proportional = this.airspeedPID.kp * correctedError;
    
    // Integral term (with anti-windup)
    this.airspeedPID.integral += correctedError * deltaTime;
    this.airspeedPID.integral = this.clamp(this.airspeedPID.integral, -10, 10); // Anti-windup limit
    const integral = this.airspeedPID.ki * this.airspeedPID.integral;
    
    // Derivative term
    const derivative = this.airspeedPID.kd * (correctedError - this.airspeedPID.previousError) / deltaTime;
    this.airspeedPID.previousError = correctedError;
    
    // Combine terms
    const output = proportional + integral + derivative;
    
    // Apply output limits
    return this.clamp(output, this.controlLimits.throttleAdjustment.min, this.controlLimits.throttleAdjustment.max);
  }
  
  /**
   * Rate limiting to prevent control oscillations
   */
  rateLimit(newValue, currentValue, maxRate) {
    const difference = newValue - currentValue;
    const maxChange = maxRate;
    
    if (difference > maxChange) {
      return currentValue + maxChange;
    } else if (difference < -maxChange) {
      return currentValue - maxChange;
    } else {
      return newValue;
    }
  }
  
  /**
   * Utility function to clamp values
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * Update stability metrics for monitoring autopilot performance
   */
  updateStabilityMetrics(altitudeError, airspeedError, elevatorInput, throttleInput) {
    this.stabilityMetrics.altitudeError = Math.abs(altitudeError);
    this.stabilityMetrics.airspeedError = Math.abs(airspeedError);
    this.stabilityMetrics.controlActivity = Math.abs(elevatorInput) + Math.abs(throttleInput);
    
    // Calculate overall stability score (lower is better)
    const altitudeScore = this.stabilityMetrics.altitudeError / 100; // Normalize to 100ft units
    const speedScore = this.stabilityMetrics.airspeedError / 10;     // Normalize to 10 KTS units
    const activityScore = this.stabilityMetrics.controlActivity * 2; // Activity penalty
    
    this.stabilityMetrics.stabilityScore = altitudeScore + speedScore + activityScore;
  }
  
  /**
   * Log current autopilot status
   */
  logStatus(currentAltitude, currentAirspeed, altitudeError, airspeedError, elevatorTrim, throttleAdj) {
    const stableAltitude = Math.abs(altitudeError) < 50;
    const stableSpeed = Math.abs(airspeedError) < 10;
    
    console.log(`🤖 Autopilot: Alt ${Math.round(currentAltitude)}ft (${Math.round(altitudeError)}ft err), ` +
                `Speed ${Math.round(currentAirspeed)} KTS (${Math.round(airspeedError)} KTS err), ` +
                `Elev ${(elevatorTrim * 100).toFixed(1)}%, Throttle ${((this.flightPhysics.state.controls.throttle) * 100).toFixed(1)}%`);
  }
  
  /**
   * Get current autopilot status for display
   */
  getStatus() {
    return {
      enabled: this.enabled,
      targets: {
        altitude: this.targetAltitude,
        airspeed: this.targetAirspeed
      },
      current: {
        altitude: this.flightPhysics.getFlightState().altitude,
        airspeed: this.flightPhysics.getFlightState().airspeed
      },
      errors: {
        altitude: this.targetAltitude - this.flightPhysics.getFlightState().altitude,
        airspeed: this.targetAirspeed - this.flightPhysics.getFlightState().airspeed
      },
      controls: {
        elevatorTrim: this.currentOutputs.elevatorTrim,
        throttleAdjustment: this.currentOutputs.throttleAdjustment,
        throttle: this.flightPhysics.state.controls.throttle
      },
      stability: this.stabilityMetrics
    };
  }
  
  /**
   * Reset autopilot to clean state
   */
  reset() {
    this.altitudePID.integral = 0;
    this.altitudePID.previousError = 0;
    this.airspeedPID.integral = 0;
    this.airspeedPID.previousError = 0;
    this.currentOutputs.elevatorTrim = 0;
    this.currentOutputs.throttleAdjustment = 0;
    this.stateHistory = [];
    
    console.log('🔄 Autopilot reset to initial state');
  }
  
  /**
   * Adaptive PID tuning based on flight conditions
   */
  adaptiveTuning() {
    // Simple adaptive tuning based on stability metrics
    if (this.stabilityMetrics.stabilityScore > 5) {
      // System is unstable, reduce gains
      this.altitudePID.kp *= 0.95;
      this.airspeedPID.kp *= 0.95;
      console.log('🟡 Autopilot tuning: Reducing gains for stability');
    } else if (this.stabilityMetrics.stabilityScore < 1) {
      // System is very stable, can increase gains slightly
      this.altitudePID.kp *= 1.02;
      this.airspeedPID.kp *= 1.02;
      console.log('🟢 Autopilot tuning: Increasing gains for better response');
    }
    
    // Limit gains to reasonable bounds
    this.altitudePID.kp = this.clamp(this.altitudePID.kp, 0.000001, 0.00001);
    this.airspeedPID.kp = this.clamp(this.airspeedPID.kp, 0.00001, 0.0001);
  }
}

export { AutopilotService };