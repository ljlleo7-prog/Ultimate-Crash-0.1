import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import useAirportSearch from './hooks/useAirportSearch';
import aircraftService from './services/aircraftService';
import { calculateFlightPlan, formatDistance, formatFlightTime, formatFuel } from './utils/distanceCalculator';
import FlightInitialization from './components/FlightInitialization.jsx';
import FlightInProgress from './components/FlightInProgress.jsx';
import RouteSelectionFrame from './components/RouteSelectionFrame.jsx';
import NarrativeScene from './components/NarrativeScene.jsx';
import { generateInitialWeather } from './services/weatherService';
import { buildAutoRouteDetails, buildRouteAuthState, DEFAULT_ROUTE_DETAILS, mergeFlightPlanWithRoute, normalizeRouteDetails, normalizeWaypoint } from './utils/routeDetails.js';

import { FadeOverlay, CinematicReview } from './components/CinematicComponents.jsx';
import { LanguageProvider } from './contexts/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import Header from './components/Header';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage.jsx';
import TutorialHub from './components/TutorialHub';
import ChallengesHub from './components/ChallengesHub';
import FMCPanel from './components/fmc/FMCPanel';
import { airportService } from './services/airportService';
import { TUTORIALS } from './data/tutorialCatalog';
import { CHALLENGES } from './data/challengeCatalog';
import { cloudSaveService } from './services/cloudSaveService.js';
import { useAuth } from './contexts/AuthContext.jsx';

const APP_SETTINGS_STORAGE_KEY = 'app_settings';
const DEFAULT_APP_SETTINGS = {
  offlineMode: true
};

const DEFAULT_WEATHER = {
  type: 'clear',
  windSpeed: 0,
  visibility: 10,
  ceiling: 5000,
  precipitation: 0,
  turbulence: 0
};

const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const isSameAirport = (departure, arrival) => {
  if (!departure || !arrival) return false;
  const departureCode = departure.icao || departure.iata || departure.name;
  const arrivalCode = arrival.icao || arrival.iata || arrival.name;
  return departureCode && arrivalCode && departureCode === arrivalCode;
};

function App() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [devMode, setDevMode] = useState(false);
  const [appMode, setAppMode] = useState('home');
  const [isTutorial, setIsTutorial] = useState(false);
  const [difficulty, setDifficulty] = useState('rookie');
  const [preflightConfig, setPreflightConfig] = useState({
    airline: 'Test Airline',
    callsign: 'TEST001',
    aircraftModel: 'B737-800',
    pax: 150,
    payload: 20000,
    fuelReserve: 0.1,
    cruiseHeight: 35000,
    crewCount: 2,
    timeZulu: '',
    useRandomTime: true,
    season: '',
    useRandomSeason: true,
    weatherData: DEFAULT_WEATHER,
    selectedDeparture: null,
    selectedArrival: null,
    routeDetails: DEFAULT_ROUTE_DETAILS,
    flightPlan: null
  });

  const [flightInitialized, setFlightInitialized] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [resumeSave, setResumeSave] = useState(null);
  const [resumeCheckLoading, setResumeCheckLoading] = useState(false);
  const [resumeCheckError, setResumeCheckError] = useState(null);
  const { selectedDeparture, selectedArrival, selectDeparture, selectArrival, getAirportByCode } = useAirportSearch();
  const [aircraftSuggestions, setAircraftSuggestions] = useState([]);
  const [failureType, setFailureType] = useState('random');
  const [weatherData, setWeatherData] = useState(DEFAULT_WEATHER);
  const [cinematicPhase, setCinematicPhase] = useState('none');
  const [showSettings, setShowSettings] = useState(false);
  const [showRouteSelection, setShowRouteSelection] = useState(false);
  const [appSettings, setAppSettings] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_APP_SETTINGS;
    }

    try {
      const raw = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_APP_SETTINGS;
      }
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed
      };
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });
  const [departureQuery, setDepartureQuery] = useState('');
  const [arrivalQuery, setArrivalQuery] = useState('');
  const [alternateQuery, setAlternateQuery] = useState('');
  const routeGenerationRequestRef = useRef(0);

  const offlineMode = appSettings.offlineMode;
  const activeUser = offlineMode ? null : authUser;
  const routeAuthState = buildRouteAuthState({ offlineMode, activeUser });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
  }, [appSettings]);
  const departureResults = useMemo(() => airportService.searchAirports(departureQuery).slice(0, 10), [departureQuery]);
  const arrivalResults = useMemo(() => airportService.searchAirports(arrivalQuery).slice(0, 10), [arrivalQuery]);
  const alternateResults = useMemo(() => airportService.searchAirports(alternateQuery).slice(0, 10), [alternateQuery]);

  const updatePreflightConfig = (patch) => {
    setPreflightConfig((prev) => ({ ...prev, ...patch }));
  };

  const updateRouteDetails = (patch) => {
    setPreflightConfig((prev) => ({
      ...prev,
      routeDetails: normalizeRouteDetails(
        typeof patch === 'function' ? patch(prev.routeDetails) : { ...prev.routeDetails, ...patch },
        prev.selectedDeparture,
        prev.selectedArrival
      )
    }));
  };

  const regenerateRouteDetails = async (departure, arrival, previousRouteDetails) => {
    const requestId = routeGenerationRequestRef.current + 1;
    routeGenerationRequestRef.current = requestId;
    const nextRouteDetails = await buildAutoRouteDetails({
      departure,
      arrival,
      previousRouteDetails,
      routeOptions: { authState: routeAuthState }
    });
    if (routeGenerationRequestRef.current !== requestId) return;
    setPreflightConfig((prev) => ({
      ...prev,
      routeDetails: nextRouteDetails
    }));
  };

  const setPreflightDeparture = (airport) => {
    selectDeparture(airport);
    setDepartureQuery('');
    const routeDetails = normalizeRouteDetails(preflightConfig.routeDetails, airport, preflightConfig.selectedArrival);
    setPreflightConfig((prev) => ({
      ...prev,
      selectedDeparture: airport,
      routeDetails
    }));
    if (airport && preflightConfig.selectedArrival && !isSameAirport(airport, preflightConfig.selectedArrival)) {
      regenerateRouteDetails(airport, preflightConfig.selectedArrival, routeDetails);
    } else {
      routeGenerationRequestRef.current += 1;
    }
  };

  const setPreflightArrival = (airport) => {
    selectArrival(airport);
    setArrivalQuery('');
    const routeDetails = normalizeRouteDetails(preflightConfig.routeDetails, preflightConfig.selectedDeparture, airport);
    setPreflightConfig((prev) => ({
      ...prev,
      selectedArrival: airport,
      routeDetails
    }));
    if (preflightConfig.selectedDeparture && airport && !isSameAirport(preflightConfig.selectedDeparture, airport)) {
      regenerateRouteDetails(preflightConfig.selectedDeparture, airport, routeDetails);
    } else {
      routeGenerationRequestRef.current += 1;
    }
  };

  const setPreflightAlternate = (airport) => {
    setAlternateQuery('');
    updateRouteDetails({ alternate: airport || null });
  };

  const mergedFlightPlan = useMemo(
    () => mergeFlightPlanWithRoute(preflightConfig.flightPlan, preflightConfig.routeDetails),
    [preflightConfig.flightPlan, preflightConfig.routeDetails]
  );

  const runtimeRouteDetails = useMemo(
    () => normalizeRouteDetails(preflightConfig.routeDetails, preflightConfig.selectedDeparture, preflightConfig.selectedArrival),
    [preflightConfig.routeDetails, preflightConfig.selectedDeparture, preflightConfig.selectedArrival]
  );

  const routeValidation = useMemo(() => {
    const departure = preflightConfig.selectedDeparture;
    const arrival = preflightConfig.selectedArrival;
    const alternate = runtimeRouteDetails.alternate;
    const hasDeparture = Boolean(departure);
    const hasArrival = Boolean(arrival);
    const sameAirport = hasDeparture && hasArrival && (departure.icao || departure.iata) === (arrival.icao || arrival.iata);
    const isRouteReady = hasDeparture && hasArrival && !sameAirport;

    return {
      departureState: hasDeparture ? 'idle' : 'warning',
      departureMessage: hasDeparture ? 'Departure selected.' : 'Select a valid departure airport.',
      arrivalState: hasArrival ? 'idle' : 'warning',
      arrivalMessage: hasArrival ? 'Arrival selected.' : 'Select a valid arrival airport.',
      alternateState: alternate ? 'idle' : 'idle',
      alternateMessage: alternate ? 'Alternate selected.' : 'Optional but recommended for dispatch planning.',
      routeState: sameAirport ? 'error' : isRouteReady ? 'success' : 'idle',
      routeMessage: sameAirport
        ? 'Departure and arrival must be different airports.'
        : isRouteReady
          ? 'Valid route selected. You can continue to route review.'
          : 'Set both departure and arrival to complete the route.',
      isRouteReady
    };
  }, [preflightConfig.selectedDeparture, preflightConfig.selectedArrival, runtimeRouteDetails.alternate]);

  const tabletReadiness = useMemo(() => {
    const hasPax = isPositiveNumber(preflightConfig.pax);
    const hasPayload = isPositiveNumber(preflightConfig.payload);
    const hasReserve = Number.isFinite(Number(preflightConfig.fuelReserve)) && Number(preflightConfig.fuelReserve) >= 0;
    const hasCruise = isPositiveNumber(preflightConfig.cruiseHeight);
    const hasFlightPlanFuel = Boolean(preflightConfig.flightPlan?.fuel?.totalFuel);
    const isLoadoutReady = hasPax && hasPayload && hasReserve && hasCruise;
    const isPerformanceReady = hasFlightPlanFuel && isLoadoutReady;

    return {
      isRouteReady: routeValidation.isRouteReady,
      isLoadoutReady,
      isPerformanceReady,
      isFinalizeReady: routeValidation.isRouteReady && isLoadoutReady,
      hasPax,
      hasPayload,
      hasReserve,
      hasCruise
    };
  }, [preflightConfig.pax, preflightConfig.payload, preflightConfig.fuelReserve, preflightConfig.cruiseHeight, preflightConfig.flightPlan, routeValidation.isRouteReady]);

  const routeSearchState = useMemo(() => ({
    departureQuery,
    arrivalQuery,
    alternateQuery,
    departureResults,
    arrivalResults,
    alternateResults,
    setDepartureQuery,
    setArrivalQuery,
    setAlternateQuery
  }), [departureQuery, arrivalQuery, alternateQuery, departureResults, arrivalResults, alternateResults]);

  const {
    airline,
    callsign,
    aircraftModel,
    pax,
    payload,
    fuelReserve,
    cruiseHeight,
    crewCount,
    timeZulu,
    useRandomTime,
    season,
    useRandomSeason
  } = preflightConfig;

  const handleDevStart = () => {
    console.log('🚀 Development Mode: Starting flight simulation directly');

    const devDeparture = getAirportByCode('KSFO') || getAirportByCode('KATL');
    const devArrival = getAirportByCode('KLAX') || getAirportByCode('KJFK');

    if (devDeparture && devArrival) {
      console.log('📍 Dev Mode: Using default airports', devDeparture.iata, '->', devArrival.iata);
      setPreflightDeparture(devDeparture);
      setPreflightArrival(devArrival);

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

  useEffect(() => {
    if (offlineMode) {
      setResumeSave(null);
      setResumeCheckError(null);
      setResumeCheckLoading(false);
      return;
    }

    let isMounted = true;

    const loadResumeSave = async () => {
      if (authLoading || !activeUser || appMode !== 'init') {
        if (isMounted) {
          setResumeSave(null);
          setResumeCheckError(null);
          setResumeCheckLoading(false);
        }
        return;
      }

      setResumeCheckLoading(true);
      const { data, error } = await cloudSaveService.getCurrentUserSave();

      if (!isMounted) {
        return;
      }

      setResumeSave(data ?? null);
      setResumeCheckError(error?.message ?? null);
      setResumeCheckLoading(false);
    };

    loadResumeSave();

    return () => {
      isMounted = false;
    };
  }, [activeUser, appMode, authLoading, offlineMode]);

  useEffect(() => {
    const calculateFlightPlanAsync = async () => {
      if (preflightConfig.selectedDeparture && preflightConfig.selectedArrival && preflightConfig.aircraftModel) {
        try {
          const plan = await calculateFlightPlan(
            preflightConfig.selectedDeparture,
            preflightConfig.selectedArrival,
            preflightConfig.aircraftModel,
            preflightConfig.payload,
            preflightConfig.fuelReserve
          );
          setPreflightConfig((prev) => ({ ...prev, flightPlan: plan }));
        } catch (error) {
          console.error('Error calculating flight plan:', error);
          setPreflightConfig((prev) => ({ ...prev, flightPlan: null }));
        }
      } else {
        setPreflightConfig((prev) => ({ ...prev, flightPlan: null }));
      }
    };
    calculateFlightPlanAsync();
  }, [preflightConfig.selectedDeparture, preflightConfig.selectedArrival, preflightConfig.aircraftModel, preflightConfig.payload, preflightConfig.fuelReserve]);

  const handleInitializeFlight = () => {
    if (!tabletReadiness.isFinalizeReady) {
      alert('Complete the tablet route and loadout setup before continuing.');
      return;
    }
    setShowRouteSelection(true);
  };

  const handleRouteConfirm = (routeData) => {
    updateRouteDetails(routeData);
    setShowRouteSelection(false);
    startSimulation(routeData);
  };

  const handleRouteSkip = () => {
    setShowRouteSelection(false);
    updateRouteDetails(DEFAULT_ROUTE_DETAILS);
    startSimulation(DEFAULT_ROUTE_DETAILS);
  };

  const handleResumeFlight = (saveRecord) => {
    const payload = saveRecord?.data;
    if (!payload) {
      alert('Saved flight data is unavailable.');
      return;
    }

    const restoredFlightData = payload.flightData || {};
    const restoredFlightPlan = payload.flightPlan || null;
    const restoredWeather = payload.weatherData || weatherData;

    setPreflightConfig((prev) => ({
      ...prev,
      flightPlan: restoredFlightPlan,
      weatherData: restoredWeather,
      aircraftModel: payload.aircraftModel || prev.aircraftModel
    }));
    setWeatherData(restoredWeather);
    setResumeSave(saveRecord);
    setFlightInitialized(true);
    setAppMode('simulation');
  };

  const handleDiscardResumeSave = async () => {
    if (offlineMode) {
      setResumeSave(null);
      return;
    }

    if (!resumeSave?.id) {
      setResumeSave(null);
      return;
    }

    const { error } = await cloudSaveService.discardFlight(resumeSave.id);
    if (error) {
      alert(`Failed to discard saved flight: ${error.message || 'Unknown error'}`);
      return;
    }

    setResumeSave(null);
    setResumeCheckError(null);
  };

  const startSimulation = () => {
    const fadeDuration = 2500;

    let currentSeason = season;
    if (useRandomSeason) {
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      currentSeason = seasons[Math.floor(Math.random() * seasons.length)];
      updatePreflightConfig({ season: currentSeason });
    }

    let currentTimeZulu = timeZulu;
    if (useRandomTime) {
      currentTimeZulu = new Date().toISOString();
      updatePreflightConfig({ timeZulu: currentTimeZulu });
    }

    const departureAirport = preflightConfig.selectedDeparture;
    if (departureAirport && offlineMode) {
      const initialWeather = generateInitialWeather(
        departureAirport.latitude,
        departureAirport.longitude,
        currentSeason,
        currentTimeZulu
      );
      setWeatherData(initialWeather);
      updatePreflightConfig({ weatherData: initialWeather });
    }

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
      setAppMode('simulation');
      setCinematicPhase('none');
    }, 2500);
  };

  const handleResetFlight = () => {
    setFlightInitialized(false);
    setAppMode('init');
    updatePreflightConfig({ flightPlan: null, routeDetails: DEFAULT_ROUTE_DETAILS });
  };

  const handleStartSinglePlayer = () => {
    setAppMode('init');
    setIsTutorial(false);
    setActiveTutorial(null);
    setActiveChallenge(null);
  };

  const handleStartTutorial = () => {
    setAppMode('tutorial-hub');
    setIsTutorial(false);
    setActiveTutorial(null);
    setActiveChallenge(null);
  };

  const handleStartChallenges = () => {
    setAppMode('challenge-hub');
    setIsTutorial(false);
    setActiveTutorial(null);
    setActiveChallenge(null);
  };

  const launchScenario = async (scenario, mode = 'tutorial') => {
    const dep = getAirportByCode(scenario.departureCode);
    const arr = getAirportByCode(scenario.arrivalCode);

    if (!dep || !arr) {
      alert(`Could not load ${mode} airports. Please try again.`);
      return;
    }

    const launchRouteDetails = normalizeRouteDetails(
      scenario.launchConfig?.routeDetails || DEFAULT_ROUTE_DETAILS,
      dep,
      arr
    );

    let scenarioFlightPlan = null;
    try {
      scenarioFlightPlan = await calculateFlightPlan(
        dep,
        arr,
        scenario.launchConfig?.aircraftModel || aircraftModel,
        preflightConfig.payload,
        preflightConfig.fuelReserve
      );
    } catch (error) {
      console.error(`Error calculating ${mode} flight plan:`, error);
    }

    if (!scenarioFlightPlan?.fuel?.totalFuel) {
      scenarioFlightPlan = {
        ...(scenarioFlightPlan || {}),
        fuel: {
          ...(scenarioFlightPlan?.fuel || {}),
          totalFuel: 12000,
          reserveFuel: scenarioFlightPlan?.fuel?.reserveFuel ?? 1200,
          tripFuel: scenarioFlightPlan?.fuel?.tripFuel ?? 10800,
          fuelSufficient: true
        }
      };
    }

    setIsTutorial(mode === 'tutorial');
    setActiveTutorial(mode === 'tutorial' ? scenario : null);
    setActiveChallenge(mode === 'challenge' ? scenario : null);
    setDifficulty(scenario.launchConfig?.difficulty || 'rookie');
    setFailureType(scenario.launchConfig?.failureType || 'none');
    setWeatherData(scenario.launchConfig?.weatherData || DEFAULT_WEATHER);
    setPreflightDeparture(dep);
    setPreflightArrival(arr);
    setPreflightConfig((prev) => ({
      ...prev,
      aircraftModel: scenario.launchConfig?.aircraftModel || prev.aircraftModel,
      weatherData: scenario.launchConfig?.weatherData || DEFAULT_WEATHER,
      selectedDeparture: dep,
      selectedArrival: arr,
      routeDetails: launchRouteDetails,
      flightPlan: scenarioFlightPlan
    }));
    setCinematicPhase('none');

    setTimeout(() => {
      setFlightInitialized(true);
      setAppMode('simulation');
    }, 100);
  };

  const handleLaunchTutorial = async (tutorial) => {
    await launchScenario(tutorial, 'tutorial');
  };

  const handleLaunchChallenge = async (challenge) => {
    await launchScenario(challenge, 'challenge');
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleOfflineModeChange = (event) => {
    const checked = event.target.checked;
    setAppSettings(prev => ({
      ...prev,
      offlineMode: checked
    }));
  };

  const handleTutorialClose = () => {
    setIsTutorial(false);
    setActiveTutorial(null);
    setActiveChallenge(null);
    setFlightInitialized(false);
    setAppMode('home');
    updatePreflightConfig({ flightPlan: null, routeDetails: DEFAULT_ROUTE_DETAILS });
  };

  if (typeof window !== 'undefined' && window.location.pathname === '/login') {
    return <LoginPage />;
  }

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
              selectedDeparture={preflightConfig.selectedDeparture}
              selectedArrival={preflightConfig.selectedArrival}
              aircraftModel={aircraftModel}
              weatherData={weatherData}
              setWeatherData={setWeatherData}
              crewCount={crewCount}
              failureType={failureType}
              difficulty={difficulty}
              pax={pax}
              payload={payload}
              routeDetails={runtimeRouteDetails}
              onComplete={handleCinematicReviewComplete}
            />
          )}

          {cinematicPhase === 'narrative_scene' && (
            <NarrativeScene
              onComplete={handleNarrativeComplete}
              context={{
                difficulty,
                departure: preflightConfig.selectedDeparture,
                arrival: preflightConfig.selectedArrival,
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

  if (appMode === 'simulation' && flightInitialized) {
    return (
      <LanguageProvider>
        <LanguageSwitcher style={{ position: 'fixed', top: '10px', right: '120px', zIndex: 2000 }} />
        <FlightInProgress
          callsign={callsign}
          aircraftModel={aircraftModel}
          difficulty={difficulty}
          selectedDeparture={preflightConfig.selectedDeparture}
          selectedArrival={preflightConfig.selectedArrival}
          initialDeparture={preflightConfig.selectedDeparture}
          flightPlan={mergedFlightPlan}
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
          routeDetails={runtimeRouteDetails}
          isTutorial={isTutorial}
          activeTutorial={activeTutorial}
          activeChallenge={activeChallenge}
          onTutorialClose={handleTutorialClose}
          offlineMode={offlineMode}
        />
      </LanguageProvider>
    );
  }

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
                onChange={updateRouteDetails}
                difficulty={difficulty}
                departure={preflightConfig.selectedDeparture}
                arrival={preflightConfig.selectedArrival}
                routeData={runtimeRouteDetails}
                routeAuthState={routeAuthState}
              />
            ) : (
              <>
                <div className="preflight-init-layout">
                  <FlightInitialization
                    difficulty={difficulty}
                    setDifficulty={setDifficulty}
                    preflightConfig={preflightConfig}
                    updatePreflightConfig={updatePreflightConfig}
                    selectedDeparture={preflightConfig.selectedDeparture}
                    selectedArrival={preflightConfig.selectedArrival}
                    aircraftSuggestions={aircraftSuggestions}
                    handleInitializeFlight={handleInitializeFlight}
                    tabletReadiness={tabletReadiness}
                    resumeSave={resumeSave}
                    resumeCheckLoading={resumeCheckLoading}
                    resumeCheckError={resumeCheckError}
                    onResumeFlight={handleResumeFlight}
                    onDiscardResumeSave={handleDiscardResumeSave}
                    isLoggedIn={Boolean(activeUser)}
                    offlineMode={offlineMode}
                  />
                  <div className="preflight-tablet-shell">
                    <FMCPanel
                      preflightMode
                      flightPlan={mergedFlightPlan}
                      preflightConfig={preflightConfig}
                      routeDetails={runtimeRouteDetails}
                      onUpdatePreflight={updatePreflightConfig}
                      onUpdateRouteDetails={(patch) => {
                        if (patch && Object.prototype.hasOwnProperty.call(patch, 'alternate')) {
                          setPreflightAlternate(patch.alternate);
                        }
                        updateRouteDetails(patch);
                      }}
                      onSelectDeparture={setPreflightDeparture}
                      onSelectArrival={setPreflightArrival}
                      aircraftData={{ name: aircraftModel, mass: 70000 }}
                      aircraftSuggestions={aircraftSuggestions}
                      weatherData={weatherData}
                      routeSearchState={routeSearchState}
                      tabletReadiness={tabletReadiness}
                      routeValidation={routeValidation}
                    />
                  </div>
                </div>
              </>
            )}
          </main>

          <footer className="app-footer">
            <p>©2026, GeeksProductionStudio. All Rights Reserved.</p>
          </footer>
        </div>
      </LanguageProvider>
    );
  }

  if (appMode === 'tutorial-hub') {
    return (
      <LanguageProvider>
        <LanguageSwitcher style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000 }} />
        <TutorialHub
          tutorials={TUTORIALS}
          onLaunchTutorial={handleLaunchTutorial}
          onBack={() => setAppMode('home')}
        />
      </LanguageProvider>
    );
  }

  if (appMode === 'challenge-hub') {
    return (
      <LanguageProvider>
        <LanguageSwitcher style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000 }} />
        <ChallengesHub
          challenges={CHALLENGES}
          onLaunchChallenge={handleLaunchChallenge}
          onBack={() => setAppMode('home')}
        />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <HomePage
        onStartSinglePlayer={handleStartSinglePlayer}
        onStartTutorial={handleStartTutorial}
        onStartChallenges={handleStartChallenges}
        onOpenSettings={handleOpenSettings}
      />
      {showSettings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <div style={{
            width: 'min(420px, calc(100vw - 32px))',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            color: '#f9fafb',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Settings</h2>
              <button onClick={handleCloseSettings} style={{ background: 'transparent', color: '#f9fafb', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <label style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Offline mode</div>
                <div style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
                  Disable multiplayer, cloud save, live weather, and network terrain fetches.
                </div>
              </div>
              <input type="checkbox" checked={offlineMode} onChange={handleOfflineModeChange} />
            </label>
          </div>
        </div>
      )}
    </LanguageProvider>
  );
}

export default App;
export { normalizeWaypoint, normalizeRouteDetails, mergeFlightPlanWithRoute };
