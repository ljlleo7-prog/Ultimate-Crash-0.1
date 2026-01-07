import React from 'react';
import FlightPanel from './FlightPanel.jsx';

const FlightInProgress = ({
  callsign, aircraftModel, difficulty, selectedDeparture, selectedArrival, flightPlan,
  airline, pax, payload, fuelReserve, cruiseHeight, useRandomTime, timeZulu, useRandomSeason, season,
  handleResetFlight, formatDistance, formatFlightTime, formatFuel,
  weatherData, failureType, crewCount
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

  // Flight data for the cockpit display
  const flightData = {
    heading: 245,
    trueAirspeed: 480,
    groundSpeed: 465,
    indicatedAirspeed: 250,
    radioFreq: 121.5,
    pitch: 2.5,
    roll: 0.5,
    verticalSpeed: 1200,
    altitude: 28000,
    altimeter: 29.92,
    engineN1: [89.2, 88.7],
    engineN2: [95.1, 94.8],
    engineEGT: [625, 618],
    fuel: 8500,
    hydraulicPressure: 2950,
    circuitBreakers: {
      engine1: true,
      engine2: true,
      hydraulics: true,
      electrical: true,
      instruments: true
    },
    alarms: [],
    autopilot: true,
    flightDirector: true,
    altitudeHold: true,
    headingHold: true,
    flightPhase: 'CLIMB',
    nextWaypoint: selectedArrival ? selectedArrival.iata : 'DEST',
    distanceToWaypoint: flightPlan ? flightPlan.distance.nauticalMiles : 0,
    timeToWaypoint: flightPlan ? flightPlan.time : 0
  };

  return React.createElement('div', { className: 'App' }, [
    React.createElement('header', { key: 'header', className: 'app-header' }, [
      React.createElement('h1', { key: 'title' }, 'Flight in Progress - ', callsign || 'Unnamed Flight'),
      React.createElement('p', { key: 'subtitle' }, 'Difficulty: ', difficulty.toUpperCase(), ' | Aircraft: ', aircraftModel),
      React.createElement('button', { 
        key: 'reset-btn',
        onClick: handleResetFlight, 
        className: 'reset-btn' 
      }, 'Reset Flight')
    ]),

    React.createElement('main', { key: 'main', className: 'app-main' }, [
      React.createElement('div', { key: 'flight-progress', className: 'flight-in-progress' }, [
        React.createElement('div', { key: 'summary', className: 'flight-summary' }, [
          React.createElement('div', { key: 'route', className: 'summary-item' }, [
            React.createElement('strong', { key: 'route-label' }, 'Route:'),
            ' ', selectedDeparture.iata, ' → ', selectedArrival.iata
          ]),
          React.createElement('div', { key: 'distance', className: 'summary-item' }, [
            React.createElement('strong', { key: 'distance-label' }, 'Distance:'),
            ' ', flightPlan ? formatDistance(flightPlan.distance.nauticalMiles) : 'Calculating...'
          ]),
          React.createElement('div', { key: 'time', className: 'summary-item' }, [
            React.createElement('strong', { key: 'time-label' }, 'Flight Time:'),
            ' ', flightPlan ? formatFlightTime(flightPlan.time) : 'Calculating...'
          ]),
          React.createElement('div', { key: 'fuel', className: 'summary-item' }, [
            React.createElement('strong', { key: 'fuel-label' }, 'Fuel:'),
            ' ', flightPlan ? formatFuel(flightPlan.fuel) : 'Calculating...'
          ])
        ]),
        
        // Flight Panel Cockpit Display
        React.createElement(FlightPanel, {
          key: 'cockpit-display',
          flightData: flightData,
          onActionRequest: (action) => {
            console.log('Action requested:', action);
            if (action === 'reset-to-initiation') {
              handleResetFlight();
            }
          }
        }),
        
        React.createElement('div', { key: 'details', className: 'flight-details' }, [
          React.createElement('h3', { key: 'params-title' }, 'Flight Parameters'),
          React.createElement('div', { key: 'params-grid', className: 'parameters-grid' }, [
            React.createElement('div', { key: 'airline', className: 'param-item' }, [
              React.createElement('strong', { key: 'airline-label' }, 'Airline:'),
              ' ', airline || 'Not specified'
            ]),
            React.createElement('div', { key: 'callsign', className: 'param-item' }, [
              React.createElement('strong', { key: 'callsign-label' }, 'Callsign:'),
              ' ', callsign || 'Not specified'
            ]),
            React.createElement('div', { key: 'pax', className: 'param-item' }, [
              React.createElement('strong', { key: 'pax-label' }, 'PAX:'),
              ' ', pax
            ]),
            React.createElement('div', { key: 'payload', className: 'param-item' }, [
              React.createElement('strong', { key: 'payload-label' }, 'Payload:'),
              ' ', payload, ' kg'
            ]),
            React.createElement('div', { key: 'fuel-reserve', className: 'param-item' }, [
              React.createElement('strong', { key: 'fuel-reserve-label' }, 'Fuel Reserve:'),
              ' ', fuelReserve * 100, '%'
            ]),
            React.createElement('div', { key: 'cruise', className: 'param-item' }, [
              React.createElement('strong', { key: 'cruise-label' }, 'Cruise Height:'),
              ' ', cruiseHeight, ' ft'
            ]),
            React.createElement('div', { key: 'time-zulu', className: 'param-item' }, [
              React.createElement('strong', { key: 'time-zulu-label' }, 'Time (Zulu):'),
              ' ', useRandomTime ? generateRandomTime() : timeZulu
            ]),
            React.createElement('div', { key: 'season', className: 'param-item' }, [
              React.createElement('strong', { key: 'season-label' }, 'Season:'),
              ' ', useRandomSeason ? generateRandomSeason() : season
            ])
          ])
        ]),
        
        // Weather and Failure Conditions Display
        React.createElement('div', { key: 'conditions', className: 'conditions-display' }, [
          React.createElement('h3', { key: 'conditions-title' }, 'Weather & Failure Conditions'),
          React.createElement('div', { key: 'conditions-grid', className: 'conditions-grid' }, [
            React.createElement('div', { key: 'weather', className: 'condition-item' }, [
              React.createElement('strong', { key: 'weather-label' }, 'Weather:'),
              ' ', weatherData?.type ? weatherData.type.charAt(0).toUpperCase() + weatherData.type.slice(1) : 'Clear',
              weatherData?.windSpeed ? `, Wind: ${weatherData.windSpeed} kts` : '',
              weatherData?.visibility ? `, Visibility: ${weatherData.visibility} mi` : ''
            ]),
            React.createElement('div', { key: 'failure', className: 'condition-item' }, [
              React.createElement('strong', { key: 'failure-label' }, 'Failure Type:'),
              ' ', failureType ? failureType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'None'
            ]),
            React.createElement('div', { key: 'crew', className: 'condition-item' }, [
              React.createElement('strong', { key: 'crew-label' }, 'Crew Count:'),
              ' ', crewCount || 2
            ])
          ])
        ])
      ])
    ])
  ]);
};

export default FlightInProgress;