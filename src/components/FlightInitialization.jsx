import React, { useState, useEffect } from 'react';
import './FlightInitialization.css';
import AirportSearchInput from './AirportSearchInput.jsx';
import { randomFlightService } from '../services/randomFlightService.js';
import { useLanguage } from '../contexts/LanguageContext';

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
  apiKey, setApiKey
}) => {
  const { t } = useLanguage();
  
  // Fuel Reserve State (hours)
  const [reserveHours, setReserveHours] = useState(1.0);
  
  // Step Management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Input validation helper
  const isValidNumber = (val, min, max) => {
    if (val === '' || val === null || val === undefined) return false;
    const num = parseFloat(val);
    return !isNaN(num) && num >= min && num <= max;
  };
  
  // Step 1 Validation: Difficulty is always selected (it has a default)
  const isStep1Valid = () => !!difficulty;
  
  // Step 2 Validation: Flight Parameters
  const isStep2Valid = () => {
    return (
      airline.trim() !== '' &&
      callsign.trim() !== '' &&
      aircraftModel &&
      isValidNumber(pax, 0, 1000) &&
      isValidNumber(payload, 0, 100000) &&
      isValidNumber(cruiseHeight, 1000, 50000) &&
      isValidNumber(reserveHours, 0.5, 5.0) &&
      isValidNumber(crewCount, 1, 10) &&
      (useRandomTime || timeZulu.trim() !== '') &&
      (useRandomSeason || season)
    );
  };

  // Step 3 Validation: Route
  const isStep3Valid = () => {
    return selectedDeparture && selectedArrival;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && isStep1Valid()) {
      // Auto-generate hidden parameters based on difficulty when proceeding
      const randomWeather = generateRandomWeather(difficulty);
      setWeatherData(randomWeather);
      const randomFailure = generateRandomFailure(difficulty);
      setFailureType(randomFailure);
      
      setCurrentStep(2);
    }
    else if (currentStep === 2 && isStep2Valid()) setCurrentStep(3);
  };

  // Randomize Helpers
  const randomizeStep1 = () => {
    const difficulties = ['rookie', 'amateur', 'intermediate', 'advanced', 'pro', 'devil'];
    const randomDiff = difficulties[Math.floor(Math.random() * difficulties.length)];
    setDifficulty(randomDiff);
  };

  const randomizeStep2 = async () => {
    try {
      const randomParams = await randomFlightService.generateRandomFlightParameters();
      setAirline(randomParams.airline);
      setCallsign(randomParams.callsign);
      setAircraftModel(randomParams.aircraftModel);
      setPax(randomParams.pax);
      setPayload(randomParams.payload);
      setFuelReserve(randomParams.fuelReserve);
      setCruiseHeight(randomParams.cruiseHeight);
      setUseRandomTime(true);
      setUseRandomSeason(true);
      setCrewCount(Math.floor(Math.random() * 4) + 2); // Random crew 2-5
      
      // Also randomize hidden weather/failure based on current difficulty
      const randomWeather = generateRandomWeather(difficulty);
      setWeatherData(randomWeather);
      const randomFailure = generateRandomFailure(difficulty);
      setFailureType(randomFailure);
    } catch (error) {
      console.error("Error randomizing flight params:", error);
    }
  };

  const randomizeStep3 = async () => {
    try {
      const randomParams = await randomFlightService.generateRandomFlightParameters();
      selectDeparture(randomParams.selectedDeparture);
      selectArrival(randomParams.selectedArrival);
    } catch (error) {
      console.error("Error randomizing route:", error);
    }
  };


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
      alert(`${t('initialization.messages.random_initialized')}\n${t('initialization.summary.route')} ${randomParams.selectedDeparture.iata} → ${randomParams.selectedArrival.iata}\n${t('initialization.parameters.aircraft_type')}: ${randomParams.aircraftModel}\n${t('initialization.sections.difficulty')}: ${randomParams.difficulty}\n${t('initialization.tooltips.random_difficulty')}: ${randomFailure}\n${t('initialization.parameters.season')}: ${randomWeather.type}`);
      
    } catch (error) {
      console.error('Error initializing random flight:', error);
      alert(t('initialization.messages.error_random'));
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

  // Handle difficulty change
  useEffect(() => {
    // Difficulty logic here if needed in future
  }, [difficulty]);



  return (
    <div className="flight-initialization">
      {/* 01. DIFFICULTY & INTEL */}
      <div 
        className="dispatch-section"
        style={{ 
          opacity: currentStep === 1 ? 1 : 0.5, 
          pointerEvents: currentStep === 1 ? 'auto' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #30363d' }}>
          <h2 className="section-header" style={{ borderBottom: 'none', marginBottom: 0 }}>{t('initialization.sections.difficulty')}</h2>
          <button className="dispatch-btn random" onClick={randomizeStep1} title={t('initialization.tooltips.random_difficulty')}>
            🎲
          </button>
        </div>
        
        <div className="difficulty-grid">
          <div className="difficulty-buttons">
            {['rookie', 'amateur', 'intermediate', 'advanced', 'pro', 'devil'].map((level) => (
              <button
                key={level}
                className={`difficulty-btn ${level} ${difficulty === level ? 'active' : ''}`}
                onClick={() => setDifficulty(level)}
              >
                {t(`initialization.difficulty.${level}`)}
              </button>
            ))}
          </div>
          
          <div className="intel-panel">
            <div className="crew-intel-box">
              <span className="intel-label">{t('initialization.difficulty.intel_label')}</span>
              <p className="intel-text">
                {(() => {
                  return t(`initialization.difficulty.descriptions.${difficulty}`) || t('initialization.difficulty.descriptions.waiting');
                })()}
              </p>
            </div>
          </div>
        </div>
        
        {currentStep === 1 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="dispatch-btn primary" 
              onClick={handleNextStep}
              disabled={!isStep1Valid()}
            >
              {t('initialization.buttons.next_params')}
            </button>
          </div>
        )}
      </div>

      {/* 02. FLIGHT PARAMETERS (Merged with Crew Count) */}
      <div 
        className="dispatch-section"
        style={{ 
          opacity: currentStep === 2 ? 1 : 0.5, 
          pointerEvents: currentStep === 2 ? 'auto' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #30363d' }}>
          <h2 className="section-header" style={{ borderBottom: 'none', marginBottom: 0 }}>{t('initialization.sections.parameters')}</h2>
          <button className="dispatch-btn random" onClick={randomizeStep2} title={t('initialization.tooltips.random_params')}>
            🎲
          </button>
        </div>

        <div className="dispatch-grid">
          <div className="parameter-group">
            <label>{t('initialization.parameters.airline')}</label>
            <input
              type="text"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="dispatch-input"
              placeholder={t('initialization.parameters.placeholders.operator')}
            />
          </div>

          <div className="parameter-group">
            <label>{t('initialization.parameters.callsign')}</label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="dispatch-input"
              placeholder={t('initialization.parameters.placeholders.flight_number')}
            />
          </div>

          <div className="parameter-group">
            <label>{t('initialization.parameters.aircraft_type')}</label>
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
            <label>{t('initialization.parameters.crew_count')}</label>
            <input
              type="number"
              value={crewCount}
              onChange={(e) => setCrewCount(e.target.value)}
              className="dispatch-input"
              min="1" max="10"
              placeholder={t('initialization.parameters.placeholders.count_range')}
            />
          </div>

          <div className="parameter-group">
            <label>{t('initialization.parameters.passengers')}</label>
            <input
              type="number"
              value={pax}
              onChange={(e) => setPax(e.target.value)}
              className="dispatch-input"
              min="0" max="1000"
              placeholder={t('initialization.parameters.placeholders.pax_range')}
            />
          </div>

          <div className="parameter-group">
            <label>{t('initialization.parameters.payload')}</label>
            <input
              type="number"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="dispatch-input"
              min="0" max="100000"
              placeholder={t('initialization.parameters.placeholders.weight_unit')}
            />
          </div>

          <div className="parameter-group">
            <label>{t('initialization.parameters.cruise_height')}</label>
            <input
              type="number"
              value={cruiseHeight}
              onChange={(e) => setCruiseHeight(e.target.value)}
              className="dispatch-input"
              min="1000" max="50000"
              placeholder={t('initialization.parameters.placeholders.height_unit')}
            />
          </div>

          <div className="parameter-group">
            <label>{t('initialization.parameters.reserve_fuel')}</label>
            <input
              type="number"
              value={reserveHours}
              onChange={(e) => setReserveHours(e.target.value)}
              className="dispatch-input"
              min="0.5" max="5.0" step="0.1"
              placeholder={t('initialization.parameters.placeholders.hours')}
            />
          </div>

          <div className="parameter-group">
            <label>{t('initialization.parameters.zulu_time')}</label>
            <div className="checkbox-input-group">
              <input
                type="text"
                value={timeZulu}
                onChange={(e) => setTimeZulu(e.target.value)}
                className="dispatch-input"
                disabled={useRandomTime}
                placeholder={t('initialization.parameters.placeholders.time_format')}
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useRandomTime}
                  onChange={(e) => {
                    setUseRandomTime(e.target.checked);
                    if (e.target.checked) setTimeZulu(generateRandomTime());
                  }}
                /> {t('initialization.parameters.random_checkbox')}
              </label>
            </div>
          </div>

          <div className="parameter-group">
            <label>{t('initialization.parameters.season')}</label>
            <div className="checkbox-input-group">
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="dispatch-select"
                disabled={useRandomSeason}
              >
                <option value="Spring">{t('initialization.parameters.seasons.spring')}</option>
                <option value="Summer">{t('initialization.parameters.seasons.summer')}</option>
                <option value="Autumn">{t('initialization.parameters.seasons.autumn')}</option>
                <option value="Winter">{t('initialization.parameters.seasons.winter')}</option>
              </select>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useRandomSeason}
                  onChange={(e) => {
                    setUseRandomSeason(e.target.checked);
                    if (e.target.checked) setSeason(generateRandomSeason());
                  }}
                /> {t('initialization.parameters.random_checkbox')}
              </label>
            </div>
          </div>
        </div>

        {currentStep === 2 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
             <button 
              className="dispatch-btn primary" 
              onClick={handleNextStep}
              disabled={!isStep2Valid()}
            >
              {t('initialization.buttons.next_route')}
            </button>
          </div>
        )}
      </div>

      {/* 03. ROUTE SELECTION */}
      <div 
        className="dispatch-section"
        style={{ 
          opacity: currentStep === 3 ? 1 : 0.5, 
          pointerEvents: currentStep === 3 ? 'auto' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #30363d' }}>
          <h2 className="section-header" style={{ borderBottom: 'none', marginBottom: 0 }}>{t('initialization.sections.route')}</h2>
          <button className="dispatch-btn random" onClick={randomizeStep3} title={t('initialization.tooltips.random_route')}>
            🎲
          </button>
        </div>

        <div className="airport-selection-grid">
          <div className="parameter-group">
            <label>{t('initialization.route.departure')}</label>
            <AirportSearchInput
              placeholder={t('initialization.route.search_placeholder')}
              searchResults={searchResults}
              handleSearch={handleSearch}
              onSelect={selectDeparture}
              selectedAirport={selectedDeparture}
            />
          </div>

          <div className="parameter-group">
            <label>{t('initialization.route.arrival')}</label>
            <AirportSearchInput
              placeholder={t('initialization.route.search_placeholder')}
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
            <span className="summary-label">{t('initialization.summary.route')}</span>
            <span className="summary-value">{selectedDeparture.iata} → {selectedArrival.iata}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('initialization.summary.distance')}</span>
            <span className="summary-value">{formatDistance(flightPlan.distance.nauticalMiles)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('initialization.summary.est_time')}</span>
            <span className="summary-value">{formatFlightTime(flightPlan.time)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('initialization.summary.fuel_req')}</span>
            <span className="summary-value" style={{fontSize: '0.9em'}}>
              {t('initialization.summary.trip')}: {flightPlan.fuel.tripFuel}kg | {t('initialization.summary.rsv')}: {flightPlan.fuel.reserveFuel}kg
              <br/>
              {t('initialization.summary.total')}: {formatFuel(flightPlan.fuel)}
            </span>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {currentStep === 3 && (
        <div className="dispatch-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button
            className="dispatch-btn primary"
            onClick={() => {
              if (!selectedDeparture || !selectedArrival) {
                alert(t('initialization.messages.select_airports'));
                return;
              }
              handleInitializeFlight();
            }}
            style={{ width: '100%' }}
          >
            {t('initialization.buttons.finalize')}
          </button>
        </div>
      )}
    </div>
  );
};

export default FlightInitialization;
