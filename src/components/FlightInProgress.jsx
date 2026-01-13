import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
import FlightPanelModular from './FlightPanelModular';
import DebugPhysicsPanel from './DebugPhysicsPanel';
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
    setTrim,
    physicsService
  } = useAircraftPhysics(aircraftConfig, false, physicsModel);

  // Control state for UI components
  const [throttleControl, setThrottleControl] = useState(47);
  const [commandInput, setCommandInput] = useState('');
  const [sceneState, setSceneState] = useState(sceneManager.getState());
  const [narrative, setNarrative] = useState(null);
  const [activeFailures, setActiveFailures] = useState([]);
  const [phaseName, setPhaseName] = useState('');

  // Set up event listeners for narrative and failure updates
  useEffect(() => {
    // Subscribe to narrative updates
    const unsubscribeNarrative = eventBus.subscribe(eventBus.Types.NARRATIVE_UPDATE, (payload) => {
      setNarrative(payload);
    });
    
    // Subscribe to critical messages
    const unsubscribeCritical = eventBus.subscribe(eventBus.Types.CRITICAL_MESSAGE, (payload) => {
      // Flash effect or special handling for critical messages
      setNarrative(payload);
      // Could add audio alert here
    });
    
    // Subscribe to phase changes
    const unsubscribePhase = eventBus.subscribe(eventBus.Types.PHASE_CHANGED, (payload) => {
      setPhaseName(payload.phase.name);
      if (payload.phase.narrative) {
        setNarrative(payload.phase.narrative);
      }
    });
    
    // Subscribe to failure updates
    const unsubscribeFailure = eventBus.subscribe(eventBus.Types.FAILURE_OCCURRED, (payload) => {
      // Update active failures display
      const state = sceneManager.getState();
      setActiveFailures(state.activeFailures);
    });
    
    const unsubscribeFailureResolved = eventBus.subscribe(eventBus.Types.FAILURE_RESOLVED, (payload) => {
      // Update active failures display
      const state = sceneManager.getState();
      setActiveFailures(state.activeFailures);
    });
    
    // Subscribe to physics initialization events
    const unsubscribePhysicsInit = eventBus.subscribe(eventBus.Types.PHYSICS_INITIALIZE, (payload) => {
      // Apply initial conditions to physics service
      if (physicsService && typeof physicsService.setInitialConditions === 'function') {
        physicsService.setInitialConditions(payload.initialConditions);
      }
      
      // Update autopilot targets if provided
      if (physicsService && typeof physicsService.updateAutopilotTargets === 'function') {
        const targets = {};
        if (payload.targetAltitude !== undefined) {
          targets.altitude = payload.targetAltitude;
        }
        if (payload.targetSpeed !== undefined) {
          targets.speed = payload.targetSpeed;
        }
        if (Object.keys(targets).length > 0) {
          physicsService.updateAutopilotTargets(targets);
        }
      }
    });
    
    return () => {
      unsubscribeNarrative();
      unsubscribeCritical();
      unsubscribePhase();
      unsubscribeFailure();
      unsubscribeFailureResolved();
      unsubscribePhysicsInit();
    };
  }, [physicsService]);

  // Main update loop
  useEffect(() => {
    sceneManager.start();
    let animationId = null;
    let lastTime = performance.now();
    const loop = now => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const lastSceneState = sceneManager.getState();
      let physicsState = null;
      if (lastSceneState.physicsActive && isInitialized) {
        physicsState = updatePhysics(1 / 60, now);
      }
      sceneManager.update(dt, physicsState);
      const state = sceneManager.getState();
      setSceneState(state);
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isInitialized, updatePhysics]);

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
            {phaseName || 'Situation'}
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: narrative?.severity === 'critical' ? '#ef4444' : narrative?.severity === 'warning' ? '#f59e0b' : '#E5E7EB',
              marginBottom: '4px'
            }}
          >
            {narrative?.title || 'Awaiting flight instructions...'}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#D1D5DB',
              opacity: 0.9,
              marginBottom: '8px'
            }}
          >
            {narrative?.content || 'Prepare for takeoff.'}
          </div>
          
          {/* Active Failures Display */}
          {activeFailures.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                color: '#ef4444',
                marginBottom: '4px'
              }}>
                Active Failures ({activeFailures.length})
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                {activeFailures.map((failure, index) => (
                  <div key={index} style={{
                    fontSize: '10px',
                    color: failure.isCritical ? '#ef4444' : '#f59e0b',
                    padding: '4px 6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '3px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{failure.type.toUpperCase()} {failure.data.engineIndex !== undefined ? `ENGINE ${failure.data.engineIndex + 1}` : ''}</span>
                    <span>{failure.isCritical ? 'CRITICAL' : `${Math.round(failure.progress)}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        <DebugPhysicsPanel 
          debugPhysicsData={flightData?.debugPhysics} 
          thrust={flightData?.thrust}
          drag={flightData?.drag}
        />

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
                case 'trim':
                  setTrim(payload);
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
                window.location.reload();
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
