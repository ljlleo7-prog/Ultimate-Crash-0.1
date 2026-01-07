import React from 'react';

// Flight Pose Panel Component - Vertically compressed 3-column layout
const FlightPosePanel = ({ flightState }) => {
  // Calculate altitude in 20-foot increments
  const altitude20ft = Math.round(flightState.altitude / 20) * 20;
  
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
            style: { bottom: `${Math.min(100, (flightState.indicatedAirspeed / 400) * 100)}%` }
          },
            React.createElement('div', { className: 'indicator-line' }),
            React.createElement('span', { className: 'current-value' }, `${flightState.indicatedAirspeed.toFixed(0)}`)
          )
        )
      ),
      
      // Center: Artificial Horizon with Pitch/Roll (compressed)
      React.createElement('div', { className: 'artificial-horizon compressed' },
        React.createElement('div', { 
          className: 'horizon-container',
          style: { transform: `rotate(${flightState.roll}deg)` }
        },
          // Sky and ground - both move in the same direction (corrected)
          React.createElement('div', { 
            className: 'sky',
            style: { 
              transform: `translateY(${-flightState.pitch * 1.5}px)`,
              height: '1000px', // Long rectangular shape for more coverage
              width: '100%'
            } 
          }),
          React.createElement('div', { 
            className: 'ground',
            style: { 
              transform: `translateY(${-flightState.pitch * 1.5}px)`,
              height: '1000px', // Long rectangular shape for more coverage
              width: '100%'
            } 
          }),
          
          // Pitch ladder
          React.createElement('div', { className: 'pitch-ladder' },
            Array.from({ length: 13 }, (_, i) => {
              const pitch = (i - 6) * 10; // -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60 degrees
              const position = pitch * 3; // Increased spacing for better visibility
              return React.createElement('div', {
                key: `pitch-${pitch}`,
                className: `pitch-line ${pitch === 0 ? 'center-line' : ''}`,
                style: { top: `calc(50% + ${position}px)` }
              },
                pitch !== 0 && React.createElement('span', { className: 'pitch-value' }, Math.abs(pitch))
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
            style: { transform: `rotate(${-flightState.roll}deg)` }
          }),
          React.createElement('div', { className: 'roll-scale' },
            Array.from({ length: 5 }, (_, i) => {
              const roll = (i - 2) * 30; // -60, -30, 0, 30, 60 degrees
              return React.createElement('div', {
                key: `roll-${roll}`,
                className: `roll-mark ${roll === 0 ? 'center-mark' : ''}`,
                style: { transform: `rotate(${roll}deg)` }
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
              const altitude = i * 10000; // 0, 10000, 20000, 30000, 40000 feet
              const position = (altitude / 45000) * 100;
              return React.createElement('div', {
                key: `alt-${altitude}`,
                className: 'scale-mark',
                style: { bottom: `${position}%` }
              },
                React.createElement('span', { className: 'scale-value' }, altitude / 1000)
              );
            })
          ),
          // Current ALT indicator with 20ft accuracy
          React.createElement('div', {
            className: 'current-indicator alt-indicator',
            style: { bottom: `${Math.min(100, (flightState.altitude / 45000) * 100)}%` }
          },
            React.createElement('div', { className: 'indicator-line' }),
            React.createElement('span', { className: 'current-value' }, `${altitude20ft}`)
          )
        )
      )
    ),
    
    // Bottom: Additional information (compressed)
    React.createElement('div', { className: 'pfd-bottom-info compressed' },
      React.createElement('div', { className: 'vs-display' },
        React.createElement('span', { className: 'label' }, 'VS'),
        React.createElement('span', { 
          className: `value ${flightState.verticalSpeed > 0 ? 'climbing' : flightState.verticalSpeed < 0 ? 'descending' : 'level'}`
        }, `${flightState.verticalSpeed >= 0 ? '+' : ''}${flightState.verticalSpeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'heading-display' },
        React.createElement('span', { className: 'label' }, 'HDG'),
        React.createElement('span', { className: 'value' }, `${flightState.heading.toFixed(0)}°`)
      ),
      React.createElement('div', { className: 'gs-display' },
        React.createElement('span', { className: 'label' }, 'GS'),
        React.createElement('span', { className: 'value' }, `${flightState.groundSpeed.toFixed(0)}`)
      ),
      React.createElement('div', { className: 'tas-display' },
        React.createElement('span', { className: 'label' }, 'TAS'),
        React.createElement('span', { className: 'value' }, `${flightState.trueAirspeed.toFixed(0)}`)
      )
    )
  );
};

export default FlightPosePanel;