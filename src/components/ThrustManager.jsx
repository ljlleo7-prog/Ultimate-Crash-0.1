import React, { useState, useEffect } from 'react';

const ThrustManager = ({ controlThrust, flightState }) => {
  // Get current throttle from flight state (physics engine uses 0-1, display as percentage)
  const currentThrottle = (flightState.throttle || 47) / 100; // Convert from percentage to 0-1
  const [displayThrottle, setDisplayThrottle] = useState(47); // Display in percentage
  
  // Update display throttle when flightState changes
  useEffect(() => {
    if (flightState.throttle !== undefined) {
      setDisplayThrottle(flightState.throttle);
    }
  }, [flightState.throttle]);
  
  // Calculate engine parameters based on current throttle
  const calculateEngineParams = (throttleValue) => {
    // Convert throttle percentage to 0-1 for physics engine
    const normalizedThrottle = throttleValue / 100;
    
    // Calculate realistic engine parameters based on throttle
    // At cruise (47% displayed), engines run at ~85-90% N1
    const baseN1 = 85 + (normalizedThrottle - 0.47) * 30; // Base 85% at 47% displayed
    const baseN2 = 90 + (normalizedThrottle - 0.47) * 25; // Base 90% at 47% displayed
    const baseEGT = normalizedThrottle * 800 + 400; // EGT in °F
    
    return {
      n1: Math.min(100, Math.max(50, baseN1)),
      n2: Math.min(100, Math.max(50, baseN2)),
      egt: Math.min(900, Math.max(400, baseEGT))
    };
  };
  
  const engineParams = calculateEngineParams(displayThrottle);
  
  const handleThrustChange = (engineIndex, delta) => {
    const newThrottle = Math.max(0, Math.min(100, displayThrottle + delta));
    setDisplayThrottle(newThrottle);
    
    // Send normalized throttle (0-1) to physics engine
    controlThrust(engineIndex, newThrottle / 100);
  };
  
  const handleDirectThrottleSet = (newThrottle) => {
    setDisplayThrottle(newThrottle);
    // Send normalized throttle (0-1) to physics engine
    controlThrust(0, newThrottle / 100); // Use engine 0 as primary
  };
  
  return React.createElement('div', { className: 'thrust-manager' },
    React.createElement('h4', null, 'Thrust Management'),
    
    // Main throttle display and control
    React.createElement('div', { className: 'throttle-control-main', style: {
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
        } }, `${displayThrottle.toFixed(1)}%`),
        React.createElement('div', { style: {
          fontSize: '12px',
          color: '#888'
        } }, 'THRUST')
      ),
      
      // Throttle lever-style control
      React.createElement('div', { className: 'throttle-lever', style: {
        position: 'relative',
        height: '120px',
        width: '40px',
        background: '#333',
        borderRadius: '20px',
        margin: '0 auto',
        border: '2px solid #555'
      } },
        React.createElement('div', { style: {
          position: 'absolute',
          bottom: `${displayThrottle}%`,
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
          bottom: `${displayThrottle}%`,
          left: '-5px',
          width: '50px',
          height: '20px',
          background: '#fff',
          border: '2px solid #000',
          borderRadius: '10px',
          transform: 'translateY(50%)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold'
        } }, 'THR')
      ),
      
      // Throttle adjustment buttons
      React.createElement('div', { className: 'throttle-buttons', style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '10px'
      } },
        React.createElement('button', {
          className: 'thrust-btn decrease',
          onClick: () => handleThrustChange(0, -5),
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
          onClick: () => handleThrustChange(0, 5),
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
    ),
    
    // Engine parameters display
    React.createElement('div', { className: 'engine-parameters', style: {
      background: '#1a1a1a',
      padding: '10px',
      borderRadius: '8px',
      border: '1px solid #333'
    } },
      React.createElement('div', { style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        fontSize: '12px'
      } },
        React.createElement('div', null,
          React.createElement('div', { style: { color: '#888' } }, 'Engine 1 N1'),
          React.createElement('div', { 
            style: { 
              color: '#00ff00', 
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 'bold'
            } 
          }, `${engineParams.n1.toFixed(1)}%`)
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { color: '#888' } }, 'Engine 2 N1'),
          React.createElement('div', { 
            style: { 
              color: '#00ff00', 
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 'bold'
            } 
          }, `${engineParams.n1.toFixed(1)}%`)
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { color: '#888' } }, 'Engine 1 N2'),
          React.createElement('div', { 
            style: { 
              color: '#00aa00', 
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 'bold'
            } 
          }, `${engineParams.n2.toFixed(1)}%`)
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { color: '#888' } }, 'Engine 2 N2'),
          React.createElement('div', { 
            style: { 
              color: '#00aa00', 
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 'bold'
            } 
          }, `${engineParams.n2.toFixed(1)}%`)
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { color: '#888' } }, 'EGT °F'),
          React.createElement('div', { 
            style: { 
              color: '#ffaa00', 
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 'bold'
            } 
          }, `${engineParams.egt.toFixed(0)}`)
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { color: '#888' } }, 'Status'),
          React.createElement('div', { 
            style: { 
              color: '#10b981', 
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 'bold'
            } 
          }, 'NORM')
        )
      )
    )
  );
};

export default ThrustManager;