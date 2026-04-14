import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
import { useLanguage } from '../contexts/LanguageContext';
import { updateWeather } from '../services/weatherService';
import { realWeatherService } from '../services/RealWeatherService';
import { terrainService } from '../services/TerrainService';
import { terrainRadarService } from '../services/TerrainRadarService';
import { airportService } from '../services/airportService';
import weatherConfig from '../config/weatherConfig.json';
import FlightPanelModular from './FlightPanelModular';
import DebugPhysicsPanel from './DebugPhysicsPanel';
import FailureDebugPanel from './FailureDebugPanel';
import sceneManager from '../services/sceneManager.js';
import eventBus from '../services/eventBus';
import { getRunwayHeading } from '../utils/routeGenerator';
import {
  appendApproachTelemetrySample,
  buildApproachTelemetrySample,
  summarizeApproachTelemetry
} from '../utils/approachTelemetry.js';
import RadioActionPanel from './RadioActionPanel';
import { atcManager } from '../services/ATCLogic';
import { initializeATCPhraseologyTemplates } from '../data/atcResponseDatabase';
import { npcService } from '../services/NPCService';
import { regionControlService } from '../services/RegionControlService';
import { checkStartupRequirements, StartupPhases } from '../services/StartupChecklist';
import { skylinetragedyService } from '../services/skylinetragedy/SkylinetragedyService.js';
import { npcCrewService } from '../services/NPCCrewService';
import CrewPanel from './CrewPanel';
import TutorialOverlay from './TutorialOverlay';
import MultiplayerTrafficPanel from './MultiplayerTrafficPanel.jsx';
import usePhysicsMotionControl from '../hooks/flight/usePhysicsMotionControl.js';
import useEventBusSubscriptions from '../hooks/flight/useEventBusSubscriptions.js';
import useStartupChecklist from '../hooks/flight/useStartupChecklist.js';
import { multiplayerSessionService } from '../services/multiplayer/MultiplayerSessionService.js';
import { trafficSyncService } from '../services/multiplayer/TrafficSyncService.js';
import { playerSettingsService } from '../services/playerSettingsService.js';
import useAutoCloudSave from '../hooks/flight/useAutoCloudSave.js';

const FlightInProgress = ({
  callsign,
  aircraftModel,
  difficulty,
  selectedDeparture,
  selectedArrival,
  initialDeparture, // New prop
  flightPlan,
  airline,
  pax,
  payload,
  fuelReserve,
  cruiseHeight,
  useRandomTime,
  timeZulu,
  useRandomSeason,
  season,
  handleResetFlight,
  formatDistance,
  formatFlightTime,
  formatFuel,
  weatherData,
  setWeatherData,
  failureType,
  crewCount,
  physicsModel = 'realistic',
  routeDetails,
  isTutorial = false,
  onTutorialClose,
  offlineMode = false
}) => {


  const averagePassengerWeight = 90;
  const averageCrewWeight = 90;
  // Parse inputs safely as they might be strings from the initialization form
  const safePax = parseInt(pax) || 0;
  const safeCrew = parseInt(crewCount) || 0;
  const safePayload = parseFloat(payload) || 0;
  const safeCruiseHeight = parseInt(cruiseHeight) || 0;

  const totalPassengerWeight = safePax * averagePassengerWeight;
  const totalCrewWeight = safeCrew * averageCrewWeight;
  const additionalPayloadWeight = safePayload;
  const totalPayloadWeight = totalPassengerWeight + totalCrewWeight + additionalPayloadWeight;
  const flightPlanFuelWeight = flightPlan && flightPlan.fuel && typeof flightPlan.fuel.totalFuel === 'number'
    ? flightPlan.fuel.totalFuel
    : 0;

  // Calculate initial heading from runway
  const runwayName = (routeDetails?.departureRunway) || (flightPlan?.departure?.runways?.[0]?.name) || '36L';
  const isEastward = selectedArrival && selectedDeparture ? selectedArrival.longitude > selectedDeparture.longitude : null;
  const runwayHeadingDeg = getRunwayHeading(runwayName, isEastward);
  const runwayHeadingRad = runwayHeadingDeg * Math.PI / 180;

  // Calculate Spawn Position (Runway Threshold)
  let initialLat = initialDeparture?.latitude || 37.6188;
  let initialLon = initialDeparture?.longitude || -122.3750;

  if (isTutorial && selectedDeparture && selectedArrival) {
      const tutorialLatBias = (selectedArrival.latitude - selectedDeparture.latitude) * 0.12;
      const tutorialLonBias = (selectedArrival.longitude - selectedDeparture.longitude) * 0.12;
      initialLat = selectedDeparture.latitude + tutorialLatBias;
      initialLon = selectedDeparture.longitude + tutorialLonBias;
  } else if (initialDeparture && runwayName) {
      // Try to get runway geometry to spawn at the threshold
      // Pass the airport code (IATA or ICAO)
      const airportCode = initialDeparture.iata || initialDeparture.icao;
      if (airportCode) {
          const geom = airportService.getRunwayGeometry(airportCode, runwayName);
          if (geom && geom.thresholdStart) {
              console.log(`Spawn Point Adjusted to Runway ${runwayName} Threshold:`, geom.thresholdStart);
              initialLat = geom.thresholdStart.latitude;
              initialLon = geom.thresholdStart.longitude;

              // Apply 100m offset along runway heading to prevent "sliding off the back" or grass glitches
              // 1 deg Lat ~= 111,111m
              // 1 deg Lon ~= 111,111m * cos(lat)
              const offsetMeters = 100;
              const metersPerLat = 111111;
              const metersPerLon = 111111 * Math.cos(initialLat * Math.PI / 180);

              const dLat = (offsetMeters * Math.cos(runwayHeadingRad)) / metersPerLat;
              const dLon = (offsetMeters * Math.sin(runwayHeadingRad)) / metersPerLon;

              initialLat += dLat;
              initialLon += dLon;
          }
      }
  }

  const activeRouteWaypoints = (Array.isArray(routeDetails?.waypoints) && routeDetails.waypoints.length > 0)
    ? routeDetails.waypoints
    : (Array.isArray(flightPlan?.waypoints) ? flightPlan.waypoints : []);

  const aircraftConfig = useMemo(() => ({
    aircraftModel,
    payloadWeight: totalPayloadWeight,
    fuelWeight: flightPlanFuelWeight,
    cruiseHeight,
    windSpeedKts: weatherData && typeof weatherData.windSpeed === 'number'
      ? weatherData.windSpeed
      : 0,
    initialLatitude: initialLat,
    initialLongitude: initialLon,
    initialHeading: runwayHeadingDeg,
    airportElevation: initialDeparture?.elevation || 0,
    initialAltitude: isTutorial ? 10000 : undefined,
    initialSpeed: isTutorial ? 250 : undefined,
    flightPlan: activeRouteWaypoints,
    departure: selectedDeparture,
    arrival: selectedArrival,
    departureRunway: (routeDetails?.departureRunway) || (flightPlan?.departure?.runways?.[0]?.name),
    arrivalRunway: (routeDetails?.landingRunway) || (flightPlan?.arrival?.runways?.[0]?.name),
    difficulty: difficulty,
    failureType: failureType
  }), [
    aircraftModel,
    totalPayloadWeight,
    flightPlanFuelWeight,
    cruiseHeight,
    weatherData,
    initialLat,
    initialLon,
    runwayHeadingDeg,
    initialDeparture?.elevation,
    isTutorial,
    routeDetails,
    flightPlan,
    selectedDeparture,
    selectedArrival,
    difficulty,
    failureType
  ]);
  const {
    flightData,
    physicsState,
    isInitialized,
    error,
    isCrashed,
    updatePhysics,
    setThrottle,
    setPitch,
    setRoll,
    setYaw,
    setFlaps,
    setAirBrakes,
    setGear,
    setTrim,
    performSystemAction,
    setEnvironment,
    physicsService,
    setTimeScale,
    timeScale,
    updateFlightPlan,
    setEngineThrottle,
    setMotionEnabled
  } = useAircraftPhysics(aircraftConfig, false, physicsModel);

  const formatNumber = (value, digits = 0, suffix = '') => (
    Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '---'
  );

  // Control state for UI components
  const { language } = useLanguage();
  const [, setThrottleControl] = useState(0); // Initialize at IDLE
  const [commandInput, setCommandInput] = useState('');
  const [radioMessages, setRadioMessages] = useState([]);
  const [currentFreq, setCurrentFreq] = useState(121.500);
  const [useRealWeather] = useState(!offlineMode);
  const [sceneState, setSceneState] = useState(
    isTutorial
      ? {
          scenarioId: null,
          status: 'tutorial',
          phaseId: null,
          phaseName: 'Tutorial',
          phaseType: null,
          elapsedInPhase: 0,
          totalElapsed: 0,
          physicsActive: true,
          activeFailures: [],
          completedPhases: [],
          lastCommand: null,
          takeoffClearanceReceived: true,
          narrativeHistory: []
        }
      : sceneManager.getState()
  );
  const lastSceneStateRef = useRef(sceneState);
  const isInitializedRef = useRef(isInitialized);
  const updatePhysicsRef = useRef(updatePhysics);
  const physicsServiceRef = useRef(physicsService);
  const physicsStateRef = useRef(physicsState);
  const [narrative, setNarrative] = useState(null);
  const [activeFailures, setActiveFailures] = useState([]);
  const [phaseName, setPhaseName] = useState('');
  const [showDebugPhysics, setShowDebugPhysics] = useState(false);
  const [showFailurePanel, setShowFailurePanel] = useState(false);
  const [isChannelBusy, setIsChannelBusy] = useState(false);
  const [npcs, setNpcs] = useState([]);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [multiplayerStatus, setMultiplayerStatus] = useState({
    label: 'Offline',
    detail: 'Supabase auth and namespace session required.'
  });
  const [remoteTraffic, setRemoteTraffic] = useState([]);
  const [playerSettings, setPlayerSettings] = useState(playerSettingsService.defaults);
  const [playerSettingsError, setPlayerSettingsError] = useState(null);
  const [playerSettingsLoaded, setPlayerSettingsLoaded] = useState(false);
  const [activeFlightPlan, setActiveFlightPlan] = useState(flightPlan);
  const [autoSaveStatus, setAutoSaveStatus] = useState({
    isSaving: false,
    lastSavedAt: null,
    saveError: null
  });
  useEffect(() => {
    if (offlineMode) {
      setPlayerSettings(playerSettingsService.defaults);
      setPlayerSettingsError(null);
      setPlayerSettingsLoaded(true);
      return;
    }

    let isMounted = true;

    const loadPlayerSettings = async () => {
      const { data, error } = await playerSettingsService.getPlayerSettings();
      if (!isMounted) {
        return;
      }

      if (data) {
        setPlayerSettings(data);
      }
      setPlayerSettingsError(error?.message ?? null);
      setPlayerSettingsLoaded(true);
    };

    loadPlayerSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePlayerSettingsChange = async (patch) => {
    if (offlineMode) {
      const nextSettings = {
        ...playerSettings,
        ...patch
      };
      setPlayerSettings(nextSettings);
      setPlayerSettingsError(null);
      return;
    }

    const nextSettings = {
      ...playerSettings,
      ...patch
    };

    setPlayerSettings(nextSettings);
    const { data, error } = await playerSettingsService.updatePlayerSettings(nextSettings);

    if (data) {
      setPlayerSettings(data);
    }
    setPlayerSettingsError(error?.message ?? null);
  };

  const autoSaveMeta = useAutoCloudSave({
    enabled: !offlineMode && playerSettings.autoSaveEnabled,
    intervalMinutes: playerSettings.autoSaveIntervalMinutes,
    isInitialized: !offlineMode && isInitialized && playerSettingsLoaded && !isTutorial,
    flightData,
    physicsState,
    physicsService,
    flightPlan: activeFlightPlan,
    weatherData,
    aircraftModel,
    onSaveStateChange: setAutoSaveStatus
  });

  useEffect(() => {
    setAutoSaveStatus(prev => ({
      ...prev,
      lastSavedAt: autoSaveMeta.lastSavedAt,
      saveError: autoSaveMeta.saveError,
      isSaving: autoSaveMeta.isSaving
    }));
  }, [autoSaveMeta.isSaving, autoSaveMeta.lastSavedAt, autoSaveMeta.saveError]);

  useEffect(() => {
    if (!isTutorial) {
      return;
    }

    setNarrative(null);
    setPhaseName('Tutorial');
    setActiveFailures([]);
    const tutorialSceneState = {
      scenarioId: null,
      status: 'tutorial',
      phaseId: null,
      phaseName: 'Tutorial',
      phaseType: null,
      elapsedInPhase: 0,
      totalElapsed: 0,
      physicsActive: true,
      activeFailures: [],
      completedPhases: [],
      lastCommand: null,
      takeoffClearanceReceived: true,
      narrativeHistory: []
    };
    lastSceneStateRef.current = tutorialSceneState;
    setSceneState(tutorialSceneState);
  }, [isTutorial]);

  useEffect(() => {
    initializeATCPhraseologyTemplates();
  }, []);

  useEffect(() => {
    let mounted = true;

    const setupMultiplayer = async () => {
      if (isTutorial || offlineMode) {
        setMultiplayerStatus({ label: 'Offline', detail: offlineMode ? 'Offline mode enabled.' : 'Tutorial mode active.' });
        return;
      }

      const namespaceKey = import.meta.env.VITE_MULTIPLAYER_NAMESPACE || 'legacy';
      const gate = await multiplayerSessionService.canUseMultiplayer();
      if (!mounted) {
        return;
      }

      if (!gate.ok) {
        setMultiplayerStatus({ label: 'Offline', detail: gate.reason });
        return;
      }

      const sessionCode = `${(selectedDeparture?.iata || selectedDeparture?.icao || 'DEP')}-${(selectedArrival?.iata || selectedArrival?.icao || 'ARR')}`;
      const result = await multiplayerSessionService.createOrJoinSession({
        namespaceKey,
        sessionCode,
        role: 'pilot',
        callsign,
        aircraftType: aircraftModel,
        scenarioConfig: {
          departure: selectedDeparture?.iata || selectedDeparture?.icao || null,
          arrival: selectedArrival?.iata || selectedArrival?.icao || null,
          difficulty,
          failureType
        }
      });

      if (!mounted) {
        return;
      }

      if (result.error) {
        setMultiplayerStatus({ label: 'Unavailable', detail: result.error.message || 'Failed to create multiplayer session.' });
        return;
      }

      const session = result.data;
      const connection = await trafficSyncService.connect({
        namespaceKey: session.namespaceKey,
        sessionId: session.sessionId,
        userId: gate.user.id,
        callsign,
        aircraftType: aircraftModel,
        role: session.role || 'pilot'
      });

      if (!mounted) {
        return;
      }

      if (!connection.connected) {
        setMultiplayerStatus({ label: 'Disconnected', detail: 'Realtime channel unavailable.' });
        return;
      }

      setMultiplayerStatus({
        label: 'Live traffic',
        detail: `${session.namespaceKey} / ${session.sessionCode}`
      });
    };

    setupMultiplayer();

    const unsubscribeTraffic = eventBus.subscribe(eventBus.Types.MULTIPLAYER_TRAFFIC_UPDATED, (payload) => {
      setRemoteTraffic(payload?.traffic || []);
    });

    const unsubscribeStatus = eventBus.subscribe(eventBus.Types.MULTIPLAYER_STATUS_CHANGED, (payload) => {
      if (payload?.status === 'left') {
        setRemoteTraffic([]);
        setMultiplayerStatus({ label: 'Offline', detail: 'Multiplayer session closed.' });
      }
    });

    return () => {
      mounted = false;
      unsubscribeTraffic?.();
      unsubscribeStatus?.();
      trafficSyncService.disconnect();
      multiplayerSessionService.leaveCurrentSession().catch(() => {});
    };
  }, [isTutorial, offlineMode, callsign, aircraftModel, difficulty, failureType, selectedDeparture, selectedArrival]);

  // Radio Message Handler
  const handleRadioTransmit = (messageDataOrText, type, templateId, params) => {
    // Check if channel is busy
    if (atcManager.isBusy(currentFreq)) {
        setRadioMessages(prev => [...prev, {
            sender: 'System',
            text: '[FREQUENCY BUSY]',
            timestamp: Date.now(),
            type: 'system'
        }]);
        return;
    }

    let messageText, messageType, messageTemplateId, messageParams;

    // Handle both object (from RadioActionPanel) and legacy string arguments
    if (typeof messageDataOrText === 'object' && messageDataOrText !== null) {
        messageText = messageDataOrText.text;
        messageType = messageDataOrText.type;
        messageTemplateId = messageDataOrText.templateId;
        messageParams = messageDataOrText.params;
    } else {
        messageText = messageDataOrText;
        messageType = type;
        messageTemplateId = templateId;
        messageParams = params;
    }

    // Add pilot message
    const freqType = getFrequencyType(currentFreq);
    const newMessage = {
      sender: callsign,
      text: messageText,
      timestamp: Date.now(),
      type: messageType || 'transmission',
      frequency: freqType
    };
    
    setRadioMessages(prev => [...prev, newMessage]);
    
    // Process with ATC Logic
    const context = {
        callsign: callsign,
        altitude: Math.round(flightData?.altitude ?? 0),
        heading: Math.round(flightData?.heading ?? 0),
        weather: weatherData, // Pass weather data to ATC context
        frequencyType: freqType,
        language,
        phaseOfFlight: sceneState.phaseType
    };

    atcManager.processMessage(
        { type: messageType, templateId: messageTemplateId, params: messageParams, text: messageText },
        context,
        (response) => {
            setRadioMessages(prev => [...prev, { ...response, frequency: freqType }]);
            
            // Event Bus Trigger for Takeoff Clearance
            if (messageTemplateId === 'req_takeoff') {
                console.log('🛫 Takeoff Clearance Received - Triggering Event');
                eventBus.publish('atc.clearance.takeoff', {
                    timestamp: Date.now(),
                    runway: messageParams?.runway
                });
            }
        }
    );
  };

  // Startup Checklist Logic (Pro/Devil)
  const [startupStatus, setStartupStatus] = useState(() => {
    const isHardcore = difficulty === 'pro' || difficulty === 'devil';
    return {
      canContinue: !isHardcore,
      missingItems: isHardcore ? ['System Initialization...'] : []
    };
  });
  const [approachTelemetrySamples, setApproachTelemetrySamples] = useState([]);
  const approachTelemetry = summarizeApproachTelemetry(approachTelemetrySamples);
  const { startupStatus: quickStartupStatus } = useStartupChecklist(difficulty, physicsState?.systems);

  usePhysicsMotionControl({
    motionController: setMotionEnabled,
    phaseType: sceneState.phaseType,
    takeoffClearanceReceived: sceneState.takeoffClearanceReceived,
    isInitialized,
    isTutorial,
    onParkedPhaseChange: (isParkedPhase) => {
      if (physicsService?.setGroundMode) {
        physicsService.setGroundMode(isParkedPhase);
      }
    }
  });

  useEffect(() => {
    if (!physicsState || !physicsState.systems) return;

    // Only enforce for Pro/Devil modes
    if (difficulty !== 'pro' && difficulty !== 'devil') {
        if (!startupStatus.canContinue) {
            setStartupStatus({ canContinue: true, missingItems: [] });
        }
        return;
    }

    if (quickStartupStatus && quickStartupStatus.items?.length > 0) {
        const quickMissingItems = quickStartupStatus.items.filter(item => !item.complete).map(item => item.name);
        if (!quickStartupStatus.complete && sceneState.phaseType === 'boarding') {
            const nextQuickStatus = { canContinue: false, missingItems: quickMissingItems };
            if (JSON.stringify(nextQuickStatus) !== JSON.stringify(startupStatus)) {
                setStartupStatus(nextQuickStatus);
            }
            return;
        }
    }

    let phaseToCheck = null;
    const currentPhaseType = sceneState.phaseType;

    // Map phases to checklist requirements
    // Scene 1: Boarding/Pre-flight -> Power Up
    if (currentPhaseType === 'boarding' || currentPhaseType === 'takeoff_prep' || currentPhaseType === 'departure_clearance') {
        // Note: takeoff_prep is usually just before takeoff, but if we start cold & dark,
        // we might be in boarding.
        phaseToCheck = StartupPhases.POWER_UP;
    } 
    // Scene 2: Pushback -> Engine Start
    else if (currentPhaseType === 'pushback') {
        phaseToCheck = StartupPhases.ENGINE_START;
    }

    if (phaseToCheck) {
        const result = checkStartupRequirements(phaseToCheck, physicsState.systems, physicsState.engines);
        
        // Only update state if changed to avoid render loops
        if (result.canContinue !== startupStatus.canContinue || 
            JSON.stringify(result.missingItems) !== JSON.stringify(startupStatus.missingItems)) {
            setStartupStatus(result);
        }
    } else {
        if (!startupStatus.canContinue) {
            setStartupStatus({ canContinue: true, missingItems: [] });
        }
    }
  }, [physicsState, sceneState.phaseType, difficulty]);

  useEffect(() => {
    setApproachTelemetrySamples([]);
  }, [callsign, aircraftModel, selectedArrival?.iata, selectedArrival?.icao, routeDetails?.landingRunway, flightPlan?.arrival?.runways?.[0]?.name]);

  useEffect(() => {
    const sample = buildApproachTelemetrySample({ ils: flightData?.autopilotDebug?.ils, timestamp: Date.now() });
    setApproachTelemetrySamples(prev => appendApproachTelemetrySample(prev, sample));
  }, [flightData?.autopilotDebug?.ils]);

  // Sync prop flightPlan to state if it changes (e.g. reset)
  useEffect(() => {
    // Only update if the plan actually changed content-wise to prevent object identity loops
    setActiveFlightPlan(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(flightPlan)) {
            return flightPlan;
        }
        return prev;
    });
  }, [flightPlan]);
  
  // Handle Flight Plan Update
   const handleUpdateFlightPlan = (newPlan) => {
     console.log("📝 Flight Plan Updated:", newPlan);
     
     let updatedPlanObject;
     if (Array.isArray(newPlan)) {
         // If we received just an array of waypoints, merge it into the existing plan object
         updatedPlanObject = {
             ...(activeFlightPlan || {}),
             waypoints: newPlan
         };
     } else {
         // If we received a full object, use it
         updatedPlanObject = newPlan;
     }

     setActiveFlightPlan(updatedPlanObject);
     
     // Update Physics Service
     if (updateFlightPlan) {
         // Physics service handles both array and object, but let's pass the array if that's what changed,
         // or just pass the full object which the service also handles.
         updateFlightPlan(updatedPlanObject);
     }
   };
  
  const lastNpcUpdateRef = React.useRef(Date.now());
  const lastRegionUpdateRef = React.useRef(0);

  const getFrequencyType = (freq) => {
    const f = parseFloat(freq);
    const alt = flightData?.altitude || 0;
    const lat = flightData?.position?.latitude;
    const lon = flightData?.position?.longitude;

    // Check Region Control Frequency first
    if (currentRegion && Math.abs(f - parseFloat(currentRegion.frequency)) < 0.005) {
        return 'CENTER';
    }

    // High Altitude Logic (> 5000ft)
    if (alt > 5000) {
        if (Math.abs(f - 121.5) < 0.1) return 'GUARD';
        return 'UNICOM'; 
    }

    // Dynamic Airport Frequency Check
    if (lat && lon) {
        // Find nearest airport within 20nm
        const nearbyAirports = airportService.getAirportsWithinRadius(lat, lon, 20);
        if (nearbyAirports.length > 0) {
            // Sort by distance to prioritize the closest one
            nearbyAirports.sort((a, b) => {
                const distA = airportService.calculateDistance({ latitude: lat, longitude: lon }, a);
                const distB = airportService.calculateDistance({ latitude: lat, longitude: lon }, b);
                return distA - distB;
            });

            const nearest = nearbyAirports[0];
            if (nearest.frequencies) {
                const matchedFreq = nearest.frequencies.find(freqObj => 
                    Math.abs(f - freqObj.frequency) < 0.005 // Stricter tolerance for specific freqs
                );
                
                if (matchedFreq) {
                    return matchedFreq.type.toUpperCase();
                }
            }
        }
    }

    // Low Altitude Logic (Standard/Fallback)
    if (Math.abs(f - 118.0) < 0.1) return 'TOWER';
    if (Math.abs(f - 121.9) < 0.1) return 'GROUND';
    if (Math.abs(f - 121.5) < 0.1) return 'GUARD';
    if (Math.abs(f - 119.0) < 0.1) return 'CENTER';
    return 'UNICOM';
  };

  // NPC Update Loop
  useEffect(() => {
    if (!flightData || !flightData.position) return;
    
    const now = Date.now();
    let dt = (now - lastNpcUpdateRef.current) / 1000;
    lastNpcUpdateRef.current = now;

    // Cap dt to prevent huge jumps after pause/lag
    if (dt > 1.0) dt = 0.016;
    
    // Sync busy state
    const busy = atcManager.isBusy(currentFreq);
    if (busy !== isChannelBusy) {
        setIsChannelBusy(busy);
    }

    // Update Region Info (every 5 seconds or if not set)
    if (!currentRegion || now - lastRegionUpdateRef.current > 5000) {
        if (flightData.position) {
             const region = regionControlService.getRegionInfo(flightData.position.latitude, flightData.position.longitude);
             console.log('Region Update:', region);
             setCurrentRegion(region);
             lastRegionUpdateRef.current = now;
        }
    }

    // Update NPCs
    // Use timeScale for acceleration
    const effectiveDt = dt * (timeScale || 1);
    const messages = npcService.update(effectiveDt, flightData.position, { atcManager }); // Pass ATC context for channel blocking checks
    setNpcs([...npcService.npcs]); // Update state for radar

    // Update ATC Logic (Proactive & ATIS)
    const freqType = getFrequencyType(currentFreq);
    const freqInfo = {
        frequency: currentFreq,
        type: freqType,
        station: freqType === 'CENTER' && currentRegion ? currentRegion.name : freqType
    };

    atcManager.update(effectiveDt, {
        altitude: flightData.altitude,
        verticalSpeed: flightData.verticalSpeed,
        callsign: callsign,
        weather: weatherData,
        language
    }, freqInfo, (msg) => {
        setRadioMessages(prev => [...prev, { ...msg, frequency: freqType }]);
    });

    if (messages.length > 0) {
        // Handle incoming NPC messages
        messages.forEach(msg => {
            setRadioMessages(prev => [...prev, msg]);
        });
    }
  }, [flightData.frame, flightData.position]);

  useEventBusSubscriptions(eventBus, {
    [eventBus.Types.NARRATIVE_UPDATE]: (payload) => {
      setNarrative(payload);
    },
    [eventBus.Types.CRITICAL_MESSAGE]: (payload) => {
      setNarrative(payload);
    },
    [eventBus.Types.PHASE_CHANGED]: (payload) => {
      const phase = payload?.phase;
      setPhaseName(phase?.name || '');
      if (phase?.narrative) {
        setNarrative(phase.narrative);
      }
    },
    [eventBus.Types.FAILURE_OCCURRED]: () => {
      const state = sceneManager.getState();
      setActiveFailures(state.activeFailures);
    },
    [eventBus.Types.FAILURE_RESOLVED]: () => {
      const state = sceneManager.getState();
      setActiveFailures(state.activeFailures);
    },
    [eventBus.Types.PHYSICS_INITIALIZE]: (payload) => {
      if (physicsService && typeof physicsService.setInitialConditions === 'function' && payload?.initialConditions) {
        physicsService.setInitialConditions(payload.initialConditions);
      }

      if (physicsService && typeof physicsService.updateAutopilotTargets === 'function') {
        const targets = {};
        if (payload?.targetAltitude !== undefined) {
          targets.altitude = payload.targetAltitude;
        }
        if (payload?.targetSpeed !== undefined) {
          targets.speed = payload.targetSpeed;
        }
        if (Object.keys(targets).length > 0) {
          physicsService.updateAutopilotTargets(targets);
        }
      }
    }
  });

  // Weather update effect
  useEffect(() => {
    let interval;

    if (useRealWeather && !offlineMode) {
       const fetchRealWeather = async () => {
         const lat = physicsService?.state?.geo?.lat || initialDeparture?.latitude || 37.6188;
         const lon = physicsService?.state?.geo?.lon || initialDeparture?.longitude || -122.3750;
         
         try {
             const data = await realWeatherService.getWeather(lat, lon);
             // Only update if data changed (deep comparison would be better, but simplified check helps)
             setWeatherData(prev => {
                 if (JSON.stringify(prev) !== JSON.stringify(data)) {
                     console.log("🌦️ Real Weather Updated:", data);
                     if (setEnvironment) setEnvironment(data);
                     return data;
                 }
                 return prev;
             });
         } catch (e) {
             console.error("❌ Real Weather Fetch Failed", e);
         }
       };
       
       fetchRealWeather();
       interval = setInterval(fetchRealWeather, 5 * 60 * 1000); // Update every 5 minutes
    } else {
        interval = setInterval(() => {
          setWeatherData(prevWeatherData => {
            const updated = updateWeather(prevWeatherData, weatherConfig.atisUpdateIntervalMinutes);
            if (setEnvironment) setEnvironment(updated);
            return updated;
          });
        }, weatherConfig.atisUpdateIntervalMinutes * 60 * 1000);
    }

    return () => clearInterval(interval);
  }, [useRealWeather, offlineMode, setEnvironment, physicsService]); // Removed weatherData and setWeatherData to prevent loops

  // Terrain update effect
  useEffect(() => {
    const fetchTerrain = async () => {
       if (!physicsService || !physicsService.state || !physicsService.state.geo) return;

       const { lat, lon } = physicsService.state.geo;

       try {
           const radarEleFt = terrainRadarService.getTerrainHeight(lat, lon);

           if (radarEleFt !== null) {
               physicsService.terrainElevation = radarEleFt * 0.3048;
               return;
           }

           if (offlineMode) {
               return;
           }

           const ele = await terrainService.getElevation(lat, lon);
           if (ele !== null && typeof ele === 'number') {
               physicsService.terrainElevation = ele;
           }
       } catch (e) {
           console.error("❌ Terrain fetch failed", e);
       }
    };
    
    // Loop every 1 second
    const interval = setInterval(fetchTerrain, 1000);
    return () => clearInterval(interval);
  }, [physicsService, offlineMode]);

  // Update scene manager with selected flight parameters
  useEffect(() => {
    if (isTutorial) {
      return;
    }

    if (selectedDeparture && selectedArrival) {
      console.log('✈️  FlightInProgress: Updating scene manager with flight parameters:', {
        callsign: callsign,
        departure: selectedDeparture.iata || selectedDeparture.icao,
        arrival: selectedArrival.iata || selectedArrival.icao,
        aircraftModel: aircraftModel,
        departureRunway: routeDetails?.departureRunway,
        landingRunway: routeDetails?.landingRunway,
        initialHeading: runwayHeadingDeg
      });

      sceneManager.updateScenario({
        callsign: callsign,
        departure: selectedDeparture.iata || selectedDeparture.icao,
        arrival: selectedArrival.iata || selectedArrival.icao,
        aircraftModel: aircraftModel,
        departureRunway: routeDetails?.departureRunway,
        landingRunway: routeDetails?.landingRunway,
        initialHeading: runwayHeadingDeg
      });

      console.log('✅ FlightInProgress: Scene manager updated successfully');
    }
  }, [callsign, selectedDeparture, selectedArrival, aircraftModel, routeDetails, runwayHeadingDeg, isTutorial]);

  // Trigger Physics ILS update when radio frequency changes
  useEffect(() => {
    if (physicsService && isInitialized) {
        const currentFlightPlan = {
            waypoints: activeRouteWaypoints,
            departure: selectedDeparture,
            arrival: selectedArrival
        };
        physicsService.handleRadioTuning(currentFreq, currentFlightPlan);
    }
  }, [currentFreq, isInitialized, physicsService, routeDetails, flightPlan, selectedDeparture, selectedArrival]);

  // Initialize SkylineTragedy Service
  useEffect(() => {
    if (!offlineMode) {
      skylinetragedyService.initialize();
    }
    npcCrewService.initialize(difficulty);

    return () => {
      npcCrewService.destroy();
    };
  }, [difficulty, offlineMode]);

  useEffect(() => {
    npcCrewService.setAircraftStateProvider(() => {
      if (!physicsService) return null;
      return {
        altitude: physicsService.altitude,
        airspeed: physicsService.speed,
        heading: physicsService.heading,
        fuel: physicsService.systems?.fuel || 0
      };
    });
  }, [physicsService]);

  useEffect(() => {
    isInitializedRef.current = isInitialized;
    updatePhysicsRef.current = updatePhysics;
    physicsServiceRef.current = physicsService;
    physicsStateRef.current = physicsState;
  }, [isInitialized, updatePhysics, physicsService, physicsState]);

  // Main update loop
  useEffect(() => {
    if (isTutorial) {
      setMotionEnabled?.(true);
    } else {
      sceneManager.start();
    }

    const FIXED_STEP = 1 / 60;
    const MAX_FRAME_DELTA = 0.1;
    const MAX_ACCUMULATED_TIME = FIXED_STEP * 6;
    let animationId = null;
    let lastTime = performance.now();
    let accumulator = 0;

    const loop = now => {
      const frameDt = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA);
      lastTime = now;
      accumulator = Math.min(accumulator + frameDt, MAX_ACCUMULATED_TIME);

      let physicsSnapshot = physicsStateRef.current;
      let steppedDt = 0;

      while (isInitializedRef.current && accumulator >= FIXED_STEP) {
        physicsSnapshot = updatePhysicsRef.current?.(FIXED_STEP) ?? physicsSnapshot;
        accumulator -= FIXED_STEP;
        steppedDt += FIXED_STEP;

        if (physicsServiceRef.current) {
          skylinetragedyService.update(FIXED_STEP, physicsServiceRef.current);
        }
      }

      if (!isTutorial) {
        sceneManager.update(steppedDt || frameDt, physicsSnapshot);
        const nextState = sceneManager.getState();
        const previousState = lastSceneStateRef.current;
        const shouldUpdateSceneState =
          previousState.phaseId !== nextState.phaseId ||
          previousState.phaseName !== nextState.phaseName ||
          previousState.phaseType !== nextState.phaseType ||
          previousState.status !== nextState.status ||
          previousState.physicsActive !== nextState.physicsActive ||
          previousState.takeoffClearanceReceived !== nextState.takeoffClearanceReceived ||
          previousState.scenarioId !== nextState.scenarioId ||
          previousState.activeFailures.length !== nextState.activeFailures.length ||
          previousState.completedPhases.length !== nextState.completedPhases.length ||
          previousState.narrativeHistory.length !== nextState.narrativeHistory.length ||
          previousState.lastCommand !== nextState.lastCommand;

        if (shouldUpdateSceneState) {
          lastSceneStateRef.current = nextState;
          setSceneState(nextState);
        }
      }

      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isTutorial, setMotionEnabled]);

  useEffect(() => {
    if (offlineMode) {
      return;
    }

    const session = multiplayerSessionService.getCurrentSession();
    const userId = multiplayerSessionService.currentUser?.id;
    if (!session || !userId || !flightData?.position) {
      return;
    }

    trafficSyncService.broadcastTraffic({
      sessionId: session.sessionId,
      namespaceKey: session.namespaceKey,
      userId,
      callsign,
      aircraftType: aircraftModel,
      role: session.role || 'pilot',
      flightData
    });
  }, [flightData, callsign, aircraftModel]);

  // ✅ CLEAN ARCHITECTURE: Throttle control handler
  const handleThrustControl = (engineIndex, throttleValue) => {
    console.log('🎯 FlightInProgress: Throttle control received:', {
      engineIndex,
      throttleValue,
      percentage: `${((Number(throttleValue) || 0) * 100).toFixed(1)}%`
    });
    
    const validatedThrottle = Math.max(-0.7, Math.min(1, throttleValue));
    
    // Update local display state (Legacy support)
    setThrottleControl(validatedThrottle * 100);
    
    // Send directly to physics engine
    if (setEngineThrottle) {
        setEngineThrottle(engineIndex, validatedThrottle);
        console.log(`🚀 FlightInProgress: Engine ${engineIndex} throttle set to:`, validatedThrottle);
    } else {
        setThrottle(validatedThrottle);
        console.log('🚀 FlightInProgress: Global throttle set to:', validatedThrottle);
    }
  };

  // Handle surface control changes
  const handleFlapsControl = (position) => {
    console.log(`🛩️ Flaps control: ${position}`);
    setFlaps(position);
  };

  const handleGearControl = (position) => {
    console.log(`🔧 Gear control: ${position}`);
    setGear(position);
  };

  const handleAirBrakesControl = (position) => {
    console.log(`🛑 Air brakes control: ${position}`);
    setAirBrakes(position);
  };

  const handleCommandSubmit = (event) => {
    event.preventDefault();
    const trimmed = commandInput.trim();
    if (!trimmed) {
      return;
    }
    console.log('🧭 COMMAND INPUT:', trimmed);
    eventBus.publish('command.input', {
      raw: trimmed,
      sceneId: sceneState.sceneId,
      scenarioId: sceneState.scenarioId
    });
    setCommandInput('');
  };




  if (!isInitialized && !error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>✈️ Starting Flight Simulation...</div>
          <div style={{ color: '#4ade80' }}>Initializing physics engine...</div>
        </div>
      </div>
    );
  }

  // Show error state if initialization fails
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px', color: '#ef4444' }}>❌ Initialization Error</div>
          <div style={{ marginBottom: '20px' }}>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '12px 25px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: '#0a0a0a',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.4)',
          background: 'linear-gradient(to right, rgba(15,23,42,0.95), rgba(30,64,175,0.85))',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          zIndex: 10
        }}
      >
        <div style={{ flex: 2, minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#9CA3AF',
              marginBottom: '4px'
            }}
          >
            {phaseName || 'Situation'}
          </div>
          
          {/* Conditional Rendering: Only show narrative in Header if Physics is ACTIVE (PHY-ON) 
              In PHY-OFF mode, narrative is shown in the immersive full-screen view.
              Also show if there is a warning/critical message (e.g. checklist blocked) */}
          {(sceneState.physicsActive || narrative?.severity === 'warning' || narrative?.severity === 'critical') && (
            <>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: narrative?.severity === 'critical' ? '#ef4444' : narrative?.severity === 'warning' ? '#f59e0b' : '#E5E7EB',
                  marginBottom: '4px'
                }}
              >
                {narrative?.title || 'Awaiting flight instructions...'}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#D1D5DB',
                  opacity: 0.9,
                  marginBottom: '8px'
                }}
              >
                {narrative?.content || 'Prepare for takeoff.'}
              </div>
            </>
          )}

          {/* Live Startup Checklist Status (Pro/Devil Mode) */}
          {!startupStatus.canContinue && (difficulty === 'pro' || difficulty === 'devil') && (
            <div style={{ marginTop: '8px', marginBottom: '8px' }}>
              <div style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                color: '#f59e0b',
                marginBottom: '4px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>⚠️ Checklist Incomplete</span>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {startupStatus.missingItems.map((item, index) => (
                  <div key={index} style={{
                    fontSize: '11px',
                    color: '#fbbf24',
                    padding: '6px 8px',
                    background: 'rgba(69, 26, 3, 0.6)',
                    borderRadius: '4px',
                    borderLeft: '3px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ marginRight: '6px' }}>☐</span> {item}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Active Failures Display - Always visible if failures exist */}
          {activeFailures.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                color: '#ef4444',
                marginBottom: '4px'
              }}>
                Active Failures ({activeFailures.length})
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                {activeFailures.map((failure, index) => (
                  <div key={index} style={{
                    fontSize: '10px',
                    color: failure.isCritical ? '#ef4444' : '#f59e0b',
                    padding: '4px 6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '3px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{failure.type.toUpperCase()} {failure?.data?.engineIndex !== undefined ? `ENGINE ${failure.data.engineIndex + 1}` : ''}</span>
                    <span>{failure.isCritical ? 'CRITICAL' : `${Math.round(failure.progress)}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: 1.3, minWidth: '260px', height: '120px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <RadioActionPanel
            onTransmit={handleRadioTransmit}
            currentStation={Number.isFinite(currentFreq) ? currentFreq.toFixed(3) : '---'}
            callsign={callsign || 'N12345'}
            flightPlan={activeFlightPlan}
            isChannelBusy={isChannelBusy}
            frequencyType={getFrequencyType(currentFreq)}
          />
          <MultiplayerTrafficPanel status={multiplayerStatus} remoteTraffic={remoteTraffic} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Debug Panel - Toggled via Sidebar or Button */}
        {showDebugPhysics && (
          <DebugPhysicsPanel 
            debugPhysicsData={flightData?.debugPhysics}
            thrust={flightData?.thrust}
            drag={flightData?.drag}
            waypoints={aircraftConfig.flightPlan}
            flightData={flightData}
            groundStatus={physicsService?.groundStatus?.status}
            remainingRunwayLength={physicsService?.groundStatus?.remainingLength ?? 0}
          />
        )}

        {showFailurePanel && (
          <FailureDebugPanel 
            physicsService={physicsService} 
            onClose={() => setShowFailurePanel(false)}
          />
        )}

        <CrewPanel difficulty={difficulty} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10 }}>
          <FlightPanelModular
            flightData={{
              ...flightData,
              physicsActive: sceneState.physicsActive,
              narrativeHistory: sceneState.narrativeHistory,
              phaseName: sceneState.phaseName,
              approachTelemetry
            }}
            physicsState={physicsState}
            physicsService={physicsService}
            weatherData={weatherData}
            aircraftModel={aircraftModel}
            aircraftData={physicsService?.aircraft}
            selectedArrival={selectedArrival}
            flightPlan={activeFlightPlan} // Pass active dynamic plan
            radioMessages={radioMessages}
            onRadioFreqChange={setCurrentFreq}
            npcs={npcs}
            frequencyContext={getFrequencyType(currentFreq)}
            currentRegion={currentRegion}
            timeScale={timeScale}
            setTimeScale={setTimeScale}
            onUpdateFlightPlan={handleUpdateFlightPlan}
            startupStatus={startupStatus}
            playerSettings={playerSettings}
            playerSettingsError={offlineMode ? null : playerSettingsError}
            autoSaveStatus={offlineMode ? { isSaving: false, lastSavedAt: null, saveError: null } : autoSaveStatus}
            onUpdatePlayerSettings={handlePlayerSettingsChange}
            onActionRequest={(action, payload, extra) => {
              const payloadStr = typeof payload === 'number' ? payload.toFixed(5) : JSON.stringify(payload);
              console.log(`📡 UI Action: ${action} = ${payloadStr}, Extra: ${extra}`);

              switch (action) {
                case 'throttle':
                  handleThrustControl(extra !== undefined ? extra : 0, payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}, Engine: ${extra}`);
                  break;
                case 'flaps':
                  handleFlapsControl(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'airBrakes':
                  handleAirBrakesControl(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'gear':
                  handleGearControl(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'trim':
                  setTrim(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'pitch':
                  setPitch(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'roll':
                  setRoll(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'yaw':
                  setYaw(payload);
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                case 'toggle-autopilot': {
                  if (physicsService && typeof physicsService.setAutopilot === 'function') {
                    const status = typeof physicsService.getAutopilotStatus === 'function'
                      ? physicsService.getAutopilotStatus()
                      : null;
                    const engaged = status && typeof status.engaged === 'boolean' ? status.engaged : false;
                    physicsService.setAutopilot(!engaged);
                  }
                  console.log(`📡 FlightPanel Action: ${action}`);
                  break;
                }
                case 'set-autopilot-mode': {
                  if (physicsService && typeof physicsService.setAutopilotMode === 'function') {
                    physicsService.setAutopilotMode(payload);
                  }
                  console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  break;
                }
                case 'set-autopilot-targets': {
                  if (physicsService && typeof physicsService.updateAutopilotTargets === 'function' && payload) {
                    // Direct pass-through for RealisticAutopilotService (Imperial Units)
                    // ModernAutopilotModule sends: { ias, vs, altitude }
                    const targets = {
                      altitude: payload.altitude, // ft
                      speed: payload.ias,         // kts
                      vs: payload.vs              // ft/min
                    };
                    
                    physicsService.updateAutopilotTargets(targets);
                  }
                  console.log(`📡 FlightPanel Action: ${action} = ${JSON.stringify(payload)}`);
                  break;
                }
                case 'set-nav-frequency': {
                  if (physicsService && physicsService.autopilot && typeof physicsService.autopilot.setNavFrequency === 'function') {
                    physicsService.autopilot.setNavFrequency(payload);
                    console.log(`📡 FlightPanel Action: ${action} = ${payload}`);
                  }
                  break;
                }
                case 'system-action': {
                  if (performSystemAction && payload) {
                    performSystemAction(payload.system, payload.action, payload.value);
                  }
                  console.log(`📡 FlightPanel Action: ${action} = ${JSON.stringify(payload)}`);
                  break;
                }
                case 'load-flight': {
                  if (physicsService && typeof physicsService.loadFlightState === 'function') {
                    physicsService.loadFlightState(payload);
                  }
                  console.log(`📡 FlightPanel Action: ${action} = ${JSON.stringify(payload)}`);
                  break;
                }
                case 'toggle-debug': {
                  setShowDebugPhysics(prev => !prev);
                  setShowFailurePanel(prev => !prev);
                  console.log(`📡 FlightPanel Action: ${action} -> Toggling Debug & Failure Panels`);
                  break;
                }
                case 'skip-phase': {
                  // Check if we can proceed (Hardcore modes only)
                  if ((difficulty === 'pro' || difficulty === 'devil') && !startupStatus.canContinue) {
                    const missing = startupStatus.missingItems.join(', ');
                    const warningMsg = {
                        title: 'Checklist Incomplete',
                        content: `Cannot proceed. Missing items: ${missing}`,
                        severity: 'warning'
                    };
                    
                    // Show warning via narrative
                    setNarrative(warningMsg);
                    
                    // Also log to console
                    console.warn('❌ Cannot skip phase:', missing);
                    return;
                  }

                  sceneManager.skipPhase();
                  console.log(`📡 FlightPanel Action: ${action}`);
                  break;
                }
                default:
                  console.log('Unhandled action:', action);
              }
            }}
          />

        </div>
      </div>
      
      {/* Debug Panel for LNAV/PID */}
      {showDebugPhysics && flightData && (
        <div style={{
          position: 'absolute',
          top: '90px',
          right: '20px',
          background: 'rgba(10, 15, 30, 0.85)',
          color: '#4ade80',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '11px',
          borderRadius: '6px',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          zIndex: 100,
          pointerEvents: 'none',
          width: '220px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            borderBottom: '1px solid rgba(74, 222, 128, 0.3)',
            paddingBottom: '4px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>FLIGHT DATA & LNAV</span>
            <span>{formatNumber(flightData?.derived?.heading, 0, '°')}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <span style={{ color: '#9ca3af' }}>Lat:</span>
            <span>{formatNumber(flightData?.position?.latitude, 5)}</span>
            
            <span style={{ color: '#9ca3af' }}>Lon:</span>
            <span>{formatNumber(flightData?.position?.longitude, 5)}</span>
            
            <span style={{ color: '#9ca3af' }}>Alt:</span>
            <span>{formatNumber(flightData?.derived?.altitude_ft, 0, ' ft')}</span>
            
            <span style={{ color: '#9ca3af' }}>IAS:</span>
            <span>{formatNumber(flightData?.indicatedAirspeed, 0, ' kts')}</span>

            <span style={{ color: '#9ca3af' }}>GS:</span>
            <span>{formatNumber(flightData?.derived?.airspeed, 0, ' kts')}</span>
          </div>

          <div style={{ margin: '8px 0', borderTop: '1px solid rgba(74, 222, 128, 0.2)' }}></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px 8px' }}>
            <span style={{ color: '#9ca3af' }}>Mode:</span>
            <span style={{ fontWeight: 'bold' }}>{flightData.autopilotDebug?.mode || 'OFF'}</span>
            
            <span style={{ color: '#9ca3af' }}>Engaged:</span>
            <span style={{ color: flightData.autopilotDebug?.engaged ? '#4ade80' : '#ef4444' }}>
              {flightData.autopilotDebug?.engaged ? 'ACTIVE' : 'OFF'}
            </span>
            
            <span style={{ color: '#9ca3af' }}>Target Hdg:</span>
            <span>{Number.isFinite(flightData?.autopilotTargets?.heading) ? `${flightData.autopilotTargets.heading.toFixed(1)}°` : '---'}</span>
            
            <span style={{ color: '#9ca3af' }}>Hdg Error:</span>
            <span style={{ color: Math.abs(flightData.autopilotDebug?.headingError) > 5 ? '#f59e0b' : '#4ade80' }}>
              {Number.isFinite(flightData?.autopilotDebug?.headingError) ? `${flightData.autopilotDebug.headingError.toFixed(2)}°` : '0.00°'}
            </span>
            
            <span style={{ color: '#9ca3af' }}>Tgt Roll:</span>
            <span>{Number.isFinite(flightData?.autopilotDebug?.targetRoll) ? `${flightData.autopilotDebug.targetRoll.toFixed(1)}°` : '0.0°'}</span>
            
            <span style={{ color: '#9ca3af' }}>Act Roll:</span>
            <span>{formatNumber((flightData?.orientation?.phi ?? 0) * 180 / Math.PI, 1, '°')}</span>
          </div>

          {flightData.autopilotDebug?.ils?.active && (
            <>
              <div style={{ margin: '8px 0', borderTop: '1px solid rgba(74, 222, 128, 0.2)' }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px 8px' }}>
                <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>ILS STATUS</span>
                <span style={{ color: '#f59e0b', fontWeight: 'bold', textAlign: 'right' }}>{flightData?.autopilotDebug?.ils?.runway || '---'}</span>

                <span style={{ color: '#9ca3af' }}>Dist:</span>
                <span>{Number.isFinite(flightData?.autopilotDebug?.ils?.distAlong) ? `${(flightData.autopilotDebug.ils.distAlong / 6076).toFixed(1)} nm` : '---'}</span>

                <span style={{ color: '#9ca3af' }}>LOC Err:</span>
                <span style={{ color: Math.abs(flightData.autopilotDebug.ils.distCross ?? 0) > 50 ? '#ef4444' : '#4ade80' }}>
                  {Number.isFinite(flightData?.autopilotDebug?.ils?.distCross) ? `${flightData.autopilotDebug.ils.distCross.toFixed(0)} ft` : '---'}
                </span>

                <span style={{ color: '#9ca3af' }}>LOC Dev:</span>
                <span>{Number.isFinite(flightData?.autopilotDebug?.ils?.locDeviationDeg) ? `${flightData.autopilotDebug.ils.locDeviationDeg.toFixed(2)}°` : '---'}</span>

                <span style={{ color: '#9ca3af' }}>G/S Err:</span>
                <span style={{ color: Math.abs(flightData.autopilotDebug.ils.altError ?? 0) > 50 ? '#ef4444' : '#4ade80' }}>
                  {Number.isFinite(flightData?.autopilotDebug?.ils?.altError) ? `${flightData.autopilotDebug.ils.altError.toFixed(0)} ft` : '---'}
                </span>

                <span style={{ color: '#9ca3af' }}>G/S Dev:</span>
                <span>{Number.isFinite(flightData?.autopilotDebug?.ils?.gsDeviationDeg) ? `${flightData.autopilotDebug.ils.gsDeviationDeg.toFixed(2)}°` : '---'}</span>

                <span style={{ color: '#9ca3af' }}>Tgt Alt:</span>
                <span>{Number.isFinite(flightData?.autopilotDebug?.ils?.targetAltitude) ? `${flightData.autopilotDebug.ils.targetAltitude.toFixed(0)} ft` : '---'}</span>

                <span style={{ color: '#9ca3af' }}>Trend:</span>
                <span style={{
                  color: approachTelemetry?.trend === 'improving'
                    ? '#4ade80'
                    : approachTelemetry?.trend === 'worsening'
                      ? '#ef4444'
                      : '#f59e0b'
                }}>
                  {(approachTelemetry?.trend || 'stable').toUpperCase()}
                </span>

                <span style={{ color: '#9ca3af' }}>Capture:</span>
                <span>
                  LOC {approachTelemetry?.locCaptured ? `@ ${formatNumber(approachTelemetry?.locCaptureTimeSec, 1, 's')}` : 'ARM'} / GS {approachTelemetry?.gsCaptured ? `@ ${formatNumber(approachTelemetry?.gsCaptureTimeSec, 1, 's')}` : 'ARM'}
                </span>

                <span style={{ color: '#9ca3af' }}>Final:</span>
                <span>
                  {Number.isFinite(approachTelemetry?.final?.distCross)
                    ? `${Math.abs(approachTelemetry.final.distCross).toFixed(0)} ft / ${Number.isFinite(approachTelemetry?.final?.altError) ? `${Math.abs(approachTelemetry.final.altError).toFixed(0)} ft` : '---'}`
                    : '---'}
                </span>
              </div>
            </>
          )}
          
          <div style={{ margin: '8px 0', borderTop: '1px solid rgba(74, 222, 128, 0.2)' }}></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#9ca3af' }}>Next WP:</span>
               <span>
                 {activeRouteWaypoints[flightData.currentWaypointIndex]?.name ||
                  activeRouteWaypoints[flightData.currentWaypointIndex]?.id ||
                  `IDX ${flightData.currentWaypointIndex}`}
               </span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#9ca3af' }}>WP Index:</span>
               <span>{flightData.currentWaypointIndex} / {activeRouteWaypoints.length}</span>
             </div>
          </div>
        </div>
      )}

      {isCrashed && (
        <div className="end-scene-overlay">
          <div className="end-scene-content">
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>{t('narrative.phases.shutoff.default.0.title') || 'Flight Ended'}</div>
            <div style={{ marginBottom: '20px', maxWidth: '420px' }}>
              {t('narrative.phases.shutoff.default.2.content') || 'Placeholder: post-incident summary and narrative debrief will appear here.'}
            </div>
            <button
              onClick={() => {
                window.location.reload();
              }}
              style={{
                background: 'linear-gradient(135deg, #DC2626, #F97316)',
                color: 'white',
                border: 'none',
                padding: '12px 25px',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {t('ui.menu.quit') || 'Return to Initialization'}
            </button>
          </div>
        </div>
      )}
      {isTutorial && flightData && (
        <TutorialOverlay 
          physicsState={flightData} 
          onClose={onTutorialClose} 
        />
      )}
    </div>
  );
};

export default FlightInProgress;
