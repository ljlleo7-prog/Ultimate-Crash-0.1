import React, { useState, useEffect, useCallback } from 'react';

// Import modular components
import CrashWarningFlash from './CrashWarningFlash';
import CrashPanel from './CrashPanel';
import DraggableJoystick from './DraggableJoystick';
import ThrustManager from './ThrustManager';
import ModernAutopilotModule from './ModernAutopilotModule';
import FlightPosePanel from './FlightPosePanel';
import NavigationPanel from './NavigationPanel';
import CentralPanel from './CentralPanel';
import SurfaceControls from './SurfaceControls';
import './FlightPanel.css';

const FlightPanelModular = ({ flightData, onActionRequest, aircraftModel }) => {
  // Use flightData from parent component instead of creating own physics service
  const [flightState, setFlightState] = useState({
    // Navigation
    heading: flightData?.heading || 270,
    trueAirspeed: flightData?.airspeed || 450,
    groundSpeed: flightData?.airspeed || 430,
    indicatedAirspeed: flightData?.indicatedAirspeed || 280,
    radioFreq: 121.5,
    
    // Flight Pose
    pitch: flightData?.pitch || 2.5,
    roll: flightData?.roll || 0.5,
    verticalSpeed: flightData?.verticalSpeed || 1200,
    altitude: flightData?.altitude || 35000,
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
    
    // Surface Controls State
    flapsPosition: 'up',
    gearPosition: 'up',
    airBrakesPosition: 'up',
    
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
  
  // Update flightState when flightData changes
  useEffect(() => {
    if (flightData) {
      setFlightState(prevState => ({
        ...prevState,
        // Navigation
        heading: flightData.heading,
        trueAirspeed: flightData.airspeed,
        groundSpeed: flightData.airspeed,
        indicatedAirspeed: flightData.indicatedAirspeed || 0, // FIXED: Ensure IAS is always a number
        radioFreq: prevState.radioFreq,
        
        // Flight Pose
        pitch: flightData.pitch || 0, // FIXED: Ensure pitch is always a number
        roll: flightData.roll || 0, // FIXED: Ensure roll is always a number
        verticalSpeed: flightData.verticalSpeed || 0, // FIXED: Ensure vertical speed is always a number
        altitude: flightData.altitude || 0, // FIXED: Ensure altitude is always a number
        altimeter: prevState.altimeter,
        
        // Engine
        engineN1: flightData.engineN1 || prevState.engineN1,
        engineN2: flightData.engineN2 || prevState.engineN2,
        engineEGT: flightData.engineEGT || prevState.engineEGT,
        fuel: flightData.fuel || prevState.fuel,
        
        // Systems
        hydraulicPressure: prevState.hydraulicPressure,
        circuitBreakers: prevState.circuitBreakers,
        alarms: flightData.alarms || prevState.alarms,
        
        // Autopilot - Update from physics service status
        autopilot: flightData.autopilotEngaged || false, // ✅ Use physics service status
        flightDirector: prevState.flightDirector,
        altitudeHold: prevState.altitudeHold,
        headingHold: prevState.headingHold,
        autopilotTargets: prevState.autopilotTargets
      }));
    }
  }, [flightData]);
  
  const [flashActive, setFlashActive] = useState(false);
  const [flashText, setFlashText] = useState('');
  const [showCrashPanel, setShowCrashPanel] = useState(false);

  // Handle crash warnings and alerts
  useEffect(() => {
    if (flightData?.crashWarning) {
      setFlashText(flightData.crashWarning);
      setFlashActive(true);
    }
  }, [flightData?.crashWarning]);

  // Control functions - Updated to use parent's physics service
  const controlPitch = (amount) => {
    if (onActionRequest) {
      onActionRequest('pitch', amount);
    }
  };

  const controlRoll = (amount) => {
    if (onActionRequest) {
      onActionRequest('roll', amount);
    }
  };

  const controlThrust = (engineIndex, amount) => {
    if (onActionRequest) {
      onActionRequest('throttle', amount);
    }
  };

  const toggleAutopilot = () => {
    if (onActionRequest) {
      onActionRequest('toggle-autopilot');
    }
  };

  const setAutopilotTargets = (targets) => {
    if (onActionRequest) {
      onActionRequest('set-autopilot-targets', targets);
    }
  };

  const controlFlaps = (position) => {
    if (onActionRequest) {
      onActionRequest('control-flaps', position);
    }
  };

  const controlAirBrakes = (position) => {
    if (onActionRequest) {
      onActionRequest('control-airbrakes', position);
    }
  };

  const controlGear = (position) => {
    if (onActionRequest) {
      onActionRequest('control-gear', position);
    }
  };

  const resetFlight = () => {
    // TODO: Implement control through parent component
    console.log('Reset flight requested');
    
    // Call parent's reset function to roll back to flight initiation
    if (onActionRequest) {
      onActionRequest('reset-to-initiation');
    }
  };

  const setTestConfiguration = (altitude, ias) => {
    // TODO: Implement control through parent component
    console.log('Test configuration requested:', altitude, 'ft,', ias, 'kts IAS');
  };

  // Main render function
  return React.createElement('div', { className: 'modern-flight-panel', style: { userSelect: 'none' } },
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
    ),
    
    // Surface Controls (Flaps, Gear, Airbrakes) - New Lever-Style Component
    React.createElement(SurfaceControls, {
      controlFlaps,
      controlGear,
      controlAirBrakes,
      flightState
    })
  );
};

export default FlightPanelModular;