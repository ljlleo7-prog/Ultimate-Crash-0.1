import React, { useState, useEffect } from 'react';
import aircraftService from '../services/aircraftService';

const ControlSurfacePanel = ({ controlFlaps, controlGear, controlAirBrakes, controlTrim, flightState, aircraftModel }) => {
  const [flapProfile, setFlapProfile] = useState(null);
  const [airbrakeProfile, setAirbrakeProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Trim state
  const trimValue = flightState?.trimValue || 0;

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const profiles = await aircraftService.getControlSurfaceProfiles(aircraftModel || 'Boeing 737-800');
        setFlapProfile(profiles.flaps);
        setAirbrakeProfile(profiles.airbrakes);
      } catch (error) {
        console.error('Error fetching aircraft profiles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [aircraftModel]);

  // Lever control component (compact version)
  const LeverControl = ({ label, position, maxPosition, onToggle, positionLabels, colorMap, height = 90 }) => {
    const percentage = (position / maxPosition) * 100;
    const currentLabel = positionLabels[position] || position;
    const currentColor = colorMap[position] || '#f59e0b';

    return React.createElement('div', { 
      style: { 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        width: '60px'
      } 
    },
      // Label and value
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          height: '30px',
          justifyContent: 'center'
        } 
      },
        React.createElement('span', { style: { color: '#93c5fd', marginBottom: '2px' } }, label),
        React.createElement('span', { 
          style: { 
            color: currentColor,
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1px 4px',
            borderRadius: '3px',
            fontSize: '9px'
          } 
        }, currentLabel)
      ),
      
      // Lever housing
      React.createElement('div', { 
        style: { 
          position: 'relative',
          height: `${height}px`,
          width: '32px',
          background: 'linear-gradient(180deg, #1e293b, #0f172a)',
          borderRadius: '16px',
          border: '1px solid #3b82f6',
          boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.6)',
          userSelect: 'none',
          cursor: 'pointer'
        },
        onMouseDown: (e) => {
          console.log(`LeverControl: onMouseDown for ${label}`, { clientY: e.clientY, maxPosition, position });
          e.preventDefault();
          e.stopPropagation();
          
          const leverElement = e.currentTarget;
          const rect = leverElement.getBoundingClientRect();
          
          const handleUpdate = (clientY) => {
            const relativeY = clientY - rect.top;
            // Invert the calculation: top of the lever is 0, bottom is maxPosition
            const invertedRelativePosition = (relativeY / rect.height);
            const newPosition = Math.round(invertedRelativePosition * maxPosition);
            const clampedPosition = Math.max(0, Math.min(maxPosition, newPosition));
            
            if (clampedPosition !== position) {
              console.log(`LeverControl: onToggle for ${label} with new position ${clampedPosition}`);
              onToggle(clampedPosition);
            }
          };

          handleUpdate(e.clientY);
          
          const handleMouseMove = (moveEvent) => {
            console.log(`LeverControl: handleMouseMove for ${label}`, { clientY: moveEvent.clientY });
            handleUpdate(moveEvent.clientY);
          };
          
          const handleMouseUp = () => {
            console.log(`LeverControl: handleMouseUp for ${label}`);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
          };
          
          document.body.style.cursor = 'grabbing';
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        },
        onClick: (e) => {
          if (maxPosition === 1) {
            onToggle(position === 0 ? 1 : 0);
          }
        }
      },
        // Position markers
        Array.from({ length: maxPosition + 1 }).map((_, index) => {
          const markerPercentage = (index / maxPosition) * 100;
          const isActive = index === position;
          return React.createElement('div', {
            key: index,
            style: {
              position: 'absolute',
              top: `${markerPercentage}%`, // Changed from bottom to top
              left: '50%',
              transform: 'translateX(-50%)',
              width: '3px',
              height: '5px',
              background: isActive ? currentColor : '#475569',
              borderRadius: '1px',
              boxShadow: isActive ? `0 0 4px ${currentColor}` : 'none',
              transition: 'all 0.2s ease',
              zIndex: 1
            }
          });
        }),
        
        // Lever handle
        React.createElement('div', { style: {
          position: 'absolute',
          top: `${percentage}%`, // Changed from bottom to top
          left: '-5px',
          width: '42px',
          height: '18px',
          background: `linear-gradient(135deg, ${currentColor}, ${currentColor}88)`,
          borderRadius: '9px',
          transform: 'translateY(-50%) rotate(10deg)', // Adjusted translateY for top positioning
          border: '1px solid #1e293b',
          boxShadow: `0 2px 6px rgba(0, 0, 0, 0.8), 0 0 8px ${currentColor}44`,
          cursor: 'grab',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          fontWeight: 'bold',
          color: '#ffffff',
          transition: 'top 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease', // Changed bottom to top
          textShadow: '0 1px 1px rgba(0, 0, 0, 0.8)',
          zIndex: 2
        } }, label.substring(0, 3))
      )
    );
  };

  // Custom Trim Wheel Component (360-degree full wheel)
  const TrimWheelControl = ({ value, onChange }) => {
    // Value is in radians (approx -0.2 to 0.2)
    // 1 Unit = 0.01 radians (as per user request)
    // 1 Revolution (360deg) = 1 Unit = 0.01 rad
    const radPerRev = 0.01;
    const rotation = (value / radPerRev) * 360;

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = -e.deltaY; // Scroll up = positive trim (nose up)
        const sensitivity = 0.5; // Degrees per pixel/tick
        const newRotation = rotation + (delta * sensitivity);
        const newValue = (newRotation / 360) * radPerRev;
        // Clamp to +/- 0.2 rad (approx +/- 11.5 deg)
        const clamped = Math.max(-0.2, Math.min(0.2, newValue));
        // Send normalized value (-1 to 1) to match useAircraftPhysics setTrim expectation
        onChange(clamped / 0.2);
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      const wheel = e.currentTarget;
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const getAngle = (clientX, clientY) => {
        const x = clientX - centerX;
        const y = clientY - centerY;
        return Math.atan2(y, x) * (180 / Math.PI);
      };

      let lastAngle = getAngle(e.clientX, e.clientY);
      let currentRotation = rotation;

      const handleMouseMove = (moveEvent) => {
        const angle = getAngle(moveEvent.clientX, moveEvent.clientY);
        let delta = angle - lastAngle;
        
        // Handle wrap around for continuous rotation
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        // Update rotation
        currentRotation += delta;
        lastAngle = angle;

        // Calculate new trim value
        const newValue = (currentRotation / 360) * radPerRev;
        const clamped = Math.max(-0.2, Math.min(0.2, newValue));
        
        // Send normalized value (-1 to 1)
        onChange(clamped / 0.2);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };

      document.body.style.cursor = 'grabbing';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    return React.createElement('div', {
        style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '80px' // Slightly wider container
        }
    }, 
        // Label
        React.createElement('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: '10px',
                fontWeight: 'bold'
            }
        },
            React.createElement('span', { style: { color: '#93c5fd' } }, 'TRIM'),
            React.createElement('span', { 
                style: { 
                    color: '#f59e0b',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '2px',
                    minWidth: '40px',
                    textAlign: 'center'
                } 
            }, (value * 100).toFixed(1)) // Show "Units" (1 unit = 0.01 rad)
        ),
        
        // Wheel Container
        React.createElement('div', {
            style: {
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
                border: '4px solid #475569',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.8)',
                position: 'relative',
                cursor: 'grab',
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.05s linear' // Smooth update
            },
            onMouseDown: handleMouseDown,
            onWheel: handleWheel
        },
            // Wheel Texture/Details
            // 1. Outer Ring (Draggable Area visual cue)
            React.createElement('div', {
                style: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    borderRadius: '50%',
                    border: '2px dashed #64748b',
                    opacity: 0.5
                }
            }),
            // 2. Main Indicator (White Line)
            React.createElement('div', {
                style: {
                    position: 'absolute',
                    top: '5px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    height: '15px',
                    background: '#ffffff',
                    borderRadius: '2px',
                    boxShadow: '0 0 4px rgba(255,255,255,0.5)'
                }
            }),
            // 3. Center Hub
            React.createElement('div', {
                style: {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#0f172a',
                    border: '1px solid #475569'
                }
            })
        )
    );
  };

  if (loading) {
    return React.createElement('div', { className: 'control-surface-panel', style: { minWidth: '220px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', borderRadius: '10px', color: '#93c5fd' } }, 'Loading Aircraft Data...');
  }

  // Prepare Flap Labels
  const flapLabels = flapProfile?.positions.reduce((acc, pos, idx) => {
    acc[idx] = pos.label;
    return acc;
  }, {}) || { 0: 'UP', 1: 'TO', 2: 'LDG' };

  const flapMax = (flapProfile?.positions.length || 3) - 1;

  // Prepare Airbrake Labels
  const airbrakeLabels = airbrakeProfile?.positions 
    ? airbrakeProfile.positions.reduce((acc, pos, idx) => {
        acc[idx] = pos.label;
        return acc;
      }, {})
    : (airbrakeProfile?.hasTwoTier 
        ? { 0: 'RET', 1: 'ARM', 2: 'FLT', 3: 'GND' } 
        : { 0: 'RET', 1: 'EXT' });
  
  const airbrakeMax = airbrakeProfile?.positions 
    ? airbrakeProfile.positions.length - 1
    : (airbrakeProfile?.hasTwoTier ? 3 : 1);

  return React.createElement('div', { 
    className: 'control-surface-panel',
    style: {
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      border: '2px solid #475569',
      borderRadius: '10px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'row',
      gap: '15px',
      color: 'white',
      fontFamily: 'Courier New, monospace',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      alignItems: 'flex-start'
    }
  },
    // Left side: Controls in a row
    React.createElement('div', { style: { display: 'flex', flexDirection: 'row', gap: '15px' } },
      // Flaps
      React.createElement(LeverControl, {
        label: 'FLAPS',
        position: flightState.flapsValue || 0,
        maxPosition: flapMax,
        onToggle: controlFlaps,
        positionLabels: flapLabels,
        colorMap: { 0: '#10b981', [flapMax]: '#ef4444' }
      }),
      
      // Gear
      React.createElement(LeverControl, {
        label: 'GEAR',
        position: flightState.gearValue ? 1 : 0,
        maxPosition: 1,
        onToggle: (val) => controlGear(val === 1),
        positionLabels: { 0: 'UP', 1: 'DN' },
        colorMap: { 0: '#10b981', 1: '#ef4444' }
      }),
      
      // Airbrakes
      React.createElement(LeverControl, {
        label: 'BRAKES',
        position: flightState.airBrakesValue || 0,
        maxPosition: airbrakeMax,
        onToggle: controlAirBrakes,
        positionLabels: airbrakeLabels,
        colorMap: { 0: '#10b981', [airbrakeMax]: '#ef4444' }
      }),

      // Trim Wheel (Custom UI)
      React.createElement(TrimWheelControl, {
        value: trimValue,
        onChange: controlTrim
      })
    ),
    
    // Right side: Status Info (Vertical)
    React.createElement('div', { 
      style: { 
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingLeft: '12px',
        borderLeft: '1px solid rgba(75, 85, 99, 0.5)',
        minWidth: '110px'
      } 
    },
      React.createElement('div', { style: { fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '2px' } }, 'SYSTEMS'),
      
      React.createElement('div', { style: { fontSize: '9px', display: 'flex', justifyContent: 'space-between' } },
        React.createElement('span', { style: { color: '#94a3b8' } }, 'HYD:'),
        React.createElement('span', { style: { color: flightState.hydraulicPressure > 2000 ? '#10b981' : '#ef4444', fontWeight: 'bold' } }, `${flightState.hydraulicPressure}`)
      ),
      
      React.createElement('div', { style: { fontSize: '9px', display: 'flex', justifyContent: 'space-between' } },
        React.createElement('span', { style: { color: '#94a3b8' } }, 'STATUS:'),
        React.createElement('span', { style: { color: flightState.hydraulicPressure > 1000 ? '#10b981' : '#ef4444', fontWeight: 'bold' } }, flightState.hydraulicPressure > 1000 ? 'OK' : 'FAIL')
      ),

      React.createElement('div', { style: { fontSize: '9px', marginTop: '4px', color: '#60a5fa', fontStyle: 'italic', maxWidth: '100px' } }, aircraftModel?.substring(0, 15) || 'B737-800')
    )
  );
};

export default ControlSurfacePanel;
