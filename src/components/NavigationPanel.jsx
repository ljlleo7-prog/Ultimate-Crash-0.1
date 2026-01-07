import React from 'react';

// Navigation Panel Component
const NavigationPanel = ({ flightState }) => {
  // Safe access to properties with defaults
  const groundSpeed = flightState?.groundSpeed || 0;
  const trueAirspeed = flightState?.trueAirspeed || 0;
  const heading = flightState?.heading || 0;
  const nextWaypoint = flightState?.nextWaypoint || 'N/A';
  const distanceToWaypoint = flightState?.distanceToWaypoint || 0;
  const timeToWaypoint = flightState?.timeToWaypoint || 0;
  
  return React.createElement('div', { className: 'navigation-panel' },
    React.createElement('h3', null, 'Navigation'),
    
    React.createElement('div', { className: 'nav-grid' },
      React.createElement('div', { className: 'nav-item' },
        React.createElement('span', { className: 'label' }, 'GS'),
        React.createElement('span', { className: 'value' }, `${groundSpeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'nav-item' },
        React.createElement('span', { className: 'label' }, 'TAS'),
        React.createElement('span', { className: 'value' }, `${trueAirspeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'nav-item' },
        React.createElement('span', { className: 'label' }, 'HDG'),
        React.createElement('span', { className: 'value' }, `${heading.toFixed(0)}°`)
      ),
      React.createElement('div', { className: 'nav-item' },
        React.createElement('span', { className: 'label' }, 'WPT'),
        React.createElement('span', { className: 'value' }, nextWaypoint)
      ),
      React.createElement('div', { className: 'nav-item large' },
        React.createElement('span', { className: 'label' }, 'DIST'),
        React.createElement('span', { className: 'value' }, `${distanceToWaypoint.toFixed(1)}nm`)
      ),
      React.createElement('div', { className: 'nav-item large' },
        React.createElement('span', { className: 'label' }, 'TIME'),
        React.createElement('span', { className: 'value' }, `${timeToWaypoint.toFixed(1)}min`)
      )
    )
  );
};

export default NavigationPanel;