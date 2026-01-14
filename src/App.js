import React, { useState, useEffect } from 'react';
import './App.css';
import useAirportSearch from './hooks/useAirportSearch';
import aircraftService from './services/aircraftService';
import { airportService } from './services/airportService';
import { calculateDistance, calculateFlightPlan, formatDistance, formatFlightTime, formatFuel } from './utils/distanceCalculator';
import AirportSearchInput from './components/AirportSearchInput.js';
import FlightInitialization from './components/FlightInitialization.js';
import FlightInProgress from './components/FlightInProgress.jsx';
import RouteSelection from './components/RouteSelection.jsx';
import { generateInitialWeather, updateWeather } from './services/weatherService';
import { generateDefaultRouteData } from './services/routeUtils';

import { FadeOverlay, CinematicReview } from './components/CinematicComponents.js';

function App() {
  // Add development mode flag
  const [devMode, setDevMode] = useState(false);
  
  // Development mode bypass - directly initialize flight
  const handleDevStart = () => {
    console.log('🚀 Development Mode: Starting flight simulation directly');
    setFlightInitialized(true);
    setCinematicPhase('none');
  };
  
  // Flight initialization state
  const [difficulty, setDifficulty] = useState('rookie');
  const [airline, setAirline] = useState('Test Airline');
  const [callsign, setCallsign] = useState('TEST001');
  const [aircraftModel, setAircraftModel] = useState('B737-800');
  const [pax, setPax] = useState(150);
  const [payload, setPayload] = useState(20000);
  const [fuelReserve, setFuelReserve] = useState(0.1);
  const [cruiseHeight, setCruiseHeight] = useState(35000);
  const [timeZulu, setTimeZulu] = useState('');
  const [useRandomTime, setUseRandomTime] = useState(true);
  const [season, setSeason] = useState('');
  const [useRandomSeason, setUseRandomSeason] = useState(true);
  const [apiKey, setApiKey] = useState('');
  
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
    type: 'clear',
    windSpeed: 0,
    visibility: 10,
    ceiling: 5000,
    precipitation: 0,
    turbulence: 0
  });
  const [crewCount, setCrewCount] = useState(2);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [cinematicPhase, setCinematicPhase] = useState('none');
  const [physicsModel, setPhysicsModel] = useState('imaginary'); // Default to imaginary model
  
  // Route selection state
  const [routeSelectionPhase, setRouteSelectionPhase] = useState(false);
  const [selectedDepartureGate, setSelectedDepartureGate] = useState(null);
  const [selectedDepartureTaxiway, setSelectedDepartureTaxiway] = useState(null);
  const [selectedDepartureRunway, setSelectedDepartureRunway] = useState(null);
  const [selectedSID, setSelectedSID] = useState(null);
  const [selectedWaypoints, setSelectedWaypoints] = useState([]);
  const [selectedSTAR, setSelectedSTAR] = useState(null);
  const [selectedArrivalRunway, setSelectedArrivalRunway] = useState(null);
  const [selectedArrivalTaxiway, setSelectedArrivalTaxiway] = useState(null);
  const [selectedArrivalGate, setSelectedArrivalGate] = useState(null);
  const [shouldSkipRouteSelection, setShouldSkipRouteSelection] = useState(false);

  // Load popular aircraft models
  useEffect(() => {
    const loadAircraft = async () => {
      try {
        const popularAircraft = await aircraftService.getPopularAircraft();
        setAircraftSuggestions(popularAircraft);
      } catch (error) {
        console.error('Error loading popular aircraft:', error);
        setAircraftSuggestions([]);
      }
    };
    loadAircraft();
  }, []);

  // Calculate flight plan when airports, aircraft, payload, and fuel reserve are selected
  useEffect(() => {
    const calculateFlightPlanAsync = async () => {
      if (selectedDeparture && selectedArrival && aircraftModel) {
        try {
          const plan = await calculateFlightPlan(selectedDeparture, selectedArrival, aircraftModel, payload, fuelReserve);
          setFlightPlan(plan);
        } catch (error) {
          console.error('Error calculating flight plan:', error);
          setFlightPlan(null);
        }
      } else {
        setFlightPlan(null);
      }
    };
    calculateFlightPlanAsync();
  }, [selectedDeparture, selectedArrival, aircraftModel, payload, fuelReserve]);

  const handleSearch = (query) => {
    searchAirports(query);
  };

  const handleInitializeFlight = () => {
    if (!selectedDeparture || !selectedArrival) {
      alert('Please select both departure and arrival airports');
      return;
    }
    
    // Determine season
    let currentSeason = season;
    if (useRandomSeason) {
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      currentSeason = seasons[Math.floor(Math.random() * seasons.length)];
      setSeason(currentSeason);
    }

    // Determine Zulu time
    let currentTimeZulu = timeZulu;
    if (useRandomTime) {
      const now = new Date();
      currentTimeZulu = now.toISOString();
      setTimeZulu(currentTimeZulu);
    }

    // Generate initial weather data
    const initialWeather = generateInitialWeather(
      selectedDeparture.latitude,
      selectedDeparture.longitude,
      currentSeason,
      currentTimeZulu
    );
    setWeatherData(initialWeather);
    
    // Check if route selection is needed based on difficulty and skip flag
    if (difficulty === 'rookie' && shouldSkipRouteSelection) {
      // Rookie mode with skip - use default values
      proceedToCinematicReview();
    } else {
      // Enter route selection phase
      setRouteSelectionPhase(true);
      // Make sure we're not in cinematic mode
      setCinematicPhase('none');
    }
  };
  
  const proceedToCinematicReview = () => {
    const fadeDuration = 2500;
    const reviewDuration = 5000;
    
    setCinematicPhase('fade_out');

    setTimeout(() => {
      setCinematicPhase('cinematic_review');

      setTimeout(() => {
        setCinematicPhase('fade_in');
        setTimeout(() => {
          setFlightInitialized(true);
          setCinematicPhase('none');
        }, fadeDuration);
      }, reviewDuration);
    }, fadeDuration);
  };
  
  const handleSkipRouteSelection = () => {
    setShouldSkipRouteSelection(true);
    setRouteSelectionPhase(false);
    proceedToCinematicReview();
  };
  
  const handleCompleteRouteSelection = () => {
    setRouteSelectionPhase(false);
    proceedToCinematicReview();
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
      setWeatherData: setWeatherData,
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
      initialDeparture: selectedDeparture,
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
      formatFuel: formatFuel,
      weatherData: weatherData,
      setWeatherData: setWeatherData,
      failureType: failureType,
      crewCount: crewCount,
      physicsModel: physicsModel,
      // Route-related props
      selectedDepartureGate: selectedDepartureGate,
      selectedDepartureTaxiway: selectedDepartureTaxiway,
      selectedDepartureRunway: selectedDepartureRunway,
      selectedSID: selectedSID,
      selectedWaypoints: selectedWaypoints,
      selectedSTAR: selectedSTAR,
      selectedArrivalRunway: selectedArrivalRunway,
      selectedArrivalTaxiway: selectedArrivalTaxiway,
      selectedArrivalGate: selectedArrivalGate
    });
  }


  return React.createElement('div', { className: 'App' },
    React.createElement('header', { className: 'app-header' },
      React.createElement('h1', null, 'Ultimate Crash - Flight Initialization'),
      React.createElement('p', null, 'Configure your flight parameters and select difficulty level'),
      // Development mode toggle
      React.createElement('div', { className: 'dev-mode-toggle', style: { marginTop: '10px' } },
        React.createElement('button', {
          onClick: () => setDevMode(!devMode),
          style: {
            backgroundColor: devMode ? '#ff6b6b' : '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }
        }, devMode ? '🔧 Dev Mode: ON' : '🔧 Dev Mode: OFF')
      ),
      // Development mode quick start button
      devMode && React.createElement('div', { className: 'dev-start', style: { marginTop: '10px' } },
        React.createElement('button', {
          onClick: handleDevStart,
          style: {
            backgroundColor: '#ff4757',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }
        }, '🚀 Quick Start Physics Test')
      )
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
        setUseRandomSeason: useRandomSeason,
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
        handleSearch: handleSearch,
        physicsModel: physicsModel,
        setPhysicsModel: setPhysicsModel,
        apiKey: apiKey,
        setApiKey: setApiKey
      }),
      
      // Route Selection Component
      routeSelectionPhase && React.createElement(RouteSelection, {
        difficulty: difficulty,
        selectedDeparture: selectedDeparture,
        selectedArrival: selectedArrival,
        onSkip: handleSkipRouteSelection,
        onComplete: handleCompleteRouteSelection,
        
        selectedDepartureGate: selectedDepartureGate,
        setSelectedDepartureGate: setSelectedDepartureGate,
        selectedDepartureTaxiway: selectedDepartureTaxiway,
        setSelectedDepartureTaxiway: setSelectedDepartureTaxiway,
        selectedDepartureRunway: selectedDepartureRunway,
        setSelectedDepartureRunway: setSelectedDepartureRunway,
        selectedSID: selectedSID,
        setSelectedSID: setSelectedSID,
        selectedWaypoints: selectedWaypoints,
        setSelectedWaypoints: setSelectedWaypoints,
        selectedSTAR: selectedSTAR,
        setSelectedSTAR: setSelectedSTAR,
        selectedArrivalRunway: selectedArrivalRunway,
        setSelectedArrivalRunway: setSelectedArrivalRunway,
        selectedArrivalTaxiway: selectedArrivalTaxiway,
        setSelectedArrivalTaxiway: setSelectedArrivalTaxiway,
        selectedArrivalGate: selectedArrivalGate,
        setSelectedArrivalGate: setSelectedArrivalGate
      })
    )
  );
}

export default App;
