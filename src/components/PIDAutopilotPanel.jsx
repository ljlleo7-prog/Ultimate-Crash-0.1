import React, { useState, useEffect } from 'react';

const PIDAutopilotPanel = ({ physicsService, onAutopilotToggle }) => {
  const [autopilotStatus, setAutopilotStatus] = useState({
    engaged: false,
    targets: { altitude: 35000, speed: 450, heading: 0 },
    controllers: {}
  });
  
  const [targetInputs, setTargetInputs] = useState({
    altitude: 35000,
    speed: 450,
    heading: 0
  });
  
  const [pidTuning, setPidTuning] = useState({
    altitude: { kp: 0.0008, ki: 0.0001, kd: 0.002 },
    speed: { kp: 0.5, ki: 0.05, kd: 0.1 },
    heading: { kp: 0.8, ki: 0.1, kd: 0.3 }
  });
  
  // Update status from physics service
  useEffect(() => {
    if (physicsService) {
      const status = physicsService.getAutopilotStatus();
      setAutopilotStatus(status);
      
      // Update input displays
      setTargetInputs({
        altitude: Math.round(-status.targets.altitude * 3.28084), // Convert to feet
        speed: Math.round(status.targets.speed * 1.94384), // Convert to knots
        heading: Math.round(status.targets.heading * 180/Math.PI) // Convert to degrees
      });
    }
  }, [physicsService]);
  
  // Update physics service targets
  const updateTargets = () => {
    if (!physicsService) return;
    
    // Convert inputs back to physics units
    const targets = {
      altitude: -targetInputs.altitude / 3.28084, // Convert feet to meters (negative)
      speed: targetInputs.speed / 1.94384, // Convert knots to m/s
      heading: targetInputs.heading * Math.PI/180 // Convert degrees to radians
    };
    
    physicsService.update({ targets });
  };
  
  // Toggle autopilot engagement
  const toggleAutopilot = () => {
    if (!physicsService) return;
    
    const newState = !autopilotStatus.engaged;
    physicsService.setAutopilot(newState);
    onAutopilotToggle?.(newState);
  };
  
  // Tune PID parameters
  const tunePID = (controller, parameter, value) => {
    if (!physicsService) return;
    
    const numValue = parseFloat(value);
    const current = pidTuning[controller][parameter];
    const newParams = { ...pidTuning };
    newParams[controller][parameter] = numValue;
    setPidTuning(newParams);
    
    // Update physics service
    physicsService.tunePID(controller, 
      newParams[controller].kp,
      newParams[controller].ki,
      newParams[controller].kd
    );
  };
  
  // Reset PID controllers
  const resetPID = () => {
    if (!physicsService) return;
    
    // Reset to default values
    physicsService.tunePID('altitude', 0.0008, 0.0001, 0.002);
    physicsService.tunePID('speed', 0.5, 0.05, 0.1);
    physicsService.tunePID('heading', 0.8, 0.1, 0.3);
    
    setPidTuning({
      altitude: { kp: 0.0008, ki: 0.0001, kd: 0.002 },
      speed: { kp: 0.5, ki: 0.05, kd: 0.1 },
      heading: { kp: 0.8, ki: 0.1, kd: 0.3 }
    });
  };
  
  if (!physicsService) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-white">
        <div className="text-center">Loading autopilot system...</div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🚁 PID Autopilot Control</h2>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${autopilotStatus.engaged ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-sm">{autopilotStatus.engaged ? 'ENGAGED' : 'DISENGAGED'}</span>
        </div>
      </div>
      
      {/* Autopilot Toggle */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Autopilot Status</h3>
            <p className="text-sm text-gray-300">Maintain altitude and speed automatically</p>
          </div>
          <button
            onClick={toggleAutopilot}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              autopilotStatus.engaged
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {autopilotStatus.engaged ? 'DISENGAGE' : 'ENGAGE'}
          </button>
        </div>
      </div>
      
      {/* Target Controls */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="font-semibold mb-4">Flight Targets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Altitude (ft)</label>
            <input
              type="number"
              value={targetInputs.altitude}
              onChange={(e) => setTargetInputs({...targetInputs, altitude: parseInt(e.target.value)})}
              onBlur={updateTargets}
              className="w-full bg-gray-600 rounded px-3 py-2 text-white"
              min="0"
              max="50000"
              step="100"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Speed (KTS)</label>
            <input
              type="number"
              value={targetInputs.speed}
              onChange={(e) => setTargetInputs({...targetInputs, speed: parseInt(e.target.value)})}
              onBlur={updateTargets}
              className="w-full bg-gray-600 rounded px-3 py-2 text-white"
              min="100"
              max="600"
              step="10"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Heading (°)</label>
            <input
              type="number"
              value={targetInputs.heading}
              onChange={(e) => setTargetInputs({...targetInputs, heading: parseInt(e.target.value)})}
              onBlur={updateTargets}
              className="w-full bg-gray-600 rounded px-3 py-2 text-white"
              min="0"
              max="359"
              step="1"
            />
          </div>
        </div>
      </div>
      
      {/* PID Tuning */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">PID Controller Tuning</h3>
          <button
            onClick={resetPID}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          >
            Reset to Defaults
          </button>
        </div>
        
        <div className="space-y-4">
          {Object.entries(pidTuning).map(([controller, params]) => (
            <div key={controller} className="bg-gray-600 rounded p-3">
              <h4 className="font-medium mb-2 capitalize">{controller} Controller</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Kp</label>
                  <input
                    type="number"
                    value={params.kp}
                    onChange={(e) => tunePID(controller, 'kp', e.target.value)}
                    step="0.0001"
                    className="w-full bg-gray-500 rounded px-2 py-1 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Ki</label>
                  <input
                    type="number"
                    value={params.ki}
                    onChange={(e) => tunePID(controller, 'ki', e.target.value)}
                    step="0.0001"
                    className="w-full bg-gray-500 rounded px-2 py-1 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Kd</label>
                  <input
                    type="number"
                    value={params.kd}
                    onChange={(e) => tunePID(controller, 'kd', e.target.value)}
                    step="0.0001"
                    className="w-full bg-gray-500 rounded px-2 py-1 text-sm text-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Current Errors Display */}
      {autopilotStatus.engaged && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-4">Control Errors</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-600 rounded p-3">
              <div className="text-sm text-gray-300">Altitude Error</div>
              <div className="text-lg font-mono">
                {(autopilotStatus.targets.altitude - (-35000 * 3.28084)).toFixed(0)} ft
              </div>
            </div>
            <div className="bg-gray-600 rounded p-3">
              <div className="text-sm text-gray-300">Speed Error</div>
              <div className="text-lg font-mono">
                {(autopilotStatus.targets.speed * 1.94384 - 450).toFixed(1)} KTS
              </div>
            </div>
            <div className="bg-gray-600 rounded p-3">
              <div className="text-sm text-gray-300">Heading Error</div>
              <div className="text-lg font-mono">
                {(autopilotStatus.targets.heading * 180/Math.PI - 0).toFixed(1)}°
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PIDAutopilotPanel;