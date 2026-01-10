import React from 'react';

const ControlSurfacePanel = ({ controlFlaps, controlGear, controlAirBrakes, flightState }) => {
  // Helper function to create a lever control
  const createLeverControl = (label, currentValue, minValue, maxValue, step, onValueChange, positionLabels = null) => {
    // Calculate lever position as percentage
    const percentage = ((currentValue - minValue) / (maxValue - minValue)) * 100;
    
    // Get label for current position if positionLabels is provided
    const currentLabel = positionLabels ? positionLabels[currentValue] : `${currentValue}`;
    
    return React.createElement('div', { 
      style: { 
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      } 
    },
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '14px'
        } 
      },
        React.createElement('span', {}, label),
        React.createElement('span', { 
          style: { 
            color: currentValue === minValue ? '#10b981' : 
                   currentValue === maxValue ? '#ef4444' : '#f59e0b'
          } 
        }, currentLabel)
      ),
      
      // Lever control
      React.createElement('div', { 
        style: { 
          position: 'relative',
          height: '120px',
          width: '40px',
          background: '#333',
          borderRadius: '20px',
          margin: '0 auto',
          border: '2px solid #555',
          userSelect: 'none',
          cursor: 'grab'
        },
        onMouseDown: (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const leverElement = e.currentTarget;
          const rect = leverElement.getBoundingClientRect();
          
          const initialY = e.clientY;
          const initialValue = currentValue;
          
          const handleMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();
            
            const deltaY = moveEvent.clientY - initialY;
            // Calculate value change based on drag distance
            const valueRange = maxValue - minValue;
            const valueChange = Math.round((deltaY / rect.height) * valueRange / step) * step;
            
            const newValue = Math.max(minValue, Math.min(maxValue, initialValue - valueChange));
            
            onValueChange(newValue);
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
        React.createElement('div', { style: {
          position: 'absolute',
          bottom: `${percentage}%`,
          left: '2px',
          right: '2px',
          height: '20px',
          background: 'linear-gradient(to top, #ef4444, #f59e0b, #10b981)',
          borderRadius: '10px',
          transition: 'bottom 0.1s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        } }),
        React.createElement('div', { style: {
          position: 'absolute',
          bottom: `${percentage}%`,
          left: '-5px',
          width: '50px',
          height: '20px',
          background: '#fff',
          border: '2px solid #000',
          borderRadius: '10px',
          transform: 'translateY(50%)',
          cursor: 'grab',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold'
        } }, label.substring(0, 3))
      )
    );
  };

  return React.createElement('div', { 
    className: 'control-surface-panel',
    style: {
      background: 'rgba(0, 0, 0, 0.8)',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      padding: '15px',
      margin: '10px',
      minWidth: '200px',
      color: 'white',
      fontFamily: 'Courier New, monospace'
    }
  },
    // Title
    React.createElement('h3', { 
      style: { 
        margin: '0 0 20px 0', 
        textAlign: 'center',
        color: '#3b82f6',
        fontSize: '16px'
      } 
    }, 'CONTROL SURFACES'),
    
    // Flaps Control - Lever style
    createLeverControl(
      'FLAPS',
      flightState.flaps || 0,
      0,
      2,
      1,
      controlFlaps,
      { 0: 'UP', 1: 'TO', 2: 'LDG' }
    ),
    
    // Gear Control - Lever style
    createLeverControl(
      'GEAR',
      flightState.gear ? 1 : 0,
      0,
      1,
      1,
      (value) => controlGear(value === 1),
      { 0: 'UP', 1: 'DOWN' }
    ),
    
    // Air Brakes Control - Lever style
    createLeverControl(
      'BRAKES',
      flightState.airBrakes || 0,
      0,
      1,
      1,
      controlAirBrakes,
      { 0: 'RTCT', 1: 'EXT' }
    ),
    
    // Status Indicators
    React.createElement('div', { 
      style: { 
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #374151',
        fontSize: '12px',
        color: '#9ca3af'
      } 
    },
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '3px'
        } 
      },
        React.createElement('span', {}, 'Hydraulic Pressure:'),
        React.createElement('span', { 
          style: { 
            color: flightState.hydraulicPressure > 2000 ? '#10b981' : 
                   flightState.hydraulicPressure > 1000 ? '#f59e0b' : '#ef4444'
          } 
        }, `${flightState.hydraulicPressure} PSI`)
      ),
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between'
        } 
      },
        React.createElement('span', {}, 'System Status:'),
        React.createElement('span', { 
          style: { 
            color: flightState.hydraulicPressure > 1000 ? '#10b981' : '#ef4444'
          } 
        }, flightState.hydraulicPressure > 1000 ? 'NORMAL' : 'FAILURE')
      )
    )
  );
};

export default ControlSurfacePanel;