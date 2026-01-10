/**
 * PropulsionManager - Coordinates multiple engines with robust failure handling
 * Supports 2, 3, 4+ engines for different aircraft types
 */
import { Engine } from './Engine.js';

export class PropulsionManager {
  constructor(aircraftConfig = {}) {
    // Engine configuration
    this.engineCount = aircraftConfig.engineCount || 2;
    this.engines = [];
    this.engineConfiguration = aircraftConfig.engineConfiguration || 'twin'; // 'twin', 'tri', 'quad'
    
    // Aircraft-specific engine configurations
    this.aircraftEngineConfigs = {
      twin: {
        engines: [
          { position: { x: -8, y: 0, z: 0 }, thrust: 85000 }, // Left engine
          { position: { x: 8, y: 0, z: 0 }, thrust: 85000 }  // Right engine
        ]
      },
      tri: {
        engines: [
          { position: { x: -6, y: 0, z: 0 }, thrust: 75000 }, // Left engine
          { position: { x: 6, y: 0, z: 0 }, thrust: 75000 },  // Right engine
          { position: { x: 0, y: 0, z: -2 }, thrust: 80000 }  // Center engine
        ]
      },
      quad: {
        engines: [
          { position: { x: -10, y: 0, z: 0 }, thrust: 70000 }, // Left outer
          { position: { x: -3, y: 0, z: 0 }, thrust: 70000 },  // Left inner
          { position: { x: 3, y: 0, z: 0 }, thrust: 70000 },   // Right inner
          { position: { x: 10, y: 0, z: 0 }, thrust: 70000 }   // Right outer
        ]
      }
    };
    
    // Global control parameters
    this.globalControls = {
      masterThrottle: 0.47, // Master throttle (0-1)
      differentialThrottle: 0, // For yaw control (-1 to 1)
      thrustVectoring: 0, // For VTOL aircraft (-1 to 1)
      reverseThrust: false, // Reverse thrust enabled
      emergencyShutdown: false // All engines shutdown
    };
    
    // Aircraft state
    this.aircraftState = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { u: 0, v: 0, w: 0 },
      orientation: { phi: 0, theta: 0, psi: 0 },
      angularRates: { p: 0, q: 0, r: 0 },
      altitude: 0,
      airspeed: 0,
      mass: 45000, // kg
      centerOfGravity: { x: 0, y: 0, z: 0 }
    };
    
    // Environmental conditions
    this.environment = {
      airDensity: 1.225, // kg/m³
      temperature: 15,    // °C
      humidity: 0.5,      // 0-1
      windSpeed: 0,       // m/s
      windDirection: 0    // degrees
    };
    
    // Failure simulation and management
    this.failureSimulation = {
      enabled: false,
      failureRate: 0.001, // Per second probability
      timeToNextFailure: null
    };
    
    // Performance tracking
    this.performanceMetrics = {
      totalThrust: 0,
      fuelConsumption: 0,
      averageEGT: 0,
      enginesRunning: 0,
      thrustAsymmetry: 0,
      efficiency: 0
    };
    
    // Initialize engines
    this.initializeEngines();
  }
  
  /**
   * Initialize all engines based on aircraft configuration
   */
  initializeEngines() {
    const config = this.aircraftEngineConfigs[this.engineConfiguration];
    
    if (!config || config.engines.length !== this.engineCount) {
      throw new Error(`Invalid engine configuration: ${this.engineConfiguration} with ${this.engineCount} engines`);
    }
    
    // Clear existing engines
    this.engines = [];
    
    // Create engines based on configuration
    for (let i = 0; i < this.engineCount; i++) {
      const engineConfig = config.engines[i];
      
      const engine = new Engine(i, {
        engineType: 'turbofan',
        maxThrust: engineConfig.thrust,
        n1Idle: 22,
        n1Max: 100,
        n2Base: 85,
        egtIdle: 550,
        egtMax: 900,
        vibrationAmplitude: 0.5
      });
      
      // Position engines
      engine.position = engineConfig.position;
      this.engines.push(engine);
    }
    
    this.log('Engines initialized', {
      count: this.engineCount,
      configuration: this.engineConfiguration,
      totalThrust: this.getTotalMaxThrust()
    });
  }
  
  /**
   * Set master throttle for all engines
   */
  setMasterThrottle(throttle) {
    const validatedThrottle = Math.max(0, Math.min(1, throttle));
    this.globalControls.masterThrottle = validatedThrottle;
    
    // Apply to all running engines
    this.engines.forEach(engine => {
      if (!engine.failureState.isFailed) {
        const individualThrottle = this.calculateIndividualThrottle(engine.engineIndex, validatedThrottle);
        engine.setThrottle(individualThrottle);
      }
    });
    
    this.log('Master throttle set', {
      master: validatedThrottle,
      enginesUpdated: this.engines.filter(e => !e.failureState.isFailed).length
    });
  }
  
  /**
   * Set individual engine throttle
   */
  setEngineThrottle(engineIndex, throttle) {
    if (engineIndex < 0 || engineIndex >= this.engines.length) {
      throw new Error(`Invalid engine index: ${engineIndex}`);
    }
    
    const engine = this.engines[engineIndex];
    const validatedThrottle = Math.max(0, Math.min(1, throttle));
    
    if (!engine.failureState.isFailed) {
      engine.setThrottle(validatedThrottle);
    }
    
    this.log('Individual throttle set', {
      engine: engineIndex,
      throttle: validatedThrottle
    });
  }
  
  /**
   * Calculate individual engine throttle based on master and differential control
   */
  calculateIndividualThrottle(engineIndex, masterThrottle) {
    const differential = this.globalControls.differentialThrottle;
    const engineCount = this.engines.length;
    
    // For twin engine aircraft
    if (engineCount === 2) {
      const leftEngine = 0;
      const rightEngine = 1;
      
      if (engineIndex === leftEngine) {
        return Math.max(0, masterThrottle - differential * 0.5);
      } else if (engineIndex === rightEngine) {
        return Math.max(0, masterThrottle + differential * 0.5);
      }
    }
    
    // For quad engine aircraft (simplified)
    if (engineCount === 4) {
      const baseThrottle = masterThrottle;
      const yawFactor = differential * 0.3;
      
      // Left engines (negative X)
      if (engineIndex <= 1) {
        return Math.max(0, baseThrottle - yawFactor);
      }
      // Right engines (positive X)
      else {
        return Math.max(0, baseThrottle + yawFactor);
      }
    }
    
    // Default: return master throttle
    return masterThrottle;
  }
  
  /**
   * Set differential throttle for asymmetric thrust control
   */
  setDifferentialThrottle(differential) {
    const validatedDifferential = Math.max(-1, Math.min(1, differential));
    this.globalControls.differentialThrottle = validatedDifferential;
    
    // Recalculate all engine throttles
    this.setMasterThrottle(this.globalControls.masterThrottle);
    
    this.log('Differential throttle set', {
      differential: validatedDifferential
    });
  }
  
  /**
   * Trigger engine failure
   */
  triggerEngineFailure(engineIndex, failureType, severity = 'major', recoveryPossible = false) {
    if (engineIndex < 0 || engineIndex >= this.engines.length) {
      throw new Error(`Invalid engine index: ${engineIndex}`);
    }
    
    const engine = this.engines[engineIndex];
    engine.triggerFailure(failureType, severity, recoveryPossible);
    
    this.log('Engine failure triggered', {
      engine: engineIndex,
      failureType,
      severity,
      recoveryPossible
    });
  }
  
  /**
   * Recover engine from failure
   */
  recoverEngine(engineIndex) {
    if (engineIndex < 0 || engineIndex >= this.engines.length) {
      throw new Error(`Invalid engine index: ${engineIndex}`);
    }
    
    const engine = this.engines[engineIndex];
    const success = engine.recoverFromFailure();
    
    if (success) {
      this.log('Engine recovered', {
        engine: engineIndex
      });
    }
    
    return success;
  }
  
  /**
   * Emergency shutdown all engines
   */
  emergencyShutdown() {
    this.globalControls.emergencyShutdown = true;
    
    this.engines.forEach(engine => {
      if (!engine.failureState.isFailed) {
        engine.triggerFailure('flameout', 'critical', false);
      }
    });
    
    this.log('Emergency shutdown executed');
  }
  
  /**
   * Update environmental conditions
   */
  updateEnvironment(altitude, airDensity, temperature, humidity, windSpeed = 0, windDirection = 0) {
    this.environment = {
      airDensity: airDensity || 1.225,
      temperature: temperature || 15,
      humidity: humidity || 0.5,
      windSpeed: windSpeed || 0,
      windDirection: windDirection || 0
    };
    
    // Update all engines with new environmental conditions
    this.engines.forEach(engine => {
      engine.updateEnvironment(altitude, airDensity, temperature, humidity);
    });
    
    this.log('Environment updated', this.environment);
  }
  
  /**
   * Simulate random failures
   */
  simulateRandomFailures(enabled, failureRate = 0.001) {
    this.failureSimulation = {
      enabled: enabled,
      failureRate: failureRate,
      timeToNextFailure: enabled ? Math.random() * 60 : null // Random failure within 60 seconds
    };
    
    this.log('Failure simulation updated', this.failureSimulation);
  }
  
  /**
   * Update all engines and calculate overall propulsion forces
   */
  update() {
    const deltaTime = 0.016; // ~60 FPS simulation
    
    // Simulate random failures
    if (this.failureSimulation.enabled) {
      this.updateFailureSimulation(deltaTime);
    }
    
    // Update all engines
    this.engines.forEach(engine => {
      engine.calculateParameters();
    });
    
    // Calculate overall performance metrics
    this.calculatePerformanceMetrics();
    
    return this.getPropulsionForces();
  }
  
  /**
   * Simulate random failures over time
   */
  updateFailureSimulation(deltaTime) {
    if (this.failureSimulation.timeToNextFailure !== null) {
      this.failureSimulation.timeToNextFailure -= deltaTime;
      
      if (this.failureSimulation.timeToNextFailure <= 0) {
        // Trigger a random failure
        const runningEngines = this.engines.filter(e => !e.failureState.isFailed);
        if (runningEngines.length > 0) {
          const randomEngine = runningEngines[Math.floor(Math.random() * runningEngines.length)];
          const failureTypes = ['flameout', 'fire', 'damage', 'fuelLeak'];
          const severities = ['minor', 'major', 'critical'];
          
          const failureType = failureTypes[Math.floor(Math.random() * failureTypes.length)];
          const severity = severities[Math.floor(Math.random() * severities.length)];
          
          randomEngine.triggerFailure(failureType, severity, Math.random() < 0.3);
        }
        
        // Schedule next failure
        this.failureSimulation.timeToNextFailure = Math.random() * 60;
      }
    }
  }
  
  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics() {
    let totalThrust = 0;
    let totalFuelFlow = 0;
    let totalEGT = 0;
    let enginesRunning = 0;
    
    this.engines.forEach(engine => {
      const status = engine.getStatus();
      totalThrust += status.thrust;
      totalFuelFlow += status.fuelFlow;
      totalEGT += status.egt;
      if (status.isRunning) enginesRunning++;
    });
    
    this.performanceMetrics = {
      totalThrust: totalThrust,
      fuelConsumption: totalFuelFlow,
      averageEGT: enginesRunning > 0 ? totalEGT / enginesRunning : 0,
      enginesRunning: enginesRunning,
      thrustAsymmetry: this.calculateThrustAsymmetry(),
      efficiency: this.calculateEfficiency()
    };
  }
  
  /**
   * Calculate thrust asymmetry between engines
   */
  calculateThrustAsymmetry() {
    const thrustValues = this.engines.map(e => e.currentState.thrust);
    const maxThrust = Math.max(...thrustValues);
    const minThrust = Math.min(...thrustValues);
    
    if (maxThrust === 0) return 0;
    return (maxThrust - minThrust) / maxThrust;
  }
  
  /**
   * Calculate overall propulsion efficiency
   */
  calculateEfficiency() {
    const totalThrust = this.performanceMetrics.totalThrust;
    const totalFuelFlow = this.performanceMetrics.fuelConsumption;
    
    if (totalFuelFlow === 0) return 0;
    return (totalThrust / totalFuelFlow) / 100; // Simplified efficiency calculation
  }
  
  /**
   * Get propulsion forces for physics engine
   */
  getPropulsionForces() {
    let totalForce = { x: 0, y: 0, z: 0 };
    let totalTorque = { x: 0, y: 0, z: 0 };
    
    this.engines.forEach(engine => {
      const status = engine.getStatus();
      
      if (status.isRunning) {
        // Forward thrust (assuming engines point in aircraft's forward direction)
        totalForce.z += status.thrust;
        
        // Calculate torque based on engine position and thrust
        const torqueScale = 0.001; // Scale factor for torque calculation
        totalTorque.x += status.thrust * engine.position.y * torqueScale; // Roll torque
        totalTorque.y += status.thrust * engine.position.x * torqueScale; // Pitch torque
        totalTorque.z += status.thrust * engine.position.y * torqueScale; // Yaw torque
      }
    });
    
    return {
      forces: totalForce,
      torques: totalTorque,
      individualThrusts: this.engines.map(e => e.currentState.thrust),
      engineStates: this.engines.map(e => e.getStatus())
    };
  }
  
  /**
   * Get total maximum thrust capacity
   */
  getTotalMaxThrust() {
    return this.engines.reduce((total, engine) => total + engine.maxThrust, 0);
  }
  
  /**
   * Get engine status summary
   */
  getStatus() {
    return {
      engines: this.engines.map(engine => engine.getStatus()),
      performance: { ...this.performanceMetrics },
      controls: { ...this.globalControls },
      environment: { ...this.environment },
      failureSimulation: { ...this.failureSimulation }
    };
  }
  
  /**
   * Debug logging
   */
  log(message, data) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 PropulsionManager: ${message}`, data || '');
    }
  }
}