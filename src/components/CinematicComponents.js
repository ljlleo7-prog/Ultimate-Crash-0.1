import React from 'react';

const FadeOverlay = ({ phase, children }) => {
  return React.createElement('div', { className: `fade-overlay ${phase}` }, children);
};

const CinematicReview = ({ callsign, selectedDeparture, selectedArrival, aircraftModel, weatherData, crewCount, failureType, difficulty }) => {
  return React.createElement('div', { className: 'cinematic-review' },
    React.createElement('div', { className: 'cinematic-header' },
      React.createElement('h1', null, 'FLIGHT BRIEFING'),
      React.createElement('div', { className: 'flight-info-banner' },
        React.createElement('span', null, callsign || 'UNNAMED FLIGHT'),
        React.createElement('span', null, selectedDeparture?.iata, ' → ', selectedArrival?.iata),
        React.createElement('span', null, aircraftModel)
      )
    ),
    React.createElement('div', { className: 'cinematic-content' },
      React.createElement('div', { className: 'control-panel-review' },
        React.createElement('h2', null, 'FLIGHT CONTROL PANEL'),
        React.createElement('div', { className: 'panel-sections' },
          React.createElement('div', { className: 'panel-section' },
            React.createElement('h3', null, 'AIRCRAFT SYSTEMS'),
            React.createElement('div', { className: 'system-status' },
              React.createElement('div', { className: 'system-item' },
                React.createElement('span', { className: 'label' }, 'ENGINES:'),
                React.createElement('span', { className: 'status normal' }, 'NORMAL')
              ),
              React.createElement('div', { className: 'system-item' },
                React.createElement('span', { className: 'label' }, 'HYDRAULICS:'),
                React.createElement('span', { className: 'status normal' }, 'NORMAL')
              ),
              React.createElement('div', { className: 'system-item' },
                React.createElement('span', { className: 'label' }, 'ELECTRICAL:'),
                React.createElement('span', { className: 'status normal' }, 'NORMAL')
              ),
              React.createElement('div', { className: 'system-item' },
                React.createElement('span', { className: 'label' }, 'FUEL:'),
                React.createElement('span', { className: 'status normal' }, 'NORMAL')
              )
            )
          ),
          React.createElement('div', { className: 'panel-section' },
            React.createElement('h3', null, 'WEATHER BRIEFING'),
            React.createElement('div', { className: 'weather-briefing' },
              React.createElement('div', { className: 'weather-item' },
                React.createElement('span', null, 'WIND:'),
                React.createElement('span', null, weatherData.windSpeed, ' kts')
              ),
              React.createElement('div', { className: 'weather-item' },
                React.createElement('span', null, 'VISIBILITY:'),
                React.createElement('span', null, weatherData.visibility, ' mi')
              ),
              React.createElement('div', { className: 'weather-item' },
                React.createElement('span', null, 'CLOUD COVER:'),
                React.createElement('span', null, weatherData.cloudCover, '%')
              ),
              React.createElement('div', { className: 'weather-item' },
                React.createElement('span', null, 'TURBULENCE:'),
                React.createElement('span', null, weatherData.turbulence.toUpperCase())
              )
            )
          ),
          React.createElement('div', { className: 'panel-section' },
            React.createElement('h3', null, 'CREW CONFIGURATION'),
            React.createElement('div', { className: 'crew-briefing' },
              React.createElement('div', { className: 'crew-item' },
                React.createElement('span', null, 'PILOTS:'),
                React.createElement('span', null, crewCount)
              ),
              React.createElement('div', { className: 'crew-item' },
                React.createElement('span', null, 'FAILURE TYPE:'),
                React.createElement('span', null, failureType.toUpperCase())
              ),
              React.createElement('div', { className: 'crew-item' },
                React.createElement('span', null, 'DIFFICULTY:'),
                React.createElement('span', null, difficulty.toUpperCase())
              )
            )
          )
        )
      ),
      React.createElement('div', { className: 'situation-description' },
        React.createElement('h2', null, 'SITUATION OVERVIEW'),
        React.createElement('div', { className: 'situation-text' },
          React.createElement('p', null, 'Flight ', callsign || 'UNNAMED', ' is preparing for departure from ', selectedDeparture?.name, ' (', selectedDeparture?.iata, ') to ', selectedArrival?.name, ' (', selectedArrival?.iata, ').'),
          React.createElement('p', null, 'The ', aircraftModel, ' is configured with ', pax, ' passengers and ', payload, ' kg of cargo. Weather conditions indicate ', weatherData.turbulence, ' turbulence with ', weatherData.visibility, ' miles visibility.'),
          React.createElement('p', null, 'Simulation will feature ', failureType === 'random' ? 'random failure scenarios based on difficulty level' : `specific ${failureType} failure`, ' with ', crewCount, ' pilot', crewCount > 1 ? 's' : '', ' on duty.'),
          React.createElement('p', { className: 'countdown' }, 'Simulation starting in 5 seconds...')
        )
      )
    )
  );
};

export { FadeOverlay, CinematicReview };