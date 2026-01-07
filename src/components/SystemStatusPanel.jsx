import React from 'react';

// System Status Panel Component
const SystemStatusPanel = ({ flightState }) => {
  return React.createElement('div', { className: 'system-status-panel' },
    React.createElement('h3', null, 'System Status'),
    
    React.createElement('div', { className: 'system-grid' },
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Fuel'),
        React.createElement('span', { className: 'value' }, `${flightState.fuel.toFixed(0)}%`)
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Oil'),
        React.createElement('span', { className: 'value' }, `${flightState.oilPressure.toFixed(0)}psi`)
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Hyd'),
        React.createElement('span', { className: 'value' }, `${flightState.hydraulicPressure.toFixed(0)}psi`)
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Elec'),
        React.createElement('span', { className: 'value' }, `${flightState.electricalVoltage.toFixed(1)}V`)
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Gear'),
        React.createElement('span', { 
          className: `value ${flightState.gearDown ? 'down' : 'up'}`
        }, flightState.gearDown ? 'DOWN' : 'UP')
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Flaps'),
        React.createElement('span', { className: 'value' }, `${flightState.flaps}°`)
      )
    )
  );
};

export default SystemStatusPanel;