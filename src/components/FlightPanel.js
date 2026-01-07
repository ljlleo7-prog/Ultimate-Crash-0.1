import React, { useState, useEffect, useRef } from 'react';
import './FlightPanel.css';
import FlightPhysicsService from '../services/flightPhysicsService';

const FlightPanel = ({ flightData, onActionRequest }) => {
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
    alarms: [],
    
    // Autopilot
    autopilot: true,
    flightDirector: true,
    altitudeHold: true,
    headingHold: true,
    
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

  const flightPhysicsRef = useRef(new FlightPhysicsService());
  const [flashActive, setFlashActive] = useState(false);
  const [flashText, setFlashText] = useState('');
  const [showCrashPanel, setShowCrashPanel] = useState(false);

  // Dynamic updates with realistic flight physics
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedState = flightPhysicsRef.current.update();
      setFlightState(updatedState);
      
      // Handle crash warnings and effects
      if (updatedState.crashWarning && !updatedState.hasCrashed) {
        setFlashText(updatedState.crashWarning);
        setFlashActive(true);
        
        // Flash effect duration
        setTimeout(() => setFlashActive(false), 2000);
      }
      
      // Handle actual crash
      if (updatedState.hasCrashed && !showCrashPanel) {
        setShowCrashPanel(true);
        setFlashText('CRASHED');
        setFlashActive(true);
      }
    }, 100); // Update every 100ms for smooth physics

    return () => clearInterval(interval);
  }, [showCrashPanel]);

  // Control functions
  const controlPitch = (amount) => {
    flightPhysicsRef.current.controlPitch(amount);
  };

  const controlRoll = (amount) => {
    flightPhysicsRef.current.controlRoll(amount);
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

  const resetFlight = () => {
    flightPhysicsRef.current.resetFlight();
    setShowCrashPanel(false);
    setFlashActive(false);
    setFlashText('');
  };

  // Crash Warning Flash Component
  const CrashWarningFlash = () => {
    if (!flashActive) return null;
    
    return React.createElement('div', {
      className: `crash-warning-flash ${flashText.toLowerCase().replace('!', '').replace(' ', '-')}`,
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
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

  // Crash Panel Component
  const CrashPanel = () => {
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

  // Joystick Controller Component
  const JoystickController = () => {
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
        React.createElement('button', {
          key: 'roll-right',
          className: 'control-btn roll-right',
          onClick: () => controlRoll(1),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '→ Roll Right'),
        
        // Center indicator
        React.createElement('div', { key: 'center', className: 'joystick-center' }, '✈')
      )
    );
  };

  // Thrust Manager Component
  const ThrustManager = () => {
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
          React.createElement('span', { className: 'thrust-value' }, 'SYNC'),
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

  // Autopilot Toggle Component
  const AutopilotToggle = () => {
    return React.createElement('div', { className: 'autopilot-toggle' },
      React.createElement('button', {
        className: `ap-toggle-btn ${flightState.autopilot ? 'ap-engaged' : 'ap-disengaged'}`,
        onClick: toggleAutopilot,
        disabled: flightState.hasCrashed
      },
        `AP: ${flightState.autopilot ? 'ENGAGED' : 'DISENGAGED'}`
      )
    );
  };

  // Flight Attitude Indicator Component
  const FlightAttitudeIndicator = () => {
    const indicatorRef = useRef(null);
    
    useEffect(() => {
      if (indicatorRef.current) {
        // Apply pitch and roll transformations
        indicatorRef.current.style.transform = `rotate(${flightState.roll}deg)`;
        
        // Apply pitch translation (simplified)
        const pitchOffset = flightState.pitch * 5; // Scale factor for visual effect
        indicatorRef.current.style.transform += ` translateY(${pitchOffset}px)`;
      }
    }, [flightState.pitch, flightState.roll]);
    
    return React.createElement('div', { className: 'flight-attitude-indicator' },
      React.createElement('div', { 
        ref: indicatorRef,
        className: 'aircraft-symbol'
      },
        React.createElement('div', { className: 'pitch-lines' },
          // Pitch lines would be implemented here
          React.createElement('div', { className: 'horizon-line' })
        )
      ),
      React.createElement('div', { className: 'pose-data' },
        React.createElement('span', null, `Pitch: ${flightState.pitch.toFixed(1)}°`),
        React.createElement('span', null, `Roll: ${flightState.roll.toFixed(1)}°`)
      )
    );
  };

  // Main render function
  return React.createElement('div', { className: 'flight-panel' },
    // Crash warning flash (appears on top of everything)
    CrashWarningFlash(),
    
    // Crash panel (appears when crashed)
    CrashPanel(),
    
    // Normal flight panel (hidden when crashed)
    !showCrashPanel && React.createElement(React.Fragment, null,
      React.createElement('div', { className: 'instrument-group navigation-group' },
        React.createElement('h3', null, 'Navigation'),
        React.createElement('div', { className: 'instrument' },
          React.createElement('span', null, `HDG: ${flightState.heading.toFixed(0)}°`),
          React.createElement('span', null, `TAS: ${flightState.trueAirspeed.toFixed(0)}`),
          React.createElement('span', null, `GS: ${flightState.groundSpeed.toFixed(0)}`),
          React.createElement('span', null, `IAS: ${flightState.indicatedAirspeed.toFixed(0)}`),
          React.createElement('span', null, `FREQ: ${flightState.radioFreq}`)
        )
      ),
      
      React.createElement('div', { className: 'instrument-group flight-pose-group' },
        React.createElement('h3', null, 'Flight Pose'),
        FlightAttitudeIndicator(),
        React.createElement('div', { className: 'instrument' },
          React.createElement('span', null, `ALT: ${flightState.altitude.toFixed(0)} ft`),
          React.createElement('span', null, `VS: ${flightState.verticalSpeed.toFixed(0)} fpm`),
          React.createElement('span', null, `ALT SET: ${flightState.altimeter}`)
        )
      ),
      
      React.createElement('div', { className: 'instrument-group engine-group' },
        React.createElement('h3', null, 'Engine'),
        React.createElement('div', { className: 'instrument' },
          React.createElement('span', null, `N1: ${flightState.engineN1[0].toFixed(1)}% / ${flightState.engineN1[1].toFixed(1)}%`),
          React.createElement('span', null, `N2: ${flightState.engineN2[0].toFixed(1)}% / ${flightState.engineN2[1].toFixed(1)}%`),
          React.createElement('span', null, `EGT: ${flightState.engineEGT[0].toFixed(0)}° / ${flightState.engineEGT[1].toFixed(0)}°`),
          React.createElement('span', null, `FUEL: ${flightState.fuel.toFixed(0)} lbs`)
        )
      ),
      
      React.createElement('div', { className: 'instrument-group systems-group' },
        React.createElement('h3', null, 'Systems'),
        React.createElement('div', { className: 'instrument' },
          React.createElement('span', null, `HYD: ${flightState.hydraulicPressure} psi`),
          React.createElement('span', null, `CIRCUITS: ${flightState.circuitBreakers ? Object.values(flightState.circuitBreakers).filter(Boolean).length : 0}/5 OK`),
          React.createElement('span', null, `FLAPS: ${flightState.flaps === 0 ? 'UP' : flightState.flaps === 1 ? 'TO' : 'LDG'}`),
          React.createElement('span', null, `GEAR: ${flightState.gear ? 'DOWN' : 'UP'}`)
        )
      ),
      
      React.createElement('div', { className: 'instrument-group autopilot-group' },
        React.createElement('h3', null, 'Autopilot'),
        AutopilotToggle(),
        React.createElement('div', { className: 'instrument' },
          React.createElement('span', null, `FD: ${flightState.flightDirector ? 'ON' : 'OFF'}`),
          React.createElement('span', null, `ALT HOLD: ${flightState.altitudeHold ? 'ON' : 'OFF'}`),
          React.createElement('span', null, `HDG HOLD: ${flightState.headingHold ? 'ON' : 'OFF'}`)
        )
      ),
      
      React.createElement('div', { className: 'control-panel' },
        React.createElement('div', { className: 'control-section' },
          JoystickController()
        ),
        React.createElement('div', { className: 'control-section' },
          ThrustManager()
        )
      ),
      
      React.createElement('div', { className: 'central-display' },
        React.createElement('h3', null, 'Flight Status'),
        React.createElement('div', { className: 'status-info' },
          React.createElement('span', null, `PHASE: ${flightState.flightPhase}`),
          React.createElement('span', null, `NEXT: ${flightState.nextWaypoint}`),
          React.createElement('span', null, `DIST: ${flightState.distanceToWaypoint.toFixed(1)} nm`),
          React.createElement('span', null, `ETA: ${flightState.timeToWaypoint.toFixed(1)} min`)
        )
      ),
      
      // Stall warning display (if any)
      flightState.stallWarning && !flightState.isStalling && React.createElement('div', {
        className: 'stall-warning-indicator',
        style: {
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'orange',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }
      }, 'STALL WARNING'),
      
      flightState.isStalling && React.createElement('div', {
        className: 'stall-indicator',
        style: {
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'red',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '1.4rem',
          fontWeight: 'bold'
        }
      }, 'STALL!'),
      
      // Crash warning display (if any)
      flightState.crashWarning && !flashActive && React.createElement('div', {
        className: 'crash-warning-indicator',
        style: {
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'red',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }
      }, `WARNING: ${flightState.crashWarning}`),
      
      flightState.timeToCrash && React.createElement('div', {
        className: 'time-to-crash',
        style: {
          position: 'fixed',
          bottom: '60px',
          right: '20px',
          backgroundColor: 'orange',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '1rem'
        }
      }, `Time to impact: ${flightState.timeToCrash.toFixed(1)}s`)
    )
  );
};

export default FlightPanel;