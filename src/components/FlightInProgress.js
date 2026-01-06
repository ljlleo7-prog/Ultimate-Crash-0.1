import React from 'react';
import FlightPanel from './FlightPanel.js';

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
    React.createElement('header', { className: 'app-header' }, [
      React.createElement('h1', { key: 'title' }, 'Flight in Progress - ', callsign || 'Unnamed Flight'),
      React.createElement('p', { key: 'subtitle' }, 'Difficulty: ', difficulty.toUpperCase(), ' | Aircraft: ', aircraftModel),
      React.createElement('button', { 
        key: 'reset-btn',
        onClick: handleResetFlight, 
        className: 'reset-btn' 
      }, 'Reset Flight')
    ]),

    React.createElement('main', { className: 'app-main' }, [
      React.createElement('div', { className: 'flight-in-progress' }, [
        React.createElement('div', { className: 'flight-summary' }, [
          React.createElement('div', { className: 'summary-item' }, [
            React.createElement('strong', { key: 'route-label' }, 'Route:'),
            ' ', selectedDeparture.iata, ' → ', selectedArrival.iata
          ]),
          React.createElement('div', { className: 'summary-item' }, [
            React.createElement('strong', { key: 'distance-label' }, 'Distance:'),
            ' ', flightPlan ? formatDistance(flightPlan.distance.nauticalMiles) : 'Calculating...'
          ]),
          React.createElement('div', { className: 'summary-item' }, [
            React.createElement('strong', { key: 'time-label' }, 'Flight Time:'),
            ' ', flightPlan ? formatFlightTime(flightPlan.time) : 'Calculating...'
          ]),
          React.createElement('div', { className: 'summary-item' }, [
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
          }
        }),
        
        React.createElement('div', { className: 'flight-details' }, [
          React.createElement('h3', { key: 'params-title' }, 'Flight Parameters'),
          React.createElement('div', { className: 'parameters-grid' }, [
            React.createElement('div', { className: 'param-item' }, [
              React.createElement('strong', { key: 'airline-label' }, 'Airline:'),
              ' ', airline || 'Not specified'
            ]),
            React.createElement('div', { className: 'param-item' }, [
              React.createElement('strong', { key: 'callsign-label' }, 'Callsign:'),
              ' ', callsign || 'Not specified'
            ]),
            React.createElement('div', { className: 'param-item' }, [
              React.createElement('strong', { key: 'pax-label' }, 'PAX:'),
              ' ', pax
            ]),
            React.createElement('div', { className: 'param-item' }, [
              React.createElement('strong', { key: 'payload-label' }, 'Payload:'),
              ' ', payload, ' kg'
            ]),
            React.createElement('div', { className: 'param-item' }, [
              React.createElement('strong', { key: 'fuel-reserve-label' }, 'Fuel Reserve:'),
              ' ', fuelReserve * 100, '%'
            ]),
            React.createElement('div', { className: 'param-item' }, [
              React.createElement('strong', { key: 'cruise-label' }, 'Cruise Height:'),
              ' ', cruiseHeight, ' ft'
            ]),
            React.createElement('div', { className: 'param-item' }, [
              React.createElement('strong', { key: 'time-zulu-label' }, 'Time (Zulu):'),
              ' ', useRandomTime ? generateRandomTime() : timeZulu
            ]),
            React.createElement('div', { className: 'param-item' }, [
              React.createElement('strong', { key: 'season-label' }, 'Season:'),
              ' ', useRandomSeason ? generateRandomSeason() : season
            ])
          ])
        ])
      ])
    ])
  ]);
};

export default FlightInProgress;