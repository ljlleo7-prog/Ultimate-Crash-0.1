import React, { useState, useEffect } from 'react';

const SurfaceControls = ({ controlFlaps, controlGear, controlAirBrakes, flightState }) => {
  // Initialize control states from flightState
  const [flapsPosition, setFlapsPosition] = useState(flightState?.flapsPosition || 'up');
  const [gearPosition, setGearPosition] = useState(flightState?.gearPosition || 'up');
  const [airBrakesPosition, setAirBrakesPosition] = useState(flightState?.airBrakesPosition || 'up');
  
  // Update local state when flightState changes
  useEffect(() => {
    if (flightState) {
      // Update from physics service if available
      if (flightState.flapsPosition !== undefined) setFlapsPosition(flightState.flapsPosition);
      if (flightState.gearPosition !== undefined) setGearPosition(flightState.gearPosition);
      if (flightState.airBrakesPosition !== undefined) setAirBrakesPosition(flightState.airBrakesPosition);
      
      // Fallback to raw values if positions not provided
      if (flightState.flapsValue !== undefined) {
        setFlapsPosition(flightState.flapsValue === 0 ? 'up' : 'down');
      }
      if (flightState.airBrakesValue !== undefined) {
        setAirBrakesPosition(flightState.airBrakesValue === 0 ? 'up' : 'down');
      }
      if (flightState.gearValue !== undefined) {
        setGearPosition(flightState.gearValue === false ? 'up' : 'down');
      }
    }
  }, [flightState]);

  const handleFlapsToggle = () => {
    const newPosition = flapsPosition === 'up' ? 'down' : 'up';
    setFlapsPosition(newPosition);
    controlFlaps(newPosition);
  };

  const handleGearToggle = () => {
    const newPosition = gearPosition === 'up' ? 'down' : 'up';
    setGearPosition(newPosition);
    controlGear(newPosition);
  };

  const handleAirBrakesToggle = () => {
    const newPosition = airBrakesPosition === 'up' ? 'down' : 'up';
    setAirBrakesPosition(newPosition);
    controlAirBrakes(newPosition);
  };

  // Individual Lever Component
  const LeverControl = ({ label, position, onToggle, color, disabled }) => {
    const isDown = position === 'down';
    const leverColor = isDown ? color.down : color.up;
    
    return React.createElement('div', { 
      className: 'lever-control',
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '15px',
        background: '#1a1a1a',
        borderRadius: '12px',
        border: '2px solid #333',
        minWidth: '80px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }
    },
      // Lever Label
      React.createElement('div', { 
        style: {
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#ccc',
          marginBottom: '10px',
          textAlign: 'center'
        }
      }, label),
      
      // Lever Visual
      React.createElement('div', { 
        style: {
          position: 'relative',
          width: '30px',
          height: '80px',
          background: '#333',
          border: '3px solid #555',
          borderRadius: '15px',
          marginBottom: '10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1
        },
        onClick: disabled ? null : onToggle
      },
        // Lever Handle
        React.createElement('div', { 
          style: {
            position: 'absolute',
            width: '100%',
            height: '25px',
            background: `linear-gradient(to bottom, ${leverColor}, ${leverColor}dd)`,
            border: `2px solid ${leverColor}88`,
            borderRadius: '8px',
            left: 0,
            [isDown ? 'bottom' : 'top']: '2px',
            transition: 'all 0.2s ease',
            boxShadow: isDown ? 
              `0 2px 8px ${leverColor}40` : 
              `0 -2px 8px ${leverColor}40`
          }
        })
      ),
      
      // Position Indicator
      React.createElement('div', { 
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          color: leverColor,
          fontFamily: 'monospace'
        }
      }, isDown ? 'DOWN' : 'UP'),
      
      // Status Light
      React.createElement('div', { 
        style: {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isDown ? '#10b981' : '#ef4444',
          marginTop: '5px',
          boxShadow: isDown ? 
            '0 0 6px #10b981' : 
            '0 0 6px #ef4444'
        }
      })
    );
  };

  // Check if physics service is providing real data
  const hasPhysicsData = flightState && (
    flightState.flapsPosition !== undefined || 
    flightState.gearPosition !== undefined || 
    flightState.airBrakesPosition !== undefined
  );

  return React.createElement('div', { 
    className: 'surface-controls-container',
    style: {
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      gap: '15px',
      zIndex: 100,
      background: 'rgba(0,0,0,0.8)',
      padding: '20px',
      borderRadius: '15px',
      border: '2px solid #444'
    }
  },
    // Flaps Lever
    React.createElement(LeverControl, {
      label: 'FLAPS',
      position: flapsPosition,
      onToggle: handleFlapsToggle,
      color: { up: '#3b82f6', down: '#10b981' },
      disabled: flightState?.autopilot || flightState?.hasCrashed
    }),
    
    // Gear Lever
    React.createElement(LeverControl, {
      label: 'GEAR',
      position: gearPosition,
      onToggle: handleGearToggle,
      color: { up: '#3b82f6', down: '#f59e0b' },
      disabled: flightState?.autopilot || flightState?.hasCrashed
    }),
    
    // Air Brakes Lever
    React.createElement(LeverControl, {
      label: 'BRAKES',
      position: airBrakesPosition,
      onToggle: handleAirBrakesToggle,
      color: { up: '#3b82f6', down: '#ef4444' },
      disabled: flightState?.autopilot || flightState?.hasCrashed
    }),
    
    // Status indicator
    React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
        background: hasPhysicsData ? '#1a1a1a' : '#333',
        borderRadius: '8px',
        border: `2px solid ${hasPhysicsData ? '#10b981' : '#f59e0b'}`,
        minWidth: '60px'
      }
    },
      React.createElement('div', {
        style: {
          fontSize: '10px',
          color: '#888',
          marginBottom: '5px'
        }
      }, 'STATUS'),
      React.createElement('div', {
        style: {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: hasPhysicsData ? '#10b981' : '#f59e0b',
          boxShadow: hasPhysicsData ? 
            '0 0 6px #10b981' : 
            '0 0 6px #f59e0b'
        }
      }),
      React.createElement('div', {
        style: {
          fontSize: '8px',
          color: hasPhysicsData ? '#10b981' : '#f59e0b',
          marginTop: '5px',
          fontFamily: 'monospace'
        }
      }, hasPhysicsData ? 'SYNC' : 'LOCAL')
    )
  );
};

export default SurfaceControls;