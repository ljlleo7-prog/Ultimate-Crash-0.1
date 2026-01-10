/**
 * ParameterValidator - Flexible validation for abnormal conditions
 * Handles extreme values that occur during failures, fires, flameouts, etc.
 */
export class ParameterValidator {
  /**
   * Validate engine parameter with flexible ranges for abnormal conditions
   */
  static validateEngineParameter(paramName, value, context = {}) {
    const { 
      failureType = 'none',
      severity = 'none',
      altitude = 0,
      temperature = 15,
      isEngineRunning = true 
    } = context;
    
    const normalRanges = {
      throttle: { min: 0, max: 1, clamp: true },
      n1: { min: 0, max: 105, clamp: true },      // Can exceed 100% in extreme conditions
      n2: { min: 0, max: 110, clamp: true },       // N2 can overspeed
      egt: { min: 100, max: 1500, clamp: true },  // Can drop to 100°C or go to 1500°C in fire
      thrust: { min: 0, max: 120000, clamp: true }, // Can exceed normal max
      fuelFlow: { min: 0, max: 5, clamp: true },   // Can be zero or very high
      oilPressure: { min: 0, max: 150, clamp: true }, // Can be zero or very high
      vibrationLevel: { min: 0, max: 10, clamp: true }, // Can be extreme during failures
      fuelQuantity: { min: 0, max: 10000, clamp: true } // Fuel in kg
    };
    
    const failureModifications = {
      flameout: {
        n1: { min: 0, max: 10, clamp: true },
        egt: { min: 100, max: 400, clamp: true },
        thrust: { min: 0, max: 1000, clamp: true },
        fuelFlow: { min: 0, max: 0.5, clamp: true },
        oilPressure: { min: 0, max: 10, clamp: true }
      },
      fire: {
        egt: { min: 800, max: 2000, clamp: true },
        vibrationLevel: { min: 1, max: 10, clamp: true },
        thrust: { min: 0, max: 50000, clamp: true }
      },
      damage: {
        n1: { min: 0, max: 80, clamp: true },
        n2: { min: 0, max: 85, clamp: true },
        thrust: { min: 0, max: 40000, clamp: true },
        vibrationLevel: { min: 0.5, max: 8, clamp: true }
      },
      fuelLeak: {
        fuelFlow: { min: 0, max: 1, clamp: true },
        thrust: { min: 0, max: 80000, clamp: true }
      }
    };
    
    // Get base range
    let range = normalRanges[paramName] || { min: -Infinity, max: Infinity, clamp: false };
    
    // Apply failure-specific modifications
    if (failureType !== 'none' && failureModifications[failureType]) {
      const failureRange = failureModifications[failureType][paramName];
      if (failureRange) {
        range = { ...range, ...failureRange };
      }
    }
    
    // Apply severity multipliers
    if (severity === 'critical' && failureType !== 'none') {
      range.max *= 1.5; // Allow 50% more range for critical failures
    } else if (severity === 'major') {
      range.max *= 1.2; // Allow 20% more range for major failures
    }
    
    // Environmental modifications
    if (altitude > 10000) { // High altitude
      range.max *= 0.8; // Reduce max at high altitude
    }
    
    if (temperature > 40) { // Hot day
      range.max *= 0.9; // Reduce max on hot days
    }
    
    // Validate and clamp
    let validatedValue = value;
    
    if (range.clamp) {
      validatedValue = Math.max(range.min, Math.min(range.max, value));
    }
    
    // Special handling for engine stop conditions
    if (!isEngineRunning && paramName === 'n1') {
      validatedValue = Math.min(validatedValue, 5); // N1 should be very low when stopped
    }
    
    // Special handling for flameout conditions
    if (failureType === 'flameout' && paramName === 'egt') {
      validatedValue = Math.max(100, validatedValue); // Minimum 100°C during flameout
    }
    
    // Track if value was modified
    const wasModified = validatedValue !== value;
    
    return {
      value: validatedValue,
      wasClamped: wasModified,
      originalValue: value,
      range: range,
      context: context
    };
  }
  
  /**
   * Validate multiple parameters at once
   */
  static validateEngineParameters(parameters, context) {
    const results = {};
    
    Object.entries(parameters).forEach(([paramName, value]) => {
      results[paramName] = this.validateEngineParameter(paramName, value, context);
    });
    
    return results;
  }
  
  /**
   * Check if parameter values indicate a specific condition
   */
  static detectCondition(parameters) {
    const conditions = [];
    
    // Flameout detection
    if (parameters.n1 < 10 && parameters.egt < 400 && parameters.thrust < 1000) {
      conditions.push('flameout');
    }
    
    // Fire detection
    if (parameters.egt > 1200 && parameters.vibrationLevel > 2) {
      conditions.push('fire');
    }
    
    // Low oil pressure
    if (parameters.oilPressure < 10 && parameters.n1 > 20) {
      conditions.push('lowOilPressure');
    }
    
    // Fuel leak detection
    if (parameters.fuelFlow < 0.5 && parameters.thrust > 30000) {
      conditions.push('fuelLeak');
    }
    
    // Engine damage
    if (parameters.vibrationLevel > 3 && parameters.n1 < 60) {
      conditions.push('engineDamage');
    }
    
    return conditions;
  }
  
  /**
   * Validate flight control inputs
   */
  static validateControlInput(inputType, value, context = {}) {
    const controlRanges = {
      throttle: { min: 0, max: 1, emergencyMax: 1.2 }, // Can exceed 100% in emergency
      pitch: { min: -30, max: 30, emergencyMax: 45 },   // Degrees
      roll: { min: -60, max: 60, emergencyMax: 90 },    // Degrees
      yaw: { min: -20, max: 20, emergencyMax: 30 },     // Degrees
      trim: { min: -10, max: 10, emergencyMax: 15 },     // Units
      flaps: { min: 0, max: 3, emergencyMax: 3 },       // 0=UP, 1=TO, 2=LDG, 3=EMERGENCY
      gear: { min: 0, max: 1, emergencyMax: 1 },        // 0=UP, 1=DOWN
      airBrakes: { min: 0, max: 1, emergencyMax: 1.5 }  // Can exceed normal in emergency
    };
    
    const range = controlRanges[inputType] || { min: -Infinity, max: Infinity };
    
    let validatedValue = value;
    let warnings = [];
    
    // Emergency conditions allow exceeding normal ranges
    const emergencyFactor = context.emergency ? 1.5 : 1.0;
    const effectiveMax = Math.max(range.max, range.emergencyMax || range.max) * emergencyFactor;
    
    if (validatedValue > effectiveMax) {
      validatedValue = effectiveMax;
      warnings.push(`Value exceeded emergency maximum for ${inputType}`);
    }
    
    if (validatedValue < range.min) {
      validatedValue = range.min;
      warnings.push(`Value below minimum for ${inputType}`);
    }
    
    return {
      value: validatedValue,
      warnings: warnings,
      wasModified: validatedValue !== value,
      range: range
    };
  }
  
  /**
   * Sanitize parameter values to prevent simulation instability
   */
  static sanitizeParameters(parameters) {
    const sanitized = { ...parameters };
    
    // Remove NaN and infinite values
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'number') {
        if (isNaN(sanitized[key]) || !isFinite(sanitized[key])) {
          sanitized[key] = 0;
        }
      }
    });
    
    // Prevent sudden jumps that could cause instability
    if (sanitized.n1 !== undefined && Math.abs(sanitized.n1) > 200) {
      sanitized.n1 = Math.sign(sanitized.n1) * 200;
    }
    
    if (sanitized.egt !== undefined && Math.abs(sanitized.egt) > 2500) {
      sanitized.egt = Math.sign(sanitized.egt) * 2500;
    }
    
    if (sanitized.thrust !== undefined && Math.abs(sanitized.thrust) > 200000) {
      sanitized.thrust = Math.sign(sanitized.thrust) * 200000;
    }
    
    return sanitized;
  }
  
  /**
   * Generate realistic failure scenarios for testing
   */
  static generateFailureScenario() {
    const failureTypes = ['flameout', 'fire', 'damage', 'fuelLeak', 'stuck'];
    const severities = ['minor', 'major', 'critical'];
    const affectedEngines = [1, 2, 3, 4]; // Number of engines affected
    
    return {
      failureType: failureTypes[Math.floor(Math.random() * failureTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      affectedEngines: affectedEngines[Math.floor(Math.random() * affectedEngines.length)],
      timeToFailure: Math.random() * 300, // 0-5 minutes
      recoveryPossible: Math.random() < 0.4, // 40% chance of recovery
      environmentalFactors: {
        altitude: Math.random() * 12000, // 0-12km
        temperature: -50 + Math.random() * 80, // -50°C to +30°C
        weather: ['clear', 'storm', 'turbulence', 'icing'][Math.floor(Math.random() * 4)]
      }
    };
  }
}