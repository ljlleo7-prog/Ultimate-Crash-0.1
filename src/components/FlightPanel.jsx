import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FlightPanel.css';
import FlightPhysicsService from '../services/flightPhysicsService';

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

// Physics Debug Panel Component
const PhysicsDebugPanel = ({ flightPhysicsRef }) => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!showDebug) return;
    
    const interval = setInterval(() => {
      if (flightPhysicsRef.current) {
        const info = flightPhysicsRef.current.getPhysicsDebugInfo();
        setDebugInfo(info);
      }
    }, 500); // Update every 500ms
    
    return () => clearInterval(interval);
  }, [showDebug, flightPhysicsRef]);

  if (!showDebug) {
    return (
      <button 
        onClick={() => setShowDebug(true)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: '#333',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        Show Physics Debug
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Physics Debug</h3>
        <button 
          onClick={() => setShowDebug(false)}
          style={{
            background: '#666',
            color: 'white',
            border: 'none',
            padding: '2px 6px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Hide
        </button>
      </div>
      
      {debugInfo && (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Forces (N):</strong><br/>
            Lift: {debugInfo.forces.lift}<br/>
            Thrust: {debugInfo.forces.thrust}<br/>
            Drag: {debugInfo.forces.drag}<br/>
            Gravity: {debugInfo.forces.gravity}
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Ratios:</strong><br/>
            Lift/Weight: {debugInfo.ratios.liftWeight}<br/>
            Thrust/Drag: {debugInfo.ratios.thrustDrag}
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Accelerations:</strong><br/>
            Horizontal: {debugInfo.accelerations.horizontal} kts/s<br/>
            Vertical: {debugInfo.accelerations.vertical} ft/s²
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Velocities:</strong><br/>
            Horizontal: {debugInfo.velocities.horizontal} kts<br/>
            Vertical: {debugInfo.velocities.vertical} ft/s
          </div>
          
          <div>
            <strong>Environment:</strong><br/>
            Air Density: {debugInfo.airDensity} kg/m³<br/>
            Angle of Attack: {debugInfo.angleOfAttack}°
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
        <button 
          onClick={() => flightPhysicsRef.current.setDebugConditions(35000, 250, 2, 85)}
          style={{
            background: '#444',
            color: 'white',
            border: 'none',
            padding: '2px 6px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Cruise
        </button>
        <button 
          onClick={() => flightPhysicsRef.current.setDebugConditions(10000, 180, 5, 90)}
          style={{
            background: '#444',
            color: 'white',
            border: 'none',
            padding: '2px 6px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Climb
        </button>
        <button 
          onClick={() => flightPhysicsRef.current.setDebugConditions(5000, 140, -2, 70)}
          style={{
            background: '#444',
            color: 'white',
            border: 'none',
            padding: '2px 6px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Descent
        </button>
      </div>
    </div>
  );
};

// Main FlightPanel component
const FlightPanel = ({ onActionRequest }) => {
  const flightPhysicsRef = useRef(new FlightPhysicsService());
  const [flightState, setFlightState] = useState({
    // Navigation
    heading: 0,
    trueAirspeed: 0,
    groundSpeed: 0,
    indicatedAirspeed: 0,
    
    // Flight Pose
    pitch: 0,
    roll: 0,
    verticalSpeed: 0,
    altitude: 0,
    
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
        
        // Handle crash warnings with cooldown
        if (updatedState.crashWarning && canTriggerAlert()) {
          setFlashActive(true);
          setFlashText(updatedState.crashWarning);
          
          if (updatedState.crashWarning === 'CRASHED') {
            setShowCrashPanel(true);
          }
        }
      }
    }, 100); // Update every 100ms for smooth physics
    
    return () => clearInterval(interval);
  }, [flightState.hasCrashed, canTriggerAlert]);
  
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

  // **NEW: Control Surface Functions**
  const controlFlaps = (position) => {
    flightPhysicsRef.current.controlFlaps(position);
    setFlightState(prevState => ({
      ...prevState,
      flaps: position
    }));
  };

  const controlGear = (position) => {
    flightPhysicsRef.current.controlGear(position);
    setFlightState(prevState => ({
      ...prevState,
      gear: position
    }));
  };

  const controlAirBrakes = (position) => {
    flightPhysicsRef.current.controlAirBrakes(position);
    setFlightState(prevState => ({
      ...prevState,
      airBrakes: position
    }));
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
    setLastAlertTime(0); // Reset cooldown timer
    
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
    // Crash warning flash with cooldown and auto-hide
    React.createElement(CrashWarningFlash, { 
      flashActive, 
      flashText, 
      onAlertComplete: handleAlertComplete 
    }),
    
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
    
    // Physics Debug Panel
    React.createElement(PhysicsDebugPanel, { flightPhysicsRef }),
    
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