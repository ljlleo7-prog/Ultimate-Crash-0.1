import React from 'react';

const ControlSurfacePanel = ({ controlFlaps, controlGear, controlAirBrakes, flightState }) => {
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
        margin: '0 0 15px 0', 
        textAlign: 'center',
        color: '#3b82f6',
        fontSize: '16px'
      } 
    }, 'CONTROL SURFACES'),
    
    // Flaps Control
    React.createElement('div', { 
      style: { 
        marginBottom: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      } 
    },
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '14px'
        } 
      },
        React.createElement('span', {}, 'FLAPS'),
        React.createElement('span', { 
          style: { 
            color: flightState.flaps === 0 ? '#10b981' : 
                   flightState.flaps === 1 ? '#f59e0b' : '#ef4444'
          } 
        }, 
          flightState.flaps === 0 ? 'UP' : 
          flightState.flaps === 1 ? 'TO' : 'LDG'
        )
      ),
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          gap: '5px' 
        } 
      },
        React.createElement('button', {
          onClick: () => controlFlaps(0),
          style: {
            flex: 1,
            padding: '5px',
            background: flightState.flaps === 0 ? '#3b82f6' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }
        }, 'UP'),
        React.createElement('button', {
          onClick: () => controlFlaps(1),
          style: {
            flex: 1,
            padding: '5px',
            background: flightState.flaps === 1 ? '#3b82f6' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }
        }, 'TO'),
        React.createElement('button', {
          onClick: () => controlFlaps(2),
          style: {
            flex: 1,
            padding: '5px',
            background: flightState.flaps === 2 ? '#3b82f6' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }
        }, 'LDG')
      )
    ),
    
    // Gear Control
    React.createElement('div', { 
      style: { 
        marginBottom: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      } 
    },
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '14px'
        } 
      },
        React.createElement('span', {}, 'GEAR'),
        React.createElement('span', { 
          style: { 
            color: flightState.gear ? '#ef4444' : '#10b981'
          } 
        }, flightState.gear ? 'DOWN' : 'UP')
      ),
      React.createElement('button', {
        onClick: () => controlGear(!flightState.gear),
        style: {
          padding: '8px',
          background: flightState.gear ? '#ef4444' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      }, flightState.gear ? 'GEAR UP' : 'GEAR DOWN')
    ),
    
    // Air Brakes Control
    React.createElement('div', { 
      style: { 
        marginBottom: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      } 
    },
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '14px'
        } 
      },
        React.createElement('span', {}, 'AIR BRAKES'),
        React.createElement('span', { 
          style: { 
            color: flightState.airBrakes === 0 ? '#10b981' : '#ef4444'
          } 
        }, flightState.airBrakes === 0 ? 'RETRACTED' : 'EXTENDED')
      ),
      React.createElement('button', {
        onClick: () => controlAirBrakes(flightState.airBrakes === 0 ? 1 : 0),
        style: {
          padding: '8px',
          background: flightState.airBrakes === 0 ? '#10b981' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      }, flightState.airBrakes === 0 ? 'EXTEND BRAKES' : 'RETRACT BRAKES')
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