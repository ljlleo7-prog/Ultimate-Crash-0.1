import React from 'react';

// Flight Pose Panel Component - Vertically compressed 3-column layout
const FlightPosePanel = ({ flightState }) => {
  // FIXED: Add safety checks for all properties
  const indicatedAirspeed = flightState.indicatedAirspeed || 0;
  // Use derived AMSL altitude if available (from physics engine), otherwise fallback
  const trueAltitude = (flightState.derived && flightState.derived.altitude_ft) 
    ? flightState.derived.altitude_ft 
    : (flightState.altitude || 0);
    
  const verticalSpeed = flightState.verticalSpeed || 0;
  const heading = flightState.heading || 0;
  const groundSpeed = flightState.groundSpeed || 0;
  const trueAirspeed = flightState.trueAirspeed || 0;
  const pitch = flightState.pitch || 0;
  const roll = flightState.roll || 0;
  
  // Altimeter Logic
  const altimeterSetting = flightState.altimeter || 29.92;
  const localQNH = flightState.localQNH || 29.92;
  const terrainElevation = flightState.terrainElevation || 0;

  // Calculate Indicated Altitude
  // Formula: Indicated = True + (Setting - QNH) * 1000
  const indicatedAltitude = trueAltitude + (altimeterSetting - localQNH) * 1000;
  
  // Calculate Indicated Terrain Elevation (where it appears on the tape relative to indicated altitude)
  // The tape shows Indicated Altitude.
  // The Terrain Mark should be at the Indicated Altitude corresponding to the Terrain Level.
  // Indicated Terrain Level = True Terrain + (Setting - QNH) * 1000
  const indicatedTerrainElevation = terrainElevation + (altimeterSetting - localQNH) * 1000;
  
  // AGL (Above Ground Level)
  // Use physics-derived AGL if available for precision (handles objects/runway)
  const agl = (flightState.derived && flightState.derived.altitude_agl_ft)
    ? flightState.derived.altitude_agl_ft
    : (trueAltitude - terrainElevation);

  // Visibility Logic
  const visibility = flightState.visibility;
  let fogOpacity = 0;
  if (visibility !== undefined && visibility !== null) {
      if (visibility < 500) fogOpacity = 0.95 - (visibility / 500) * 0.15;
      else if (visibility < 2000) fogOpacity = 0.8 - ((visibility - 500) / 1500) * 0.4;
      else if (visibility < 8000) fogOpacity = 0.4 - ((visibility - 2000) / 6000) * 0.4;
  }

  // Calculate altitude in 20-foot increments for display text
  const altitude20ft = Math.round(indicatedAltitude / 20) * 20;
  
  return React.createElement('div', { className: 'civil-aviation-pose-panel' },
    React.createElement('h3', null, 'Primary Flight Display'),
    
    // Main display area with three sections - vertically compressed
    React.createElement('div', { className: 'pfd-compressed-3col' },
      
      // Left: IAS Vertical Bar (compressed)
      React.createElement('div', { className: 'ias-vertical-bar compressed' },
        React.createElement('div', { className: 'ias-label' }, 'IAS'),
        React.createElement('div', { className: 'vertical-scale-container' },
          // IAS scale from 0 to 400 knots
          React.createElement('div', { className: 'vertical-scale' },
            Array.from({ length: 5 }, (_, i) => {
              const speed = i * 100; // 0, 100, 200, 300, 400 knots
              const position = (speed / 400) * 100;
              return React.createElement('div', {
                key: `speed-${speed}`,
                className: 'scale-mark',
                style: { bottom: `${position}%` }
              },
                React.createElement('span', { className: 'scale-value' }, speed)
              );
            })
          ),
          // Current IAS indicator
          React.createElement('div', {
            className: 'current-indicator ias-indicator',
            style: { bottom: `${Math.min(100, (indicatedAirspeed / 400) * 100)}%` }
          },
            React.createElement('div', { className: 'indicator-line' }),
            React.createElement('span', { className: 'current-value' }, `${indicatedAirspeed.toFixed(0)}`)
          )
        )
      ),
      
      // Center: Artificial Horizon with Pitch/Roll (compressed)
      React.createElement('div', { className: 'artificial-horizon compressed' },
        React.createElement('div', { 
          className: 'horizon-container',
          style: { transform: `rotate(${-roll}deg)` } // Reverse roll direction for correct horizon reference
        },
          // Sky and ground - increased width and height for better coverage
          React.createElement('div', { 
            className: 'sky',
            style: { 
              transform: `translateY(${pitch * 3}px)`,
              height: '300%', // Tall sky for better coverage
              width: '200%',  // Wider sky for better roll coverage
              top: '-250%',    // Center vertically
              left: '-50%'     // Center horizontally
            } 
          }),
          React.createElement('div', { 
            className: 'ground',
            style: { 
              transform: `translateY(${pitch * 3}px)`,
              height: '300%', // Tall ground for better coverage
              width: '200%',  // Wider ground for better roll coverage
              bottom: '-250%', // Center vertically
              left: '-50%'     // Center horizontally
            } 
          }),
          
          // Fog Overlay
          fogOpacity > 0 && React.createElement('div', {
            className: 'fog-overlay',
            style: {
              position: 'absolute',
              top: '-250%',
              left: '-50%',
              width: '200%',
              height: '300%',
              backgroundColor: '#e2e8f0',
              opacity: fogOpacity,
              pointerEvents: 'none',
              zIndex: 2 // Above sky/ground, below ladder
            }
          }),

          // Pitch ladder
          React.createElement('div', { className: 'pitch-ladder' },
            Array.from({ length: 13 }, (_, i) => {
              const pitchValue = (i - 6) * 10; // -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60 degrees
              const position = pitchValue * 3; // Increased spacing for better visibility
              return React.createElement('div', {
                key: `pitch-${pitchValue}`,
                className: `pitch-line ${pitchValue === 0 ? 'center-line' : ''}`,
                style: { top: `calc(50% + ${position}px)` }
              },
                pitchValue !== 0 && React.createElement('span', { className: 'pitch-value' }, Math.abs(pitchValue))
              );
            })
          ),
          
          // Aircraft symbol
          React.createElement('div', { className: 'aircraft-symbol' },
            React.createElement('div', { className: 'wings' }),
            React.createElement('div', { className: 'fuselage' })
          )
        ),
        
        // Roll indicator
        React.createElement('div', { className: 'roll-indicator' },
          React.createElement('div', { 
            className: 'roll-triangle',
            style: { transform: `rotate(${-roll}deg)` }
          }),
          React.createElement('div', { className: 'roll-scale' },
            Array.from({ length: 5 }, (_, i) => {
              const rollValue = (i - 2) * 30; // -60, -30, 0, 30, 60 degrees
              return React.createElement('div', {
                key: `roll-${rollValue}`,
                className: `roll-mark ${rollValue === 0 ? 'center-mark' : ''}`,
                style: { transform: `rotate(${rollValue}deg)` }
              });
            })
          )
        )
      ),
      
      // Right: ALT Vertical Bar (compressed)
      React.createElement('div', { className: 'alt-vertical-bar compressed' },
        React.createElement('div', { className: 'alt-label' }, 'ALT'),
        React.createElement('div', { className: 'vertical-scale-container' },
          // ALT scale from 0 to 45000 feet in 5000ft increments
          React.createElement('div', { className: 'vertical-scale' },
            Array.from({ length: 5 }, (_, i) => {
              const altitudeValue = i * 10000; // 0, 10000, 20000, 30000, 40000 feet
              const position = (altitudeValue / 45000) * 100;
              return React.createElement('div', {
                key: `alt-${altitudeValue}`,
                className: 'scale-mark',
                style: { bottom: `${position}%` }
              },
                React.createElement('span', { className: 'scale-value' }, altitudeValue / 1000)
              );
            })
          ),
          
          // Terrain Warning Mark (Red Line)
          React.createElement('div', {
            className: 'terrain-mark',
            style: { 
              position: 'absolute',
              bottom: `${Math.min(100, Math.max(0, (indicatedTerrainElevation / 45000) * 100))}%`,
              left: 0,
              width: '100%',
              height: '2px',
              backgroundColor: 'red',
              zIndex: 5
            }
          }),
          
          // Current ALT indicator with 20ft accuracy
          React.createElement('div', {
            className: 'current-indicator alt-indicator',
            style: { bottom: `${Math.min(100, (indicatedAltitude / 45000) * 100)}%` }
          },
            React.createElement('div', { className: 'indicator-line' }),
            React.createElement('span', { className: 'current-value' }, `${altitude20ft}`)
          ),
          
          // Terrain Text (AGL) - Only show when below 2500ft
          agl < 2500 && React.createElement('div', {
            style: {
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              color: agl < 1000 ? 'red' : '#fbbf24', // Red if low, amber otherwise
              fontSize: '10px',
              fontWeight: 'bold',
              textAlign: 'right',
              zIndex: 10
            }
          }, `${Math.max(0, agl).toFixed(0)}ft above terrain`)
        )
      )
    ),
    
    // Bottom: Additional information (compressed)
    React.createElement('div', { className: 'pfd-bottom-info compressed' },
      React.createElement('div', { className: 'vs-display' },
        React.createElement('span', { className: 'label' }, 'VS'),
        React.createElement('span', { 
          className: `value ${verticalSpeed > 0 ? 'climbing' : verticalSpeed < 0 ? 'descending' : 'level'}`
        }, `${verticalSpeed >= 0 ? '+' : ''}${verticalSpeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'heading-display' },
        React.createElement('span', { className: 'label' }, 'HDG'),
        React.createElement('span', { className: 'value' }, `${heading.toFixed(0)}°`)
      ),
      React.createElement('div', { className: 'gs-display' },
        React.createElement('span', { className: 'label' }, 'GS'),
        React.createElement('span', { className: 'value' }, `${groundSpeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'tas-display' },
        React.createElement('span', { className: 'label' }, 'TAS'),
        React.createElement('span', { className: 'value' }, `${trueAirspeed.toFixed(0)}`)
      )
    )
  );
};

export default FlightPosePanel;
