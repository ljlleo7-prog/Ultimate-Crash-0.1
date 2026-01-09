// Control Synchronization Debug Tool
export class ControlDebugTool {
  constructor() {
    this.debugLog = [];
    this.isEnabled = true;
  }

  logControlChange(type, value, source = 'UI') {
    if (!this.isEnabled) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
      timestamp,
      type,
      value,
      source,
      stackTrace: this.getCallStack()
    };
    
    this.debugLog.push(entry);
    this.limitLog();
    
    console.log(`🎮 [CONTROL DEBUG] ${timestamp} | ${type}: ${value} | ${source}`, entry);
  }

  getCallStack() {
    const stack = new Error().stack.split('\n');
    return stack.slice(2, 5).map(line => line.trim()).join(' → ');
  }

  limitLog() {
    if (this.debugLog.length > 50) {
      this.debugLog = this.debugLog.slice(-50);
    }
  }

  getLog() {
    return this.debugLog;
  }

  clearLog() {
    this.debugLog = [];
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  // Test all control synchronizations
  testControls() {
    console.log('🧪 Testing Control Synchronization...');
    
    // Test data
    const testCases = [
      { type: 'throttle', value: 0.75 },
      { type: 'flaps', value: 'down' },
      { type: 'airBrakes', value: 'down' },
      { type: 'gear', value: 'down' }
    ];

    testCases.forEach(test => {
      this.logControlChange(test.type, test.value, 'TEST');
    });

    return this.debugLog;
  }

  // Verify control synchronization between UI and physics
  verifySynchronization(flightData, physicsState) {
    const issues = [];
    
    // Check throttle sync
    if (flightData.throttle && Math.abs(flightData.throttle / 100 - physicsState.throttle) > 0.05) {
      issues.push(`Throttle mismatch: UI=${flightData.throttle}% vs Physics=${physicsState.throttle * 100}%`);
    }

    // Check surface controls sync
    if (flightData.flapsPosition && flightData.flapsValue !== undefined) {
      const expectedFlaps = flightData.flapsPosition === 'down' ? 1 : 0;
      if (flightData.flapsValue !== expectedFlaps) {
        issues.push(`Flaps mismatch: Position=${flightData.flapsPosition} vs Value=${flightData.flapsValue}`);
      }
    }

    return issues;
  }

  // Generate control status report
  generateReport(flightData, physicsState) {
    const issues = this.verifySynchronization(flightData, physicsState);
    const report = {
      timestamp: new Date().toISOString(),
      controls: {
        throttle: {
          ui: flightData?.throttle,
          physics: physicsState?.throttle * 100,
          sync: Math.abs((flightData?.throttle || 0) - (physicsState?.throttle * 100 || 0)) < 5
        },
        flaps: {
          position: flightData?.flapsPosition,
          value: flightData?.flapsValue,
          physics: physicsState?.flaps,
          sync: flightData?.flapsValue === physicsState?.flaps
        },
        airBrakes: {
          position: flightData?.airBrakesPosition,
          value: flightData?.airBrakesValue,
          physics: physicsState?.airBrakes,
          sync: flightData?.airBrakesValue === physicsState?.airBrakes
        },
        gear: {
          position: flightData?.gearPosition,
          value: flightData?.gearValue,
          physics: physicsState?.gear,
          sync: flightData?.gearValue === physicsState?.gear
        }
      },
      issues,
      status: issues.length === 0 ? '✅ SYNCED' : '⚠️ ISSUES FOUND'
    };

    console.log('📊 CONTROL STATUS REPORT:', report);
    return report;
  }
}

// Export singleton instance
export const controlDebug = new ControlDebugTool();

// Helper functions for quick debugging
export const debugControlChange = (type, value, source = 'UI') => {
  controlDebug.logControlChange(type, value, source);
};

export const quickControlTest = () => {
  console.log('🚀 QUICK CONTROL TEST');
  controlDebug.testControls();
};

export const checkControlStatus = (flightData, physicsState) => {
  return controlDebug.generateReport(flightData, physicsState);
};