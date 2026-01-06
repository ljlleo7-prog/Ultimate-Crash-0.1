import React from 'react';

const FlightInProgress = ({
  callsign, aircraftModel, difficulty, selectedDeparture, selectedArrival, flightPlan,
  airline, pax, payload, fuelReserve, cruiseHeight, useRandomTime, timeZulu, useRandomSeason, season,
  handleResetFlight, formatDistance, formatFlightTime, formatFuel
}) => {
  
  const generateRandomTime = () => {
    const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
    const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
    return `${hours}:${minutes}Z`;
  };

  const generateRandomSeason = () => {
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    return seasons[Math.floor(Math.random() * seasons.length)];
  };

  return React.createElement('div', { className: 'App' },
    React.createElement('header', { className: 'app-header' },
      React.createElement('h1', null, 'Flight in Progress - ', callsign || 'Unnamed Flight'),
      React.createElement('p', null, 'Difficulty: ', difficulty.toUpperCase(), ' | Aircraft: ', aircraftModel),
      React.createElement('button', { onClick: handleResetFlight, className: 'reset-btn' }, 'Reset Flight')
    ),

    React.createElement('main', { className: 'app-main' },
      React.createElement('div', { className: 'flight-in-progress' },
        React.createElement('h2', null, 'Flight Status'),
        React.createElement('div', { className: 'flight-summary' },
          React.createElement('div', { className: 'summary-item' },
            React.createElement('strong', null, 'Route:'),
            ' ', selectedDeparture.iata, ' → ', selectedArrival.iata
          ),
          React.createElement('div', { className: 'summary-item' },
            React.createElement('strong', null, 'Distance:'),
            ' ', flightPlan ? formatDistance(flightPlan.distance.nauticalMiles) : 'Calculating...'
          ),
          React.createElement('div', { className: 'summary-item' },
            React.createElement('strong', null, 'Flight Time:'),
            ' ', flightPlan ? formatFlightTime(flightPlan.time) : 'Calculating...'
          ),
          React.createElement('div', { className: 'summary-item' },
            React.createElement('strong', null, 'Fuel:'),
            ' ', flightPlan ? formatFuel(flightPlan.fuel) : 'Calculating...'
          )
        ),
        
        React.createElement('div', { className: 'flight-details' },
          React.createElement('h3', null, 'Flight Parameters'),
          React.createElement('div', { className: 'parameters-grid' },
            React.createElement('div', { className: 'param-item' },
              React.createElement('strong', null, 'Airline:'),
              ' ', airline || 'Not specified'
            ),
            React.createElement('div', { className: 'param-item' },
              React.createElement('strong', null, 'Callsign:'),
              ' ', callsign || 'Not specified'
            ),
            React.createElement('div', { className: 'param-item' },
              React.createElement('strong', null, 'PAX:'),
              ' ', pax
            ),
            React.createElement('div', { className: 'param-item' },
              React.createElement('strong', null, 'Payload:'),
              ' ', payload, ' kg'
            ),
            React.createElement('div', { className: 'param-item' },
              React.createElement('strong', null, 'Fuel Reserve:'),
              ' ', fuelReserve * 100, '%'
            ),
            React.createElement('div', { className: 'param-item' },
              React.createElement('strong', null, 'Cruise Height:'),
              ' ', cruiseHeight, ' ft'
            ),
            React.createElement('div', { className: 'param-item' },
              React.createElement('strong', null, 'Time (Zulu):'),
              ' ', useRandomTime ? generateRandomTime() : timeZulu
            ),
            React.createElement('div', { className: 'param-item' },
              React.createElement('strong', null, 'Season:'),
              ' ', useRandomSeason ? generateRandomSeason() : season
            )
          )
        ),

        React.createElement('div', { className: 'flight-controls' },
          React.createElement('h3', null, 'Flight Controls'),
          React.createElement('p', null, 'Flight simulation controls will appear here...')
        )
      )
    )
  );
};

export default FlightInProgress;