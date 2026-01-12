import React from 'react';

const ControlSurfacePanel = ({ controlFlaps, controlGear, controlAirBrakes, flightState }) => {
  // Multi-position lever component for flaps
  const MultiPositionLeverControl = ({ label, position, maxPosition, onToggle, positionLabels, colorMap }) => {
    const percentage = (position / maxPosition) * 100;
    const currentLabel = positionLabels[position];
    const currentColor = colorMap[position] || '#f59e0b';

    return React.createElement('div', { 
      style: { 
        marginBottom: '25px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      } 
    },
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: '600'
        } 
      },
        React.createElement('span', { style: { color: '#93c5fd' } }, label),
        React.createElement('span', { 
          style: { 
            color: currentColor,
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          } 
        }, currentLabel)
      ),
      
      // Lever housing with position markers
      React.createElement('div', { 
        style: { 
          position: 'relative',
          height: '140px',
          width: '45px',
          background: 'linear-gradient(180deg, #1e293b, #0f172a)',
          borderRadius: '22px',
          margin: '0 auto',
          border: '2px solid #3b82f6',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)',
          userSelect: 'none',
          cursor: 'grab'
        },
        onMouseDown: (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const leverElement = e.currentTarget;
          const rect = leverElement.getBoundingClientRect();
          
          const handleMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();
            
            // Calculate position based on mouse Y relative to lever housing
            const relativeY = moveEvent.clientY - rect.top;
            const relativePosition = 1 - (relativeY / rect.height);
            
            // Calculate new position with discrete steps
            const newPosition = Math.round(relativePosition * maxPosition);
            const clampedPosition = Math.max(0, Math.min(maxPosition, newPosition));
            
            if (clampedPosition !== position) {
              onToggle(clampedPosition);
            }
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
          };
          
          document.body.style.cursor = 'grabbing';
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
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
              bottom: `${markerPercentage}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '4px',
              height: '8px',
              background: isActive ? currentColor : '#475569',
              borderRadius: '2px',
              boxShadow: isActive ? `0 0 8px ${currentColor}` : 'none',
              transition: 'all 0.2s ease'
            }
          });
        }),
        
        // Lever handle
        React.createElement('div', { style: {
          position: 'absolute',
          bottom: `${percentage}%`,
          left: '-8px',
          width: '61px',
          height: '28px',
          background: `linear-gradient(135deg, ${currentColor}, ${currentColor}88)`,
          borderRadius: '14px',
          transform: 'translateY(50%) rotate(15deg)',
          border: '2px solid #1e293b',
          boxShadow: `0 4px 12px rgba(0, 0, 0, 0.8), 0 0 15px ${currentColor}44`,
          cursor: 'grab',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#ffffff',
          transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, transform 0.3s ease',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
        } }, label.substring(0, 3))
      )
    );
  };

  // Binary lever component for gear and speedbrakes
  const BinaryLeverControl = ({ label, position, onToggle, positionLabels, colorMap }) => {
    const isUp = position === 0;
    const percentage = isUp ? 0 : 100;
    const currentLabel = positionLabels[position];
    const currentColor = colorMap[position] || '#f59e0b';

    return React.createElement('div', { 
      style: { 
        marginBottom: '25px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      } 
    },
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: '600'
        } 
      },
        React.createElement('span', { style: { color: '#93c5fd' } }, label),
        React.createElement('span', { 
          style: { 
            color: currentColor,
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          } 
        }, currentLabel)
      ),
      
      // Lever housing with position markers
      React.createElement('div', { 
        style: { 
          position: 'relative',
          height: '120px',
          width: '45px',
          background: 'linear-gradient(180deg, #1e293b, #0f172a)',
          borderRadius: '22px',
          margin: '0 auto',
          border: '2px solid #3b82f6',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)',
          userSelect: 'none',
          cursor: 'pointer'
        },
        onClick: () => onToggle(isUp ? 1 : 0)
      },
        // Up marker
        React.createElement('div', {
          style: {
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '4px',
            height: '8px',
            background: isUp ? currentColor : '#475569',
            borderRadius: '2px',
            boxShadow: isUp ? `0 0 8px ${currentColor}` : 'none',
            transition: 'all 0.2s ease'
          }
        }),
        
        // Down marker
        React.createElement('div', {
          style: {
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '4px',
            height: '8px',
            background: !isUp ? currentColor : '#475569',
            borderRadius: '2px',
            boxShadow: !isUp ? `0 0 8px ${currentColor}` : 'none',
            transition: 'all 0.2s ease'
          }
        }),
        
        // Lever handle
        React.createElement('div', { style: {
          position: 'absolute',
          bottom: `${percentage}%`,
          left: '-8px',
          width: '61px',
          height: '26px',
          background: `linear-gradient(135deg, ${currentColor}, ${currentColor}88)`,
          borderRadius: '13px',
          transform: 'translateY(50%) rotate(15deg)',
          border: '2px solid #1e293b',
          boxShadow: `0 4px 10px rgba(0, 0, 0, 0.8), 0 0 12px ${currentColor}44`,
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#ffffff',
          transition: 'bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, transform 0.3s ease',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
        } }, label.substring(0, 3))
      )
    );
  };

  return React.createElement('div', { 
    className: 'control-surface-panel',
    style: {
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: '20px',
      margin: '10px',
      minWidth: '220px',
      color: 'white',
      fontFamily: 'Courier New, monospace',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
    }
  },
    // Title
    React.createElement('h3', { 
      style: { 
        margin: '0 0 25px 0', 
        textAlign: 'center',
        color: '#3b82f6',
        fontSize: '16px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        textShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
      } 
    }, 'Control Surfaces'),
    
    // Flaps Control - Multi-position lever
    React.createElement(MultiPositionLeverControl, {
      label: 'FLAPS',
      position: flightState.flaps || 0,
      maxPosition: 2,
      onToggle: controlFlaps,
      positionLabels: { 0: 'UP', 1: 'TO', 2: 'LDG' },
      colorMap: { 0: '#10b981', 1: '#f59e0b', 2: '#ef4444' }
    }),
    
    // Gear Control - Binary lever
    React.createElement(BinaryLeverControl, {
      label: 'GEAR',
      position: flightState.gear ? 1 : 0,
      onToggle: (value) => controlGear(value === 1),
      positionLabels: { 0: 'UP', 1: 'DOWN' },
      colorMap: { 0: '#10b981', 1: '#ef4444' }
    }),
    
    // Air Brakes Control - Binary lever
    React.createElement(BinaryLeverControl, {
      label: 'BRAKES',
      position: flightState.airBrakes || 0,
      onToggle: controlAirBrakes,
      positionLabels: { 0: 'RTCT', 1: 'EXT' },
      colorMap: { 0: '#10b981', 1: '#ef4444' }
    }),
    
    // Status Indicators
    React.createElement('div', { 
      style: { 
        marginTop: '20px',
        paddingTop: '15px',
        borderTop: '1px solid rgba(75, 85, 99, 0.5)',
        fontSize: '12px',
        color: '#94a3b8'
      } 
    },
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '4px',
          alignItems: 'center'
        } 
      },
        React.createElement('span', {}, 'Hydraulic Pressure:'),
        React.createElement('span', { 
          style: { 
            color: flightState.hydraulicPressure > 2000 ? '#10b981' : 
                   flightState.hydraulicPressure > 1000 ? '#f59e0b' : '#ef4444',
            fontWeight: 'bold'
          } 
        }, `${flightState.hydraulicPressure} PSI`)
      ),
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        } 
      },
        React.createElement('span', {}, 'System Status:'),
        React.createElement('span', { 
          style: { 
            color: flightState.hydraulicPressure > 1000 ? '#10b981' : '#ef4444',
            fontWeight: 'bold'
          } 
        }, flightState.hydraulicPressure > 1000 ? 'NORMAL' : 'FAILURE')
      )
    )
  );
};

export default ControlSurfacePanel;