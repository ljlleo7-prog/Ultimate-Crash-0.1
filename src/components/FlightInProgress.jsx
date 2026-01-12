import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
import FlightPanelModular from './FlightPanelModular';
import IntegratedControlPanel from './IntegratedControlPanel';
import commandDatabase from '../commandDatabase.json';
import sceneManager from '../services/sceneManager.js';
import eventBus from '../services/eventBus.js';

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
  } = useAircraftPhysics(aircraftConfig, false, physicsModel);

  // Control state for UI components
  const [throttleControl, setThrottleControl] = useState(47);
  const [commandInput, setCommandInput] = useState('');
  const [sceneState, setSceneState] = useState(sceneManager.getState());

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

  const handleCommandSubmit = (event) => {
    event.preventDefault();
    const trimmed = commandInput.trim();
    if (!trimmed) {
      return;
    }
    console.log('🧭 COMMAND INPUT:', trimmed);
    eventBus.publish('command.input', {
      raw: trimmed,
      sceneId: sceneState.sceneId,
      scenarioId: sceneState.scenarioId
    });
    setCommandInput('');
  };




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

  useEffect(() => {
    sceneManager.start();
    let animationId = null;
    let lastTime = performance.now();
    const loop = now => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      sceneManager.update(dt);
      const state = sceneManager.getState();
      setSceneState(state);
      if (state.physicsActive && isInitialized) {
        updatePhysics(1 / 60, now);
      }
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isInitialized, updatePhysics]);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: '#0a0a0a',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.4)',
          background: 'linear-gradient(to right, rgba(15,23,42,0.95), rgba(30,64,175,0.85))',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          zIndex: 10
        }}
      >
        <div style={{ flex: 2, minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#9CA3AF',
              marginBottom: '4px'
            }}
          >
            Situation
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#E5E7EB',
              marginBottom: '4px'
            }}
          >
            Placeholder: unfolding in-flight emergency narrative goes here.
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#D1D5DB',
              opacity: 0.9
            }}
          >
            Placeholder: concise description of the current failure, risks, and time pressure.
          </div>
        </div>
        <form
          onSubmit={handleCommandSubmit}
          style={{
            flex: 1.3,
            minWidth: '260px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <label
            style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#9CA3AF'
            }}
          >
            Captain command
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={commandInput}
              onChange={(event) => setCommandInput(event.target.value)}
              placeholder="Placeholder: type your decision or cockpit command"
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(148,163,184,0.6)',
                background: 'rgba(15,23,42,0.9)',
                color: '#E5E7EB',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #DC2626, #F97316)',
                color: 'white',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ➤
            </button>
          </div>
          <div
            style={{
              marginTop: '6px',
              fontSize: '11px',
              color: '#9CA3AF'
            }}
          >
            Placeholder: commands are logged only for now, not yet linked to systems.
          </div>
          {commandInput.trim().length > 0 && (
            <div
              style={{
                marginTop: '6px',
                borderRadius: '6px',
                border: '1px solid rgba(148,163,184,0.4)',
                background: 'rgba(15,23,42,0.9)',
                maxHeight: '140px',
                overflowY: 'auto'
              }}
            >
              {commandDatabase
                .filter((template) => {
                  const value = commandInput.trim().toLowerCase();
                  const abbr = template.abbr.toLowerCase();
                  const full = template.template.toLowerCase();
                  return abbr.startsWith(value) || full.startsWith(value);
                })
                .map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setCommandInput(template.template)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#E5E7EB',
                      fontSize: '11px',
                      borderBottom: '1px solid rgba(31,41,55,0.8)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, color: '#BFDBFE' }}>{template.abbr}</span>
                      <span style={{ color: '#9CA3AF' }}>{template.template}</span>
                    </div>
                    <div style={{ color: '#9CA3AF', fontSize: '10px' }}>{template.description}</div>
                  </button>
                ))}
            </div>
          )}
        </form>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
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

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <FlightPanelModular
            flightData={flightData}
            onActionRequest={(action, payload) => {
              const payloadStr = typeof payload === 'number' ? payload.toFixed(5) : JSON.stringify(payload);
              console.log(`📡 UI Action: ${action} = ${payloadStr}`);

              switch (action) {
                case 'throttle':
                  handleThrustControl(0, payload);
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
                  setPitch(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'roll':
                  setRoll(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'yaw':
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
      </div>

      {isCrashed && (
        <div className="end-scene-overlay">
          <div className="end-scene-content">
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>Flight Ended</div>
            <div style={{ marginBottom: '20px', maxWidth: '420px' }}>
              Placeholder: post-incident summary and narrative debrief will appear here.
            </div>
            <button
              onClick={() => {
                resetAircraft();
                handleResetFlight();
              }}
              style={{
                background: 'linear-gradient(135deg, #DC2626, #F97316)',
                color: 'white',
                border: 'none',
                padding: '12px 25px',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Return to Initialization
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightInProgress;
