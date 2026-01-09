import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FlightPanel.css';
import NewFlightPhysicsService from '../services/newFlightPhysicsService';
import aircraftService from '../services/aircraftService';

// Import modular components
import CrashPanel from './CrashPanel';
import DraggableJoystick from './DraggableJoystick';
import ThrustManager from './ThrustManager';
import ModernAutopilotModule from './ModernAutopilotModule';
import FlightPosePanel from './FlightPosePanel';
import NavigationPanel from './NavigationPanel';
import CentralPanel from './CentralPanel';

// **NEW: Import Control Surface Panel**
import ControlSurfacePanel from './ControlSurfacePanel';



// Crash Warning Flash Component - MOVED OUTSIDE main component
const CrashWarningFlash = ({ flashActive, flashText, onAlertComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  
  useEffect(() => {
    if (flashActive) {
      // Show the alert
      setIsVisible(true);
      setIsBlinking(true);
      
      // Blink for 3 cycles (600ms total)
      const blinkTimer = setTimeout(() => {
        setIsBlinking(false);
      }, 600);
      
      // Auto-hide after blinking completes
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        if (onAlertComplete) {
          onAlertComplete();
        }
      }, 1000); // Total display time: 1 second
      
      return () => {
        clearTimeout(blinkTimer);
        clearTimeout(hideTimer);
      };
    } else {
      // If flashActive becomes false, hide immediately
      setIsVisible(false);
      setIsBlinking(false);
    }
  }, [flashActive, onAlertComplete]);
  
  if (!isVisible) return null;
  
  const warningClass = 'crash-warning-flash';
  const blinkAnimation = isBlinking ? 'flashBlink 0.2s 3' : 'none';
  
  return React.createElement('div', {
    className: warningClass,
    style: {
      position: 'fixed',
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'auto',
      minWidth: '300px',
      height: 'auto',
      backgroundColor: 'rgba(255, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontSize: '3rem',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '2px 2px 4px black',
      padding: '20px 40px',
      borderRadius: '10px',
      border: '3px solid white',
      animation: blinkAnimation,
      pointerEvents: 'none',
      transition: 'opacity 0.3s ease'
    }
  }, flashText);
};



// Main FlightPanel component
const FlightPanel = ({ onActionRequest, aircraftModel, flightData }) => {
  // Use flightData from parent component instead of creating own physics service
  const [flightState, setFlightState] = useState({
    // Navigation
    heading: flightData?.heading || 0,
    trueAirspeed: flightData?.airspeed || 0,
    groundSpeed: flightData?.airspeed || 0,
    indicatedAirspeed: flightData?.indicatedAirspeed || 0,
    
    // Flight Pose
    pitch: flightData?.pitch || 0,
    roll: flightData?.roll || 0,
    verticalSpeed: flightData?.verticalSpeed || 0,
    altitude: flightData?.altitude || 0,
    
    // Engine
    engineN1: [0, 0],
    engineN2: [0, 0],
    engineEGT: [0, 0],
    fuel: 100,
    
    // Systems
    hydraulicPressure: 3000,
    
    // Autopilot
    autopilot: false,
    autopilotTargets: {},
    
    // Crash Detection
    crashWarning: '',
    timeToCrash: null,
    hasCrashed: false,
    alarms: []
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
        indicatedAirspeed: flightData.indicatedAirspeed,
        
        // Flight Pose
        pitch: flightData.pitch,
        roll: flightData.roll,
        verticalSpeed: flightData.verticalSpeed,
        altitude: flightData.altitude
      }));
    }
  }, [flightData]);
  
  const [flashActive, setFlashActive] = useState(false);
  const [flashText, setFlashText] = useState('');
  const [showCrashPanel, setShowCrashPanel] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState(0);
  const [alertCooldown, setAlertCooldown] = useState(3000); // 3 second cooldown
  
  // Handle alert completion
  const handleAlertComplete = useCallback(() => {
    setFlashActive(false);
    setLastAlertTime(Date.now());
  }, []);
  
  // Check if alert can be triggered (cooldown check)
  const canTriggerAlert = useCallback(() => {
    return Date.now() - lastAlertTime >= alertCooldown;
  }, [lastAlertTime, alertCooldown]);
  
  // Dynamic updates with realistic flight physics
  // REMOVED: No longer needed since we're using flightData from parent
  
  // Control functions - Updated to use parent's physics service
  const controlPitch = (amount) => {
    // TODO: Implement control through parent component
    console.log('Pitch control requested:', amount);
  };

  const controlRoll = (amount) => {
    // TODO: Implement control through parent component
    console.log('Roll control requested:', amount);
  };

  const controlThrust = (engineIndex, amount) => {
    // TODO: Implement control through parent component
    console.log('Thrust control requested for engine', engineIndex, ':', amount);
  };

  // Control Surface Functions - Updated to use parent's physics service
  const controlFlaps = (position) => {
    // TODO: Implement control through parent component
    console.log('Flaps control requested:', position);
  };

  const controlGear = (position) => {
    // TODO: Implement control through parent component
    console.log('Gear control requested:', position);
  };

  const controlAirBrakes = (position) => {
    // TODO: Implement control through parent component
    console.log('Airbrakes control requested:', position);
  };

  const toggleAutopilot = () => {
    // TODO: Implement control through parent component
    console.log('Autopilot toggle requested');
  };

  const setAutopilotTargets = (targets) => {
    // TODO: Implement control through parent component
    console.log('Autopilot targets requested:', targets);
  };

  const resetFlight = () => {
    // TODO: Implement control through parent component
    console.log('Reset flight requested');
    
    // Call parent's reset function to roll back to flight initiation
    if (onActionRequest) {
      onActionRequest('reset-to-initiation');
    }
  };

  // Test Configuration Function - Updated to use parent's physics service
  const setTestConfiguration = (altitude, ias) => {
    // TODO: Implement control through parent component
    console.log('Test configuration requested:', altitude, 'ft,', ias, 'kts IAS');
  };

  // Main render function
  return React.createElement('div', { className: 'modern-flight-panel' },
    // Crash warning flash with cooldown and auto-hide
    React.createElement(CrashWarningFlash, { 
      flashActive, 
      flashText, 
      onAlertComplete: handleAlertComplete 
    }),
    
    // Crash panel (if crashed)
    React.createElement(CrashPanel, { showCrashPanel, resetFlight }),
    

    
    // Physics Debug Panel - REMOVED since flightPhysicsRef is no longer available
    // React.createElement(PhysicsDebugPanel, { flightPhysicsRef }),
    
    // **NEW: Autopilot Debug Panel** - REMOVED since flightPhysicsRef is no longer available
    // React.createElement(AutopilotDebugPanel, { flightPhysicsRef }),
    
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
        React.createElement(ThrustManager, { controlThrust, flightState }),
        // **NEW: Control Surface Panel**
        React.createElement(ControlSurfacePanel, { 
          controlFlaps, 
          controlGear, 
          controlAirBrakes, 
          flightState 
        })
      )
    )
  );
};

export default FlightPanel;