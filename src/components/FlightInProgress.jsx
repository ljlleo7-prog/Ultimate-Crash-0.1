import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
// Import ThrustManager from components directory
import ThrustManager from './ThrustManager.jsx';
// Import SurfaceControls from components directory  
import SurfaceControls from './SurfaceControls.jsx';
import { controlDebug, debugControlChange, quickControlTest, checkControlStatus } from '../utils/ControlDebugTool.js';
import FlightPanelModular from './FlightPanelModular';
import FlightPhysicsDashboard from './FlightPhysicsDashboard.jsx';

const FlightInProgress = () => {
  // Initialize control debug tool and auto-start physics
  useEffect(() => {
    console.log('🎮 FlightInProgress: Initializing control synchronization');
    controlDebug.enable();
    
    // Test control system after initialization
    setTimeout(() => {
      console.log('🔧 Running initial control test...');
      quickControlTest();
    }, 2000);
  }, []);

  // Aircraft configuration for physics initialization
  const aircraftConfig = {
    model: 'Boeing 737-800', // Boeing 737-800 as default aircraft
    mass: 79000, // kg
    fuelWeight: 7000, // kg
    payloadWeight: 8000 // kg
  };

  const {
    flightData,
    physicsState,
    isInitialized,
    error,
    isCrashed,
    resetAircraft,
    updatePhysics,
    setThrottle,
    setPitch,
    setRoll,
    setYaw
  } = useAircraftPhysics(aircraftConfig, true);

  // Control state for UI components
  const [throttleControl, setThrottleControl] = useState(47); // Default 47% as mentioned by user
  const [controlSyncStatus, setControlSyncStatus] = useState('INITIALIZING');

  // Handle thrust control from ThrustManager
  const handleThrustControl = (engine, delta) => {
    const newThrottle = Math.max(0, Math.min(100, throttleControl + delta));
    setThrottleControl(newThrottle);
    
    // Log control change
    debugControlChange('throttle', newThrottle, `THRUST_MANAGER_${engine}`);
    
    // Send to physics engine using hook functions
    setThrottle(newThrottle);
    
    // Debug log
    console.log(`🎮 Thrust Control: ${throttleControl}% → ${newThrottle}% (Engine ${engine})`);
  };

  // Handle surface control changes
  const handleFlapsControl = (position) => {
    debugControlChange('flaps', position, 'SURFACE_CONTROLS');
    // Surface controls are handled differently - they're aircraft configuration
    // For now, we'll log the change but not directly set via physics hook
    console.log(`🛩️ Flaps control: ${position}`);
  };

  const handleGearControl = (position) => {
    debugControlChange('gear', position, 'SURFACE_CONTROLS');
    // Landing gear is handled differently - it's an aircraft configuration
    console.log(`🔧 Gear control: ${position}`);
  };

  const handleAirBrakesControl = (position) => {
    debugControlChange('airBrakes', position, 'SURFACE_CONTROLS');
    // Air brakes are handled differently - they're aircraft configuration  
    console.log(`🛑 Air brakes control: ${position}`);
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

  // Auto-start logic means we don't need a start button anymore
  // Show loading state briefly while physics initializes
  if (!isInitialized && !error) {
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
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>✈️ Starting Flight Simulation...</div>
          <div style={{ color: '#4ade80' }}>Initializing physics engine...</div>
        </div>
      </div>
    );
  }

  // Show error state if initialization fails
  if (error) {
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
          <div style={{ fontSize: '24px', marginBottom: '20px', color: '#ef4444' }}>❌ Initialization Error</div>
          <div style={{ marginBottom: '20px' }}>{error}</div>
          <button 
            onClick={() => window.location.reload()}
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
            Reload Page
          </button>
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
      overflow: 'hidden',
      display: 'flex'
    }}>
      {/* Left Side - Control Debug Panel */}
      {debugRender()}
      
      {/* Center - Main Flight Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FlightPanelModular
          flightData={flightData}
          onActionRequest={(action, payload) => {
            console.log(`📡 UI Action: ${action}`, payload);
            debugControlChange(action, payload, 'FLIGHT_PANEL');
            
            // Handle specific actions
            switch (action) {
              case 'throttle':
                handleThrustControl(0, payload); // Engine 1
                console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                break;
              case 'flaps':
                handleFlapsControl(payload);
                console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                break;
              case 'airBrakes':
                handleAirBrakesControl(payload);
                console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                break;
              case 'gear':
                handleGearControl(payload);
                console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                break;
              case 'pitch':
                // Handle pitch control from flight panel
                setPitch(payload);
                console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                break;
              case 'roll':
                // Handle roll control from flight panel
                setRoll(payload);
                console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                break;
              case 'yaw':
                // Handle yaw control from flight panel
                setYaw(payload);
                console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                break;
              default:
                console.log('Unhandled action:', action);
            }
          }}
        />
        
        {/* Control Panels at Bottom */}
        <div style={{ display: 'flex', gap: '10px', padding: '10px', background: 'rgba(0,0,0,0.8)', overflow: 'hidden' }}>
          {/* Thrust Manager - Lever Style */}
          <ThrustManager
            thrust={throttleControl}
            onThrustChange={handleThrustControl}
            disabled={false}
            flightState={flightData}
          />
          
          {/* REMOVE SurfaceControls - Duplicate controls already in FlightPanelModular */}
        </div>
      </div>
      
      {/* Right Side - Physics Debug Dashboard */}
      <div style={{ 
        width: '380px', 
        background: 'rgba(0,0,0,0.9)', 
        borderLeft: '2px solid #333',
        overflowY: 'auto', /* Allow vertical scrolling */
        overflowX: 'hidden' /* Hide horizontal scroll */
      }}>
        <FlightPhysicsDashboard
          flightData={flightData}
          physicsState={physicsState}
          debugData={{
            forces: {
              lift: flightData.lift,
              drag: flightData.drag,
              thrust: flightData.thrust,
              weight: flightData.weight
            },
            accelerations: {
              horizontal: flightData.accelerationX,
              vertical: flightData.accelerationY
            }
          }}
          isInitialized={isInitialized}
          aircraftConfig={aircraftConfig}
        />
      </div>
      
      {/* Crash/Reset Handling - Disabled for now */}
      {/* 
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
            onClick={resetAircraft}
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
      */}
    </div>
  );
};

export default FlightInProgress;