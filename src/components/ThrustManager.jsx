import React from 'react';

const ThrustManager = ({ controlThrust, flightState }) => {
  return React.createElement('div', { className: 'thrust-manager' },
    React.createElement('h4', null, 'Thrust Management'),
    React.createElement('div', { className: 'thrust-controls' },
      // Engine 1 controls
      React.createElement('div', { key: 'engine1', className: 'engine-control' },
        React.createElement('span', null, 'Engine 1:'),
        React.createElement('button', {
          className: 'thrust-btn decrease',
          onClick: () => controlThrust(0, -5),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '-'),
        React.createElement('span', { className: 'thrust-value' }, `${flightState.engineN1[0].toFixed(1)}%`),
        React.createElement('button', {
          className: 'thrust-btn increase',
          onClick: () => controlThrust(0, 5),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '+')
      ),
      
      // Engine 2 controls
      React.createElement('div', { key: 'engine2', className: 'engine-control' },
        React.createElement('span', null, 'Engine 2:'),
        React.createElement('button', {
          className: 'thrust-btn decrease',
          onClick: () => controlThrust(1, -5),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '-'),
        React.createElement('span', { className: 'thrust-value' }, `${flightState.engineN1[1].toFixed(1)}%`),
        React.createElement('button', {
          className: 'thrust-btn increase',
          onClick: () => controlThrust(1, 5),
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '+')
      ),
      
      // Both engines together
      React.createElement('div', { key: 'both-engines', className: 'engine-control both' },
        React.createElement('span', null, 'Both Engines:'),
        React.createElement('button', {
          className: 'thrust-btn decrease',
          onClick: () => {
            controlThrust(0, -5);
            controlThrust(1, -5);
          },
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '-'),
        React.createElement('span', { className: 'thrust-value' }, `${((flightState.engineN1[0] + flightState.engineN1[1]) / 2).toFixed(1)}%`),
        React.createElement('button', {
          className: 'thrust-btn increase',
          onClick: () => {
            controlThrust(0, 5);
            controlThrust(1, 5);
          },
          disabled: flightState.autopilot || flightState.hasCrashed
        }, '+')
      )
    )
  );
};

export default ThrustManager;