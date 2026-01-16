import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
import { updateWeather } from '../services/weatherService';
import weatherConfig from '../config/weatherConfig.json';
import FlightPanelModular from './FlightPanelModular';
import DebugPhysicsPanel from './DebugPhysicsPanel';
import commandDatabase from '../commandDatabase.json';
import sceneManager from '../services/sceneManager.js';
import eventBus from '../services/eventBus.js';
import { getRunwayHeading } from '../utils/routeGenerator';

const FlightInProgress = ({ 
  callsign, 
  aircraftModel, 
  difficulty, 
  selectedDeparture, 
  selectedArrival, 
  initialDeparture, // New prop
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
  setWeatherData, 
  failureType, 
  crewCount, 
  physicsModel = 'realistic',
  routeDetails
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

  // Calculate initial heading from runway
  const runwayName = (routeDetails?.departureRunway) || (flightPlan?.departure?.runways?.[0]?.name) || '36L';
  const isEastward = selectedArrival && selectedDeparture ? selectedArrival.longitude > selectedDeparture.longitude : null;
  const runwayHeadingDeg = getRunwayHeading(runwayName, isEastward);
  const runwayHeadingRad = runwayHeadingDeg * Math.PI / 180;

  const aircraftConfig = {
    aircraftModel,
    payloadWeight: totalPayloadWeight,
    fuelWeight: flightPlanFuelWeight,
    cruiseHeight,
    windSpeedKts: weatherData && typeof weatherData.windSpeed === 'number'
      ? weatherData.windSpeed
      : 0,
    // Fallback to KSFO if latitude/longitude are missing (prevents 0,0 initialization)
    initialLatitude: initialDeparture?.latitude || 37.6188,
    initialLongitude: initialDeparture?.longitude || -122.3750,
    // Pass heading in degrees, as useAircraftPhysics converts it to radians
    initialHeading: runwayHeadingDeg,
    flightPlan: (routeDetails?.waypoints || flightPlan?.waypoints || [])
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
  const [showDebugPhysics, setShowDebugPhysics] = useState(false);

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

  // Weather update effect
  useEffect(() => {
    if (!weatherData || !setWeatherData) return;

    const interval = setInterval(() => {
      setWeatherData(prevWeatherData => {
        const updated = updateWeather(prevWeatherData, weatherConfig.atisUpdateIntervalMinutes);
        // Optionally, publish weather updates to eventBus if other components need to react
        // eventBus.publish(eventBus.Types.WEATHER_UPDATE, updated);
        return updated;
      });
    }, weatherConfig.atisUpdateIntervalMinutes * 60 * 1000); // Convert minutes to milliseconds

    return () => clearInterval(interval);
  }, [weatherData, setWeatherData]);

  // Update scene manager with selected flight parameters
  useEffect(() => {
    if (selectedDeparture && selectedArrival) {
      console.log('✈️  FlightInProgress: Updating scene manager with flight parameters:', {
        callsign: callsign,
        departure: selectedDeparture.iata || selectedDeparture.icao,
        arrival: selectedArrival.iata || selectedArrival.icao,
        aircraftModel: aircraftModel,
        departureRunway: routeDetails?.departureRunway,
        landingRunway: routeDetails?.landingRunway,
        initialHeading: runwayHeadingDeg
      });
      
      sceneManager.updateScenario({
        callsign: callsign,
        departure: selectedDeparture.iata || selectedDeparture.icao,
        arrival: selectedArrival.iata || selectedArrival.icao,
        aircraftModel: aircraftModel,
        departureRunway: routeDetails?.departureRunway,
        landingRunway: routeDetails?.landingRunway,
        initialHeading: runwayHeadingDeg
      });
      
      console.log('✅ FlightInProgress: Scene manager updated successfully');
    }
  }, [callsign, selectedDeparture, selectedArrival, aircraftModel, routeDetails, runwayHeadingDeg]);

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
        {showDebugPhysics && (
          <DebugPhysicsPanel 
            debugPhysicsData={flightData?.debugPhysics} 
            thrust={flightData?.thrust}
            drag={flightData?.drag}
            waypoints={flightPlan?.waypoints || []}
          />
        )}

        <button
          onClick={() => setShowDebugPhysics(!showDebugPhysics)}
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            zIndex: 2000,
            background: 'rgba(30, 41, 59, 0.8)',
            color: showDebugPhysics ? '#38bdf8' : '#94a3b8',
            border: `1px solid ${showDebugPhysics ? '#38bdf8' : '#334155'}`,
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {showDebugPhysics ? 'HIDE DEBUG' : 'SHOW DEBUG'}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <FlightPanelModular
            flightData={flightData}
            selectedArrival={selectedArrival}
            flightPlan={flightPlan}
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
                case 'set-autopilot-mode': {
                  if (physicsService && typeof physicsService.setAutopilotMode === 'function') {
                    physicsService.setAutopilotMode(payload);
                  }
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                }
                case 'set-autopilot-targets': {
                  if (physicsService && typeof physicsService.updateAutopilotTargets === 'function' && payload) {
                    // Direct pass-through for RealisticAutopilotService (Imperial Units)
                    // ModernAutopilotModule sends: { ias, vs, altitude }
                    const targets = {
                      altitude: payload.altitude, // ft
                      speed: payload.ias,         // kts
                      vs: payload.vs              // ft/min
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
      
      {/* Debug Panel for LNAV/PID */}
      {flightData && (
        <div style={{
          position: 'absolute',
          top: '90px',
          right: '20px',
          background: 'rgba(10, 15, 30, 0.85)',
          color: '#4ade80',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '11px',
          borderRadius: '6px',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          zIndex: 100,
          pointerEvents: 'none',
          width: '220px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            borderBottom: '1px solid rgba(74, 222, 128, 0.3)',
            paddingBottom: '4px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>FLIGHT DATA & LNAV</span>
            <span>{flightData.derived?.heading.toFixed(0)}°</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <span style={{ color: '#9ca3af' }}>Lat:</span>
            <span>{flightData.position?.latitude?.toFixed(5)}</span>
            
            <span style={{ color: '#9ca3af' }}>Lon:</span>
            <span>{flightData.position?.longitude?.toFixed(5)}</span>
            
            <span style={{ color: '#9ca3af' }}>Alt:</span>
            <span>{flightData.derived?.altitude_ft?.toFixed(0)} ft</span>
            
            <span style={{ color: '#9ca3af' }}>Spd:</span>
            <span>{flightData.derived?.airspeed?.toFixed(0)} kts</span>
          </div>

          <div style={{ margin: '8px 0', borderTop: '1px solid rgba(74, 222, 128, 0.2)' }}></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px 8px' }}>
            <span style={{ color: '#9ca3af' }}>Mode:</span>
            <span style={{ fontWeight: 'bold' }}>{flightData.autopilotDebug?.mode || 'OFF'}</span>
            
            <span style={{ color: '#9ca3af' }}>Engaged:</span>
            <span style={{ color: flightData.autopilotDebug?.engaged ? '#4ade80' : '#ef4444' }}>
              {flightData.autopilotDebug?.engaged ? 'ACTIVE' : 'OFF'}
            </span>
            
            <span style={{ color: '#9ca3af' }}>Target Hdg:</span>
            <span>{flightData.autopilotTargets?.heading?.toFixed(1) || '---'}°</span>
            
            <span style={{ color: '#9ca3af' }}>Hdg Error:</span>
            <span style={{ color: Math.abs(flightData.autopilotDebug?.headingError) > 5 ? '#f59e0b' : '#4ade80' }}>
              {flightData.autopilotDebug?.headingError?.toFixed(2) || '0.00'}°
            </span>
            
            <span style={{ color: '#9ca3af' }}>Tgt Roll:</span>
            <span>{flightData.autopilotDebug?.targetRoll?.toFixed(1) || '0.0'}°</span>
            
            <span style={{ color: '#9ca3af' }}>Act Roll:</span>
            <span>{(flightData.orientation?.phi * 180 / Math.PI).toFixed(1)}°</span>
          </div>
          
          <div style={{ margin: '8px 0', borderTop: '1px solid rgba(74, 222, 128, 0.2)' }}></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#9ca3af' }}>Next WP:</span>
               <span>
                 {(routeDetails?.waypoints || flightPlan?.waypoints || [])[flightData.currentWaypointIndex]?.name || 
                  (routeDetails?.waypoints || flightPlan?.waypoints || [])[flightData.currentWaypointIndex]?.id || 
                  `IDX ${flightData.currentWaypointIndex}`}
               </span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#9ca3af' }}>WP Index:</span>
               <span>{flightData.currentWaypointIndex} / {(routeDetails?.waypoints || flightPlan?.waypoints || []).length}</span>
             </div>
          </div>
        </div>
      )}

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
