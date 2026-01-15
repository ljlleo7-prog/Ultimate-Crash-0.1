import React, { useState, useEffect } from 'react';

const ModernAutopilotModule = ({ flightState, setAutopilotTargets, toggleAutopilot }) => {
  const initialTargets = flightState?.autopilotTargets
    ? {
        ias: Number(flightState.autopilotTargets.ias) || Number(flightState.indicatedAirspeed) || 0,
        vs: Number(flightState.autopilotTargets.vs) || Number(flightState.verticalSpeed) || 0,
        altitude: Number(flightState.autopilotTargets.altitude) || Number(flightState.altitude) || 0
      }
    : {
        ias: Number(flightState.indicatedAirspeed) || 0,
        vs: Number(flightState.verticalSpeed) || 0,
        altitude: Number(flightState.altitude) || 0
      };

  const [targets, setTargets] = useState(initialTargets);

  // Only sync targets from flightState if they are explicitly provided by the physics service
  // and differ from our local state. We remove current airspeed/alt/vs from dependencies
  // to prevent the target from "following" the current state.
  useEffect(() => {
    if (flightState?.autopilotTargets) {
      setTargets(prev => {
        const newIas = Number(flightState.autopilotTargets.ias);
        const newVs = Number(flightState.autopilotTargets.vs);
        const newAlt = Number(flightState.autopilotTargets.altitude);
        
        // Only update if the values are actually different and not zero
         // (0 is often the default before targets are set)
         return {
           ias: (!isNaN(newIas) && newIas > 0) ? newIas : prev.ias,
           vs: !isNaN(newVs) ? newVs : prev.vs,
           altitude: (!isNaN(newAlt) && newAlt > 0) ? newAlt : prev.altitude
         };
       });
     }
   }, [flightState?.autopilotTargets]);

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
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'IAS TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('ias', Math.max(150, targets.ias - 10)),
            disabled: flightState.hasCrashed
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${targets.ias.toFixed(0)}`),
          React.createElement('button', {
            onClick: () => updateTarget('ias', Math.min(350, targets.ias + 10)),
            disabled: flightState.hasCrashed
          }, '+')
        )
      ),
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'VS TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('vs', Math.max(-4000, targets.vs - 500)),
            disabled: flightState.hasCrashed
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${targets.vs >= 0 ? '+' : ''}${targets.vs.toFixed(0)}`),
          React.createElement('button', {
            onClick: () => updateTarget('vs', Math.min(4000, targets.vs + 500)),
            disabled: flightState.hasCrashed
          }, '+')
        )
      ),
      React.createElement('div', { className: 'target-group' },
        React.createElement('label', null, 'ALT TGT'),
        React.createElement('div', { className: 'target-control' },
          React.createElement('button', {
            onClick: () => updateTarget('altitude', Math.max(0, targets.altitude - 1000)),
            disabled: flightState.hasCrashed
          }, '-'),
          React.createElement('span', { className: 'target-value' }, `${(targets.altitude / 1000).toFixed(1)}`),
          React.createElement('button', {
            onClick: () => updateTarget('altitude', Math.min(45000, targets.altitude + 1000)),
            disabled: flightState.hasCrashed
          }, '+')
        )
      )
    )
  );
};

export default ModernAutopilotModule;
