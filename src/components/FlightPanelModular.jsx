import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FlightPanel.css';
import FlightPhysicsService from '../services/flightPhysicsService';

// Import modular components
import CrashWarningFlash from './CrashWarningFlash';
import CrashPanel from './CrashPanel';
import DraggableJoystick from './DraggableJoystick';
import ThrustManager from './ThrustManager';
import ModernAutopilotModule from './ModernAutopilotModule';
import FlightPosePanel from './FlightPosePanel';
import NavigationPanel from './NavigationPanel';
import CentralPanel from './CentralPanel';

const FlightPanelModular = ({ flightData, onActionRequest, aircraftModel }) => {
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

export default FlightPanelModular;