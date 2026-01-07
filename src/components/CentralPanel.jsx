import React from 'react';

// Central Panel Component
const CentralPanel = ({ flightState }) => {
  // FIXED: Add safety check for undefined alarms
  const alarms = flightState.alarms || [];
  
  return React.createElement('div', { className: 'central-panel' },
    React.createElement('h3', null, 'Engine & Systems'),
    
    // Engine Parameters
    React.createElement('div', { className: 'engine-params' },
      React.createElement('div', { className: 'engine-group' },
        React.createElement('h4', null, 'Engine 1'),
        React.createElement('div', { className: 'engine-data' },
          React.createElement('span', null, `N1: ${flightState.engineN1[0].toFixed(1)}%`),
          React.createElement('span', null, `N2: ${flightState.engineN2[0].toFixed(1)}%`),
          React.createElement('span', null, `EGT: ${flightState.engineEGT[0].toFixed(0)}°`)
        )
      ),
      React.createElement('div', { className: 'engine-group' },
        React.createElement('h4', null, 'Engine 2'),
        React.createElement('div', { className: 'engine-data' },
          React.createElement('span', null, `N1: ${flightState.engineN1[1].toFixed(1)}%`),
          React.createElement('span', null, `N2: ${flightState.engineN2[1].toFixed(1)}%`),
          React.createElement('span', null, `EGT: ${flightState.engineEGT[1].toFixed(0)}°`)
        )
      )
    ),
    
    // Fuel
    React.createElement('div', { className: 'fuel-display' },
      React.createElement('span', { className: 'label' }, 'FUEL'),
      React.createElement('span', { className: 'value' }, `${flightState.fuel.toFixed(0)}kg`)
    ),
    
    // Error Log
    React.createElement('div', { className: 'error-log' },
      React.createElement('h4', null, 'System Status'),
      React.createElement('div', { className: 'status-items' },
        alarms.length > 0 
          ? alarms.map((alarm, index) => 
              React.createElement('div', { key: index, className: 'alarm-item' }, alarm)
            )
          : React.createElement('span', { className: 'status-ok' }, 'ALL SYSTEMS NORMAL')
      )
    )
  );
};

export default CentralPanel;