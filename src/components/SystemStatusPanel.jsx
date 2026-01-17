import React from 'react';

// System Status Panel Component
const SystemStatusPanel = ({ flightState }) => {
  // Safety check for flightState
  if (!flightState) return null;

  // Helper to safely format numbers with default value
  const formatValue = (val, decimals = 0) => (val != null && typeof val === 'number') ? val.toFixed(decimals) : '0';

  return React.createElement('div', { className: 'system-status-panel' },
    React.createElement('h3', null, 'System Status'),
    
    React.createElement('div', { className: 'system-grid' },
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Fuel'),
        React.createElement('span', { className: 'value' }, `${formatValue(flightState.fuel)}%`)
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Oil'),
        React.createElement('span', { className: 'value' }, `${formatValue(flightState.oilPressure)}psi`)
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Hyd'),
        React.createElement('span', { className: 'value' }, `${formatValue(flightState.hydraulicPressure)}psi`)
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Elec'),
        React.createElement('span', { className: 'value' }, `${formatValue(flightState.electricalVoltage, 1)}V`)
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Gear'),
        React.createElement('span', { 
          className: `value ${flightState.gearDown ? 'down' : 'up'}`
        }, flightState.gearDown ? 'DOWN' : 'UP')
      ),
      React.createElement('div', { className: 'system-item' },
        React.createElement('span', { className: 'label' }, 'Flaps'),
        React.createElement('span', { className: 'value' }, `${formatValue(flightState.flaps)}°`)
      )
    )
  );
};

export default SystemStatusPanel;