import React, { useState, useEffect } from 'react';
import './App.css';
import useAirportSearch from './hooks/useAirportSearch';
import aircraftService from './services/aircraftService';
import { airportService } from './services/airportService';
import { calculateDistance, calculateFlightPlan, formatDistance, formatFlightTime, formatFuel } from './utils/distanceCalculator';
import AirportSearchInput from './components/AirportSearchInput.jsx';
import FlightInitialization from './components/FlightInitialization.jsx';
import FlightInProgress from './components/FlightInProgress.jsx';
import RouteSelectionFrame from './components/RouteSelectionFrame.jsx';
import NarrativeScene from './components/NarrativeScene.jsx';
import { generateInitialWeather, updateWeather } from './services/weatherService';
import { getRunwayHeading } from './utils/routeGenerator';
import { useLanguage } from './contexts/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';

import { FadeOverlay, CinematicReview } from './components/CinematicComponents.jsx';

function App() {
  const { t } = useLanguage();
  // Add development mode flag
  const [devMode, setDevMode] = useState(false);
  
  // Development mode bypass - directly initialize flight
  const handleDevStart = () => {
    console.log('🚀 Development Mode: Starting flight simulation directly');
    
    // Set default airports for dev mode (KSFO -> KLAX)
    const devDeparture = getAirportByCode('KSFO') || getAirportByCode('KATL');
    const devArrival = getAirportByCode('KLAX') || getAirportByCode('KJFK');
    
    if (devDeparture && devArrival) {
      console.log('📍 Dev Mode: Using default airports', devDeparture.iata, '->', devArrival.iata);
      selectDeparture(devDeparture);
      selectArrival(devArrival);
      
      // We need to wait for state update or force it through props
      // Since setState is async, we can't rely on selectedDeparture being set immediately for FlightInProgress
      // But FlightInProgress uses the selectedDeparture from the hook which will update
      
      // However, we set flightInitialized to true immediately. 
      // This might cause a race condition where FlightInProgress renders before selectedDeparture updates.
      // To be safe, we'll delay the initialization slightly
      
      setTimeout(() => {
        setFlightInitialized(true);
        setCinematicPhase('none');
      }, 100);
    } else {
      console.warn('⚠️ Dev Mode: Could not find default airports');
      setFlightInitialized(true);
      setCinematicPhase('none');
    }
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
  const { searchResults, selectedDeparture, selectedArrival, searchAirports, selectDeparture, selectArrival, clearSelection, getAirportByCode } = useAirportSearch();
  
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
  
  // Route Selection State
  const [showRouteSelection, setShowRouteSelection] = useState(false);
  const [detailedRoute, setDetailedRoute] = useState(null);



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
      alert(t('initialization.messages.select_airports'));
      return;
    }
    setShowRouteSelection(true);
  };

  const handleRouteConfirm = (routeData) => {
    // Insert 10nm approach fix
    if (routeData.landingRunway && selectedArrival && selectedDeparture) {
       const isEastward = selectedArrival.longitude > selectedDeparture.longitude;
       const runwayHdg = getRunwayHeading(routeData.landingRunway, isEastward);
       console.log(`✈️ Approach for ${routeData.landingRunway}: Heading ${runwayHdg} (Eastward: ${isEastward})`);
       const approachHdg = (runwayHdg + 180) % 360; // Reciprocal
       const distance = 10; // NM
       
       // Calculate coordinate
       const lat1 = selectedArrival.latitude * Math.PI / 180;
       const lon1 = selectedArrival.longitude * Math.PI / 180;
       const brng = approachHdg * Math.PI / 180;
       const d = distance;
       const R = 3440.065; // Earth radius in NM
       
       const lat2 = Math.asin(Math.sin(lat1)*Math.cos(d/R) + Math.cos(lat1)*Math.sin(d/R)*Math.cos(brng));
       const lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(lat1), Math.cos(d/R)-Math.sin(lat1)*Math.sin(lat2));
       
       const approachFix = {
         name: `FINAL`,
         latitude: lat2 * 180 / Math.PI,
         longitude: lon2 * 180 / Math.PI
       };
       
       const runwayFix = {
          name: routeData.landingRunway || 'RWY',
          latitude: selectedArrival.latitude,
          longitude: selectedArrival.longitude
       };
       
       // Append approach fix then runway to waypoints
       if (!routeData.waypoints) routeData.waypoints = [];
       routeData.waypoints.push(approachFix);
       routeData.waypoints.push(runwayFix);
       console.log('✅ Added 10nm approach fix and runway:', approachFix, runwayFix);
    }

    setDetailedRoute(routeData);
    setShowRouteSelection(false);
    setFlightPlan(prev => {
      if (!prev) return prev;
      const merged = { ...prev };
      if (Array.isArray(routeData.waypoints) && routeData.waypoints.length > 0) {
        merged.waypoints = routeData.waypoints;
      }
      if (routeData?.departureRunway) {
        merged.departure = {
          ...merged.departure,
          runways: [{ name: routeData.departureRunway }]
        };
      }
      if (routeData?.landingRunway) {
        merged.arrival = {
          ...merged.arrival,
          runways: [{ name: routeData.landingRunway }]
        };
      }
      return merged;
    });
    startSimulation(routeData);
  };

  const handleRouteSkip = () => {
    setShowRouteSelection(false);
    setDetailedRoute(null);
    startSimulation(null);
  };

  const startSimulation = (routeData) => {
    const fadeDuration = 2500;
    const reviewDuration = 5000;

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

    setCinematicPhase('fade_out');

    setTimeout(() => {
      setCinematicPhase('cinematic_review');
      // No auto-transition to narrative_scene
    }, fadeDuration);
  };

  const handleCinematicReviewComplete = () => {
    setCinematicPhase('narrative_scene');
  };

  const handleNarrativeComplete = () => {
    setCinematicPhase('fade_in');
    setTimeout(() => {
      setFlightInitialized(true);
      setCinematicPhase('none');
    }, 2500); // fadeDuration
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
        payload: payload,
        routeDetails: detailedRoute,
        onComplete: handleCinematicReviewComplete
      }),

      cinematicPhase === 'narrative_scene' && React.createElement(NarrativeScene, {
        onComplete: handleNarrativeComplete,
        context: {
          difficulty,
          departure: selectedDeparture,
          arrival: selectedArrival,
          pax,
          callsign
        }
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
      routeDetails: detailedRoute
    });
  }

  return React.createElement('div', { className: 'App' },
    React.createElement('header', { className: 'app-header' },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' } },
        React.createElement('div', null,
          React.createElement('h1', null, 'Ultimate Crash - ' + t('initialization.title')),
          React.createElement('p', null, t('initialization.subtitle'))
        ),
        React.createElement(LanguageSwitcher)
      ),
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
        }, devMode ? '🔧 ' + t('common.devMode') + ': ON' : '🔧 ' + t('common.devMode') + ': OFF')
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
      showRouteSelection ? React.createElement(RouteSelectionFrame, {
        isOpen: showRouteSelection,
        onConfirm: handleRouteConfirm,
        onSkip: handleRouteSkip,
        difficulty: difficulty,
        departure: selectedDeparture,
        arrival: selectedArrival
      }) : React.createElement(FlightInitialization, {
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
        handleSearch: handleSearch,
        apiKey: apiKey,
        setApiKey: setApiKey
      })
    ),
    
    React.createElement('footer', { className: 'app-footer' },
      React.createElement('p', null, '©2026, GeeksProductionStudio. All Rights Reserved.')
    )
  );
}

export default App;
