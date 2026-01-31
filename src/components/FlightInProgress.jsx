import React, { useState, useEffect } from 'react';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics';
import { updateWeather } from '../services/weatherService';
import { realWeatherService } from '../services/RealWeatherService';
import { terrainService } from '../services/TerrainService';
import { terrainRadarService } from '../services/TerrainRadarService';
import { airportService } from '../services/airportService';
import weatherConfig from '../config/weatherConfig.json';
import FlightPanelModular from './FlightPanelModular';
import DebugPhysicsPanel from './DebugPhysicsPanel';
import FailureDebugPanel from './FailureDebugPanel';
import commandDatabase from '../commandDatabase.json';
import sceneManager from '../services/sceneManager.js';
import eventBus from '../services/eventBus.js';
import { getRunwayHeading } from '../utils/routeGenerator';
import RadioActionPanel from './RadioActionPanel';
import { atcManager } from '../services/ATCLogic';
import { npcService } from '../services/NPCService';
import { regionControlService } from '../services/RegionControlService';
import { checkStartupRequirements, StartupPhases } from '../services/StartupChecklist';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

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
  routeDetails
}) => {
  const { t } = useLanguage();

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

  if (initialDeparture && runwayName) {
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

  const aircraftConfig = {
    aircraftModel,
    payloadWeight: totalPayloadWeight,
    fuelWeight: flightPlanFuelWeight,
    cruiseHeight,
    windSpeedKts: weatherData && typeof weatherData.windSpeed === 'number'
      ? weatherData.windSpeed
      : 0,
    // Fallback to KSFO if latitude/longitude are missing (prevents 0,0 initialization)
    initialLatitude: initialLat,
    initialLongitude: initialLon,
    // Pass heading in degrees, as useAircraftPhysics converts it to radians
    initialHeading: runwayHeadingDeg,
    airportElevation: initialDeparture?.elevation || 0,
    flightPlan: (routeDetails?.waypoints || flightPlan?.waypoints || []),
    departure: selectedDeparture,
    arrival: selectedArrival,
    departureRunway: (routeDetails?.departureRunway) || (flightPlan?.departure?.runways?.[0]?.name),
    arrivalRunway: (routeDetails?.landingRunway) || (flightPlan?.arrival?.runways?.[0]?.name),
    difficulty: difficulty,
    failureType: failureType
  };

  const {
    flightData,
    physicsState,
    isInitialized,
    error,
    isCrashed,
    resetAircraft,
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

  // Control state for UI components
  const [throttleControl, setThrottleControl] = useState(0); // Initialize at IDLE
  const [commandInput, setCommandInput] = useState('');
  const [radioMessages, setRadioMessages] = useState([]);
  const [currentFreq, setCurrentFreq] = useState(121.500);
  const [useRealWeather, setUseRealWeather] = useState(true); // Enable Real Weather by default
  const [sceneState, setSceneState] = useState(sceneManager.getState());
  const [narrative, setNarrative] = useState(null);

  // Control Physics Motion based on Phase (Narrative vs Active)
  useEffect(() => {
    if (!setMotionEnabled || !isInitialized) return;

    // Phases where the plane should be static (physics integration disabled, systems active)
    // STRICT MODE: Ensure no movement until Takeoff Clearance is explicitly received
    // This prevents "creep" during startup, pushback, and taxi if not fully simulated
    const phaseType = sceneState.currentPhase?.type;
    
    // Check if we are in a pre-takeoff phase
    const isGroundPhase = ['boarding', 'departure_clearance', 'pushback', 'taxiing', 'takeoff_prep'].includes(phaseType);
    
    // Logic: Freeze if we are on ground AND haven't received takeoff clearance
    // Note: Once takeoff clearance is received, sceneManager usually transitions to 'takeoff' phase.
    // But even if it stays in 'takeoff_prep' for a moment, this flag will unlock it.
    // Conversely, if we force 'takeoff' phase but clearance logic hasn't fired, this might keep it frozen (safety).
    // However, for non-ground phases (Cruise, etc), we always enable motion.
    
    const shouldFreeze = isGroundPhase && !sceneState.takeoffClearanceReceived;
    
    if (shouldFreeze) {
         // Force zero velocity and lock integration
         setMotionEnabled(false);
         // console.log('🔒 Physics Motion FROZEN (Waiting for Takeoff Clearance)');
    } else {
         // Enable integration (Systems run in both cases)
         setMotionEnabled(true);
         // console.log('🔓 Physics Motion ENABLED');
    }
  }, [sceneState.currentPhase, sceneState.takeoffClearanceReceived, setMotionEnabled, isInitialized]);

  // Radio Message Handler
  const handleRadioTransmit = (messageDataOrText, type, templateId, params) => {
    // Check if channel is busy
    if (atcManager.isBusy()) {
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
        altitude: Math.round(flightData.altitude),
        heading: Math.round(flightData.heading),
        weather: weatherData, // Pass weather data to ATC context
        frequencyType: freqType
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
  const [activeFailures, setActiveFailures] = useState([]);
  const [phaseName, setPhaseName] = useState('');
  const [showDebugPhysics, setShowDebugPhysics] = useState(false);
  const [showFailurePanel, setShowFailurePanel] = useState(false);
  const [isChannelBusy, setIsChannelBusy] = useState(false);
  const [npcs, setNpcs] = useState([]);
  const [currentRegion, setCurrentRegion] = useState(null);
  
  // Dynamic Flight Plan State
  const [activeFlightPlan, setActiveFlightPlan] = useState(flightPlan);

  // Startup Checklist Logic (Pro/Devil)
  const [startupStatus, setStartupStatus] = useState(() => {
    const isHardcore = difficulty === 'pro' || difficulty === 'devil';
    return { 
      canContinue: !isHardcore, 
      missingItems: isHardcore ? ['System Initialization...'] : [] 
    };
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

    let phaseToCheck = null;
    const currentPhaseType = sceneState.currentPhase?.type;

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
  }, [physicsState, sceneState.currentPhase, difficulty]);

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
             ...activeFlightPlan,
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
    const busy = atcManager.isBusy();
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
    const messages = npcService.update(effectiveDt, flightData.position, atcManager); // Pass atcManager for blocking checks
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
        weather: weatherData
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

  // Set up event listeners for narrative and failure updates
  useEffect(() => {
    // Subscribe to narrative updates
    const unsubscribeNarrative = eventBus.subscribe(eventBus.Types.NARRATIVE_UPDATE, (payload) => {
      setNarrative(payload);
    });
    
    // Subscribe to critical messages
    const unsubscribeCritical = eventBus.subscribe(eventBus.Types.CRITICAL_MESSAGE, (payload) => {
      // Flash effect or special handling for critical messages
      setNarrative(payload);
      // Could add audio alert here
    });
    
    // Subscribe to phase changes
    const unsubscribePhase = eventBus.subscribe(eventBus.Types.PHASE_CHANGED, (payload) => {
      setPhaseName(payload.phase.name);
      if (payload.phase.narrative) {
        setNarrative(payload.phase.narrative);
      }
    });
    
    // Subscribe to failure updates
    const unsubscribeFailure = eventBus.subscribe(eventBus.Types.FAILURE_OCCURRED, (payload) => {
      // Update active failures display
      const state = sceneManager.getState();
      setActiveFailures(state.activeFailures);
    });
    
    const unsubscribeFailureResolved = eventBus.subscribe(eventBus.Types.FAILURE_RESOLVED, (payload) => {
      // Update active failures display
      const state = sceneManager.getState();
      setActiveFailures(state.activeFailures);
    });
    
    // Subscribe to physics initialization events
    const unsubscribePhysicsInit = eventBus.subscribe(eventBus.Types.PHYSICS_INITIALIZE, (payload) => {
      // Apply initial conditions to physics service only if provided
      if (physicsService && typeof physicsService.setInitialConditions === 'function' && payload.initialConditions) {
        physicsService.setInitialConditions(payload.initialConditions);
      }
      
      // Update autopilot targets if provided
      if (physicsService && typeof physicsService.updateAutopilotTargets === 'function') {
        const targets = {};
        if (payload.targetAltitude !== undefined) {
          targets.altitude = payload.targetAltitude;
        }
        if (payload.targetSpeed !== undefined) {
          targets.speed = payload.targetSpeed;
        }
        if (Object.keys(targets).length > 0) {
          physicsService.updateAutopilotTargets(targets);
        }
      }
    });
    
    return () => {
      unsubscribeNarrative();
      unsubscribeCritical();
      unsubscribePhase();
      unsubscribeFailure();
      unsubscribeFailureResolved();
      unsubscribePhysicsInit();
    };
  }, [physicsService]);

  // Weather update effect
  useEffect(() => {
    let interval;
    
    if (useRealWeather) {
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
            return updated;
          });
        }, weatherConfig.atisUpdateIntervalMinutes * 60 * 1000);
    }

    return () => clearInterval(interval);
  }, [useRealWeather, setEnvironment, physicsService]); // Removed weatherData and setWeatherData to prevent loops

  // Terrain update effect
  useEffect(() => {
    const fetchTerrain = async () => {
       if (!physicsService || !physicsService.state || !physicsService.state.geo) return;
       
       const { lat, lon } = physicsService.state.geo;
       
       try {
           // 1. Try Radar Service (Fastest, cached, consistent with visuals)
           // Returns feet, convert to meters
           const radarEleFt = terrainRadarService.getTerrainHeight(lat, lon);
           
           if (radarEleFt !== null) {
               physicsService.terrainElevation = radarEleFt * 0.3048;
               return;
           }

           // 2. Fallback to direct Terrain Service fetch
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
  }, [physicsService]);

  // Update scene manager with selected flight parameters
  useEffect(() => {
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
  }, [callsign, selectedDeparture, selectedArrival, aircraftModel, routeDetails, runwayHeadingDeg]);

  // Trigger Physics ILS update when radio frequency changes
  useEffect(() => {
    if (physicsService && isInitialized) {
        const currentFlightPlan = {
            waypoints: routeDetails?.waypoints || flightPlan?.waypoints || [],
            departure: selectedDeparture,
            arrival: selectedArrival
        };
        physicsService.handleRadioTuning(currentFreq, currentFlightPlan);
    }
  }, [currentFreq, isInitialized, physicsService, routeDetails, flightPlan, selectedDeparture, selectedArrival]);

  // Main update loop
  useEffect(() => {
    sceneManager.start();
    let animationId = null;
    let lastTime = performance.now();
    const loop = now => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      
      // Safety clamp to prevent physics explosion on lag spikes (max 0.1s)
      const safeDt = Math.min(dt, 0.1);

      const lastSceneState = sceneManager.getState();
      let physicsState = null;
      // Always update physics if initialized, even if scene says "physics inactive"
      // This allows systems (engines, hydraulics) to update while motion is disabled.
      // Motion is controlled via setMotionEnabled in the useEffect above.
      if (isInitialized) {
        // Use real elapsed time (safeDt) instead of hardcoded 1/60
        // This fixes the "doubled update speed" on high refresh rate monitors (e.g. 120Hz)
        physicsState = updatePhysics(safeDt, now);
      }
      sceneManager.update(dt, physicsState);
      const state = sceneManager.getState();
      setSceneState(state);
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isInitialized, updatePhysics]);

  // ✅ CLEAN ARCHITECTURE: Throttle control handler
  const handleThrustControl = (engineIndex, throttleValue) => {
    console.log('🎯 FlightInProgress: Throttle control received:', {
      engineIndex,
      throttleValue,
      percentage: (throttleValue * 100).toFixed(1) + '%'
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
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>✈️ {t('flight.status.starting')}</div>
          <div style={{ color: '#4ade80' }}>{t('flight.status.init_physics')}</div>
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
          <div style={{ fontSize: '24px', marginBottom: '20px', color: '#ef4444' }}>❌ {t('flight.status.error')}</div>
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
            {t('flight.status.reload')}
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
            {phaseName || t('flight.status.situation')}
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
                {narrative?.title || t('flight.status.awaiting_instructions')}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#D1D5DB',
                  opacity: 0.9,
                  marginBottom: '8px'
                }}
              >
                {narrative?.content || t('flight.status.prepare_takeoff')}
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
                <span>⚠️ {t('flight.status.checklist_incomplete')}</span>
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
                {t('flight.status.active_failures')} ({activeFailures.length})
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
                    <span>{failure.type.toUpperCase()} {failure.data.engineIndex !== undefined ? `ENGINE ${failure.data.engineIndex + 1}` : ''}</span>
                    <span>{failure.isCritical ? t('flight.status.critical') : `${Math.round(failure.progress)}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: 1.3, minWidth: '260px', height: '120px' }}>
          <RadioActionPanel 
            onTransmit={handleRadioTransmit}
            currentStation={currentFreq.toFixed(3)}
            callsign={callsign || 'N12345'}
            flightPlan={activeFlightPlan}
            isChannelBusy={isChannelBusy}
            frequencyType={getFrequencyType(currentFreq)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '4px' }}>
            <LanguageSwitcher />
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

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10 }}>
          <FlightPanelModular
            flightData={{
              ...flightData,
              physicsActive: sceneState.physicsActive,
              narrativeHistory: sceneState.narrativeHistory,
              phaseName: sceneState.phase?.name
            }}
            physicsState={physicsState}
            weatherData={weatherData}
            aircraftModel={aircraftModel}
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
            <span>{flightData.derived?.heading.toFixed(0)}°</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <span style={{ color: '#9ca3af' }}>Lat:</span>
            <span>{flightData.position?.latitude?.toFixed(5)}</span>
            
            <span style={{ color: '#9ca3af' }}>Lon:</span>
            <span>{flightData.position?.longitude?.toFixed(5)}</span>
            
            <span style={{ color: '#9ca3af' }}>Alt:</span>
            <span>{flightData.derived?.altitude_ft?.toFixed(0)} ft</span>
            
            <span style={{ color: '#9ca3af' }}>IAS:</span>
            <span>{flightData.indicatedAirspeed?.toFixed(0)} kts</span>

            <span style={{ color: '#9ca3af' }}>GS:</span>
            <span>{flightData.derived?.airspeed?.toFixed(0)} kts</span>
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
            <span>{flightData.autopilotTargets?.heading?.toFixed(1) || '---'}°</span>
            
            <span style={{ color: '#9ca3af' }}>Hdg Error:</span>
            <span style={{ color: Math.abs(flightData.autopilotDebug?.headingError) > 5 ? '#f59e0b' : '#4ade80' }}>
              {flightData.autopilotDebug?.headingError?.toFixed(2) || '0.00'}°
            </span>
            
            <span style={{ color: '#9ca3af' }}>Tgt Roll:</span>
            <span>{flightData.autopilotDebug?.targetRoll?.toFixed(1) || '0.0'}°</span>
            
            <span style={{ color: '#9ca3af' }}>Act Roll:</span>
            <span>{(flightData.orientation?.phi * 180 / Math.PI).toFixed(1)}°</span>
          </div>

          {flightData.autopilotDebug?.ils?.active && (
            <>
              <div style={{ margin: '8px 0', borderTop: '1px solid rgba(74, 222, 128, 0.2)' }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px 8px' }}>
                <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>ILS STATUS</span>
                <span style={{ color: '#f59e0b', fontWeight: 'bold', textAlign: 'right' }}>{flightData.autopilotDebug.ils.runway}</span>
                
                <span style={{ color: '#9ca3af' }}>Dist:</span>
                <span>{(flightData.autopilotDebug.ils.distAlong / 6076).toFixed(1)} nm</span>
                
                <span style={{ color: '#9ca3af' }}>LOC Err:</span>
                <span style={{ color: Math.abs(flightData.autopilotDebug.ils.distCross) > 50 ? '#ef4444' : '#4ade80' }}>
                  {flightData.autopilotDebug.ils.distCross.toFixed(0)} ft
                </span>

                <span style={{ color: '#9ca3af' }}>G/S Err:</span>
                <span style={{ color: Math.abs(flightData.autopilotDebug.ils.altError) > 50 ? '#ef4444' : '#4ade80' }}>
                  {flightData.autopilotDebug.ils.altError.toFixed(0)} ft
                </span>

                <span style={{ color: '#9ca3af' }}>Tgt Alt:</span>
                <span>{flightData.autopilotDebug.ils.targetAltitude.toFixed(0)} ft</span>
              </div>
            </>
          )}
          
          <div style={{ margin: '8px 0', borderTop: '1px solid rgba(74, 222, 128, 0.2)' }}></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#9ca3af' }}>Next WP:</span>
               <span>
                 {(routeDetails?.waypoints || flightPlan?.waypoints || [])[flightData.currentWaypointIndex]?.name || 
                  (routeDetails?.waypoints || flightPlan?.waypoints || [])[flightData.currentWaypointIndex]?.id || 
                  `IDX ${flightData.currentWaypointIndex}`}
               </span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#9ca3af' }}>WP Index:</span>
               <span>{flightData.currentWaypointIndex} / {(routeDetails?.waypoints || flightPlan?.waypoints || []).length}</span>
             </div>
          </div>
        </div>
      )}

      {isCrashed && (
        <div className="end-scene-overlay">
          <div className="end-scene-content">
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>Flight Ended</div>
            <div style={{ marginBottom: '20px', maxWidth: '420px' }}>
              Placeholder: post-incident summary and narrative debrief will appear here.
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
              Return to Initialization
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightInProgress;
