import React, { useState, useEffect } from 'react';

const ThrustManager = ({ controlThrust, flightState }) => {
  // Get current throttle from flight state (physics engine uses 0-1, display as percentage)
  const baseThrottle = (flightState.throttle || 47);
  // Track throttle for each engine separately
  const [displayThrottle, setDisplayThrottle] = useState({
    e1: baseThrottle,
    e2: baseThrottle
  }); // Display in percentage
  
  // Update display throttle when flightState changes
  useEffect(() => {
    if (flightState.throttle !== undefined) {
      setDisplayThrottle(prev => ({
        ...prev,
        e1: flightState.throttle * 100,
        e2: flightState.throttle * 100
      }));
    }
  }, [flightState.throttle]);
  
  // Calculate parameters for each engine using physics engine values
  const engineParams = {
    e1: {
      n1: (flightState.engineN1 && flightState.engineN1[0]) || 85,
      n2: (flightState.engineN2 && flightState.engineN2[0]) || 90,
      egt: (flightState.engineEGT && flightState.engineEGT[0]) || 600
    },
    e2: {
      n1: (flightState.engineN1 && flightState.engineN1[1]) || 85,
      n2: (flightState.engineN2 && flightState.engineN2[1]) || 90,
      egt: (flightState.engineEGT && flightState.engineEGT[1]) || 600
    }
  };
  
  // Handle individual engine thrust changes
  const handleThrustChange = (engineIndex, delta) => {
    setDisplayThrottle(prev => {
      const engineKey = engineIndex === 0 ? 'e1' : 'e2';
      const newThrottle = Math.max(0, Math.min(100, prev[engineKey] + delta));
      const updatedThrottle = {
        ...prev,
        [engineKey]: newThrottle,
        // Sync other engine with damping
        e1: engineIndex === 1 ? Math.max(0, Math.min(100, prev.e1 + delta * 0.8)) : newThrottle,
        e2: engineIndex === 0 ? Math.max(0, Math.min(100, prev.e2 + delta * 0.8)) : newThrottle
      };
      
      // Send throttle as percentage (0-100) to physics engine
      controlThrust(newThrottle);
      
      return updatedThrottle;
    });
  };
  
  // Handle direct throttle set for a specific engine
  const handleDirectThrottleSet = (engineIndex, newThrottle) => {
    const engineKey = engineIndex === 0 ? 'e1' : 'e2';
    setDisplayThrottle(prev => ({
      ...prev,
      [engineKey]: newThrottle
    }));
    
    // Send throttle as percentage (0-100) to physics engine
    controlThrust(newThrottle);
  };
  
  // Helper function to create throttle lever for each engine
  const createThrottleLever = (engineIndex, engineKey, throttleValue) => {
    const engineName = engineKey === 'e1' ? 'E1' : 'E2';
    
    return React.createElement('div', { className: `throttle-control-${engineKey}`, style: {
      background: '#1a1a1a',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '15px',
      border: '1px solid #333'
    } },
      React.createElement('div', { className: 'throttle-display', style: {
        textAlign: 'center',
        marginBottom: '10px'
      } },
        React.createElement('div', { style: {
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#00ff00',
          fontFamily: 'monospace'
        } }, `${throttleValue.toFixed(1)}%`),
        React.createElement('div', { style: {
          fontSize: '12px',
          color: '#888'
        } }, `THRUST ${engineName}`)
      ),
      
      // Throttle lever-style control
      React.createElement('div', { className: 'throttle-lever', style: {
        position: 'relative',
        height: '120px',
        width: '40px',
        background: '#333',
        borderRadius: '20px',
        margin: '0 auto',
        border: '2px solid #555',
        userSelect: 'none', // Prevent text selection during drag
        cursor: 'grab'
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const leverElement = e.currentTarget;
        const rect = leverElement.getBoundingClientRect();
        
        // Store initial position for more accurate drag calculation
        const initialY = e.clientY;
        const initialThrottle = throttleValue;
        
        const handleMouseMove = (moveEvent) => {
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
          
          const deltaY = moveEvent.clientY - initialY;
          // Calculate throttle change based on drag distance
          const newThrottle = Math.max(0, Math.min(100, initialThrottle - (deltaY / rect.height) * 100));
          
          handleDirectThrottleSet(engineIndex, newThrottle);
        };
        
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = '';
        };
        
        // Set cursor style during drag
        document.body.style.cursor = 'grabbing';
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }},
        React.createElement('div', { style: {
          position: 'absolute',
          bottom: `${throttleValue}%`,
          left: '2px',
          right: '2px',
          height: '20px',
          background: 'linear-gradient(to top, #ff4444, #ffaa00, #00ff00)',
          borderRadius: '10px',
          transition: 'bottom 0.1s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        } }),
        React.createElement('div', { style: {
          position: 'absolute',
          bottom: `${throttleValue}%`,
          left: '-5px',
          width: '50px',
          height: '20px',
          background: '#fff',
          border: '2px solid #000',
          borderRadius: '10px',
          transform: 'translateY(50%)',
          cursor: 'grab',
          userSelect: 'none', // Prevent text selection
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold'
        } }, engineName)
      ),
      
      // Throttle adjustment buttons
      React.createElement('div', { className: 'throttle-buttons', style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '10px'
      } },
        React.createElement('button', {
          className: 'thrust-btn decrease',
          onClick: () => handleThrustChange(engineIndex, -5),
          disabled: flightState.autopilot || flightState.hasCrashed,
          style: {
            padding: '8px 12px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }
        }, '−'),
        React.createElement('button', {
          className: 'thrust-btn increase',
          onClick: () => handleThrustChange(engineIndex, 5),
          disabled: flightState.autopilot || flightState.hasCrashed,
          style: {
            padding: '8px 12px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }
        }, '+')
      )
    );
  };

  return React.createElement('div', { className: 'thrust-manager', style: {
    display: 'flex',
    gap: '10px',
    flexDirection: 'row'
  } },
    React.createElement('div', null, createThrottleLever(0, 'e1', displayThrottle.e1)),
    React.createElement('div', null, createThrottleLever(1, 'e2', displayThrottle.e2))
  );
};

export default ThrustManager;