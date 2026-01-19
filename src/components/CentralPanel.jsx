import React from 'react';

// Central Panel Component - Compact design for variable engine counts
const CentralPanel = ({ flightState, onToggleSystems }) => {
  // FIXED: Add safety checks for all properties
  const alarms = flightState.alarms || [];
  const crashWarning = flightState.crashWarning || '';
  const engineN1 = flightState.engineN1 || [0, 0];
  const engineN2 = flightState.engineN2 || [0, 0];
  const engineEGT = flightState.engineEGT || [0, 0];
  const fuel = flightState.fuel || 0;

  // Combine all warnings for display
  const activeWarnings = flightState.activeWarnings || [];
  const allWarnings = [...activeWarnings];
  // Add crash warning if present (as critical)
  if (crashWarning) {
    if (!allWarnings.find(w => w.message === crashWarning)) {
      allWarnings.unshift({ id: 'CRASH_WARN', message: crashWarning, level: 'CRITICAL' });
    }
  }
  
  // Get engine count from the arrays (supports 2, 3, or 4 engines)
  const engineCount = Math.max(2, Math.min(4, engineN1.length || 2));
  
  // Engine colors for visual distinction (supports up to 4 engines)
  const engineColors = [
    { 
      id: 1, position: 'Left', 
      header: '#4a90e2', background: 'rgba(74, 144, 226, 0.1)', border: '#4a90e2' 
    },
    { 
      id: 2, position: 'Right', 
      header: '#50e3c2', background: 'rgba(80, 227, 194, 0.1)', border: '#50e3c2' 
    },
    { 
      id: 3, position: 'Inner Left', 
      header: '#ff6b6b', background: 'rgba(255, 107, 107, 0.1)', border: '#ff6b6b' 
    },
    { 
      id: 4, position: 'Inner Right', 
      header: '#feca57', background: 'rgba(254, 202, 87, 0.1)', border: '#feca57' 
    }
  ];
  
  return React.createElement('div', { className: 'central-panel', style: { padding: '10px' } },
    // Compact header
    React.createElement('div', { style: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '15px' 
    }},
      React.createElement('h3', { style: { 
        margin: 0,
        fontSize: '16px',
        color: '#fff',
        flex: 1,
        textAlign: 'center'
      } }, 'ENGINE & SYSTEMS'),
      React.createElement('button', {
        onClick: onToggleSystems,
        style: {
          background: '#4a90e2',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          padding: '4px 8px',
          fontSize: '10px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }
      }, 'OH PNL')
    ),
    
    // Compact Engine Parameters with variable engine support
    React.createElement('div', { 
      className: 'engine-params', 
      style: { 
        display: 'flex', 
        gap: '8px', 
        justifyContent: 'center',
        marginBottom: '15px',
        flexWrap: 'wrap'
      } 
    },
      // Render engines 1 to engineCount
      Array.from({ length: engineCount }).map((_, index) => {
        const engine = engineColors[index];
        return React.createElement('div', { 
          key: engine.id, 
          className: 'engine-group', 
          style: {
            flex: `0 0 calc(50% - 4px)`, // 2 engines per row on small screens
            maxWidth: engineCount > 2 ? '48%' : '100%', // More compact for 3+ engines
            background: engine.background,
            border: `1px solid ${engine.border}`,
            borderRadius: '6px',
            padding: '8px',
            textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
          }
        },
          // Compact engine header
          React.createElement('div', { 
            style: { 
              fontSize: '10px', 
              fontWeight: 'bold',
              color: engine.header, 
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            } 
          },
            React.createElement('span', null, `ENG ${engine.id}`),
            React.createElement('span', null, engine.position)
          ),
          
          // Compact engine data
          React.createElement('div', { className: 'engine-data', style: { fontSize: '11px' } },
            React.createElement('div', { 
              style: { 
                fontFamily: 'monospace',
                color: '#00ff00',
                marginBottom: '2px'
              } 
            }, `N1: ${(engineN1[index] || 0).toFixed(0)}%`),
            React.createElement('div', { 
              style: { 
                fontFamily: 'monospace',
                color: '#00ff00',
                marginBottom: '2px'
              } 
            }, `N2: ${(engineN2[index] || 0).toFixed(0)}%`),
            React.createElement('div', { 
              style: { 
                fontFamily: 'monospace',
                color: '#ffaa00'
              } 
            }, `EGT: ${(engineEGT[index] || 0).toFixed(0)}°`)
          )
        );
      })
    ),
    
    // Compact Fuel Display
    React.createElement('div', { 
      className: 'fuel-display', 
      style: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '10px',
        marginBottom: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    },
      React.createElement('span', { 
        className: 'label', 
        style: { fontSize: '12px', color: '#888', fontWeight: 'bold' } 
      }, 'FUEL'),
      React.createElement('span', { 
        className: 'value', 
        style: { fontSize: '18px', fontWeight: 'bold', color: '#ffaa00' } 
      }, `${fuel.toFixed(0)}kg`)
    ),
    
    // Compact System Status
    React.createElement('div', { 
      className: 'error-log', 
      style: {
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '10px',
        flexGrow: 1, // Fill remaining space
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '200px' // Limit height
      }
    },
      React.createElement('div', { 
        style: { 
          marginBottom: '8px', 
          fontSize: '12px', 
          color: '#ffaa00',
          fontWeight: 'bold',
          borderBottom: '1px solid #555',
          paddingBottom: '4px'
        } 
      }, 'SYSTEM STATUS / ALERTS'),
      
      React.createElement('div', { 
        className: 'status-items',
        style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflowY: 'auto',
            height: '100%',
            paddingRight: '5px'
        }
      },
        allWarnings.length > 0 
          ? allWarnings.map((warning, index) => {
              // Determine color based on level
              let color = '#ffff00'; // Advisory/Info
              // No background, just text per user request "plain text"
              let bg = 'transparent';
              
              if (warning.level === 'CRITICAL') {
                  color = '#ff4444'; // Red
              } else if (warning.level === 'WARNING') {
                  color = '#ffaa00'; // Amber
              } else {
                  color = '#00ffff'; // Cyan for advisory
              }

              return React.createElement('div', { 
                key: warning.id || `warn-${index}`, 
                className: 'alarm-item', 
                style: {
                  color: color,
                  backgroundColor: bg,
                  padding: '2px 0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }
              }, warning.message);
            })
          : React.createElement('div', { 
              className: 'status-ok', 
              style: {
                color: '#00ff00',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'left',
                padding: '5px 0',
                fontStyle: 'italic',
                fontFamily: 'monospace'
              }
            }, 'NO ACTIVE ALERTS')
      ),
    )
  );
};

export default CentralPanel;
