import React, { useState } from 'react';

const ModernAutopilotModule = ({ flightState, setAutopilotTargets, toggleAutopilot }) => {
  const [targets, setTargets] = useState({
    ias: flightState.indicatedAirspeed,
    vs: flightState.verticalSpeed,
    altitude: flightState.altitude
  });

  const updateTarget = (type, value) => {
    const newTargets = { ...targets, [type]: value };
    setTargets(newTargets);
    if (setAutopilotTargets) {
      setAutopilotTargets(newTargets);
    }
  };

  return React.createElement('div', { className: 'modern-autopilot-module' },
    React.createElement('div', { className: 'autopilot-header' },
      React.createElement('button', {
        className: `ap-toggle-btn ${flightState.autopilot ? 'ap-engaged' : 'ap-disengaged'}`,
        onClick: toggleAutopilot,
        disabled: flightState.hasCrashed
      }, flightState.autopilot ? 'AP: ENGAGED' : 'AP: DISENGAGED'),
      React.createElement('span', { className: 'ap-status' }, flightState.autopilot ? 'ACTIVE' : 'STANDBY')
    ),
    
    React.createElement('div', { className: 'target-controls' },
      // IAS Target
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'IAS TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('ias', Math.max(150, targets.ias - 10)),
            disabled: !flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${targets.ias.toFixed(0)}`),
          React.createElement('button', {
            onClick: () => updateTarget('ias', Math.min(350, targets.ias + 10)),
            disabled: !flightState.autopilot
          }, '+')
        )
      ),
      
      // VS Target
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'VS TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('vs', Math.max(-4000, targets.vs - 500)),
            disabled: !flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${targets.vs >= 0 ? '+' : ''}${targets.vs.toFixed(0)}`),
          React.createElement('button', {
            onClick: () => updateTarget('vs', Math.min(4000, targets.vs + 500)),
            disabled: !flightState.autopilot
          }, '+')
        )
      ),
      
      // Altitude Target
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'ALT TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('altitude', Math.max(0, targets.altitude - 1000)),
            disabled: !flightState.autopilot
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${(targets.altitude / 1000).toFixed(1)}`),
          React.createElement('button', {
            onClick: () => updateTarget('altitude', Math.min(45000, targets.altitude + 1000)),
            disabled: !flightState.autopilot
          }, '+')
        )
      )
    )
  );
};

export default ModernAutopilotModule;