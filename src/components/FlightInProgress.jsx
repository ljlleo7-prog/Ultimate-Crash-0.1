import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
// Import ThrustManager from components directory
import ThrustManager from './ThrustManager.jsx';
// Import SurfaceControls from components directory  
import SurfaceControls from './SurfaceControls.jsx';
import FlightPanelModular from './FlightPanelModular';

const FlightInProgress = () => {


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

  // Handle thrust control from ThrustManager
  const handleThrustControl = (engine, delta) => {
    const newThrottle = Math.max(0, Math.min(100, throttleControl + delta));
    setThrottleControl(newThrottle);
    
    // Send to physics engine using hook functions
    setThrottle(newThrottle);
  };

  // Handle surface control changes
  const handleFlapsControl = (position) => {
    // Surface controls are handled differently - they're aircraft configuration
    // For now, we'll log the change but not directly set via physics hook
    console.log(`🛩️ Flaps control: ${position}`);
  };

  const handleGearControl = (position) => {
    // Landing gear is handled differently - it's an aircraft configuration
    console.log(`🔧 Gear control: ${position}`);
  };

  const handleAirBrakesControl = (position) => {
    // Air brakes are handled differently - they're aircraft configuration  
    console.log(`🛑 Air brakes control: ${position}`);
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

      {/* Center - Main Flight Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FlightPanelModular
          flightData={flightData}
          onActionRequest={(action, payload) => {
            // Handle different payload types
            const payloadStr = typeof payload === 'number' ? payload.toFixed(5) : JSON.stringify(payload);
            console.log(`📡 UI Action: ${action} = ${payloadStr}`);
            
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
            controlThrust={handleThrustControl}
            flightState={flightData}
          />
          
          {/* REMOVE SurfaceControls - Duplicate controls already in FlightPanelModular */}
        </div>
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