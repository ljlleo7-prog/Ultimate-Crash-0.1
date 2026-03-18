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

import { FadeOverlay, CinematicReview } from './components/CinematicComponents.jsx';
import { LanguageProvider } from './contexts/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import Header from './components/Header';
import HomePage from './components/HomePage';

function App() {
  // Add development mode flag
  const [devMode, setDevMode] = useState(false);
  
  // App Mode State
  const [appMode, setAppMode] = useState('home'); // 'home', 'init', 'simulation'
  const [isTutorial, setIsTutorial] = useState(false);

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
      
      setTimeout(() => {
        setFlightInitialized(true);
        setAppMode('simulation');
        setCinematicPhase('none');
      }, 100);
    } else {
      console.warn('⚠️ Dev Mode: Could not find default airports');
      setFlightInitialized(true);
      setAppMode('simulation');
      setCinematicPhase('none');
    }
  };

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
    setShowRouteSelection(true);
  };

  const handleRouteConfirm = (routeData) => {
    // Insert 10nm approach fix logic
    if (routeData.landingRunway && selectedArrival && selectedDeparture) {
       const isEastward = selectedArrival.longitude > selectedDeparture.longitude;
       const runwayHdg = getRunwayHeading(routeData.landingRunway, isEastward);
       const approachHdg = (runwayHdg + 180) % 360; 
       const distance = 10; 
       
       const lat1 = selectedArrival.latitude * Math.PI / 180;
       const lon1 = selectedArrival.longitude * Math.PI / 180;
       const brng = approachHdg * Math.PI / 180;
       const d = distance;
       const R = 3440.065; 
       
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
       
       if (!routeData.waypoints) routeData.waypoints = [];
       routeData.waypoints.push(approachFix);
       routeData.waypoints.push(runwayFix);
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
    
    let currentSeason = season;
    if (useRandomSeason) {
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      currentSeason = seasons[Math.floor(Math.random() * seasons.length)];
      setSeason(currentSeason);
    }

    let currentTimeZulu = timeZulu;
    if (useRandomTime) {
      const now = new Date();
      currentTimeZulu = now.toISOString();
      setTimeZulu(currentTimeZulu);
    }

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
    }, fadeDuration);
  };

  const handleCinematicReviewComplete = () => {
    setCinematicPhase('narrative_scene');
  };

  const handleNarrativeComplete = () => {
    setCinematicPhase('fade_in');
    setTimeout(() => {
      setFlightInitialized(true);
      setAppMode('simulation'); // Ensure appMode syncs
      setCinematicPhase('none');
    }, 2500);
  };

  const handleResetFlight = () => {
    setFlightInitialized(false);
    setAppMode('init'); // Go back to init
    setFlightPlan(null);
  };
  
  // HomePage Handlers
  const handleStartSinglePlayer = () => {
    setAppMode('init');
    setIsTutorial(false);
  };

  const handleStartTutorial = () => {
    setIsTutorial(true);
    
    // Setup Tutorial Flight (KSFO -> KLAX)
    const dep = getAirportByCode('KSFO');
    const arr = getAirportByCode('KLAX');
    
    if (dep && arr) {
        selectDeparture(dep);
        selectArrival(arr);
        setCinematicPhase('none');
        
        // Slight delay to ensure state updates
        setTimeout(() => {
            setFlightInitialized(true);
            setAppMode('simulation');
        }, 100);
    } else {
        alert("Could not load tutorial airports. Please try again.");
    }
  };

  const handleOpenSettings = () => {
      // Placeholder
      alert("Settings menu is under construction.");
  };

  const handleTutorialClose = () => {
      setIsTutorial(false);
      setFlightInitialized(false);
      setAppMode('home');
      setFlightPlan(null);
  };

  // Render Logic
  
  // 1. Cinematic Phase (Overrides everything if active)
  if (cinematicPhase !== 'none') {
    return (
      <LanguageProvider>
        <div className={`cinematic-container ${cinematicPhase}`}>
          <LanguageSwitcher style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 2000 }} />
          
          {cinematicPhase === 'fade_out' && (
            <FadeOverlay phase="fade-out">
              <div className="fade-content">
                <h1>Initializing Flight Simulation</h1>
                <p>Preparing for takeoff...</p>
              </div>
            </FadeOverlay>
          )}
          
          {cinematicPhase === 'cinematic_review' && (
            <CinematicReview
              callsign={callsign}
              selectedDeparture={selectedDeparture}
              selectedArrival={selectedArrival}
              aircraftModel={aircraftModel}
              weatherData={weatherData}
              setWeatherData={setWeatherData}
              crewCount={crewCount}
              failureType={failureType}
              difficulty={difficulty}
              pax={pax}
              payload={payload}
              routeDetails={detailedRoute}
              onComplete={handleCinematicReviewComplete}
            />
          )}

          {cinematicPhase === 'narrative_scene' && (
            <NarrativeScene
              onComplete={handleNarrativeComplete}
              context={{
                difficulty,
                departure: selectedDeparture,
                arrival: selectedArrival,
                pax,
                callsign
              }}
            />
          )}
          
          {cinematicPhase === 'fade_in' && (
            <FadeOverlay phase="fade-in">
              <div className="fade-content">
                <h1>Simulation Active</h1>
                <p>Flight controls are now available</p>
              </div>
            </FadeOverlay>
          )}
        </div>
      </LanguageProvider>
    );
  }

  // 2. Simulation Mode (Tutorial or Regular)
  if (appMode === 'simulation' && flightInitialized) {
    return (
      <LanguageProvider>
        <LanguageSwitcher style={{ position: 'fixed', top: '10px', right: '120px', zIndex: 2000 }} />
        <FlightInProgress
          callsign={callsign}
          aircraftModel={aircraftModel}
          difficulty={difficulty}
          selectedDeparture={selectedDeparture}
          selectedArrival={selectedArrival}
          initialDeparture={selectedDeparture}
          flightPlan={flightPlan}
          airline={airline}
          pax={pax}
          payload={payload}
          fuelReserve={fuelReserve}
          cruiseHeight={cruiseHeight}
          useRandomTime={useRandomTime}
          timeZulu={timeZulu}
          useRandomSeason={useRandomSeason}
          season={season}
          handleResetFlight={handleResetFlight}
          formatDistance={formatDistance}
          formatFlightTime={formatFlightTime}
          formatFuel={formatFuel}
          weatherData={weatherData}
          setWeatherData={setWeatherData}
          failureType={failureType}
          crewCount={crewCount}
          routeDetails={detailedRoute}
          isTutorial={isTutorial}
          onTutorialClose={handleTutorialClose}
        />
      </LanguageProvider>
    );
  }

  // 3. Initialization Mode
  if (appMode === 'init') {
    return (
      <LanguageProvider>
        <div className="App">
          <LanguageSwitcher style={{ position: 'absolute', top: '20px', right: '20px' }} />
          <Header devMode={devMode} setDevMode={setDevMode} handleDevStart={handleDevStart} />

          <main className="app-main">
            {showRouteSelection ? (
              <RouteSelectionFrame
                isOpen={showRouteSelection}
                onConfirm={handleRouteConfirm}
                onSkip={handleRouteSkip}
                difficulty={difficulty}
                departure={selectedDeparture}
                arrival={selectedArrival}
              />
            ) : (
              <FlightInitialization
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                airline={airline}
                setAirline={setAirline}
                callsign={callsign}
                setCallsign={setCallsign}
                aircraftModel={aircraftModel}
                setAircraftModel={setAircraftModel}
                pax={pax}
                setPax={setPax}
                payload={payload}
                setPayload={setPayload}
                fuelReserve={fuelReserve}
                setFuelReserve={setFuelReserve}
                cruiseHeight={cruiseHeight}
                setCruiseHeight={setCruiseHeight}
                timeZulu={timeZulu}
                setTimeZulu={setTimeZulu}
                useRandomTime={useRandomTime}
                setUseRandomTime={setUseRandomTime}
                season={season}
                setSeason={setSeason}
                useRandomSeason={useRandomSeason}
                setUseRandomSeason={setUseRandomSeason}
                selectedDeparture={selectedDeparture}
                selectedArrival={selectedArrival}
                searchResults={searchResults}
                searchAirports={searchAirports}
                selectDeparture={selectDeparture}
                selectArrival={selectArrival}
                flightPlan={flightPlan}
                formatDistance={formatDistance}
                formatFlightTime={formatFlightTime}
                formatFuel={formatFuel}
                failureType={failureType}
                setFailureType={setFailureType}
                weatherData={weatherData}
                setWeatherData={setWeatherData}
                crewCount={crewCount}
                setCrewCount={setCrewCount}
                aircraftSuggestions={aircraftSuggestions}
                handleInitializeFlight={handleInitializeFlight}
                handleSearch={handleSearch}
                apiKey={apiKey}
                setApiKey={setApiKey}
              />
            )}
          </main>
          
          <footer className="app-footer">
            <p>©2026, GeeksProductionStudio. All Rights Reserved.</p>
          </footer>
        </div>
      </LanguageProvider>
    );
  }

  // 4. Default: Home Page
  return (
    <LanguageProvider>
        <HomePage 
            onStartSinglePlayer={handleStartSinglePlayer}
            onStartTutorial={handleStartTutorial}
            onOpenSettings={handleOpenSettings}
        />
    </LanguageProvider>
  );
}

export default App;
