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
    
    // Normal operating parameters (can be exceeded in failure modes)
    this.nominalParameters = {
      n1Idle: config.n1Idle || 22,      // N1 at idle (can drop to 0 in flameout)
      n1Max: config.n1Max || 100,        // Maximum N1
      n2Base: config.n2Base || 85,        // Base N2
      egtIdle: config.egtIdle || 550,    // EGT at idle (can drop to 100 in flameout)
      egtMax: config.egtMax || 900,      // Maximum EGT (can exceed 1200 in fire)
      vibrationAmplitude: config.vibrationAmplitude || 0.5
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
  calculateParameters() {
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
    this.currentState.n1 = baseN1;
    this.currentState.n2 = baseN2;
    this.currentState.egt = baseEGT;
    this.currentState.thrust = baseThrust;
    this.currentState.fuelFlow = baseFuelFlow;
    
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
    
    // N1 calculation with smooth curve
    let baseN1;
    if (throttle <= 0.05) {
      baseN1 = nominal.n1Idle;
    } else if (throttle >= 0.95) {
      baseN1 = nominal.n1Max;
    } else {
      const normalizedThrottle = (throttle - 0.05) / (0.95 - 0.05);
      const curveExponent = 0.7;
      const curveValue = Math.pow(normalizedThrottle, curveExponent);
      baseN1 = nominal.n1Idle + curveValue * (nominal.n1Max - nominal.n1Idle);
    }
    
    // N2 calculation (slower response than N1)
    const n2Response = 0.85; // N2 responds slower than N1
    baseN1 = Math.max(nominal.n1Idle, Math.min(nominal.n1Max, baseN1));
    
    let baseN2 = nominal.n2Base + (throttle * 10 * n2Response); // N2 varies with throttle
    
    // EGT calculation (exponential with throttle)
    let baseEGT;
    if (throttle <= 0.05) {
      baseEGT = nominal.egtIdle;
    } else {
      const egtCurve = Math.pow(throttle, 1.2);
      baseEGT = nominal.egtIdle + egtCurve * (nominal.egtMax - nominal.egtIdle);
    }
    
    // Thrust calculation with efficiency factors
    const efficiency = 0.85 + 0.1 * Math.sin(throttle * Math.PI);
    const airDensityFactor = Math.pow(this.environmentalFactors.airDensity / 1.225, 0.7);
    const baseThrust = (this.maxThrust * throttle) * efficiency * airDensityFactor;
    
    // Fuel flow (approximate - increases with throttle)
    const baseFuelFlow = 0.3 + (throttle * 2.0); // kg/s
    
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
    const densityFactor = Math.pow(densityRatio, 0.7);
    
    // Temperature effects (hot day = reduced performance)
    const tempFactor = Math.max(0.6, 1 - ((env.temperature - 15) * 0.004));
    
    // Altitude effects (high altitude = reduced performance)
    const altitudeFactor = Math.max(0.3, 1 - (env.altitude * 0.00008));
    
    // Combined environmental factor
    const envFactor = densityFactor * tempFactor * altitudeFactor;
    
    return [
      n1, // N1 largely unaffected by environment
      n2, // N2 largely unaffected by environment  
      egt * tempFactor, // EGT affected by temperature
      thrust * envFactor, // Thrust heavily affected by environment
      fuelFlow * envFactor // Fuel flow affected by environment
    ];
  }
  
  /**
   * Apply degradation effects
   */
  applyDegradationEffects([n1, n2, egt, thrust, fuelFlow]) {
    const deg = this.degradationFactors;
    
    // Overall degradation factor
    const degradationFactor = (deg.age + deg.wearLevel) * 0.5 - (deg.maintenance + deg.cleanliness) * 0.3 + 0.7;
    const finalFactor = Math.max(0.3, Math.min(1.1, degradationFactor));
    
    return [
      n1 * finalFactor,
      n2 * finalFactor,
      egt * (2 - finalFactor), // Higher EGT for degraded engine
      thrust * finalFactor,
      fuelFlow * finalFactor
    ];
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