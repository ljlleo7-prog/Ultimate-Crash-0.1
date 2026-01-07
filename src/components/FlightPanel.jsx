import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FlightPanel.css';
import FlightPhysicsService from '../services/flightPhysicsService';

// Crash Warning Flash Component - MOVED OUTSIDE main component
const CrashWarningFlash = ({ flashActive, flashText }) => {
  if (!flashActive) return null;
  
  // Use consistent class for all warnings - same as SINKRATE
  const warningClass = 'crash-warning-flash';
  
  return React.createElement('div', {
    className: warningClass,
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'transparent', // Use CSS classes for colors
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontSize: '4rem',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '2px 2px 4px black',
      animation: 'flashPulse 0.5s infinite alternate'
    }
  }, flashText);
};

// Crash Panel Component - MOVED OUTSIDE main component
const CrashPanel = ({ showCrashPanel, resetFlight }) => {
  if (!showCrashPanel) return null;
  
  return React.createElement('div', {
    className: 'crash-panel',
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(139, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
      color: 'white',
      fontSize: '3rem',
      fontWeight: 'bold'
    }
  },
    React.createElement('h1', { style: { fontSize: '5rem', marginBottom: '2rem' } }, 'CRASHED'),
    React.createElement('div', { style: { fontSize: '2rem', marginBottom: '1rem' } }, 'Final Score: 0'),
    React.createElement('div', { style: { fontSize: '1.5rem', marginBottom: '2rem' } }, 'You failed to maintain control of the aircraft'),
    React.createElement('button', {
      onClick: resetFlight,
      style: {
        padding: '1rem 2rem',
        fontSize: '1.5rem',
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }
    }, 'Try Again')
  );
};

// Joystick Controller Component - MOVED OUTSIDE main component
const JoystickController = ({ controlPitch, controlRoll, flightState }) => {
  return React.createElement('div', { className: 'joystick-controller' },
    React.createElement('h4', null, 'Flight Controls'),
    React.createElement('div', { className: 'joystick-grid' },
      // Pitch controls
      React.createElement('button', {
        key: 'pitch-up',
        className: 'control-btn pitch-up',
        onClick: () => controlPitch(-1),
        disabled: flightState.autopilot || flightState.hasCrashed
      }, '↑ Pitch Up'),
      React.createElement('button', {
        key: 'pitch-down',
        className: 'control-btn pitch-down',
        onClick: () => controlPitch(1),
        disabled: flightState.autopilot || flightState.hasCrashed
      }, '↓ Pitch Down'),
      
      // Roll controls
      React.createElement('button', {
        key: 'roll-left',
        className: 'control-btn roll-left',
        onClick: () => controlRoll(-1),
        disabled: flightState.autopilot || flightState.hasCrashed
      }, '← Roll Left'),
      React.createElement('div', { className: 'joystick-center' }, '✈️'),
      React.createElement('button', {
        key: 'roll-right',
        className: 'control-btn roll-right',
        onClick: () => controlRoll(1),
        disabled: flightState.autopilot || flightState.hasCrashed
      }, '→ Roll Right')
    )
  );
};

// Thrust Manager Component - MOVED OUTSIDE main component
const ThrustManager = ({ controlThrust, flightState }) => {
  return React.createElement('div', { className: 'thrust-manager' },
    React.createElement('h4', null, 'Thrust Management'),
    React.createElement('div', { className: 'thrust-controls' },
      // Engine 1 controls
      React.createElement('div', { key: 'engine1', className: 'engine-control' },
        React.createElement('span', null, 'Engine 1:'),
        React.createElement('button', {
          className: 'thrust-btn decrease',
          onClick: () => controlThrust(0, -5),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '-'),
        React.createElement('span', { className: 'thrust-value' }, `${flightState.engineN1[0].toFixed(1)}%`),
        React.createElement('button', {
          className: 'thrust-btn increase',
          onClick: () => controlThrust(0, 5),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '+')
      ),
      
      // Engine 2 controls
      React.createElement('div', { key: 'engine2', className: 'engine-control' },
        React.createElement('span', null, 'Engine 2:'),
        React.createElement('button', {
          className: 'thrust-btn decrease',
          onClick: () => controlThrust(1, -5),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '-'),
        React.createElement('span', { className: 'thrust-value' }, `${flightState.engineN1[1].toFixed(1)}%`),
        React.createElement('button', {
          className: 'thrust-btn increase',
          onClick: () => controlThrust(1, 5),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '+')
      ),
      
      // Both engines together
      React.createElement('div', { key: 'both-engines', className: 'engine-control both' },
        React.createElement('span', null, 'Both Engines:'),
        React.createElement('button', {
          className: 'thrust-btn decrease',
          onClick: () => {
            controlThrust(0, -5);
            controlThrust(1, -5);
          },
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '-'),
        React.createElement('span', { className: 'thrust-value' }, `${((flightState.engineN1[0] + flightState.engineN1[1]) / 2).toFixed(1)}%`),
        React.createElement('button', {
          className: 'thrust-btn increase',
          onClick: () => {
            controlThrust(0, 5);
            controlThrust(1, 5);
          },
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '+')
      )
    )
  );
};

// Modern Autopilot Module Component
const ModernAutopilotModule = ({ flightState, setAutopilotTargets, toggleAutopilot }) => {
  const [targets, setTargets] = useState({
    ias: flightState.indicatedAirspeed,
    vs: flightState.verticalSpeed,
    altitude: flightState.altitude
  });

  const updateTarget = (type, value) => {
    const newTargets = { ...targets, [type]: value };
    setTargets(newTargets);
    if (setAutopilotTargets) {
      setAutopilotTargets(newTargets);
    }
  };

  return React.createElement('div', { className: 'modern-autopilot-module' },
    React.createElement('div', { className: 'autopilot-header' },
      React.createElement('button', {
        className: `ap-toggle-btn ${flightState.autopilot ? 'ap-engaged' : 'ap-disengaged'}`,
        onClick: toggleAutopilot,
        disabled: flightState.hasCrashed
      }, flightState.autopilot ? 'AP: ENGAGED' : 'AP: DISENGAGED'),
      React.createElement('span', { className: 'ap-status' }, flightState.autopilot ? 'ACTIVE' : 'STANDBY')
    ),
    
    React.createElement('div', { className: 'target-controls' },
      // IAS Target
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'IAS TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('ias', Math.max(150, targets.ias - 10)),
            disabled: !flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${targets.ias.toFixed(0)}`),
          React.createElement('button', {
            onClick: () => updateTarget('ias', Math.min(350, targets.ias + 10)),
            disabled: !flightState.autopilot
          }, '+')
        )
      ),
      
      // VS Target
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'VS TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('vs', Math.max(-4000, targets.vs - 500)),
            disabled: !flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${targets.vs >= 0 ? '+' : ''}${targets.vs.toFixed(0)}`),
          React.createElement('button', {
            onClick: () => updateTarget('vs', Math.min(4000, targets.vs + 500)),
            disabled: !flightState.autopilot
          }, '+')
        )
      ),
      
      // Altitude Target
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'ALT TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('altitude', Math.max(0, targets.altitude - 1000)),
            disabled: !flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${(targets.altitude / 1000).toFixed(1)}`),
          React.createElement('button', {
            onClick: () => updateTarget('altitude', Math.min(45000, targets.altitude + 1000)),
            disabled: !flightState.autopilot
          }, '+')
        )
      )
    )
  );
};

// Flight Pose Panel Component - Vertically compressed 3-column layout
const FlightPosePanel = ({ flightState }) => {
  // Calculate altitude in 20-foot increments
  const altitude20ft = Math.round(flightState.altitude / 20) * 20;
  
  return React.createElement('div', { className: 'civil-aviation-pose-panel' },
    React.createElement('h3', null, 'Primary Flight Display'),
    
    // Main display area with three sections - vertically compressed
    React.createElement('div', { className: 'pfd-compressed-3col' },
      
      // Left: IAS Vertical Bar (compressed)
      React.createElement('div', { className: 'ias-vertical-bar compressed' },
        React.createElement('div', { className: 'ias-label' }, 'IAS'),
        React.createElement('div', { className: 'vertical-scale-container' },
          // IAS scale from 0 to 400 knots
          React.createElement('div', { className: 'vertical-scale' },
            Array.from({ length: 5 }, (_, i) => {
              const speed = i * 100; // 0, 100, 200, 300, 400 knots
              const position = (speed / 400) * 100;
              return React.createElement('div', {
                key: `speed-${speed}`,
                className: 'scale-mark',
                style: { bottom: `${position}%` }
              },
                React.createElement('span', { className: 'scale-value' }, speed)
              );
            })
          ),
          // Current IAS indicator
          React.createElement('div', {
            className: 'current-indicator ias-indicator',
            style: { bottom: `${Math.min(100, (flightState.indicatedAirspeed / 400) * 100)}%` }
          },
            React.createElement('div', { className: 'indicator-line' }),
            React.createElement('span', { className: 'current-value' }, `${flightState.indicatedAirspeed.toFixed(0)}`)
          )
        )
      ),
      
      // Center: Artificial Horizon with Pitch/Roll (compressed)
      React.createElement('div', { className: 'artificial-horizon compressed' },
        React.createElement('div', { 
          className: 'horizon-container',
          style: { transform: `rotate(${flightState.roll}deg)` }
        },
          // Sky and ground - fixed pitch movement (opposite directions)
          React.createElement('div', { 
            className: 'sky',
            style: { transform: `translateY(${-flightState.pitch * 2}px)` }
          }),
          React.createElement('div', { 
            className: 'ground',
            style: { transform: `translateY(${flightState.pitch * 2}px)` }
          }),
          
          // Pitch ladder
          React.createElement('div', { className: 'pitch-ladder' },
            Array.from({ length: 5 }, (_, i) => {
              const pitch = (i - 2) * 10; // -20, -10, 0, 10, 20 degrees
              const position = pitch * 4;
              return React.createElement('div', {
                key: `pitch-${pitch}`,
                className: `pitch-line ${pitch === 0 ? 'center-line' : ''}`,
                style: { top: `calc(50% + ${position}px)` }
              },
                pitch !== 0 && React.createElement('span', { className: 'pitch-value' }, Math.abs(pitch))
              );
            })
          ),
          
          // Aircraft symbol
          React.createElement('div', { className: 'aircraft-symbol' },
            React.createElement('div', { className: 'wings' }),
            React.createElement('div', { className: 'fuselage' })
          ),
          
          // Debug text for pitch and roll values
          React.createElement('div', { 
            className: 'debug-values',
            style: { 
              position: 'absolute',
              top: '10px',
              left: '10px',
              color: '#ffff00',
              fontSize: '12px',
              fontFamily: 'Courier New, monospace',
              background: 'rgba(0,0,0,0.7)',
              padding: '5px',
              borderRadius: '3px',
              zIndex: 10
            }
          },
            React.createElement('div', null, `Pitch: ${flightState.pitch.toFixed(1)}°`),
            React.createElement('div', null, `Roll: ${flightState.roll.toFixed(1)}°`)
          )
        ),
        
        // Roll indicator
        React.createElement('div', { className: 'roll-indicator' },
          React.createElement('div', { 
            className: 'roll-triangle',
            style: { transform: `rotate(${-flightState.roll}deg)` }
          }),
          React.createElement('div', { className: 'roll-scale' },
            Array.from({ length: 5 }, (_, i) => {
              const roll = (i - 2) * 30; // -60, -30, 0, 30, 60 degrees
              return React.createElement('div', {
                key: `roll-${roll}`,
                className: `roll-mark ${roll === 0 ? 'center-mark' : ''}`,
                style: { transform: `rotate(${roll}deg)` }
              });
            })
          )
        )
      ),
      
      // Right: ALT Vertical Bar (compressed)
      React.createElement('div', { className: 'alt-vertical-bar compressed' },
        React.createElement('div', { className: 'alt-label' }, 'ALT'),
        React.createElement('div', { className: 'vertical-scale-container' },
          // ALT scale from 0 to 45000 feet in 5000ft increments
          React.createElement('div', { className: 'vertical-scale' },
            Array.from({ length: 5 }, (_, i) => {
              const altitude = i * 10000; // 0, 10000, 20000, 30000, 40000 feet
              const position = (altitude / 45000) * 100;
              return React.createElement('div', {
                key: `alt-${altitude}`,
                className: 'scale-mark',
                style: { bottom: `${position}%` }
              },
                React.createElement('span', { className: 'scale-value' }, altitude / 1000)
              );
            })
          ),
          // Current ALT indicator with 20ft accuracy
          React.createElement('div', {
            className: 'current-indicator alt-indicator',
            style: { bottom: `${Math.min(100, (flightState.altitude / 45000) * 100)}%` }
          },
            React.createElement('div', { className: 'indicator-line' }),
            React.createElement('span', { className: 'current-value' }, `${altitude20ft}`)
          )
        )
      )
    ),
    
    // Bottom: Additional information (compressed)
    React.createElement('div', { className: 'pfd-bottom-info compressed' },
      React.createElement('div', { className: 'vs-display' },
        React.createElement('span', { className: 'label' }, 'VS'),
        React.createElement('span', { 
          className: `value ${flightState.verticalSpeed > 0 ? 'climbing' : flightState.verticalSpeed < 0 ? 'descending' : 'level'}`
        }, `${flightState.verticalSpeed >= 0 ? '+' : ''}${flightState.verticalSpeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'heading-display' },
        React.createElement('span', { className: 'label' }, 'HDG'),
        React.createElement('span', { className: 'value' }, `${flightState.heading.toFixed(0)}°`)
      ),
      React.createElement('div', { className: 'gs-display' },
        React.createElement('span', { className: 'label' }, 'GS'),
        React.createElement('span', { className: 'value' }, `${flightState.groundSpeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'tas-display' },
        React.createElement('span', { className: 'label' }, 'TAS'),
        React.createElement('span', { className: 'value' }, `${flightState.trueAirspeed.toFixed(0)}`)
      )
    )
  );
};

// Navigation Panel Component
const NavigationPanel = ({ flightState }) => {
  return React.createElement('div', { className: 'navigation-panel' },
    React.createElement('h3', null, 'Navigation'),
    
    React.createElement('div', { className: 'nav-grid' },
      React.createElement('div', { className: 'nav-item' },
        React.createElement('span', { className: 'label' }, 'GS'),
        React.createElement('span', { className: 'value' }, `${flightState.groundSpeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'nav-item' },
        React.createElement('span', { className: 'label' }, 'TAS'),
        React.createElement('span', { className: 'value' }, `${flightState.trueAirspeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'nav-item' },
        React.createElement('span', { className: 'label' }, 'HDG'),
        React.createElement('span', { className: 'value' }, `${flightState.heading.toFixed(0)}°`)
      ),
      React.createElement('div', { className: 'nav-item' },
        React.createElement('span', { className: 'label' }, 'WPT'),
        React.createElement('span', { className: 'value' }, flightState.nextWaypoint)
      ),
      React.createElement('div', { className: 'nav-item large' },
        React.createElement('span', { className: 'label' }, 'DIST'),
        React.createElement('span', { className: 'value' }, `${flightState.distanceToWaypoint.toFixed(1)}nm`)
      ),
      React.createElement('div', { className: 'nav-item large' },
        React.createElement('span', { className: 'label' }, 'TIME'),
        React.createElement('span', { className: 'value' }, `${flightState.timeToWaypoint.toFixed(1)}min`)
      )
    )
  );
};

// Central Panel Component
const CentralPanel = ({ flightState }) => {
  // FIXED: Add safety check for undefined alarms
  const alarms = flightState.alarms || [];
  
  return React.createElement('div', { className: 'central-panel' },
    React.createElement('h3', null, 'Engine & Systems'),
    
    // Engine Parameters
    React.createElement('div', { className: 'engine-params' },
      React.createElement('div', { className: 'engine-group' },
        React.createElement('h4', null, 'Engine 1'),
        React.createElement('div', { className: 'engine-data' },
          React.createElement('span', null, `N1: ${flightState.engineN1[0].toFixed(1)}%`),
          React.createElement('span', null, `N2: ${flightState.engineN2[0].toFixed(1)}%`),
          React.createElement('span', null, `EGT: ${flightState.engineEGT[0].toFixed(0)}°`)
        )
      ),
      React.createElement('div', { className: 'engine-group' },
        React.createElement('h4', null, 'Engine 2'),
        React.createElement('div', { className: 'engine-data' },
          React.createElement('span', null, `N1: ${flightState.engineN1[1].toFixed(1)}%`),
          React.createElement('span', null, `N2: ${flightState.engineN2[1].toFixed(1)}%`),
          React.createElement('span', null, `EGT: ${flightState.engineEGT[1].toFixed(0)}°`)
        )
      )
    ),
    
    // Fuel
    React.createElement('div', { className: 'fuel-display' },
      React.createElement('span', { className: 'label' }, 'FUEL'),
      React.createElement('span', { className: 'value' }, `${flightState.fuel.toFixed(0)}kg`)
    ),
    
    // Error Log
    React.createElement('div', { className: 'error-log' },
      React.createElement('h4', null, 'System Status'),
      React.createElement('div', { className: 'status-items' },
        alarms.length > 0 
          ? alarms.map((alarm, index) => 
              React.createElement('div', { key: index, className: 'alarm-item' }, alarm)
            )
          : React.createElement('span', { className: 'status-ok' }, 'ALL SYSTEMS NORMAL')
      )
    )
  );
};

const FlightPanel = ({ flightData, onActionRequest, aircraftModel }) => {
  const [flightState, setFlightState] = useState({
    // Navigation
    heading: 270,
    trueAirspeed: 450,
    groundSpeed: 430,
    indicatedAirspeed: 280,
    radioFreq: 121.5,
    
    // Flight Pose
    pitch: 2.5,
    roll: 0.5,
    verticalSpeed: 1200,
    altitude: 35000,
    altimeter: 29.92,
    
    // Engine
    engineN1: [85.2, 85.1],
    engineN2: [95.3, 95.2],
    engineEGT: [650, 645],
    fuel: 8500,
    
    // Systems
    hydraulicPressure: 3000,
    circuitBreakers: {
      engine1: true,
      engine2: true,
      hydraulics: true,
      electrical: true,
      instruments: true
    },
    alarms: [], // FIXED: Initialize alarms as empty array
    
    // Autopilot
    autopilot: true,
    flightDirector: true,
    altitudeHold: true,
    headingHold: true,
    autopilotTargets: {
      ias: 280,
      vs: 1200,
      altitude: 35000
    },
    
    // Central Display
    flightPhase: 'CRUISE',
    nextWaypoint: 'WPT3',
    distanceToWaypoint: 125.4,
    timeToWaypoint: 18.2,
    
    // Crash Detection
    crashWarning: null,
    timeToCrash: null,
    hasCrashed: false
  });

  const flightPhysicsRef = useRef(new FlightPhysicsService(aircraftModel));
  const [flashActive, setFlashActive] = useState(false);
  const [flashText, setFlashText] = useState('');
  const [showCrashPanel, setShowCrashPanel] = useState(false);

  // Dynamic updates with realistic flight physics
  useEffect(() => {
    const interval = setInterval(() => {
      if (!flightState.hasCrashed) {
        // Call the physics service update method
        const updatedState = flightPhysicsRef.current.update();
        
        // Update the flight state with real physics data
        setFlightState(prevState => ({
          ...prevState,
          // Navigation
          heading: updatedState.heading,
          trueAirspeed: updatedState.trueAirspeed,
          groundSpeed: updatedState.groundSpeed,
          indicatedAirspeed: updatedState.indicatedAirspeed,
          
          // Flight Pose
          pitch: updatedState.pitch,
          roll: updatedState.roll,
          verticalSpeed: updatedState.verticalSpeed,
          altitude: updatedState.altitude,
          
          // Engine - separate parameters for each engine
          engineN1: updatedState.engineN1,
          engineN2: updatedState.engineN2,
          engineEGT: updatedState.engineEGT,
          fuel: updatedState.fuel,
          
          // Systems
          hydraulicPressure: updatedState.hydraulicPressure,
          
          // Autopilot
          autopilot: updatedState.autopilot,
          
          // Crash Detection
          crashWarning: updatedState.crashWarning,
          timeToCrash: updatedState.timeToCrash,
          hasCrashed: updatedState.hasCrashed,
          alarms: updatedState.alarms || []
        }));
        
        // Handle crash warnings
        if (updatedState.crashWarning) {
          setFlashActive(true);
          setFlashText(updatedState.crashWarning);
          
          if (updatedState.crashWarning === 'CRASHED') {
            setShowCrashPanel(true);
          }
        } else {
          setFlashActive(false);
        }
      }
    }, 100); // Update every 100ms for smooth physics
    
    return () => clearInterval(interval);
  }, [flightState.hasCrashed]);

  // Control functions
  const controlPitch = (amount) => {
    flightPhysicsRef.current.controlPitch(amount);
    // Immediately update flight state to reflect changes
    const updatedState = flightPhysicsRef.current.update();
    setFlightState(prevState => ({
      ...prevState,
      pitch: updatedState.pitch,
      roll: updatedState.roll
    }));
  };

  const controlRoll = (amount) => {
    flightPhysicsRef.current.controlRoll(amount);
    // Immediately update flight state to reflect changes
    const updatedState = flightPhysicsRef.current.update();
    setFlightState(prevState => ({
      ...prevState,
      pitch: updatedState.pitch,
      roll: updatedState.roll
    }));
  };

  const controlThrust = (engineIndex, amount) => {
    flightPhysicsRef.current.controlThrust(engineIndex, amount);
  };

  const toggleAutopilot = () => {
    flightPhysicsRef.current.toggleAutopilot();
    setFlightState(prevState => ({
      ...prevState,
      autopilot: !prevState.autopilot
    }));
  };

  const setAutopilotTargets = (targets) => {
    flightPhysicsRef.current.setAutopilotTargets(targets);
    setFlightState(prevState => ({
      ...prevState,
      autopilotTargets: targets
    }));
  };

  const resetFlight = () => {
    flightPhysicsRef.current.resetFlight();
    setShowCrashPanel(false);
    setFlashActive(false);
    setFlashText('');
    
    // Call parent's reset function to roll back to flight initiation
    if (onActionRequest) {
      onActionRequest('reset-to-initiation');
    }
  };

  // **FIXED: ADD TEST CONFIGURATION FUNCTION**
  const setTestConfiguration = (altitude, ias) => {
    flightPhysicsRef.current.setTestConfiguration(altitude, ias);
    setFlightState(prevState => ({
      ...prevState,
      altitude,
      indicatedAirspeed: ias,
      verticalSpeed: 0,
      pitch: altitude < 10000 ? 3 : 2,
      roll: 0,
      autopilot: false
    }));
    console.log(`Test configuration set: ${altitude}ft, ${ias}kts IAS`);
  };

  // Main render function
  return React.createElement('div', { className: 'modern-flight-panel' },
    // Crash warning flash
    React.createElement(CrashWarningFlash, { flashActive, flashText }),
    
    // Crash panel (if crashed)
    React.createElement(CrashPanel, { showCrashPanel, resetFlight }),
    
    // **FIXED: ADD TEST BUTTONS**
    React.createElement('div', { className: 'test-controls', style: { 
      position: 'absolute', 
      top: '10px', 
      right: '10px', 
      zIndex: 1000,
      display: 'flex',
      gap: '10px'
    } },
      React.createElement('button', {
        onClick: () => setTestConfiguration(3000, 190),
        style: {
          padding: '8px 12px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }
      }, 'Test: 3000ft, 190kts'),
      React.createElement('button', {
        onClick: () => setTestConfiguration(35000, 250),
        style: {
          padding: '8px 12px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }
      }, 'Test: 35000ft, 250kts')
    ),
    
    // Modern cockpit layout
    React.createElement('div', { className: 'modern-cockpit' },
      // Autopilot module on top
      React.createElement(ModernAutopilotModule, { 
        flightState, 
        setAutopilotTargets, 
        toggleAutopilot 
      }),
      
      // Three parallel panels
      React.createElement('div', { className: 'main-panels' },
        // Flight Pose Panel (Left)
        React.createElement(FlightPosePanel, { flightState }),
        
        // Navigation Panel (Middle)
        React.createElement(NavigationPanel, { flightState }),
        
        // Central Panel (Right)
        React.createElement(CentralPanel, { flightState })
      ),
      
      // Manual controls at bottom
      React.createElement('div', { className: 'manual-controls' },
        React.createElement(DraggableJoystick, { controlPitch, controlRoll, flightState }),
        React.createElement(ThrustManager, { controlThrust, flightState })
      )
    )
  );
};

export default FlightPanel;

// **FIXED: Continuous control application joystick implementation**
const DraggableJoystick = ({ controlPitch, controlRoll, flightState }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const joystickRef = useRef(null);
  const maxDistance = 50;
  const controlIntervalRef = useRef(null);

  // **FIX: Force proper centering on mount and resize**
  useEffect(() => {
    const centerJoystick = () => {
      if (joystickRef.current) {
        // Reset to true center (0,0)
        setPosition({ x: 0, y: 0 });
      }
    };

    centerJoystick();
    window.addEventListener('resize', centerJoystick);
    
    return () => {
      window.removeEventListener('resize', centerJoystick);
      // Cleanup control interval
      if (controlIntervalRef.current) {
        clearInterval(controlIntervalRef.current);
      }
    };
  }, []);

  // **FIX: Continuous control application while dragging**
  const applyContinuousControls = useCallback(() => {
    if (!isDragging || flightState.autopilot || flightState.hasCrashed) return;
    
    // Calculate control inputs based on current position
    const pitchInput = -(position.y / maxDistance) * 0.5; // Reduced sensitivity
    const rollInput = (position.x / maxDistance) * 0.5;
    
    // Apply controls continuously
    controlPitch(pitchInput);
    controlRoll(rollInput);
  }, [isDragging, position, controlPitch, controlRoll, flightState]);

  // Setup continuous control interval when dragging starts
  useEffect(() => {
    if (isDragging) {
      // Apply controls immediately
      applyContinuousControls();
      
      // Set up continuous control application (10 times per second)
      controlIntervalRef.current = setInterval(applyContinuousControls, 100);
      
      return () => {
        if (controlIntervalRef.current) {
          clearInterval(controlIntervalRef.current);
          controlIntervalRef.current = null;
        }
      };
    } else {
      // Stop continuous controls when not dragging
      if (controlIntervalRef.current) {
        clearInterval(controlIntervalRef.current);
        controlIntervalRef.current = null;
      }
    }
  }, [isDragging, applyContinuousControls]);

  // Simple mouse down handler
  const handleMouseDown = (e) => {
    if (flightState.autopilot || flightState.hasCrashed) return;
    e.preventDefault();
    setIsDragging(true);
  };

  // Mouse move handler with proper event binding
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    // **FIX: Use exact center calculation**
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    // Limit to max distance
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const limitedDistance = Math.min(distance, maxDistance);
    
    if (distance > 0) {
      const ratio = limitedDistance / distance;
      const newX = deltaX * ratio;
      const newY = deltaY * ratio;
      
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // **FIX: Smooth return to true center**
      setPosition({ x: 0, y: 0 });
      
      // Apply neutral controls when released
      controlPitch(0);
      controlRoll(0);
    }
  }, [isDragging, controlPitch, controlRoll]);

  // Setup and cleanup event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Simple, clean JSX return with proper centering
  return React.createElement('div', { className: 'draggable-joystick' },
    React.createElement('h4', null, 'Flight Controls'),
    React.createElement('div', { 
      ref: joystickRef,
      className: `joystick-base ${flightState.autopilot || flightState.hasCrashed ? 'disabled' : ''}`,
      onMouseDown: handleMouseDown,
      style: { 
        userSelect: 'none',
        cursor: flightState.autopilot || flightState.hasCrashed ? 'not-allowed' : 'grab'
      }
    },
      React.createElement('div', { 
        className: 'joystick-handle',
        style: { 
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }
      }, '✈️')
    ),
    React.createElement('div', { className: 'joystick-status' },
      React.createElement('p', null, `Position: ${position.x.toFixed(0)}, ${position.y.toFixed(0)}`),
      React.createElement('p', null, `Pitch: ${flightState.pitch.toFixed(1)}° | Roll: ${flightState.roll.toFixed(1)}°`),
      React.createElement('p', null, `Continuous: ${isDragging ? 'ACTIVE' : 'INACTIVE'}`)
    )
  );
};