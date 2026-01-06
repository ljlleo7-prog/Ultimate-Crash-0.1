import React from 'react';

const FadeOverlay = ({ phase, children }) => {
  return React.createElement('div', { className: `fade-overlay ${phase}` }, children);
};

const CinematicReview = ({ callsign, selectedDeparture, selectedArrival, aircraftModel, weatherData, crewCount, failureType, difficulty, pax, payload }) => {
  // Safe access to weather data with fallbacks
  const safeWeatherData = weatherData || {
    windSpeed: 0,
    visibility: 0,
    cloudCover: 0,
    turbulence: 'none'
  };
  
  // Ensure turbulence has a valid string value
  const safeTurbulence = safeWeatherData.turbulence || 'none';
  
  // Safe access to other variables
  const safeCallsign = callsign || 'UNNAMED FLIGHT';
  const safeDepartureIata = selectedDeparture?.iata || 'DEP';
  const safeArrivalIata = selectedArrival?.iata || 'ARR';
  const safeAircraftModel = aircraftModel || 'UNKNOWN AIRCRAFT';
  const safeCrewCount = crewCount || 2;
  const safeFailureType = failureType || 'none';
  const safeDifficulty = difficulty || 'rookie';
  const safePax = pax || 0;
  const safePayload = payload || 0;

  return React.createElement('div', { className: 'cinematic-review' },
    React.createElement('div', { className: 'cinematic-header' },
      React.createElement('h1', null, 'FLIGHT BRIEFING'),
      React.createElement('div', { className: 'flight-info-banner' },
        React.createElement('span', null, safeCallsign),
        React.createElement('span', null, safeDepartureIata, ' → ', safeArrivalIata),
        React.createElement('span', null, safeAircraftModel)
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
                React.createElement('span', null, safeWeatherData.windSpeed, ' kts')
              ),
              React.createElement('div', { className: 'weather-item' },
                React.createElement('span', null, 'VISIBILITY:'),
                React.createElement('span', null, safeWeatherData.visibility, ' mi')
              ),
              React.createElement('div', { className: 'weather-item' },
                React.createElement('span', null, 'CLOUD COVER:'),
                React.createElement('span', null, safeWeatherData.cloudCover, '%')
              ),
              React.createElement('div', { className: 'weather-item' },
                React.createElement('span', null, 'TURBULENCE:'),
                React.createElement('span', null, safeTurbulence.toUpperCase())
              )
            )
          ),
          React.createElement('div', { className: 'panel-section' },
            React.createElement('h3', null, 'CREW CONFIGURATION'),
            React.createElement('div', { className: 'crew-briefing' },
              React.createElement('div', { className: 'crew-item' },
                React.createElement('span', null, 'PILOTS:'),
                React.createElement('span', null, safeCrewCount)
              ),
              React.createElement('div', { className: 'crew-item' },
                React.createElement('span', null, 'FAILURE TYPE:'),
                React.createElement('span', null, safeFailureType.toUpperCase())
              ),
              React.createElement('div', { className: 'crew-item' },
                React.createElement('span', null, 'DIFFICULTY:'),
                React.createElement('span', null, safeDifficulty.toUpperCase())
              )
            )
          )
        )
      ),
      React.createElement('div', { className: 'situation-description' },
        React.createElement('h2', null, 'SITUATION OVERVIEW'),
        React.createElement('div', { className: 'situation-text' },
          React.createElement('p', null, 'Flight ', safeCallsign, ' is preparing for departure from ', selectedDeparture?.name || 'Unknown Airport', ' (', safeDepartureIata, ') to ', selectedArrival?.name || 'Unknown Airport', ' (', safeArrivalIata, ').'),
          React.createElement('p', null, 'The ', safeAircraftModel, ' is configured with ', safePax, ' passengers and ', safePayload, ' kg of cargo. Weather conditions indicate ', safeTurbulence, ' turbulence with ', safeWeatherData.visibility, ' miles visibility.'),
          React.createElement('p', null, 'Simulation will feature ', safeFailureType === 'random' ? 'random failure scenarios based on difficulty level' : `specific ${safeFailureType} failure`, ' with ', safeCrewCount, ' pilot', safeCrewCount > 1 ? 's' : '', ' on duty.'),
          React.createElement('p', { className: 'countdown' }, 'Simulation starting in 5 seconds...')
        )
      )
    )
  );
};

export { FadeOverlay, CinematicReview };