import React, { useState, useEffect, useCallback } from 'react';

const ThrustManager = ({ controlThrust, flightState }) => {
  // ✅ CLEAN ARCHITECTURE: Single throttle state (reverted for responsiveness)
  // Internal state in 0-1 range (physics engine standard)
  const [throttle, setThrottle] = useState(0.47); // Default 47% idle
  
  // Display throttle as percentage (0-100)
  const displayThrottle = throttle * 100;
  
  // ✅ CLEAN ARCHITECTURE: Sync with flight state when it changes
  useEffect(() => {
    if (flightState?.throttle !== undefined) {
      const newThrottle = Array.isArray(flightState.throttle) ? flightState.throttle[0] : flightState.throttle;
      if (Math.abs(newThrottle - throttle) > 0.001) {
        console.log('🔄 ThrustManager: Syncing with flight state:', flightState.throttle);
        setThrottle(newThrottle);
      }
    }
  }, [flightState?.throttle, throttle]);
  
  // ✅ CLEAN ARCHITECTURE: Single throttle change handler
  const handleThrottleChange = useCallback((newThrottleValue) => {
    // Validate input (0-1 range for physics engine)
    const validatedThrottle = Math.max(0, Math.min(1, newThrottleValue));
    
    console.log(`🎯 ThrustManager: Single throttle change requested:`, {
      input: newThrottleValue,
      validated: validatedThrottle,
      display: (validatedThrottle * 100).toFixed(1) + '%'
    });
    
    setThrottle(validatedThrottle);
    
    // Send to physics engine via parent's controlThrust function
    if (controlThrust) {
      controlThrust(0, validatedThrottle); // Single engine, new throttle in 0-1 range
    }
  }, [controlThrust]);
  
  // ✅ CLEAN ARCHITECTURE: Handle direct throttle set (for click/drag)
  const handleDirectSet = useCallback((percentageValue) => {
    const normalizedValue = percentageValue / 100; // Convert percentage to 0-1
    handleThrottleChange(normalizedValue);
  }, [handleThrottleChange]);
  
  // ✅ CLEAN ARCHITECTURE: Handle throttle increment/decrement
  const handleIncrement = useCallback((delta) => {
    const newThrottle = throttle + delta;
    handleThrottleChange(newThrottle);
  }, [throttle, handleThrottleChange]);
  
  // ✅ ENHANCED: Engine parameters display (single engine)
  const getEngineParams = useCallback(() => {
    const n1 = flightState?.engineN1 || 22; // Default idle N1
    const n2 = flightState?.engineN2 || 45;
    const egt = flightState?.engineEGT || 400;
    
    return { n1, n2, egt };
  }, [flightState]);
  
  // ✅ CLEAN ARCHITECTURE: Create single smaller throttle lever
  const createThrottleLever = useCallback(() => {
    const engineParams = getEngineParams();
    const handleClick = (e) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const clickPercentage = Math.max(0, Math.min(100, (1 - clickY / rect.height) * 100));
      handleDirectSet(clickPercentage);
    };
    
    return React.createElement('div', {
      className: 'thrust-manager-container',
      style: {
        background: '#1a1a1a',
        padding: '15px',
        borderRadius: '12px',
        marginBottom: '15px',
        border: '2px solid #333',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        justifyContent: 'center'
      }
    },
      // Main throttle lever
      React.createElement('div', {
        className: 'thrust-lever-container',
        style: {
          background: '#1a1a1a',
          padding: '15px',
          borderRadius: '8px',
          border: '2px solid #333',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          minWidth: '150px'
        }
      },
        // Engine header
        React.createElement('div', {
          style: {
            textAlign: 'center',
            marginBottom: '15px'
          }
        },
          React.createElement('div', {
            style: {
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#00ff00',
              fontFamily: 'monospace',
              textShadow: '0 0 8px rgba(0,255,0,0.5)'
            }
          }, 'ENGINES'),
          React.createElement('div', {
            style: {
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#00ff00',
              fontFamily: 'monospace',
              textShadow: '0 0 8px rgba(0,255,0,0.5)'
            }
          }, `${displayThrottle.toFixed(1)}%`)
        ),
        
        // Interactive throttle lever
        React.createElement('div', {
          className: 'thrust-lever-interactive',
          style: {
            position: 'relative',
            height: '180px',
            width: '45px',
            background: '#2a2a2a',
            borderRadius: '22px',
            margin: '15px auto',
            border: '2px solid #555',
            cursor: 'pointer',
            userSelect: 'none'
          },
          onClick: handleClick
        },
          // Background scale
          React.createElement('div', {
            style: {
              position: 'absolute',
              top: '8px',
              left: '8px',
              right: '8px',
              bottom: '8px',
              background: 'linear-gradient(to top, #ff4444 0%, #ffaa00 50%, #00ff00 100%)',
              borderRadius: '15px',
              opacity: 0.3
            }
          }),
          
          // Current throttle position indicator
          React.createElement('div', {
            style: {
              position: 'absolute',
              bottom: `${displayThrottle}%`,
              left: '2px',
              right: '2px',
              height: '25px',
              background: 'linear-gradient(to top, #ff4444, #ffaa00, #00ff00)',
              borderRadius: '12px',
              transition: 'bottom 0.1s ease',
              boxShadow: '0 0 8px rgba(0,255,0,0.7)'
            }
          }),
          
          // Throttle handle
          React.createElement('div', {
            style: {
              position: 'absolute',
              bottom: `${displayThrottle}%`,
              left: '-8px',
              width: '60px',
              height: '25px',
              background: '#fff',
              border: '2px solid #000',
              borderRadius: '12px',
              transform: 'translateY(50%)',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#000',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
            }
          }, 'THR')
        ),
        
        // Control buttons
        React.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
            marginTop: '15px'
          }
        },
          React.createElement('button', {
            onClick: () => handleIncrement(-0.05), // -5%
            disabled: flightState?.autopilot || flightState?.hasCrashed,
            style: {
              flex: 1,
              padding: '10px 8px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'background 0.2s'
            }
          }, '−'),
          React.createElement('button', {
            onClick: () => handleIncrement(0.05), // +5%
            disabled: flightState?.autopilot || flightState?.hasCrashed,
            style: {
              flex: 1,
              padding: '10px 8px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'background 0.2s'
            }
          }, '+')
        ),
        
        // Engine parameters display
        React.createElement('div', {
          style: {
            marginTop: '12px',
            padding: '10px',
            background: '#0a0a0a',
            borderRadius: '6px',
            border: '1px solid #333'
          }
        },
          React.createElement('div', {
            style: {
              fontSize: '11px',
              color: '#888',
              marginBottom: '6px',
              textAlign: 'center'
            }
          }, 'ENGINE PARAMETERS'),
          React.createElement('div', {
            style: {
              fontSize: '11px',
              fontFamily: 'monospace',
              textAlign: 'center'
            }
          },
            React.createElement('div', {
              style: { color: '#00ff00' }
            }, `N1: ${engineParams.n1.toFixed(1)}%`),
            React.createElement('div', {
              style: { color: '#00ff00' }
            }, `N2: ${engineParams.n2.toFixed(1)}%`),
            React.createElement('div', {
              style: { color: '#ffaa00' }
            }, `EGT: ${engineParams.egt.toFixed(0)}°C`)
          )
        )
      ),
      
      // Debug info (only in development)
      process.env.NODE_ENV === 'development' && React.createElement('div', {
        style: {
          marginTop: '10px',
          padding: '8px',
          background: '#222',
          borderRadius: '4px',
          fontSize: '9px',
          fontFamily: 'monospace',
          color: '#666',
          position: 'absolute',
          top: '5px',
          right: '5px'
        }
      }, `Debug: ${throttle.toFixed(3)} (${displayThrottle.toFixed(1)}%)`)
    );
  }, [displayThrottle, throttle, flightState, handleIncrement, getEngineParams]);
  
  return createThrottleLever();

};

export default ThrustManager;