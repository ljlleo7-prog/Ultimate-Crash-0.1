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
    timeToWaypoint: 18.2
  });

  const flightPhysicsRef = useRef(new FlightPhysicsService());

  // Dynamic updates with realistic flight physics
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedState = flightPhysicsRef.current.update();
      setFlightState(updatedState);
    }, 100); // Update every 100ms for smooth physics

    return () => clearInterval(interval);
  }, []);

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
          disabled: flightState.autopilot
        }, '↑ Pitch Up'),
        React.createElement('button', {
          key: 'pitch-down',
          className: 'control-btn pitch-down',
          onClick: () => controlPitch(1),
          disabled: flightState.autopilot
        }, '↓ Pitch Down'),
        
        // Roll controls
        React.createElement('button', {
          key: 'roll-left',
          className: 'control-btn roll-left',
          onClick: () => controlRoll(-1),
          disabled: flightState.autopilot
        }, '← Roll Left'),
        React.createElement('button', {
          key: 'roll-right',
          className: 'control-btn roll-right',
          onClick: () => controlRoll(1),
          disabled: flightState.autopilot
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
            disabled: flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'thrust-value' }, `${flightState.engineN1[0].toFixed(1)}%`),
          React.createElement('button', {
            className: 'thrust-btn increase',
            onClick: () => controlThrust(0, 5),
            disabled: flightState.autopilot
          }, '+')
        ),
        
        // Engine 2 controls
        React.createElement('div', { key: 'engine2', className: 'engine-control' },
          React.createElement('span', null, 'Engine 2:'),
          React.createElement('button', {
            className: 'thrust-btn decrease',
            onClick: () => controlThrust(1, -5),
            disabled: flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'thrust-value' }, `${flightState.engineN1[1].toFixed(1)}%`),
          React.createElement('button', {
            className: 'thrust-btn increase',
            onClick: () => controlThrust(1, 5),
            disabled: flightState.autopilot
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
            disabled: flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'thrust-value' }, 'SYNC'),
          React.createElement('button', {
            className: 'thrust-btn increase',
            onClick: () => {
              controlThrust(0, 5);
              controlThrust(1, 5);
            },
            disabled: flightState.autopilot
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
        onClick: toggleAutopilot
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
        const indicator = indicatorRef.current;
        indicator.style.transform = `rotate(${flightState.roll}deg)`;
        
        // Update pitch lines
        const pitchLines = indicator.querySelectorAll('.pitch-line');
        pitchLines.forEach(line => {
          const pitchValue = parseInt(line.getAttribute('data-pitch')) || 0;
          const offset = (pitchValue - flightState.pitch) * 3; // 3px per degree
          line.style.transform = `translateY(${offset}px)`;
        });
      }
    }, [flightState.pitch, flightState.roll]);

    return React.createElement('div', {
      ref: indicatorRef,
      className: 'flight-attitude-indicator'
    },
      // Sky (blue top half)
      React.createElement('div', { className: 'attitude-sky' }),
      
      // Ground (orange bottom half)
      React.createElement('div', { className: 'attitude-ground' }),
      
      // Horizon line
      React.createElement('div', { className: 'horizon-line' }),
      
      // Pitch lines
      React.createElement('div', { className: 'pitch-lines' },
        [-30, -20, -10, 0, 10, 20, 30].map(pitch => 
          React.createElement('div', {
            key: `pitch-${pitch}`,
            className: `pitch-line ${pitch === 0 ? 'horizon' : ''}`,
            'data-pitch': pitch
          },
            pitch !== 0 && React.createElement('span', null, Math.abs(pitch))
          )
        )
      ),
      
      // Aircraft symbol
      React.createElement('div', { className: 'aircraft-symbol' },
        React.createElement('div', { className: 'wings' }),
        React.createElement('div', { className: 'fuselage' })
      )
    );
  };

  return React.createElement('div', {
    className: 'flight-panel cockpit-display'
  }, 
    React.createElement('div', {
      key: 'navigation-group',
      className: 'instrument-group navigation-group'
    }, 
      React.createElement('h3', { key: 'nav-title' }, 'Navigation'),
      React.createElement('div', { key: 'nav-data' }, 
        React.createElement('div', { key: 'hdg' }, `HDG: ${flightState.heading.toFixed(1)}°`),
        React.createElement('div', { key: 'tas' }, `TAS: ${flightState.trueAirspeed.toFixed(0)}`),
        React.createElement('div', { key: 'gs' }, `GS: ${flightState.groundSpeed.toFixed(0)}`),
        React.createElement('div', { key: 'ias' }, `IAS: ${flightState.indicatedAirspeed.toFixed(0)}`),
        React.createElement('div', { key: 'radio' }, `RADIO: ${flightState.radioFreq}`)
      )
    ),
    
    React.createElement('div', {
      key: 'flight-pose-group',
      className: 'instrument-group flight-pose-group'
    }, 
      React.createElement('h3', { key: 'pose-title' }, 'Flight Attitude'),
      React.createElement('div', { key: 'attitude-indicator-container' },
        FlightAttitudeIndicator(),
        React.createElement('div', { key: 'pose-data', className: 'pose-data-text' },
          React.createElement('div', { key: 'pitch' }, `Pitch: ${flightState.pitch.toFixed(1)}°`),
          React.createElement('div', { key: 'roll' }, `Roll: ${flightState.roll.toFixed(1)}°`),
          React.createElement('div', { key: 'vs' }, `V/S: ${flightState.verticalSpeed.toFixed(0)}`),
          React.createElement('div', { key: 'alt' }, `ALT: ${Math.round(flightState.altitude)}`),
          React.createElement('div', { key: 'altimeter' }, `Altimeter: ${flightState.altimeter}`)
        )
      )
    ),
    
    React.createElement('div', {
      key: 'engine-group',
      className: 'instrument-group engine-group'
    }, 
      React.createElement('h3', { key: 'engine-title' }, 'Engines'),
      React.createElement('div', { key: 'engine-data' }, 
        React.createElement('div', { key: 'n1' }, `N1: ${flightState.engineN1[0].toFixed(1)}% / ${flightState.engineN1[1].toFixed(1)}%`),
        React.createElement('div', { key: 'n2' }, `N2: ${flightState.engineN2[0].toFixed(1)}% / ${flightState.engineN2[1].toFixed(1)}%`),
        React.createElement('div', { key: 'egt' }, `EGT: ${flightState.engineEGT[0].toFixed(0)}° / ${flightState.engineEGT[1].toFixed(0)}°`),
        React.createElement('div', { key: 'fuel' }, `Fuel: ${Math.round(flightState.fuel)}`)
      )
    ),
    
    React.createElement('div', {
      key: 'systems-group',
      className: 'instrument-group systems-group'
    }, 
      React.createElement('h3', { key: 'systems-title' }, 'Systems'),
      React.createElement('div', { key: 'systems-data' }, 
        React.createElement('div', { key: 'hyd' }, `Hydraulic: ${flightState.hydraulicPressure}`),
        React.createElement('div', { key: 'breakers' }, 'Circuit Breakers: OK'),
        React.createElement('div', { key: 'alarms' }, `Alarms: ${flightState.alarms.length}`)
      )
    ),
    
    React.createElement('div', {
      key: 'autopilot-group',
      className: 'instrument-group autopilot-group'
    }, 
      React.createElement('h3', { key: 'ap-title' }, 'Autopilot'),
      React.createElement('div', { key: 'ap-data' }, 
        React.createElement('div', { key: 'ap' }, `AP: ${flightState.autopilot ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'fd' }, `FD: ${flightState.flightDirector ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'alt-hold' }, `ALT HOLD: ${flightState.altitudeHold ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'hdg-hold' }, `HDG HOLD: ${flightState.headingHold ? 'ON' : 'OFF'}`)
      ),
      AutopilotToggle()
    ),
    
    React.createElement('div', {
      key: 'control-panel',
      className: 'instrument-group control-panel'
    }, 
      React.createElement('h3', { key: 'control-title' }, 'Flight Controls'),
      React.createElement('div', { key: 'controls-container' },
        JoystickController(),
        ThrustManager()
      )
    ),
    
    React.createElement('div', {
      key: 'central-display',
      className: 'instrument-group central-display'
    }, 
      React.createElement('h3', { key: 'central-title' }, 'Central Display'),
      React.createElement('div', { key: 'central-data' }, 
        React.createElement('div', { key: 'phase' }, `Phase: ${flightState.flightPhase}`),
        React.createElement('div', { key: 'waypoint' }, `Next: ${flightState.nextWaypoint}`),
        React.createElement('div', { key: 'distance' }, `Distance: ${flightState.distanceToWaypoint.toFixed(1)}`),
        React.createElement('div', { key: 'time' }, `Time: ${flightState.timeToWaypoint.toFixed(1)}`)
      )
    ),
    
    React.createElement('div', {
      key: 'future-actions',
      className: 'future-actions-panel'
    }, 
      React.createElement('h3', { key: 'actions-title' }, 'Future Actions'),
      React.createElement('div', { key: 'actions-list' }, 
        React.createElement('div', { key: 'action1' }, '• Request clearance for approach'),
        React.createElement('div', { key: 'action2' }, '• Check weather at destination'),
        React.createElement('div', { key: 'action3' }, '• Prepare for landing checklist')
      )
    ),
    
    React.createElement('div', {
      key: 'typebox',
      className: 'typebox-container'
    }, 
      React.createElement('h3', { key: 'typebox-title' }, 'Input'),
      React.createElement('input', {
        key: 'typebox-input',
        type: 'text',
        placeholder: 'Enter command...',
        className: 'typebox-input'
      })
    )
  );
};

export default FlightPanel;