import React from 'react';
import AirportSearchInput from './AirportSearchInput.js';
import { randomFlightService } from '../services/randomFlightService.js';

const FlightInitialization = ({
  difficulty, setDifficulty,
  airline, setAirline,
  callsign, setCallsign,
  aircraftModel, setAircraftModel,
  pax, setPax,
  payload, setPayload,
  fuelReserve, setFuelReserve,
  cruiseHeight, setCruiseHeight,
  timeZulu, setTimeZulu,
  useRandomTime, setUseRandomTime,
  season, setSeason,
  useRandomSeason, setUseRandomSeason,
  selectedDeparture, selectedArrival,
  searchResults, searchAirports, selectDeparture, selectArrival,
  flightPlan, formatDistance, formatFlightTime, formatFuel,
  failureType, setFailureType,
  weatherData, setWeatherData,
  crewCount, setCrewCount,
  aircraftSuggestions,
  handleInitializeFlight,
  handleSearch
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

  // Handle random flight initialization
  const handleRandomInitialize = () => {
    try {
      const randomParams = randomFlightService.generateRandomFlightParameters();
      
      // Update all state variables with random parameters
      setAirline(randomParams.airline);
      setCallsign(randomParams.callsign);
      setAircraftModel(randomParams.aircraftModel);
      setPax(randomParams.pax);
      setPayload(randomParams.payload);
      setFuelReserve(randomParams.fuelReserve);
      setCruiseHeight(randomParams.cruiseHeight);
      setDifficulty(randomParams.difficulty);
      setUseRandomTime(true);
      setUseRandomSeason(true);
      
      // Select the random airports
      selectDeparture(randomParams.selectedDeparture);
      selectArrival(randomParams.selectedArrival);
      
      console.log('Random flight initialized:', randomParams);
      
      // Show confirmation message
      alert(`Random flight initialized!\nRoute: ${randomParams.selectedDeparture.iata} → ${randomParams.selectedArrival.iata}\nAircraft: ${randomParams.aircraftModel}\nDistance: ${Math.round(randomParams.distance)} nm`);
      
    } catch (error) {
      console.error('Error initializing random flight:', error);
      alert('Error initializing random flight. Please try again.');
    }
  };

  return React.createElement('div', { className: 'flight-initialization' },
    React.createElement('div', { className: 'difficulty-section' },
      React.createElement('h2', null, 'Difficulty Level'),
      React.createElement('div', { className: 'difficulty-buttons' },
        ['rookie', 'amateur', 'intermediate', 'advanced', 'pro', 'devil'].map((level) =>
          React.createElement('button', {
            key: level,
            className: `difficulty-btn ${level} ${difficulty === level ? 'active' : ''}`,
            onClick: () => setDifficulty(level)
          }, level.toUpperCase())
        )
      )
    ),

    React.createElement('div', { className: 'flight-parameters' },
      React.createElement('h2', null, 'Flight Parameters'),
      React.createElement('div', { className: 'parameters-grid' },
        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Airline:'),
          React.createElement('input', {
            type: 'text',
            value: airline,
            onChange: (e) => setAirline(e.target.value),
            placeholder: 'e.g., Delta Air Lines'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Callsign:'),
          React.createElement('input', {
            type: 'text',
            value: callsign,
            onChange: (e) => setCallsign(e.target.value),
            placeholder: 'e.g., DAL123'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Aircraft Model:'),
          React.createElement('select', {
            value: aircraftModel,
            onChange: (e) => setAircraftModel(e.target.value)
          },
            aircraftSuggestions.map((aircraft, index) =>
              React.createElement('option', { key: index, value: aircraft.model },
                aircraft.manufacturer, ' ', aircraft.model
              )
            )
          )
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Passengers (PAX):'),
          React.createElement('input', {
            type: 'number',
            value: pax,
            onChange: (e) => setPax(parseInt(e.target.value) || 0),
            min: '0',
            max: '1000'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Payload (kg):'),
          React.createElement('input', {
            type: 'number',
            value: payload,
            onChange: (e) => setPayload(parseInt(e.target.value) || 0),
            min: '0',
            max: '200000'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Fuel Reserve (%):'),
          React.createElement('input', {
            type: 'number',
            value: fuelReserve * 100,
            onChange: (e) => setFuelReserve((parseInt(e.target.value) || 0) / 100),
            min: '5',
            max: '50',
            step: '1'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Cruise Height (ft):'),
          React.createElement('input', {
            type: 'number',
            value: cruiseHeight,
            onChange: (e) => setCruiseHeight(parseInt(e.target.value) || 0),
            min: '10000',
            max: '45000',
            step: '1000'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Time (Zulu):'),
          React.createElement('div', { className: 'time-controls' },
            React.createElement('input', {
              type: 'text',
              value: timeZulu,
              onChange: (e) => setTimeZulu(e.target.value),
              placeholder: 'HH:MMZ',
              disabled: useRandomTime
            }),
            React.createElement('label', { className: 'checkbox-label' },
              React.createElement('input', {
                type: 'checkbox',
                checked: useRandomTime,
                onChange: (e) => setUseRandomTime(e.target.checked)
              }),
              'Random'
            )
          )
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Season:'),
          React.createElement('div', { className: 'season-controls' },
            React.createElement('select', {
              value: season,
              onChange: (e) => setSeason(e.target.value),
              disabled: useRandomSeason
            },
              React.createElement('option', { value: '' }, 'Select Season'),
              React.createElement('option', { value: 'Spring' }, 'Spring'),
              React.createElement('option', { value: 'Summer' }, 'Summer'),
              React.createElement('option', { value: 'Autumn' }, 'Autumn'),
              React.createElement('option', { value: 'Winter' }, 'Winter')
            ),
            React.createElement('label', { className: 'checkbox-label' },
              React.createElement('input', {
                type: 'checkbox',
                checked: useRandomSeason,
                onChange: (e) => setUseRandomSeason(e.target.checked)
              }),
              'Random'
            )
          )
        )
      )
    ),

    React.createElement('div', { className: 'airport-selection-section' },
      React.createElement('h2', null, 'Route Selection'),
      React.createElement('div', { className: 'airport-inputs' },
        React.createElement('div', { className: 'airport-group' },
          React.createElement('h3', null, 'Departure Airport'),
          React.createElement(AirportSearchInput, {
            placeholder: 'Enter departure airport (IATA/ICAO/Name)',
            onSelect: selectDeparture,
            selectedAirport: selectedDeparture,
            searchResults: searchResults,
            handleSearch: handleSearch
          })
        ),
        React.createElement('div', { className: 'airport-group' },
          React.createElement('h3', null, 'Arrival Airport'),
          React.createElement(AirportSearchInput, {
            placeholder: 'Enter arrival airport (IATA/ICAO/Name)',
            onSelect: selectArrival,
            selectedAirport: selectedArrival,
            searchResults: searchResults,
            handleSearch: handleSearch
          })
        )
      ),
      
      // Flight plan summary
      flightPlan && React.createElement('div', { className: 'flight-plan-summary' },
        React.createElement('h3', null, 'Flight Plan Summary'),
        React.createElement('div', { className: 'summary-grid' },
          React.createElement('div', null, 'Distance: ', formatDistance(flightPlan.distance.nauticalMiles)),
          React.createElement('div', null, 'Flight Time: ', formatFlightTime(flightPlan.time)),
          React.createElement('div', null, 'Fuel Required: ', formatFuel(flightPlan.fuel))
        )
      )
    ),

    // Random initialization button
    React.createElement('div', { className: 'initialization-buttons' },
      React.createElement('button', {
        className: 'random-init-btn',
        onClick: handleRandomInitialize,
        title: 'Generate random flight with valid aircraft-airport distance matching'
      }, '🎲 Random Flight'),
      
      React.createElement('button', {
        className: 'init-flight-btn',
        onClick: handleInitializeFlight,
        disabled: !selectedDeparture || !selectedArrival
      }, 'Initialize Flight')
    )
  );
};

export default FlightInitialization;