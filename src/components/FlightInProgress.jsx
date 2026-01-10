import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
import FlightPanelModular from './FlightPanelModular';
import IntegratedControlPanel from './IntegratedControlPanel';

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
    setYaw,
    setFlaps,
    setAirBrakes,
    setGear
  } = useAircraftPhysics(aircraftConfig, true);

  // Control state for UI components
  const [throttleControl, setThrottleControl] = useState(47); // Default 47% as mentioned by user

  // Handle thrust control from ThrustManager
  const handleThrustControl = (engine, newThrottleValue) => {
    // Handle both delta values and direct throttle values
    let newThrottle;
    
    if (newThrottleValue < 1 && newThrottleValue > -1) {
      // This is a direct throttle value from physics engine (0-1)
      newThrottle = newThrottleValue * 100;
    } else {
      // This is a delta or direct percentage value
      newThrottle = Math.max(0, Math.min(100, newThrottleValue));
    }
    
    setThrottleControl(newThrottle);
    
    // Send to physics engine using hook functions (0-1)
    setThrottle(newThrottle);
  };

  // Handle surface control changes
  const handleFlapsControl = (position) => {
    console.log(`🛩️ Flaps control: ${position}`);
    setFlaps(position);
  };

  const handleGearControl = (position) => {
    console.log(`🔧 Gear control: ${position}`);
    setGear(position);
  };

  const handleAirBrakesControl = (position) => {
    console.log(`🛑 Air brakes control: ${position}`);
    setAirBrakes(position);
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
        
        {/* Integrated Control Panel at Bottom */}
        <div style={{ padding: '10px', overflow: 'hidden' }}>
          <IntegratedControlPanel
            controlThrust={handleThrustControl}
            controlFlaps={handleFlapsControl}
            controlGear={handleGearControl}
            controlAirBrakes={handleAirBrakesControl}
            flightState={flightData}
          />
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