import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
import FlightPanelModular from './FlightPanelModular';
import IntegratedControlPanel from './IntegratedControlPanel';

const FlightInProgress = ({ 
  callsign, 
  aircraftModel, 
  difficulty, 
  selectedDeparture, 
  selectedArrival, 
  flightPlan, 
  airline, 
  pax, 
  payload, 
  fuelReserve, 
  cruiseHeight, 
  useRandomTime, 
  timeZulu, 
  useRandomSeason, 
  season, 
  handleResetFlight, 
  formatDistance, 
  formatFlightTime, 
  formatFuel, 
  weatherData, 
  failureType, 
  crewCount, 
  physicsModel = 'imaginary' 
}) => {


  const averagePassengerWeight = 90;
  const averageCrewWeight = 90;
  const totalPassengerWeight = (pax || 0) * averagePassengerWeight;
  const totalCrewWeight = (crewCount || 0) * averageCrewWeight;
  const additionalPayloadWeight = payload || 0;
  const totalPayloadWeight = totalPassengerWeight + totalCrewWeight + additionalPayloadWeight;
  const flightPlanFuelWeight = flightPlan && flightPlan.fuel && typeof flightPlan.fuel.totalFuel === 'number'
    ? flightPlan.fuel.totalFuel
    : 0;

  const aircraftConfig = {
    aircraftModel,
    payloadWeight: totalPayloadWeight,
    fuelWeight: flightPlanFuelWeight,
    cruiseHeight,
    windSpeedKts: weatherData && typeof weatherData.windSpeed === 'number'
      ? weatherData.windSpeed
      : 0
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
    setGear,
    physicsService
  } = useAircraftPhysics(aircraftConfig, true, physicsModel);

  // Control state for UI components
  const [throttleControl, setThrottleControl] = useState(47); // Default 47% as mentioned by user

  // ✅ CLEAN ARCHITECTURE: Single throttle control handler (reverted for responsiveness)
  const handleThrustControl = (engineIndex, throttleValue) => {
    console.log('🎯 FlightInProgress: Single throttle control received:', {
      engineIndex,
      throttleValue,
      percentage: (throttleValue * 100).toFixed(1) + '%'
    });
    
    const validatedThrottle = Math.max(-0.7, Math.min(1, throttleValue));
    
    // Update local display state
    setThrottleControl(validatedThrottle * 100);
    
    // Send directly to physics engine
    setThrottle(validatedThrottle);
    
    console.log('🚀 FlightInProgress: Single throttle sent to physics:', validatedThrottle);
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

      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.9)',
        color: 'lime',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 1000,
        border: '1px solid #333',
        minWidth: '220px'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '6px' }}>FORCES</div>
        <div>Thrust: {(((flightData && typeof flightData.thrust === 'number') ? flightData.thrust : 0) / 1000).toFixed(1)} kN</div>
        <div>Drag: {(((flightData && typeof flightData.drag === 'number') ? flightData.drag : 0) / 1000).toFixed(1)} kN</div>
      </div>

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
                // FlightPanelModular sends throttle in 0-1 range, pass directly to physics
                handleThrustControl(0, payload); // Engine 1, throttle in 0-1 range
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
              case 'toggle-autopilot': {
                if (physicsService && typeof physicsService.setAutopilot === 'function') {
                  const status = typeof physicsService.getAutopilotStatus === 'function'
                    ? physicsService.getAutopilotStatus()
                    : null;
                  const engaged = status && typeof status.engaged === 'boolean' ? status.engaged : false;
                  physicsService.setAutopilot(!engaged);
                }
                console.log(`📡 FlightPanel Action: ${action}`);
                break;
              }
              case 'set-autopilot-targets': {
                if (physicsService && typeof physicsService.updateAutopilotTargets === 'function' && payload) {
                  const altitudeFt = typeof payload.altitude === 'number'
                    ? payload.altitude
                    : (flightData && typeof flightData.altitude === 'number' ? flightData.altitude : 0);
                  const iasKts = typeof payload.ias === 'number'
                    ? payload.ias
                    : (flightData && typeof flightData.indicatedAirspeed === 'number' ? flightData.indicatedAirspeed : 0);
                  const targets = {
                    altitude: altitudeFt / 3.28084,
                    speed: iasKts / 1.94384
                  };
                  physicsService.updateAutopilotTargets(targets);
                }
                console.log(`📡 FlightPanel Action: ${action} = ${JSON.stringify(payload)}`);
                break;
              }
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
