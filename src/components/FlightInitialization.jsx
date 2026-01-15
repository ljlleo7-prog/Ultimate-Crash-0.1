import React, { useEffect } from 'react';
import './FlightInitialization.css';
import AirportSearchInput from './AirportSearchInput.jsx';
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
  handleSearch,
  physicsModel, setPhysicsModel,
  apiKey, setApiKey
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
  const handleRandomInitialize = async () => {
    try {
      const randomParams = await randomFlightService.generateRandomFlightParameters();
      
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
        return allFailureTypes.slice(0, 3);
      case 'amateur':
        return allFailureTypes.slice(0, 4);
      case 'intermediate':
        return allFailureTypes.slice(0, 5);
      case 'advanced':
        return allFailureTypes.slice(0, 6);
      case 'pro':
      case 'devil':
        return allFailureTypes;
      default:
        return allFailureTypes.slice(0, 3);
    }
  };

  // Get available weather types based on difficulty
  const getAvailableWeatherTypes = () => {
    const allWeatherTypes = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'snow'];
    
    switch (difficulty) {
      case 'rookie':
        return allWeatherTypes.slice(0, 3);
      case 'amateur':
        return allWeatherTypes.slice(0, 4);
      case 'intermediate':
        return allWeatherTypes.slice(0, 5);
      case 'advanced':
      case 'pro':
      case 'devil':
        return allWeatherTypes;
      default:
        return allWeatherTypes.slice(0, 3);
    }
  };

  // Get available physics models based on difficulty
  const getAvailablePhysicsModels = () => {
    switch (difficulty) {
      case 'rookie':
      case 'amateur':
        return ['imaginary', 'test_model1'];
      case 'intermediate':
      case 'advanced':
        return ['imaginary', 'realistic', 'test_model1'];
      case 'pro':
      case 'devil':
        return ['realistic', 'test_model1'];
      default:
        return ['imaginary', 'test_model1'];
    }
  };

  // Get default physics model based on difficulty
  const getDefaultPhysicsModel = () => {
    switch (difficulty) {
      case 'rookie':
      case 'amateur':
      case 'intermediate':
      case 'advanced':
        return 'imaginary';
      case 'pro':
      case 'devil':
        return 'realistic';
      default:
        return 'imaginary';
    }
  };

  // Handle difficulty change
  useEffect(() => {
    const availableModels = getAvailablePhysicsModels();
    if (!availableModels.includes(physicsModel)) {
      setPhysicsModel(getDefaultPhysicsModel());
    }
  }, [difficulty]);

  return (
    <div className="flight-initialization">
      {/* 01. DIFFICULTY & INTEL */}
      <div className="dispatch-section">
        <h2 className="section-header">01. OPERATIONAL LEVEL & INTEL</h2>
        <div className="difficulty-grid">
          <div className="difficulty-buttons">
            {['rookie', 'amateur', 'intermediate', 'advanced', 'pro', 'devil'].map((level) => (
              <button
                key={level}
                className={`difficulty-btn ${level} ${difficulty === level ? 'active' : ''}`}
                onClick={() => setDifficulty(level)}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>
          
          <div className="intel-panel">
            <div className="parameter-group">
              <label>Physics Engine:</label>
              <select 
                value={physicsModel} 
                onChange={(e) => setPhysicsModel(e.target.value)}
                className="dispatch-select"
              >
                {getAvailablePhysicsModels().map((model) => (
                  <option key={model} value={model}>
                    {model.toUpperCase()} MODEL
                  </option>
                ))}
              </select>
            </div>
            
            <div className="crew-intel-box">
              <span className="intel-label">CREW INTELLIGENCE:</span>
              <p className="intel-text">
                {(() => {
                  switch(difficulty) {
                    case 'rookie': return 'Highly supportive. NPCs assist with all checks. Standard procedures strictly followed.';
                    case 'amateur': return 'Experienced crew. Reliable support during significant events. NPC will assist.';
                    case 'intermediate': return 'Standard operations. Crew follows leads and executes commands precisely.';
                    case 'advanced': return 'Competent but prone to hesitation or minor errors under high-stress conditions.';
                    case 'pro': return 'High stress. Crew acts nervously and is prone to significant mistakes during emergencies.';
                    case 'devil': return 'Independent priorities. Active deviation from procedures possible. Do not rely on assistance.';
                    default: return 'Awaiting difficulty selection...';
                  }
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 02. METAR & CONDITIONS */}
      <div className="dispatch-section">
        <h2 className="section-header">02. METAR & ENVIRONMENTAL CONDITIONS</h2>
        <div className="dispatch-grid">
          <div className="parameter-group">
            <label>WEATHER TYPE</label>
            <select
              value={weatherData.type || 'clear'}
              onChange={(e) => setWeatherData({...weatherData, type: e.target.value})}
              className="dispatch-select"
            >
              {getAvailableWeatherTypes().map((type) => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="parameter-group">
            <label>WIND SPEED (KTS)</label>
            <input
              type="number"
              value={weatherData.windSpeed || 0}
              onChange={(e) => setWeatherData({...weatherData, windSpeed: parseInt(e.target.value) || 0})}
              className="dispatch-input"
              min="0" max="100"
            />
          </div>

          <div className="parameter-group">
            <label>VISIBILITY (MI)</label>
            <input
              type="number"
              value={weatherData.visibility || 10}
              onChange={(e) => setWeatherData({...weatherData, visibility: parseFloat(e.target.value) || 0})}
              className="dispatch-input"
              min="0" max="50" step="0.1"
            />
          </div>

          <div className="parameter-group">
            <label>FAILURE MODE</label>
            <select
              value={failureType}
              onChange={(e) => setFailureType(e.target.value)}
              className="dispatch-select"
            >
              {getAvailableFailureTypes().map((type) => (
                <option key={type} value={type}>
                  {type.split('_').map(w => w.toUpperCase()).join(' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="parameter-group">
            <label>CREW COUNT</label>
            <input
              type="number"
              value={crewCount}
              onChange={(e) => setCrewCount(parseInt(e.target.value) || 1)}
              className="dispatch-input"
              min="1" max="10"
            />
          </div>
        </div>
      </div>

      {/* 03. FLIGHT PARAMETERS */}
      <div className="dispatch-section">
        <h2 className="section-header">03. FLIGHT PARAMETERS</h2>
        <div className="dispatch-grid">
          <div className="parameter-group">
            <label>AIRLINE</label>
            <input
              type="text"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="dispatch-input"
              placeholder="OPERATOR NAME"
            />
          </div>

          <div className="parameter-group">
            <label>CALLSIGN</label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="dispatch-input"
              placeholder="FLIGHT NUMBER"
            />
          </div>

          <div className="parameter-group">
            <label>AIRCRAFT TYPE</label>
            <select
              value={aircraftModel}
              onChange={(e) => setAircraftModel(e.target.value)}
              className="dispatch-select"
            >
              {aircraftSuggestions.map((aircraft, index) => (
                <option key={index} value={aircraft.model}>
                  {aircraft.manufacturer} {aircraft.model}
                </option>
              ))}
            </select>
          </div>

          <div className="parameter-group">
            <label>PASSENGERS (PAX)</label>
            <input
              type="number"
              value={pax}
              onChange={(e) => setPax(parseInt(e.target.value) || 0)}
              className="dispatch-input"
              min="0" max="1000"
            />
          </div>

          <div className="parameter-group">
            <label>PAYLOAD (KG)</label>
            <input
              type="number"
              value={payload}
              onChange={(e) => setPayload(parseInt(e.target.value) || 0)}
              className="dispatch-input"
              min="0" max="100000"
            />
          </div>

          <div className="parameter-group">
            <label>CRUISE HEIGHT (FT)</label>
            <input
              type="number"
              value={cruiseHeight}
              onChange={(e) => setCruiseHeight(parseInt(e.target.value) || 0)}
              className="dispatch-input"
              min="1000" max="50000"
            />
          </div>

          <div className="parameter-group">
            <label>ZULU TIME</label>
            <div className="checkbox-input-group">
              <input
                type="text"
                value={timeZulu}
                onChange={(e) => setTimeZulu(e.target.value)}
                className="dispatch-input"
                disabled={useRandomTime}
                placeholder="HH:MMZ"
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useRandomTime}
                  onChange={(e) => {
                    setUseRandomTime(e.target.checked);
                    if (e.target.checked) setTimeZulu(generateRandomTime());
                  }}
                /> RANDOM
              </label>
            </div>
          </div>

          <div className="parameter-group">
            <label>SEASON</label>
            <div className="checkbox-input-group">
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="dispatch-select"
                disabled={useRandomSeason}
              >
                <option value="Spring">SPRING</option>
                <option value="Summer">SUMMER</option>
                <option value="Autumn">AUTUMN</option>
                <option value="Winter">WINTER</option>
              </select>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useRandomSeason}
                  onChange={(e) => {
                    setUseRandomSeason(e.target.checked);
                    if (e.target.checked) setSeason(generateRandomSeason());
                  }}
                /> RANDOM
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 04. ROUTE SELECTION */}
      <div className="dispatch-section">
        <h2 className="section-header">04. ROUTE SELECTION</h2>
        <div className="airport-selection-grid">
          <div className="parameter-group">
            <label>DEPARTURE AIRPORT</label>
            <AirportSearchInput
              placeholder="SEARCH ICAO/IATA..."
              searchResults={searchResults}
              handleSearch={handleSearch}
              onSelect={selectDeparture}
              selectedAirport={selectedDeparture}
            />
          </div>

          <div className="parameter-group">
            <label>ARRIVAL AIRPORT</label>
            <AirportSearchInput
              placeholder="SEARCH ICAO/IATA..."
              searchResults={searchResults}
              handleSearch={handleSearch}
              onSelect={selectArrival}
              selectedAirport={selectedArrival}
            />
          </div>
        </div>
      </div>

      {/* SUMMARY PANEL */}
      {flightPlan && selectedDeparture && selectedArrival && (
        <div className="dispatch-summary">
          <div className="summary-item">
            <span className="summary-label">ROUTE:</span>
            <span className="summary-value">{selectedDeparture.iata} → {selectedArrival.iata}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">DISTANCE:</span>
            <span className="summary-value">{formatDistance(flightPlan.distance.nauticalMiles)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">EST. TIME:</span>
            <span className="summary-value">{formatFlightTime(flightPlan.time)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">FUEL REQ:</span>
            <span className="summary-value">{formatFuel(flightPlan.fuel)}</span>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="dispatch-actions">
        <button className="dispatch-btn random" onClick={handleRandomInitialize}>
          🎲 GENERATE RANDOM MISSION
        </button>
        <button
          className="dispatch-btn primary"
          onClick={handleInitializeFlight}
          disabled={!selectedDeparture || !selectedArrival}
        >
          FINALIZE DISPATCH & INITIALIZE
        </button>
      </div>
    </div>
  );
};

export default FlightInitialization;
