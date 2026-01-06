import React, { useState, useEffect } from 'react';
import useAirportSearch from './hooks/useAirportSearch';
import { calculateFlightPlan, formatDistance, formatFlightTime, formatFuel } from './utils/distanceCalculator';
import { aircraftService } from './services/aircraftService';
import './App.css';

function App() {
  // Flight initialization state
  const [difficulty, setDifficulty] = useState('intermediate');
  const [airline, setAirline] = useState('');
  const [callsign, setCallsign] = useState('');
  const [aircraftModel, setAircraftModel] = useState('Boeing 737-800');
  const [pax, setPax] = useState(150);
  const [payload, setPayload] = useState(10000);
  const [fuelReserve, setFuelReserve] = useState(0.1);
  const [cruiseHeight, setCruiseHeight] = useState(35000);
  const [timeZulu, setTimeZulu] = useState('');
  const [useRandomTime, setUseRandomTime] = useState(true);
  const [season, setSeason] = useState('');
  const [useRandomSeason, setUseRandomSeason] = useState(true);
  
  const [flightInitialized, setFlightInitialized] = useState(false);
  const [flightPlan, setFlightPlan] = useState(null);
  const [aircraftSuggestions, setAircraftSuggestions] = useState([]);

  // Airport search hook
  const {
    searchResults,
    selectedDeparture,
    selectedArrival,
    searchAirports,
    selectDeparture,
    selectArrival,
    clearSelection
  } = useAirportSearch();

  // Load popular aircraft models
  useEffect(() => {
    const popularAircraft = aircraftService.getPopularAircraft();
    setAircraftSuggestions(popularAircraft);
  }, []);

  // Calculate flight plan when airports and aircraft are selected
  useEffect(() => {
    if (selectedDeparture && selectedArrival && aircraftModel) {
      try {
        const plan = calculateFlightPlan(selectedDeparture, selectedArrival, aircraftModel, payload);
        setFlightPlan(plan);
      } catch (error) {
        console.error('Error calculating flight plan:', error);
        setFlightPlan(null);
      }
    } else {
      setFlightPlan(null);
    }
  }, [selectedDeparture, selectedArrival, aircraftModel, payload]);

  const handleSearch = (query) => {
    searchAirports(query);
  };

  const handleInitializeFlight = () => {
    if (!selectedDeparture || !selectedArrival) {
      alert('Please select both departure and arrival airports');
      return;
    }
    setFlightInitialized(true);
  };

  const handleResetFlight = () => {
    setFlightInitialized(false);
    setFlightPlan(null);
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

  const AirportSearchInput = ({ placeholder, onSelect, selectedAirport, searchResults }) => (
    <div className="search-input">
      <input
        type="text"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        className="airport-input"
      />
      {selectedAirport && (
        <div className="selected-airport">
          <strong>{selectedAirport.iata || selectedAirport.icao}</strong> - {selectedAirport.name}
          <button onClick={() => onSelect(null)} className="clear-btn">×</button>
        </div>
      )}
      {searchResults && searchResults.length > 0 && !selectedAirport && (
        <div className="search-results">
          {searchResults.slice(0, 5).map((airport, index) => (
            <div
              key={index}
              className="result-item"
              onClick={() => onSelect(airport)}
            >
              <strong>{airport.iata || airport.icao}</strong> - {airport.name}
              <br />
              <small>{airport.city}, {airport.country}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (flightInitialized) {
    return (
      <div className="App">
        <header className="app-header">
          <h1>Flight in Progress - {callsign || 'Unnamed Flight'}</h1>
          <p>Difficulty: {difficulty.toUpperCase()} | Aircraft: {aircraftModel}</p>
          <button onClick={handleResetFlight} className="reset-btn">Reset Flight</button>
        </header>

        <main className="app-main">
          <div className="flight-in-progress">
            <h2>Flight Status</h2>
            <div className="flight-summary">
              <div className="summary-item">
                <strong>Route:</strong> {selectedDeparture.iata} → {selectedArrival.iata}
              </div>
              <div className="summary-item">
                <strong>Distance:</strong> {flightPlan ? formatDistance(flightPlan.distance.nauticalMiles) : 'Calculating...'}
              </div>
              <div className="summary-item">
                <strong>Flight Time:</strong> {flightPlan ? formatFlightTime(flightPlan.time) : 'Calculating...'}
              </div>
              <div className="summary-item">
                <strong>Fuel:</strong> {flightPlan ? formatFuel(flightPlan.fuel) : 'Calculating...'}
              </div>
            </div>
            
            <div className="flight-details">
              <h3>Flight Parameters</h3>
              <div className="parameters-grid">
                <div className="param-item">
                  <strong>Airline:</strong> {airline || 'Not specified'}
                </div>
                <div className="param-item">
                  <strong>Callsign:</strong> {callsign || 'Not specified'}
                </div>
                <div className="param-item">
                  <strong>PAX:</strong> {pax}
                </div>
                <div className="param-item">
                  <strong>Payload:</strong> {payload} kg
                </div>
                <div className="param-item">
                  <strong>Fuel Reserve:</strong> {fuelReserve * 100}%
                </div>
                <div className="param-item">
                  <strong>Cruise Height:</strong> {cruiseHeight} ft
                </div>
                <div className="param-item">
                  <strong>Time (Zulu):</strong> {useRandomTime ? generateRandomTime() : timeZulu}
                </div>
                <div className="param-item">
                  <strong>Season:</strong> {useRandomSeason ? generateRandomSeason() : season}
                </div>
              </div>
            </div>

            <div className="flight-controls">
              <h3>Flight Controls</h3>
              <p>Flight simulation controls will appear here...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Ultimate Crash - Flight Initialization</h1>
        <p>Configure your flight parameters and select difficulty level</p>
      </header>

      <main className="app-main">
        <div className="flight-initialization">
          <div className="difficulty-section">
            <h2>Difficulty Level</h2>
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
          </div>

          <div className="flight-parameters">
            <h2>Flight Parameters</h2>
            
            <div className="parameters-grid">
              <div className="parameter-group">
                <label>Airline:</label>
                <input
                  type="text"
                  value={airline}
                  onChange={(e) => setAirline(e.target.value)}
                  placeholder="e.g., Delta Air Lines"
                />
              </div>

              <div className="parameter-group">
                <label>Callsign:</label>
                <input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  placeholder="e.g., DAL123"
                />
              </div>

              <div className="parameter-group">
                <label>Aircraft Model:</label>
                <select 
                  value={aircraftModel} 
                  onChange={(e) => setAircraftModel(e.target.value)}
                >
                  {aircraftSuggestions.map((aircraft, index) => (
                    <option key={index} value={aircraft.model}>
                      {aircraft.manufacturer} {aircraft.model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="parameter-group">
                <label>Passengers (PAX):</label>
                <input
                  type="number"
                  value={pax}
                  onChange={(e) => setPax(parseInt(e.target.value) || 0)}
                  min="0"
                  max="1000"
                />
              </div>

              <div className="parameter-group">
                <label>Payload (kg):</label>
                <input
                  type="number"
                  value={payload}
                  onChange={(e) => setPayload(parseInt(e.target.value) || 0)}
                  min="0"
                  max="200000"
                />
              </div>

              <div className="parameter-group">
                <label>Fuel Reserve (%):</label>
                <input
                  type="number"
                  value={fuelReserve * 100}
                  onChange={(e) => setFuelReserve((parseInt(e.target.value) || 0) / 100)}
                  min="5"
                  max="50"
                  step="1"
                />
              </div>

              <div className="parameter-group">
                <label>Cruise Height (ft):</label>
                <input
                  type="number"
                  value={cruiseHeight}
                  onChange={(e) => setCruiseHeight(parseInt(e.target.value) || 0)}
                  min="10000"
                  max="45000"
                  step="1000"
                />
              </div>

              <div className="parameter-group">
                <label>Time (Zulu):</label>
                <div className="time-controls">
                  <input
                    type="text"
                    value={timeZulu}
                    onChange={(e) => setTimeZulu(e.target.value)}
                    placeholder="HH:MMZ"
                    disabled={useRandomTime}
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={useRandomTime}
                      onChange={(e) => setUseRandomTime(e.target.checked)}
                    />
                    Random
                  </label>
                </div>
              </div>

              <div className="parameter-group">
                <label>Season:</label>
                <div className="season-controls">
                  <select 
                    value={season} 
                    onChange={(e) => setSeason(e.target.value)}
                    disabled={useRandomSeason}
                  >
                    <option value="">Select Season</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Autumn">Autumn</option>
                    <option value="Winter">Winter</option>
                  </select>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={useRandomSeason}
                      onChange={(e) => setUseRandomSeason(e.target.checked)}
                    />
                    Random
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="airport-selection-section">
            <h2>Route Selection</h2>
            
            <div className="airport-inputs">
              <div className="airport-group">
                <h3>Departure Airport</h3>
                <AirportSearchInput
                  placeholder="Enter departure airport (IATA/ICAO/Name)"
                  onSelect={selectDeparture}
                  selectedAirport={selectedDeparture}
                  searchResults={searchResults}
                />
              </div>

              <div className="airport-group">
                <h3>Arrival Airport</h3>
                <AirportSearchInput
                  placeholder="Enter arrival airport (IATA/ICAO/Name)"
                  onSelect={selectArrival}
                  selectedAirport={selectedArrival}
                  searchResults={searchResults}
                />
              </div>
            </div>

            {flightPlan && (
              <div className="flight-preview">
                <h3>Flight Preview</h3>
                <div className="preview-info">
                  <p><strong>Distance:</strong> {formatDistance(flightPlan.distance.nauticalMiles)}</p>
                  <p><strong>Flight Time:</strong> {formatFlightTime(flightPlan.time)}</p>
                  <p><strong>Fuel Required:</strong> {formatFuel(flightPlan.fuel)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="initialization-controls">
            <button 
              onClick={handleInitializeFlight}
              disabled={!selectedDeparture || !selectedArrival}
              className="initialize-btn"
            >
              Initialize Flight
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;