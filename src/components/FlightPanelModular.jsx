import React, { useState, useEffect, useCallback } from 'react';

// Import modular components
import CrashWarningFlash from './CrashWarningFlash';
import CrashPanel from './CrashPanel';
import DraggableJoystick from './DraggableJoystick';
import ThrustManager from './ThrustManager';
import ModernAutopilotModule from './ModernAutopilotModule';
import CommunicationModule from './CommunicationModule';
import FlightPosePanel from './FlightPosePanel';
import NavigationPanel from './NavigationPanel';
import CentralPanel from './CentralPanel';
import ControlSurfacePanel from './ControlSurfacePanel';
import OverheadPanel from './OverheadPanel';
import './FlightPanel.css';

const FlightPanelModular = ({ flightData, onActionRequest, aircraftModel, selectedArrival, flightPlan, radioMessages, onRadioFreqChange }) => {
  // Use flightData from parent component instead of creating own physics service
  const [showOverhead, setShowOverhead] = useState(false);
  const [flightState, setFlightState] = useState({
    // Navigation
    heading: flightData?.heading || 270,
    trueAirspeed: flightData?.airspeed || 450,
    groundSpeed: flightData?.airspeed || 430,
    indicatedAirspeed: flightData?.indicatedAirspeed || 280,
    latitude: (flightData && flightData.position && typeof flightData.position.latitude === 'number') ? flightData.position.latitude : 0,
    longitude: (flightData && flightData.position && typeof flightData.position.longitude === 'number') ? flightData.position.longitude : 0,
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
    autopilotMode: flightData?.autopilotMode || 'LNAV',
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
    hasCrashed: false,
    frame: flightData?.frame || 0
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
        latitude: (flightData && flightData.position && typeof flightData.position.latitude === 'number') ? flightData.position.latitude : prevState.latitude,
        longitude: (flightData && flightData.position && typeof flightData.position.longitude === 'number') ? flightData.position.longitude : prevState.longitude,
        
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
        hydraulicPressure: flightData.hydraulicPressure || prevState.hydraulicPressure,
        circuitBreakers: prevState.circuitBreakers,
        alarms: flightData.alarms || prevState.alarms,
        
        // Surface controls
        flapsValue: flightData.flapsValue,
        gearValue: flightData.gearValue,
        airBrakesValue: flightData.airBrakesValue,
        trimValue: typeof flightData.trimValue === 'number' ? flightData.trimValue : prevState.trimValue,
        
        // Autopilot - Update from physics service status
        autopilot: flightData.autopilotEngaged || false, // ✅ Use physics service status
        autopilotMode: flightData.autopilotMode || prevState.autopilotMode || 'LNAV',
        flightDirector: prevState.flightDirector,
        altitudeHold: prevState.altitudeHold,
        headingHold: prevState.headingHold,
        autopilotTargets: flightData.autopilotTargets || prevState.autopilotTargets,
        frame: typeof flightData.frame === 'number' ? flightData.frame : prevState.frame,
        systems: flightData.systems || prevState.systems || {}
      }));
    }
  }, [flightData]);
  
  const [flashActive, setFlashActive] = useState(false);
  const [flashText, setFlashText] = useState('');
  const [showCrashPanel, setShowCrashPanel] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState(0);
  const alertCooldown = 3000;

  // Handle crash warnings and alerts
  useEffect(() => {
    if (!flightData?.crashWarning) {
      return;
    }
    const now = Date.now();
    if (now - lastAlertTime < alertCooldown) {
      return;
    }
    setFlashText(flightData.crashWarning);
    setFlashActive(true);
  }, [flightData?.crashWarning, lastAlertTime]);

  const handleAlertComplete = useCallback(() => {
    setFlashActive(false);
    setLastAlertTime(Date.now());
  }, []);

  useEffect(() => {
    if (flightData?.hasCrashed) {
      setShowCrashPanel(true);
    }
  }, [flightData?.hasCrashed]);

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

  const controlThrust = (engineIndex, throttleValue) => {
    // ✅ CLEAN ARCHITECTURE: Pass throttle in 0-1 range to parent
    console.log('📡 FlightPanelModular: Thrust control:', {
      engineIndex,
      throttleValue,
      percentage: (throttleValue * 100).toFixed(1) + '%'
    });
    
    if (onActionRequest) {
      onActionRequest('throttle', throttleValue); // Already in 0-1 range
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

  const setAutopilotMode = (mode) => {
    if (onActionRequest) {
      onActionRequest('set-autopilot-mode', mode);
    }
  };

  const controlFlaps = (position) => {
    if (onActionRequest) {
      onActionRequest('flaps', position);
    }
  };

  const controlAirBrakes = (position) => {
    if (onActionRequest) {
      onActionRequest('airBrakes', position);
    }
  };

  const controlGear = (position) => {
    if (onActionRequest) {
      onActionRequest('gear', position);
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

  const handleSystemAction = (system, action, value) => {
    if (onActionRequest) {
      onActionRequest('system-action', { system, action, value });
    }
  };

  // Main render function
  return React.createElement('div', { className: 'modern-flight-panel', style: { userSelect: 'none' } },
    // Overhead Panel Overlay
    showOverhead && React.createElement(OverheadPanel, {
      onClose: () => setShowOverhead(false),
      flightState,
      onSystemAction: handleSystemAction
    }),

    // Crash warning flash
    React.createElement(CrashWarningFlash, { flashActive, flashText, onAlertComplete: handleAlertComplete }),
    
    // Crash panel (if crashed)
    React.createElement(CrashPanel, { showCrashPanel, resetFlight }),

    // Debug frame panel
    React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        padding: '6px 10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#0f0',
        fontSize: '12px',
        borderRadius: '4px',
        zIndex: 1000
      }
    }, `Frame: ${flightState.frame !== undefined ? flightState.frame : 0}`),
    
    // Modern cockpit layout
    React.createElement('div', { className: 'modern-cockpit' },
      // Top Row: Autopilot + Comm
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '8px',
          width: '100%',
          alignItems: 'stretch'
        } 
      },
        React.createElement(ModernAutopilotModule, { 
          flightState, 
          setAutopilotTargets, 
          toggleAutopilot,
          setAutopilotMode 
        }),
        React.createElement(CommunicationModule, {
          flightState,
          setRadioFreq: (freq) => {
            setFlightState(prev => ({ ...prev, radioFreq: freq }));
            if (onRadioFreqChange) onRadioFreqChange(freq);
          },
          flightPlan,
          radioMessages
        })
      ),
      
      // Three parallel panels
      React.createElement('div', { className: 'main-panels' },
        // Flight Pose Panel (Left)
        React.createElement(FlightPosePanel, { flightState }),
        
        // Navigation Panel (Middle)
        React.createElement(NavigationPanel, { flightState, selectedArrival, flightPlan }),
        
        // Central Panel (Right)
        React.createElement(CentralPanel, { 
          flightState,
          onToggleSystems: () => setShowOverhead(prev => !prev)
        })
      ),
      
      // Manual controls at bottom
      React.createElement('div', { className: 'manual-controls' },
        React.createElement(DraggableJoystick, { controlPitch, controlRoll, flightState }),
        React.createElement('div', { className: 'thrust-manager-wrapper' },
          React.createElement(ThrustManager, { controlThrust, flightState })
        ),
        React.createElement(ControlSurfacePanel, {
          controlFlaps,
          controlGear,
          controlAirBrakes,
          controlTrim: (payload) => onActionRequest('trim', payload),
          flightState,
          aircraftModel
        })
      )
    )
  );
};

export default FlightPanelModular;
