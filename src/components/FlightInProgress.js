import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
import ThrustManager from './ThrustManager';
import FlightPanelModular from './FlightPanelModular';
import SurfaceControls from './SurfaceControls';
import { controlDebug, debugControlChange, quickControlTest, checkControlStatus } from '../utils/ControlDebugTool';

const FlightInProgress = () => {
  // Initialize control debug tool
  useEffect(() => {
    console.log('🎮 FlightInProgress: Initializing control synchronization');
    controlDebug.enable();
    
    // Test control system on mount
    setTimeout(() => {
      console.log('🔧 Running initial control test...');
      quickControlTest();
    }, 1000);
  }, []);

  const {
    flightData,
    physicsState,
    isInitialized,
    error,
    isCrashed,
    resetToInitiation,
    initializePhysics
  } = useAircraftPhysics();

  // Control state for UI components
  const [throttleControl, setThrottleControl] = useState(47); // Default 47% as mentioned by user
  const [controlSyncStatus, setControlSyncStatus] = useState('INITIALIZING');

  // Handle thrust control from ThrustManager
  const handleThrustControl = (engine, delta) => {
    const newThrottle = Math.max(0, Math.min(100, throttleControl + delta));
    setThrottleControl(newThrottle);
    
    // Log control change
    debugControlChange('throttle', newThrottle, `THRUST_MANAGER_${engine}`);
    
    // Send to physics via control system
    if (window.flightControlAPI) {
      window.flightControlAPI.throttle = newThrottle / 100;
    }
  };

  // Handle surface control changes
  const handleFlapsControl = (position) => {
    debugControlChange('flaps', position, 'SURFACE_CONTROLS');
    if (window.flightControlAPI) {
      window.flightControlAPI.flaps = position === 'down' ? 1 : 0;
    }
  };

  const handleGearControl = (position) => {
    debugControlChange('gear', position, 'SURFACE_CONTROLS');
    if (window.flightControlAPI) {
      window.flightControlAPI.gear = position === 'down';
    }
  };

  const handleAirBrakesControl = (position) => {
    debugControlChange('airBrakes', position, 'SURFACE_CONTROLS');
    if (window.flightControlAPI) {
      window.flightControlAPI.airBrakes = position === 'down' ? 1 : 0;
    }
  };

  // Monitor control synchronization status
  useEffect(() => {
    if (flightData && physicsState) {
      const status = checkControlStatus(flightData, physicsState);
      setControlSyncStatus(status.status);
      
      // Log significant sync issues
      if (status.issues.length > 0) {
        console.warn('⚠️ Control Sync Issues:', status.issues);
      }
    }
  }, [flightData, physicsState]);

  // Debug render method
  const debugRender = () => {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.9)',
        color: 'lime',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 1000,
        border: '1px solid #333',
        maxWidth: '300px'
      }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>🎮 CONTROL STATUS</div>
        <div>Sync: {controlSyncStatus}</div>
        <div>Throttle: {throttleControl}% → {flightData?.throttle?.toFixed(1)}%</div>
        <div>Flaps: {flightData?.flapsPosition} ({flightData?.flapsValue})</div>
        <div>Gear: {flightData?.gearPosition} ({flightData?.gearValue})</div>
        <div>Brakes: {flightData?.airBrakesPosition} ({flightData?.airBrakesValue})</div>
        <div style={{ marginTop: '5px' }}>
          <button 
            onClick={() => quickControlTest()}
            style={{
              background: '#333',
              color: 'lime',
              border: '1px solid #555',
              padding: '2px 6px',
              fontSize: '10px',
              cursor: 'pointer',
              marginRight: '2px'
            }}
          >
            TEST
          </button>
          <button 
            onClick={() => controlDebug.clearLog()}
            style={{
              background: '#333',
              color: 'lime',
              border: '1px solid #555',
              padding: '2px 6px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            CLEAR
          </button>
        </div>
      </div>
    );
  };

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>✈️ Flight Initialization</div>
          <button 
            onClick={initializePhysics}
            style={{
              background: '#1e40af',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Start Flight Simulation
          </button>
          {error && (
            <div style={{ color: 'red', marginTop: '10px' }}>
              Error: {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: '#0a0a0a',
      overflow: 'hidden'
    }}>
      {/* Control Debug Panel */}
      {debugRender()}
      
      {/* Main Flight Panel */}
      <FlightPanelModular
        flightData={flightData}
        onActionRequest={(action, payload) => {
          console.log(`📡 UI Action: ${action}`, payload);
          debugControlChange(action, payload, 'FLIGHT_PANEL');
          
          // Handle specific actions
          switch (action) {
            case 'throttle':
              handleThrustControl(0, payload); // Engine 1
              break;
            case 'flaps':
              handleFlapsControl(payload);
              break;
            case 'airBrakes':
              handleAirBrakesControl(payload);
              break;
            case 'gear':
              handleGearControl(payload);
              break;
            default:
              console.log('Unhandled action:', action);
          }
        }}
      />
      
      {/* Thrust Manager - Lever Style */}
      <ThrustManager
        thrust={throttleControl}
        onThrustChange={handleThrustControl}
        disabled={isCrashed}
        flightState={flightData}
      />
      
      {/* Surface Controls - Lever Style with Physics Sync */}
      <SurfaceControls
        controlFlaps={handleFlapsControl}
        controlGear={handleGearControl}
        controlAirBrakes={handleAirBrakesControl}
        flightState={flightData}
      />
      
      {/* Crash/Reset Handling */}
      {isCrashed && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(220, 38, 38, 0.95)',
          color: 'white',
          padding: '30px',
          borderRadius: '15px',
          textAlign: 'center',
          zIndex: 1000,
          border: '3px solid #dc2626'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '15px' }}>💥 Flight Ended</div>
          <div style={{ marginBottom: '20px' }}>
            Aircraft has crashed. Reset to start a new flight?
          </div>
          <button
            onClick={resetToInitiation}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '12px 25px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Reset Flight
          </button>
        </div>
      )}
    </div>
  );
};

export default FlightInProgress;