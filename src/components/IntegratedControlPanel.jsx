import React from 'react';
import ThrustManager from './ThrustManager';
import ControlSurfacePanel from './ControlSurfacePanel';

const IntegratedControlPanel = ({ controlThrust, controlFlaps, controlGear, controlAirBrakes, flightState }) => {
  return React.createElement('div', { className: 'integrated-control-panel', style: {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    background: 'rgba(0,0,0,0.8)',
    borderRadius: '8px',
    border: '1px solid #333',
    overflow: 'hidden',
    flexWrap: 'wrap'
  } },
    // Thrust Manager section
    React.createElement('div', { style: {
      flex: 1,
      minWidth: '250px'
    } },
      React.createElement(ThrustManager,
        {
          controlThrust: controlThrust,
          flightState: flightState
        }
      )
    ),
    
    // Control Surfaces section
    React.createElement('div', { style: {
      minWidth: '250px'
    } },
      React.createElement(ControlSurfacePanel,
        {
          controlFlaps: controlFlaps,
          controlGear: controlGear,
          controlAirBrakes: controlAirBrakes,
          flightState: flightState
        }
      )
    )
  );
};

export default IntegratedControlPanel;