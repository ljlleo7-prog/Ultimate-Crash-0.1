import React, { useState, useEffect } from 'react';

const ModernAutopilotModule = ({ flightState, setAutopilotTargets, toggleAutopilot, setAutopilotMode, setAltimeter, frequencyContext }) => {
  const initialTargets = flightState?.autopilotTargets
    ? {
        ias: Number(flightState.autopilotTargets.ias) || Number(flightState.indicatedAirspeed) || 0,
        vs: Number(flightState.autopilotTargets.vs) || Number(flightState.verticalSpeed) || 0,
        altitude: Number(flightState.autopilotTargets.altitude) || Number(flightState.altitude) || 0,
        heading: Number(flightState.autopilotTargets.heading) || Number(flightState.heading) || 0
      }
    : {
        ias: Number(flightState.indicatedAirspeed) || 0,
        vs: Number(flightState.verticalSpeed) || 0,
        altitude: Number(flightState.altitude) || 0,
        heading: Number(flightState.heading) || 0
      };

  const [targets, setTargets] = useState(initialTargets);
  const [ilsRunway, setIlsRunway] = useState('');

  // Only sync targets from flightState if they are explicitly provided by the physics service
  // and differ from our local state. We remove current airspeed/alt/vs from dependencies
  // to prevent the target from "following" the current state.
  const currentMode = flightState.autopilotMode || 'LNAV';

  useEffect(() => {
    if (availableRunways && availableRunways.length > 0) {
        // If no runway selected, or selected runway is not in the new list (e.g. airport changed)
        if (!ilsRunway || !availableRunways.includes(ilsRunway)) {
            const defaultRunway = availableRunways[0];
            setIlsRunway(defaultRunway);
            if (setILSRunway && selectedArrival) {
                setILSRunway(selectedArrival.iata || selectedArrival.icao, defaultRunway);
            }
        }
    }
  }, [availableRunways, selectedArrival, ilsRunway]);

  const handleRunwayChange = (e) => {
      const newRunway = e.target.value;
      setIlsRunway(newRunway);
      if (setILSRunway && selectedArrival) {
          setILSRunway(selectedArrival.iata || selectedArrival.icao, newRunway);
      }
  };

  useEffect(() => {
    if (flightState?.autopilotTargets) {
      setTargets(prev => {
        const newIas = Number(flightState.autopilotTargets.ias);
        const newVs = Number(flightState.autopilotTargets.vs);
        const newAlt = Number(flightState.autopilotTargets.altitude);
        const newHdg = Number(flightState.autopilotTargets.heading);
        
        // In HDG mode, do NOT update heading from props unless local heading is invalid (0).
        // This prevents the "sync with flight direction" issue if the backend echos current heading.
        const shouldUpdateHeading = !isNaN(newHdg) && (currentMode === 'LNAV' || prev.heading === 0);

        return {
           ias: (!isNaN(newIas) && newIas > 0) ? newIas : prev.ias,
           vs: !isNaN(newVs) ? newVs : prev.vs,
           altitude: (!isNaN(newAlt) && newAlt > 0) ? newAlt : prev.altitude,
           heading: shouldUpdateHeading ? newHdg : prev.heading
         };
       });
     }
   }, [flightState?.autopilotTargets, currentMode]);

  const updateTarget = (type, value) => {
    const newTargets = { ...targets, [type]: value };
    setTargets(newTargets);
    if (setAutopilotTargets) {
      setAutopilotTargets(newTargets);
    }
  };
  
  // const currentMode = flightState.autopilotMode || 'LNAV'; // Moved up

  return React.createElement('div', { 
    className: 'modern-autopilot-module',
    style: {
      padding: '8px',
      background: 'rgba(15, 23, 42, 0.9)',
      borderRadius: '8px',
      border: '1px solid #334155',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: 'fit-content'
    }
  },
    // Header Row: Toggle and Mode Status
    React.createElement('div', { 
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: '12px',
        borderBottom: '1px solid #334155',
        paddingBottom: '6px'
      } 
    },
      React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        React.createElement('button', {
          style: {
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '4px',
            cursor: 'pointer',
            background: flightState.autopilot ? '#22c55e' : '#334155',
            color: 'white',
            border: flightState.autopilot ? '1px solid #4ade80' : '1px solid #475569',
            boxShadow: flightState.autopilot ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none',
            transition: 'all 0.2s'
          },
          onClick: toggleAutopilot,
          disabled: flightState.hasCrashed
        }, flightState.autopilot ? 'AP ON' : 'AP OFF'),
        
        // APP Mode Button
        React.createElement('button', {
          style: {
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            borderRadius: '4px',
            cursor: 'pointer',
            background: currentMode === 'ILS' ? '#f59e0b' : '#334155', 
            color: 'white',
            border: currentMode === 'ILS' ? '1px solid #fbbf24' : '1px solid #475569',
            transition: 'all 0.2s',
            opacity: frequencyContext === 'TOWER' ? 1 : 0.5
          },
          onClick: () => {
              if (frequencyContext === 'TOWER') {
                  setAutopilotMode && setAutopilotMode(currentMode === 'ILS' ? 'HDG' : 'ILS');
              }
          },
          disabled: flightState.hasCrashed || frequencyContext !== 'TOWER',
          title: frequencyContext !== 'TOWER' ? 'Requires Tower Frequency' : 'Approach Mode'
        }, 'APP'),

        // Mode Toggle
        React.createElement('button', {
          style: {
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            borderRadius: '4px',
            cursor: 'pointer',
            background: currentMode === 'LNAV' ? '#3b82f6' : '#8b5cf6',
            color: 'white',
            border: 'none',
            transition: 'all 0.2s'
          },
          onClick: () => setAutopilotMode && setAutopilotMode(currentMode === 'LNAV' ? 'HDG' : 'LNAV'),
          disabled: flightState.hasCrashed
        }, currentMode)
      ),
      
      React.createElement('div', {
        style: {
          fontSize: '10px',
          color: flightState.autopilot ? '#22c55e' : '#94a3b8',
          fontWeight: 'bold',
          letterSpacing: '0.05em'
        }
      }, flightState.autopilot ? '● ACTIVE' : '○ STANDBY')
    ),
    
    // Controls Row: IAS, VS, ALT, HDG in a compact row
    React.createElement('div', { 
      style: { 
        display: 'flex', 
        gap: '16px',
        alignItems: 'flex-start'
      } 
    },
      // IAS Group
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', width: '70px' } },
        React.createElement('label', { style: { fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' } }, 'SPD (KTS)'),
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            background: '#0f172a',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid #1e293b'
          } 
        },
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => updateTarget('ias', Math.max(150, targets.ias - 5)),
            disabled: flightState.hasCrashed
          }, '-'),
          React.createElement('span', { 
            style: { 
              flex: 1, 
              textAlign: 'center', 
              fontSize: '13px', 
              color: '#f8fafc', 
              fontFamily: 'monospace',
              fontWeight: 'bold'
            } 
          }, `${targets.ias.toFixed(0)}`),
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => updateTarget('ias', Math.min(350, targets.ias + 5)),
            disabled: flightState.hasCrashed
          }, '+')
        )
      ),

      // HDG Group
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', width: '70px' } },
        React.createElement('label', { style: { fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' } }, 'HDG'),
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            background: '#0f172a',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid #1e293b'
          } 
        },
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: isILS ? '#475569' : '#64748b', cursor: isILS ? 'not-allowed' : 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => updateTarget('heading', (targets.heading - 5 + 360) % 360),
            disabled: flightState.hasCrashed || isILS
          }, '-'),
          React.createElement('span', { 
            style: { 
              flex: 1, 
              textAlign: 'center', 
              fontSize: '13px', 
              color: currentMode === 'LNAV' ? '#64748b' : (isILS ? '#fbbf24' : '#f8fafc'), 
              fontFamily: 'monospace',
              fontWeight: 'bold'
            } 
          }, `${targets.heading.toFixed(0)}`),
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: isILS ? '#475569' : '#64748b', cursor: isILS ? 'not-allowed' : 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => updateTarget('heading', (targets.heading + 5) % 360),
            disabled: flightState.hasCrashed || isILS
          }, '+')
        )
      ),

      // VS Group
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', width: '85px' } },
        React.createElement('label', { style: { fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' } }, 'V/S (FPM)'),
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            background: '#0f172a',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid #1e293b'
          } 
        },
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: isILS ? '#475569' : '#64748b', cursor: isILS ? 'not-allowed' : 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => updateTarget('vs', Math.max(-4000, targets.vs - 100)),
            disabled: flightState.hasCrashed || isILS
          }, '-'),
          React.createElement('span', { 
            style: { 
              flex: 1, 
              textAlign: 'center', 
              fontSize: '13px', 
              color: isILS ? '#fbbf24' : '#f8fafc', 
              fontFamily: 'monospace',
              fontWeight: 'bold'
            } 
          }, `${targets.vs >= 0 ? '+' : ''}${targets.vs.toFixed(0)}`),
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: isILS ? '#475569' : '#64748b', cursor: isILS ? 'not-allowed' : 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => updateTarget('vs', Math.min(4000, targets.vs + 100)),
            disabled: flightState.hasCrashed || isILS
          }, '+')
        )
      ),

      // ALT Group
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', width: '80px' } },
        React.createElement('label', { style: { fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' } }, 'ALT (FT)'),
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            background: '#0f172a',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid #1e293b'
          } 
        },
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => updateTarget('altitude', Math.max(0, targets.altitude - 100)),
            disabled: flightState.hasCrashed
          }, '-'),
          React.createElement('span', { 
            style: { 
              flex: 1, 
              textAlign: 'center', 
              fontSize: '13px', 
              color: '#f8fafc', 
              fontFamily: 'monospace',
              fontWeight: 'bold'
            } 
          }, `${targets.altitude.toFixed(0)}`),
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => updateTarget('altitude', Math.min(45000, targets.altitude + 100)),
            disabled: flightState.hasCrashed
          }, '+')
        )
      ),

      // QNH Group
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', width: '70px' } },
        React.createElement('label', { style: { fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' } }, 'BARO (IN)'),
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            background: '#0f172a',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid #1e293b'
          } 
        },
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => setAltimeter && setAltimeter(Math.max(28.00, (flightState.altimeter || 29.92) - 0.01)),
            disabled: flightState.hasCrashed
          }, '-'),
          React.createElement('span', { 
            style: { 
              flex: 1, 
              textAlign: 'center', 
              fontSize: '13px', 
              color: '#38bdf8', 
              fontFamily: 'monospace',
              fontWeight: 'bold'
            } 
          }, `${(flightState.altimeter || 29.92).toFixed(2)}`),
          React.createElement('button', {
            style: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0 4px', fontSize: '14px' },
            onClick: () => setAltimeter && setAltimeter(Math.min(31.00, (flightState.altimeter || 29.92) + 0.01)),
            disabled: flightState.hasCrashed
          }, '+')
        )
      )
    )
  );
};

export default ModernAutopilotModule;
