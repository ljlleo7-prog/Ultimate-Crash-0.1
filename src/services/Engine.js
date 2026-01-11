/**
 * Individual Engine Class - Robust for abnormal conditions and failure modes
 * Designed for crash simulation and training scenarios
 */
export class Engine {
  constructor(engineIndex, config = {}) {
    this.engineIndex = engineIndex;
    
    // Basic configuration
    this.engineType = config.engineType || 'turbofan';
    this.maxThrust = config.maxThrust || 85000; // N
    this.engineWeight = config.engineWeight || 3000; // kg
    this.specificFuelConsumption = config.specificFuelConsumption || 0.0000021; // kg/N/s (SFC)
    
    // Normal operating parameters (can be exceeded in failure modes)
    this.nominalParameters = {
      n1Idle: config.n1Idle || 22,      // N1 at idle (can drop to 0 in flameout)
      n1Max: config.n1Max || 100,        // Maximum N1
      n2Base: config.n2Base || 85,        // Base N2
      egtIdle: config.egtIdle || 550,    // EGT at idle (can drop to 100 in flameout)
      egtMax: config.egtMax || 1000,      // Increased maximum EGT for more realistic TOGA values
      vibrationAmplitude: config.vibrationAmplitude || 0.05
    };
    
    // Current state
    this.currentState = {
      throttle: 0,        // 0-1 range
      n1: this.nominalParameters.n1Idle,
      n2: this.nominalParameters.n2Base,
      egt: this.nominalParameters.egtIdle,
      thrust: 0,
      isRunning: true,
      fuelFlow: 0,
      oilPressure: 0,
      vibrationLevel: 0
    };
    
    // Failure state management
    this.failureState = {
      isFailed: false,
      failureType: 'none', // 'none', 'flameout', 'fire', 'damage', 'fuelLeak'
      severity: 'none',     // 'none', 'minor', 'major', 'critical'
      affectedSystems: [], // ['n1', 'n2', 'egt', 'thrust', 'fuel']
      timeOfFailure: null,
      recoveryPossible: false
    };
    
    // Environmental factors
    this.environmentalFactors = {
      altitude: 0,
      airDensity: 1.225, // kg/m³ at sea level
      temperature: 15,   // °C
      humidity: 0.5       // 0-1 range
    };
    
    // Performance degradation factors
    this.degradationFactors = {
      age: 0,             // 0-1 (1 = brand new)
      maintenance: 0,     // 0-1 (1 = well maintained)
      cleanliness: 1,     // 0-1 (1 = clean)
      wearLevel: 0        // 0-1 (0 = no wear)
    };
    
    // Initialize the engine
    this.initialize();
  }
  
  /**
   * Initialize engine with default parameters
   */
  initialize() {
    this.updateEnvironment(0, 1.225, 15, 0.5);
    this.calculateParameters();
    this.log('Engine initialized', this.getStatus());
  }
  
  /**
   * Update environmental conditions
   */
  updateEnvironment(altitude, airDensity, temperature, humidity) {
    this.environmentalFactors = {
      altitude: altitude || 0,
      airDensity: airDensity || 1.225,
      temperature: temperature || 15,
      humidity: humidity || 0.5
    };
    
    // Recalculate parameters if running
    if (this.currentState.isRunning) {
      this.calculateParameters();
    }
  }
  
  /**
   * Set throttle position (0-1 range)
   */
  setThrottle(throttleValue) {
    const validatedThrottle = Math.max(0, Math.min(1, throttleValue));
    this.currentState.throttle = validatedThrottle;
    
    if (!this.failureState.isFailed) {
      this.calculateParameters();
    }
    
    this.log('Throttle set', {
      throttle: validatedThrottle,
      engine: this.engineIndex
    });
  }
  
  /**
   * Calculate engine parameters based on current state and conditions
   */
  calculateParameters(dt = 0.016) {
    const throttle = this.currentState.throttle;
    const env = this.environmentalFactors;
    const nominal = this.nominalParameters;
    const degradation = this.degradationFactors;
    
    // Calculate base parameters (before failure modifications)
    let baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow;
    
    // Apply failure modifications
    if (this.failureState.isFailed) {
      [baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow] = this.calculateFailedParameters();
    } else {
      [baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow] = this.calculateNormalParameters(throttle);
    }
    
    // Apply environmental effects
    [baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow] = this.applyEnvironmentalEffects([
      baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow
    ]);
    
    // Apply degradation factors
    [baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow] = this.applyDegradationEffects([
      baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow
    ]);
    
    // Update current state
    const alphaN1 = 0.0012;
    const alphaN2 = 0.0010;
    const alphaEGT = 0.0010;
    const alphaThrust = 0.0015;
    const alphaFuel = 0.0020;
    this.currentState.n1 += (baseN1 - this.currentState.n1) * alphaN1;
    this.currentState.n2 += (baseN2 - this.currentState.n2) * alphaN2;
    this.currentState.egt += (baseEGT - this.currentState.egt) * alphaEGT;
    this.currentState.thrust += (baseThrust - this.currentState.thrust) * alphaThrust;
    this.currentState.fuelFlow += (baseFuelFlow - this.currentState.fuelFlow) * alphaFuel;
    
    // Calculate derived parameters
    this.currentState.oilPressure = this.calculateOilPressure();
    this.currentState.vibrationLevel = this.calculateVibration();
    this.currentState.isRunning = this.calculateRunningState();
    
    return this.getStatus();
  }
  
  /**
   * Calculate parameters for normal operation
   */
  calculateNormalParameters(throttle) {
    const nominal = this.nominalParameters;
    const altitude_m = this.environmentalFactors.altitude || 0;
    const airDensity = this.environmentalFactors.airDensity || 1.225;
    
    // Sea-level values at current throttle
    const N10 = nominal.n1Idle + (Math.pow(throttle, 0.7) * (nominal.n1Max - nominal.n1Idle));
    const N20 = nominal.n2Base + (Math.pow(throttle, 0.9) * 10);
    
    // A — Exponential Decay (Density-Scaled) for N1 - REDUCED DECAY RATE
    const kN1 = 0.00002; // Decay coefficient for N1 - reduced from 0.0001
    const N1_h = N10 * Math.exp(-kN1 * altitude_m);
    
    // Clamp N1 to reasonable limits
    let baseN1 = Math.max(nominal.n1Idle, Math.min(nominal.n1Max, N1_h));
    
    // B — Modified Exponential for N2 - REDUCED DECAY RATE
    const kN2 = 0.00001; // Decay coefficient for N2 - reduced from 0.00005
    const cN2 = 0.3; // Change limit factor for N2 - reduced from 0.5
    const N2_h = N20 * (1 - cN2 * (1 - Math.exp(-kN2 * altitude_m)));
    
    // Clamp N2 to reasonable limits
    let baseN2 = Math.max(50, Math.min(100, N2_h));
    
    // EGT calculation - Improved curve for higher values at TOGA
    let baseEGT;
    if (throttle <= 0.05) {
      baseEGT = nominal.egtIdle;
    } else {
      // More aggressive EGT curve that reaches higher values at TOGA
      const egtCurve = Math.pow(throttle, 0.8);
      baseEGT = nominal.egtIdle + egtCurve * (nominal.egtMax - nominal.egtIdle);
    }
    
    // Base thrust at sea level (environmental lapse applied later)
    const baseThrust = this.maxThrust * throttle;
    
    // Fuel flow using specific fuel consumption (baseline idle included)
    const idleFuel = 0.05; // kg/s idle baseline
    const baseFuelFlow = Math.max(idleFuel, this.specificFuelConsumption * baseThrust);
    
    return [baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow];
  }
  
  /**
   * Calculate parameters for failure modes
   */
  calculateFailedParameters() {
    const failure = this.failureState;
    const throttle = this.currentState.throttle;
    const nominal = this.nominalParameters;
    
    let [baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow] = this.calculateNormalParameters(throttle);
    
    switch (failure.failureType) {
      case 'flameout':
        // Flameout: Very low N1, low EGT, minimal thrust
        baseN1 = Math.max(0, baseN1 * 0.1); // 90% reduction
        baseN2 = baseN2 * 0.5; // N2 continues to spin
        baseEGT = Math.max(100, baseEGT * 0.3); // Drop to 100°C or 70% reduction
        baseThrust = baseThrust * 0.05; // 95% reduction
        baseFuelFlow = baseFuelFlow * 0.1; // Minimal fuel
        break;
        
      case 'fire':
        // Engine fire: High EGT, reduced thrust
        baseEGT = Math.min(1400, baseEGT * 1.8); // Can exceed normal max
        baseThrust = baseThrust * 0.6; // 40% reduction due to damage
        baseN1 = baseN1 * 0.8; // Slight reduction
        break;
        
      case 'damage':
        // Mechanical damage: Reduced performance across all parameters
        const damageFactor = 0.5 + (0.3 * (failure.severity === 'minor' ? 1 : failure.severity === 'major' ? 0.6 : 0.3));
        baseN1 = baseN1 * damageFactor;
        baseN2 = baseN2 * damageFactor;
        baseEGT = baseEGT * (damageFactor + 0.2); // Higher EGT for damaged engine
        baseThrust = baseThrust * damageFactor;
        baseFuelFlow = baseFuelFlow * damageFactor;
        break;
        
      case 'fuelLeak':
        // Fuel leak: Reduced fuel flow, potential flameout
        baseFuelFlow = baseFuelFlow * 0.7; // 30% fuel loss
        if (Math.random() < 0.1) { // 10% chance of flameout per update
          this.triggerFailure('flameout', 'major', true);
        }
        break;
        
      case 'stuck':
        // Stuck throttle: Parameters stuck at current values
        // No change from current state
        break;
    }
    
    return [baseN1, baseN2, baseEGT, baseThrust, baseFuelFlow];
  }
  
  /**
   * Apply environmental effects
   */
  applyEnvironmentalEffects([n1, n2, egt, thrust, fuelFlow]) {
    const env = this.environmentalFactors;
    
    // Air density effects
    const densityRatio = env.airDensity / 1.225;
    const thrustLapse = Math.pow(densityRatio, 0.7);
    
    // Temperature effects (hot day = reduced performance)
    const tempFactor = Math.max(0.6, 1 - ((env.temperature - 15) * 0.004));
    
    // Combined environmental factor (remove double altitude scaling)
    const envFactor = thrustLapse * tempFactor;
    
    return [
      n1, // N1 largely unaffected by environment
      n2, // N2 largely unaffected by environment  
      egt * tempFactor, // EGT affected by temperature
      thrust * envFactor, // Thrust heavily affected by environment
      Math.max(0.05, fuelFlow * tempFactor) // Fuel flow affected by temperature only
    ];
  }
  
  /**
   * Apply degradation effects (disabled as requested)
   */
  applyDegradationEffects([n1, n2, egt, thrust, fuelFlow]) {
    // Return parameters without degradation effects
    return [n1, n2, egt, thrust, fuelFlow];
  }
  
  /**
   * Calculate oil pressure
   */
  calculateOilPressure() {
    const n1 = this.currentState.n1;
    if (n1 < 5) return 0; // No oil pressure at very low N1
    return Math.min(100, (n1 / 100) * 80 + Math.random() * 10);
  }
  
  /**
   * Calculate vibration level
   */
  calculateVibration() {
    const baseVibration = this.nominalParameters.vibrationAmplitude;
    const throttle = this.currentState.throttle;
    const failure = this.failureState;
    
    let vibration = baseVibration * (0.5 + throttle * 0.5);
    
    // Increased vibration during failures
    if (failure.isFailed) {
      switch (failure.failureType) {
        case 'fire':
          vibration *= 2.0; // Doubled vibration
          break;
        case 'damage':
          vibration *= (1.5 + failure.severity === 'critical' ? 1.0 : 0.5);
          break;
        case 'fuelLeak':
          vibration *= 1.3;
          break;
      }
    }
    
    return Math.min(5.0, vibration); // Cap at 5.0
  }
  
  /**
   * Determine if engine is running
   */
  calculateRunningState() {
    if (this.failureState.failureType === 'flameout') {
      return false;
    }
    return this.currentState.n1 > 5; // Consider running if N1 > 5%
  }
  
  /**
   * Trigger a failure condition
   */
  triggerFailure(failureType, severity = 'major', recoveryPossible = false) {
    this.failureState = {
      isFailed: true,
      failureType: failureType,
      severity: severity,
      affectedSystems: this.getAffectedSystems(failureType),
      timeOfFailure: Date.now(),
      recoveryPossible: recoveryPossible
    };
    
    this.calculateParameters(); // Recalculate with failure state
    
    this.log('Failure triggered', {
      engine: this.engineIndex,
      failureType,
      severity,
      recoveryPossible
    });
  }
  
  /**
   * Recover from failure (if possible)
   */
  recoverFromFailure() {
    if (!this.failureState.isFailed || !this.failureState.recoveryPossible) {
      return false;
    }
    
    this.failureState = {
      isFailed: false,
      failureType: 'none',
      severity: 'none',
      affectedSystems: [],
      timeOfFailure: null,
      recoveryPossible: false
    };
    
    this.calculateParameters(); // Recalculate with normal operation
    
    this.log('Failure recovered', {
      engine: this.engineIndex
    });
    
    return true;
  }
  
  /**
   * Get systems affected by failure type
   */
  getAffectedSystems(failureType) {
    switch (failureType) {
      case 'flameout':
        return ['n1', 'egt', 'thrust', 'fuel'];
      case 'fire':
        return ['egt', 'thrust', 'n1'];
      case 'damage':
        return ['n1', 'n2', 'egt', 'thrust', 'fuel'];
      case 'fuelLeak':
        return ['fuel', 'thrust'];
      case 'stuck':
        return ['throttle'];
      default:
        return [];
    }
  }
  
  /**
   * Get current engine status
   */
  getStatus() {
    return {
      engineIndex: this.engineIndex,
      isRunning: this.currentState.isRunning,
      throttle: this.currentState.throttle,
      n1: this.currentState.n1,
      n2: this.currentState.n2,
      egt: this.currentState.egt,
      thrust: this.currentState.thrust,
      fuelFlow: this.currentState.fuelFlow,
      oilPressure: this.currentState.oilPressure,
      vibrationLevel: this.currentState.vibrationLevel,
      failureState: { ...this.failureState },
      environmentalFactors: { ...this.environmentalFactors },
      degradationFactors: { ...this.degradationFactors }
    };
  }
  
  /**
   * Simulate random failures (for testing)
   */
  simulateRandomFailure() {
    const failureTypes = ['flameout', 'fire', 'damage', 'fuelLeak'];
    const severities = ['minor', 'major', 'critical'];
    
    const failureType = failureTypes[Math.floor(Math.random() * failureTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    this.triggerFailure(failureType, severity, Math.random() < 0.3); // 30% recovery chance
  }
  
  /**
   * Debug logging
   */
  log(message, data) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 Engine ${this.engineIndex}: ${message}`, data || '');
    }
  }
}
