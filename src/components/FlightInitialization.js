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
      
      // Generate random weather based on difficulty
      const randomWeather = generateRandomWeather(randomParams.difficulty);
      setWeatherData(randomWeather);
      
      // Generate random failure based on difficulty (no "no failure" option)
      const randomFailure = generateRandomFailure(randomParams.difficulty);
      setFailureType(randomFailure);
      
      // Select the random airports
      selectDeparture(randomParams.selectedDeparture);
      selectArrival(randomParams.selectedArrival);
      
      console.log('Random flight initialized:', randomParams);
      
      // Show confirmation message
      alert(`Random flight initialized!\nRoute: ${randomParams.selectedDeparture.iata} → ${randomParams.selectedArrival.iata}\nAircraft: ${randomParams.aircraftModel}\nDifficulty: ${randomParams.difficulty}\nFailure: ${randomFailure}\nWeather: ${randomWeather.type}`);
      
    } catch (error) {
      console.error('Error initializing random flight:', error);
      alert('Error initializing random flight. Please try again.');
    }
  };

  // Generate random weather based on difficulty
  const generateRandomWeather = (difficultyLevel) => {
    const weatherTypes = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'snow'];
    const difficultyWeights = {
      'rookie': [0.4, 0.3, 0.2, 0.05, 0.03, 0.02],
      'amateur': [0.3, 0.3, 0.2, 0.1, 0.05, 0.05],
      'intermediate': [0.2, 0.25, 0.25, 0.15, 0.1, 0.05],
      'advanced': [0.15, 0.2, 0.25, 0.2, 0.1, 0.1],
      'pro': [0.1, 0.15, 0.25, 0.25, 0.15, 0.1],
      'devil': [0.05, 0.1, 0.2, 0.3, 0.2, 0.15]
    };
    
    const weights = difficultyWeights[difficultyLevel] || difficultyWeights['intermediate'];
    const randomValue = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < weatherTypes.length; i++) {
      cumulativeWeight += weights[i];
      if (randomValue <= cumulativeWeight) {
        const selectedType = weatherTypes[i];
        
        // Generate weather parameters based on type and difficulty
        const baseWind = difficultyLevel === 'devil' ? 30 : difficultyLevel === 'pro' ? 20 : 10;
        const baseVisibility = difficultyLevel === 'devil' ? 0.5 : difficultyLevel === 'pro' ? 2 : 5;
        
        return {
          type: selectedType,
          windSpeed: Math.round(baseWind + (Math.random() * (difficultyLevel === 'devil' ? 40 : 20))),
          visibility: Math.max(0.1, baseVisibility + (Math.random() * (difficultyLevel === 'devil' ? 2 : 5)))
        };
      }
    }
    
    return { type: 'clear', windSpeed: 10, visibility: 10 };
  };

  // Generate random failure based on difficulty (no "no failure")
  const generateRandomFailure = (difficultyLevel) => {
    const failureTypes = ['engine_failure', 'hydraulic_failure', 'electrical_failure', 'instrument_failure', 'fuel_leak', 'structural_damage'];
    const difficultyWeights = {
      'rookie': [0.4, 0.2, 0.15, 0.15, 0.05, 0.05],
      'amateur': [0.3, 0.2, 0.2, 0.15, 0.1, 0.05],
      'intermediate': [0.25, 0.2, 0.2, 0.15, 0.1, 0.1],
      'advanced': [0.2, 0.2, 0.2, 0.15, 0.15, 0.1],
      'pro': [0.15, 0.2, 0.2, 0.15, 0.15, 0.15],
      'devil': [0.1, 0.2, 0.2, 0.15, 0.15, 0.2]
    };
    
    const weights = difficultyWeights[difficultyLevel] || difficultyWeights['intermediate'];
    const randomValue = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < failureTypes.length; i++) {
      cumulativeWeight += weights[i];
      if (randomValue <= cumulativeWeight) {
        return failureTypes[i];
      }
    }
    
    return failureTypes[0]; // Fallback to engine failure
  };

  // Get available failure types based on difficulty
  const getAvailableFailureTypes = () => {
    const allFailureTypes = ['engine_failure', 'hydraulic_failure', 'electrical_failure', 'instrument_failure', 'fuel_leak', 'structural_damage'];
    
    switch (difficulty) {
      case 'rookie':
        return allFailureTypes.slice(0, 3); // Only engine, hydraulic, electrical
      case 'amateur':
        return allFailureTypes.slice(0, 4); // Add instrument failure
      case 'intermediate':
        return allFailureTypes.slice(0, 5); // Add fuel leak
      case 'advanced':
        return allFailureTypes.slice(0, 6); // All except structural damage
      case 'pro':
        return allFailureTypes; // All failure types
      case 'devil':
        return allFailureTypes; // All failure types
      default:
        return allFailureTypes.slice(0, 3);
    }
  };

  // Get available weather types based on difficulty
  const getAvailableWeatherTypes = () => {
    const allWeatherTypes = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'snow'];
    
    switch (difficulty) {
      case 'rookie':
        return allWeatherTypes.slice(0, 3); // Only clear, cloudy, rain
      case 'amateur':
        return allWeatherTypes.slice(0, 4); // Add storm
      case 'intermediate':
        return allWeatherTypes.slice(0, 5); // Add fog
      case 'advanced':
        return allWeatherTypes.slice(0, 6); // All weather types
      case 'pro':
        return allWeatherTypes; // All weather types
      case 'devil':
        return allWeatherTypes; // All weather types
      default:
        return allWeatherTypes.slice(0, 3);
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

    React.createElement('div', { className: 'weather-failure-section' },
      React.createElement('h2', null, 'Weather & Failure Conditions'),
      React.createElement('div', { className: 'weather-failure-grid' },
        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Weather Type:'),
          React.createElement('select', {
            value: weatherData.type || 'clear',
            onChange: (e) => setWeatherData({...weatherData, type: e.target.value})
          },
            getAvailableWeatherTypes().map((type) =>
              React.createElement('option', { key: type, value: type },
                type.charAt(0).toUpperCase() + type.slice(1)
              )
            )
          )
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Wind Speed (kts):'),
          React.createElement('input', {
            type: 'number',
            value: weatherData.windSpeed || 0,
            onChange: (e) => setWeatherData({...weatherData, windSpeed: parseInt(e.target.value) || 0}),
            min: '0',
            max: '100',
            placeholder: '0-100 kts'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Visibility (mi):'),
          React.createElement('input', {
            type: 'number',
            value: weatherData.visibility || 10,
            onChange: (e) => setWeatherData({...weatherData, visibility: parseFloat(e.target.value) || 0}),
            min: '0',
            max: '50',
            step: '0.1',
            placeholder: '0-50 mi'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Failure Type:'),
          React.createElement('select', {
            value: failureType,
            onChange: (e) => setFailureType(e.target.value)
          },
            getAvailableFailureTypes().map((type) =>
              React.createElement('option', { key: type, value: type },
                type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
              )
            )
          )
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Crew Count:'),
          React.createElement('input', {
            type: 'number',
            value: crewCount,
            onChange: (e) => setCrewCount(parseInt(e.target.value) || 1),
            min: '1',
            max: '10',
            placeholder: '1-10'
          })
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
            max: '100000'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Fuel Reserve (%):'),
          React.createElement('input', {
            type: 'number',
            value: fuelReserve,
            onChange: (e) => setFuelReserve(parseFloat(e.target.value) || 0),
            min: '0',
            max: '1',
            step: '0.01',
            placeholder: '0.0-1.0'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Cruise Height (ft):'),
          React.createElement('input', {
            type: 'number',
            value: cruiseHeight,
            onChange: (e) => setCruiseHeight(parseInt(e.target.value) || 0),
            min: '1000',
            max: '50000',
            placeholder: '1000-50000'
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Time (Zulu):'),
          React.createElement('input', {
            type: 'text',
            value: timeZulu,
            onChange: (e) => setTimeZulu(e.target.value),
            placeholder: 'HH:MMZ',
            disabled: useRandomTime
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Use Random Time:'),
          React.createElement('input', {
            type: 'checkbox',
            checked: useRandomTime,
            onChange: (e) => {
              setUseRandomTime(e.target.checked);
              if (e.target.checked) {
                setTimeZulu(generateRandomTime());
              }
            }
          })
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Season:'),
          React.createElement('select', {
            value: season,
            onChange: (e) => setSeason(e.target.value),
            disabled: useRandomSeason
          },
            React.createElement('option', { value: 'Spring' }, 'Spring'),
            React.createElement('option', { value: 'Summer' }, 'Summer'),
            React.createElement('option', { value: 'Autumn' }, 'Autumn'),
            React.createElement('option', { value: 'Winter' }, 'Winter')
          )
        ),

        React.createElement('div', { className: 'parameter-group' },
          React.createElement('label', null, 'Use Random Season:'),
          React.createElement('input', {
            type: 'checkbox',
            checked: useRandomSeason,
            onChange: (e) => {
              setUseRandomSeason(e.target.checked);
              if (e.target.checked) {
                setSeason(generateRandomSeason());
              }
            }
          })
        )
      )
    ),

    React.createElement('div', { className: 'airport-selection' },
      React.createElement('h2', null, 'Route Selection'),
      React.createElement('div', { className: 'airport-grid' },
        React.createElement('div', { className: 'airport-group' },
          React.createElement('label', null, 'Departure Airport:'),
          React.createElement(AirportSearchInput, {
            placeholder: 'Search departure airport...',
            searchResults: searchResults,
            onSearch: handleSearch,
            onSelect: selectDeparture,
            selectedAirport: selectedDeparture
          })
        ),

        React.createElement('div', { className: 'airport-group' },
          React.createElement('label', null, 'Arrival Airport:'),
          React.createElement(AirportSearchInput, {
            placeholder: 'Search arrival airport...',
            searchResults: searchResults,
            onSearch: handleSearch,
            onSelect: selectArrival,
            selectedAirport: selectedArrival
          })
        )
      )
    ),

    flightPlan && React.createElement('div', { className: 'flight-plan-summary' },
      React.createElement('h2', null, 'Flight Plan Summary'),
      React.createElement('div', { className: 'plan-details' },
        React.createElement('p', null, `Route: ${selectedDeparture.iata} → ${selectedArrival.iata}`),
        React.createElement('p', null, `Distance: ${formatDistance(flightPlan.distance.nauticalMiles)}`),
        React.createElement('p', null, `Flight Time: ${formatFlightTime(flightPlan.time)}`),
        React.createElement('p', null, `Fuel Required: ${formatFuel(flightPlan.fuel)}`)
      )
    ),

    React.createElement('div', { className: 'initialization-buttons' },
      React.createElement('button', {
        className: 'random-btn',
        onClick: handleRandomInitialize
      }, '🎲 Random Flight'),
      
      React.createElement('button', {
        className: 'initialize-btn',
        onClick: handleInitializeFlight,
        disabled: !selectedDeparture || !selectedArrival
      }, 'Initialize Flight')
    )
  );
};

export default FlightInitialization;