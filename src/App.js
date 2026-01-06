import React, { useState, useEffect } from 'react';
import './App.css';
import useAirportSearch from './hooks/useAirportSearch';
import { aircraftService } from './services/aircraftService';
import { airportService } from './services/airportService';
import { calculateDistance, calculateFlightPlan, formatDistance, formatFlightTime, formatFuel } from './utils/distanceCalculator';
import AirportSearchInput from './components/AirportSearchInput.js';
import FlightInitialization from './components/FlightInitialization.js';
import FlightInProgress from './components/FlightInProgress.js';
import { FadeOverlay, CinematicReview } from './components/CinematicComponents.js';

function App() {
  // Flight initialization state
  const [difficulty, setDifficulty] = useState('rookie');
  const [airline, setAirline] = useState('');
  const [callsign, setCallsign] = useState('');
  const [aircraftModel, setAircraftModel] = useState('');
  const [pax, setPax] = useState(0);
  const [payload, setPayload] = useState(0);
  const [fuelReserve, setFuelReserve] = useState(0.1);
  const [cruiseHeight, setCruiseHeight] = useState(35000);
  const [timeZulu, setTimeZulu] = useState('');
  const [useRandomTime, setUseRandomTime] = useState(true);
  const [season, setSeason] = useState('');
  const [useRandomSeason, setUseRandomSeason] = useState(true);
  
  // Flight simulation state
  const [flightInitialized, setFlightInitialized] = useState(false);
  const [flightPlan, setFlightPlan] = useState(null);
  
  // Airport search state
  const { searchResults, selectedDeparture, selectedArrival, searchAirports, selectDeparture, selectArrival, clearSelection } = useAirportSearch();
  
  // Aircraft suggestions
  const [aircraftSuggestions, setAircraftSuggestions] = useState([]);
  
  // New simulation state variables
  const [failureType, setFailureType] = useState('random');
  const [weatherData, setWeatherData] = useState({
    windSpeed: 0,
    windDirection: 0,
    visibility: 10,
    cloudCover: 0,
    birdStrike: false,
    turbulence: 'none',
    precipitation: 'none'
  });
  const [crewCount, setCrewCount] = useState(2);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [cinematicPhase, setCinematicPhase] = useState('none');

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
    
    // Start cinematic phase
    setCinematicPhase('fade_out');
    
    // After fade out, show cinematic review
    setTimeout(() => {
      setCinematicPhase('cinematic_review');
      
      // After cinematic review, start simulation
      setTimeout(() => {
        setCinematicPhase('fade_in');
        setTimeout(() => {
          setFlightInitialized(true);
          setCinematicPhase('none');
        }, 1000);
      }, 5000); // 5 seconds for cinematic review
    }, 1000); // 1 second fade out
  };

  const handleResetFlight = () => {
    setFlightInitialized(false);
    setFlightPlan(null);
  };

  // Cinematic UI components
  if (cinematicPhase !== 'none') {
    return React.createElement('div', { className: `cinematic-container ${cinematicPhase}` },
      cinematicPhase === 'fade_out' && React.createElement(FadeOverlay, { phase: 'fade-out' },
        React.createElement('div', { className: 'fade-content' },
          React.createElement('h1', null, 'Initializing Flight Simulation'),
          React.createElement('p', null, 'Preparing for takeoff...')
        )
      ),
      
      cinematicPhase === 'cinematic_review' && React.createElement(CinematicReview, {
        callsign: callsign,
        selectedDeparture: selectedDeparture,
        selectedArrival: selectedArrival,
        aircraftModel: aircraftModel,
        weatherData: weatherData,
        crewCount: crewCount,
        failureType: failureType,
        difficulty: difficulty,
        pax: pax,
        payload: payload
      }),
      
      cinematicPhase === 'fade_in' && React.createElement(FadeOverlay, { phase: 'fade-in' },
        React.createElement('div', { className: 'fade-content' },
          React.createElement('h1', null, 'Simulation Active'),
          React.createElement('p', null, 'Flight controls are now available')
        )
      )
    );
  }

  if (flightInitialized) {
    return React.createElement(FlightInProgress, {
      callsign: callsign,
      aircraftModel: aircraftModel,
      difficulty: difficulty,
      selectedDeparture: selectedDeparture,
      selectedArrival: selectedArrival,
      flightPlan: flightPlan,
      airline: airline,
      pax: pax,
      payload: payload,
      fuelReserve: fuelReserve,
      cruiseHeight: cruiseHeight,
      useRandomTime: useRandomTime,
      timeZulu: timeZulu,
      useRandomSeason: useRandomSeason,
      season: season,
      handleResetFlight: handleResetFlight,
      formatDistance: formatDistance,
      formatFlightTime: formatFlightTime,
      formatFuel: formatFuel
    });
  }

  return React.createElement('div', { className: 'App' },
    React.createElement('header', { className: 'app-header' },
      React.createElement('h1', null, 'Ultimate Crash - Flight Initialization'),
      React.createElement('p', null, 'Configure your flight parameters and select difficulty level')
    ),

    React.createElement('main', { className: 'app-main' },
      React.createElement(FlightInitialization, {
        difficulty: difficulty,
        setDifficulty: setDifficulty,
        airline: airline,
        setAirline: setAirline,
        callsign: callsign,
        setCallsign: setCallsign,
        aircraftModel: aircraftModel,
        setAircraftModel: setAircraftModel,
        pax: pax,
        setPax: setPax,
        payload: payload,
        setPayload: setPayload,
        fuelReserve: fuelReserve,
        setFuelReserve: setFuelReserve,
        cruiseHeight: cruiseHeight,
        setCruiseHeight: setCruiseHeight,
        timeZulu: timeZulu,
        setTimeZulu: setTimeZulu,
        useRandomTime: useRandomTime,
        setUseRandomTime: setUseRandomTime,
        season: season,
        setSeason: setSeason,
        useRandomSeason: useRandomSeason,
        setUseRandomSeason: setUseRandomSeason,
        selectedDeparture: selectedDeparture,
        selectedArrival: selectedArrival,
        searchResults: searchResults,
        searchAirports: searchAirports,
        selectDeparture: selectDeparture,
        selectArrival: selectArrival,
        flightPlan: flightPlan,
        formatDistance: formatDistance,
        formatFlightTime: formatFlightTime,
        formatFuel: formatFuel,
        failureType: failureType,
        setFailureType: setFailureType,
        weatherData: weatherData,
        setWeatherData: setWeatherData,
        crewCount: crewCount,
        setCrewCount: setCrewCount,
        aircraftSuggestions: aircraftSuggestions,
        handleInitializeFlight: handleInitializeFlight,
        handleSearch: handleSearch
      })
    )
  );
}

export default App;