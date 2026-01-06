import React from 'react';
import AirportSearchInput from './AirportSearchInput.js';

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

      flightPlan && React.createElement('div', { className: 'flight-preview' },
        React.createElement('h3', null, 'Flight Preview'),
        React.createElement('div', { className: 'preview-info' },
          React.createElement('p', null,
            React.createElement('strong', null, 'Distance:'),
            ' ', formatDistance(flightPlan.distance.nauticalMiles)
          ),
          React.createElement('p', null,
            React.createElement('strong', null, 'Flight Time:'),
            ' ', formatFlightTime(flightPlan.time)
          ),
          React.createElement('p', null,
            React.createElement('strong', null, 'Fuel Required:'),
            ' ', formatFuel(flightPlan.fuel)
          )
        )
      )
    ),

    React.createElement('div', { className: 'simulation-configuration' },
      React.createElement('h2', null, 'Simulation Configuration'),
      React.createElement('div', { className: 'config-section' },
        React.createElement('h3', null, 'Failure Type'),
        React.createElement('div', { className: 'failure-options' },
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'failureType',
              value: 'random',
              checked: failureType === 'random',
              onChange: (e) => setFailureType(e.target.value)
            }),
            'Random (Difficulty-based)'
          ),
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'failureType',
              value: 'engine',
              checked: failureType === 'engine',
              onChange: (e) => setFailureType(e.target.value),
              disabled: difficulty === 'rookie'
            }),
            'Engine Failure'
          ),
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'failureType',
              value: 'hydraulic',
              checked: failureType === 'hydraulic',
              onChange: (e) => setFailureType(e.target.value),
              disabled: difficulty === 'rookie' || difficulty === 'amateur'
            }),
            'Hydraulic System'
          ),
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'failureType',
              value: 'electrical',
              checked: failureType === 'electrical',
              onChange: (e) => setFailureType(e.target.value),
              disabled: difficulty === 'rookie' || difficulty === 'amateur'
            }),
            'Electrical System'
          ),
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'failureType',
              value: 'structural',
              checked: failureType === 'structural',
              onChange: (e) => setFailureType(e.target.value),
              disabled: difficulty !== 'devil'
            }),
            'Structural Failure'
          ),
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'failureType',
              value: 'multiple',
              checked: failureType === 'multiple',
              onChange: (e) => setFailureType(e.target.value),
              disabled: difficulty !== 'devil'
            }),
            'Multiple Systems'
          )
        )
      ),

      React.createElement('div', { className: 'config-section' },
        React.createElement('h3', null, 'Weather Conditions'),
        React.createElement('div', { className: 'weather-grid' },
          React.createElement('div', { className: 'weather-param' },
            React.createElement('label', null, 'Wind Speed (knots):'),
            React.createElement('input', {
              type: 'range',
              min: '0',
              max: difficulty === 'devil' ? 100 : difficulty === 'pro' ? 80 : difficulty === 'advanced' ? 60 : difficulty === 'intermediate' ? 40 : 20,
              value: weatherData.windSpeed,
              onChange: (e) => setWeatherData({...weatherData, windSpeed: parseInt(e.target.value)})
            }),
            React.createElement('span', null, weatherData.windSpeed, ' kts')
          ),
          
          React.createElement('div', { className: 'weather-param' },
            React.createElement('label', null, 'Visibility (miles):'),
            React.createElement('input', {
              type: 'range',
              min: '0',
              max: difficulty === 'devil' ? 0.5 : difficulty === 'pro' ? 1 : difficulty === 'advanced' ? 3 : difficulty === 'intermediate' ? 5 : 10,
              step: '0.1',
              value: weatherData.visibility,
              onChange: (e) => setWeatherData({...weatherData, visibility: parseFloat(e.target.value)})
            }),
            React.createElement('span', null, weatherData.visibility, ' mi')
          ),
          
          React.createElement('div', { className: 'weather-param' },
            React.createElement('label', null, 'Cloud Cover:'),
            React.createElement('select', {
              value: weatherData.cloudCover,
              onChange: (e) => setWeatherData({...weatherData, cloudCover: parseInt(e.target.value)})
            },
              React.createElement('option', { value: 0 }, 'Clear'),
              React.createElement('option', { value: 25, disabled: difficulty === 'rookie' }, 'Scattered'),
              React.createElement('option', { value: 50, disabled: difficulty === 'rookie' || difficulty === 'amateur' }, 'Broken'),
              React.createElement('option', { value: 75, disabled: difficulty === 'rookie' || difficulty === 'amateur' || difficulty === 'intermediate' }, 'Overcast'),
              React.createElement('option', { value: 100, disabled: difficulty !== 'devil' }, 'Dense')
            )
          ),
          
          React.createElement('div', { className: 'weather-param' },
            React.createElement('label', null, 'Turbulence:'),
            React.createElement('select', {
              value: weatherData.turbulence,
              onChange: (e) => setWeatherData({...weatherData, turbulence: e.target.value})
            },
              React.createElement('option', { value: 'none' }, 'None'),
              React.createElement('option', { value: 'light', disabled: difficulty === 'rookie' }, 'Light'),
              React.createElement('option', { value: 'moderate', disabled: difficulty === 'rookie' || difficulty === 'amateur' }, 'Moderate'),
              React.createElement('option', { value: 'severe', disabled: difficulty !== 'devil' }, 'Severe')
            )
          ),
          
          React.createElement('div', { className: 'weather-param' },
            React.createElement('label', null, 'Precipitation:'),
            React.createElement('select', {
              value: weatherData.precipitation,
              onChange: (e) => setWeatherData({...weatherData, precipitation: e.target.value})
            },
              React.createElement('option', { value: 'none' }, 'None'),
              React.createElement('option', { value: 'rain', disabled: difficulty === 'rookie' }, 'Rain'),
              React.createElement('option', { value: 'snow', disabled: difficulty === 'rookie' || difficulty === 'amateur' }, 'Snow'),
              React.createElement('option', { value: 'thunderstorm', disabled: difficulty !== 'devil' }, 'Thunderstorm')
            )
          ),
          
          React.createElement('div', { className: 'weather-param' },
            React.createElement('label', { className: 'checkbox-label' },
              React.createElement('input', {
                type: 'checkbox',
                checked: weatherData.birdStrike,
                onChange: (e) => setWeatherData({...weatherData, birdStrike: e.target.checked}),
                disabled: difficulty === 'rookie'
              }),
              'Bird Strike Risk'
            )
          )
        )
      ),

      React.createElement('div', { className: 'config-section' },
        React.createElement('h3', null, 'Crew Configuration'),
        React.createElement('div', { className: 'crew-options' },
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'crewCount',
              value: 1,
              checked: crewCount === 1,
              onChange: (e) => setCrewCount(parseInt(e.target.value)),
              disabled: flightPlan && flightPlan.distance.nauticalMiles > 3000
            }),
            '1 Pilot (Domestic/Mid-range only)'
          ),
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'crewCount',
              value: 2,
              checked: crewCount === 2,
              onChange: (e) => setCrewCount(parseInt(e.target.value))
            }),
            '2 Pilots (Standard)'
          ),
          React.createElement('label', { className: 'radio-label' },
            React.createElement('input', {
              type: 'radio',
              name: 'crewCount',
              value: 3,
              checked: crewCount === 3,
              onChange: (e) => setCrewCount(parseInt(e.target.value)),
              disabled: flightPlan && flightPlan.distance.nauticalMiles < 5000
            }),
            '3 Pilots (Long-haul)'
          )
        )
      )
    ),

    React.createElement('div', { className: 'initialization-controls' },
      React.createElement('button', {
        onClick: handleInitializeFlight,
        disabled: !selectedDeparture || !selectedArrival,
        className: 'initialize-btn'
      }, 'Initialize Flight')
    )
  );
};

export default FlightInitialization;