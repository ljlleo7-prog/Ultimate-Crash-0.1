import React, { useState, useEffect } from 'react';
import FlightPanel from './FlightPanel.jsx';
import FlightPhysicsDashboard from './FlightPhysicsDashboard.jsx';
import PIDAutopilotPanel from './PIDAutopilotPanel.jsx';
import { useAircraftPhysics } from '../hooks/useAircraftPhysics.js';

const FlightInProgress = ({
  callsign, aircraftModel, difficulty, selectedDeparture, selectedArrival, flightPlan,
  airline, pax, payload, fuelReserve, cruiseHeight, useRandomTime, timeZulu, useRandomSeason, season,
  handleResetFlight, formatDistance, formatFlightTime, formatFuel,
  weatherData, failureType, crewCount
}) => {
  // ✅ INTEGRATE REAL PHYSICS ENGINE
  const [aircraftConfig, setAircraftConfig] = useState(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [controlInputs, setControlInputs] = useState({
    throttle: 47, // Start at cruise power
    pitch: 3.0,   // +3° pitch for cruise
    roll: 0,
    yaw: 0
  });

  // ✅ INITIALIZE AIRCRAFT CONFIGURATION
  useEffect(() => {
    if (aircraftModel) {
      // Load aircraft configuration from database
      const config = {
        model: aircraftModel,
        mass: 73300, // Boeing 737-800 typical operating weight
        payload: payload || 15000,
        fuelWeight: fuelReserve ? fuelReserve * 26020 : 0.7 * 26020 // 70% fuel
      };
      setAircraftConfig(config);
      console.log('🛩️ FlightInProgress: Aircraft config loaded:', config);
    }
  }, [aircraftModel, payload, fuelReserve]);

  // ✅ PHYSICS ENGINE HOOK INTEGRATION
  const {
    flightData: physicsFlightData,
    physicsState,
    isInitialized,
    error,
    debugData,
    setThrottle,
    setPitch,
    setRoll,
    setYaw,
    resetAircraft
  } = useAircraftPhysics(aircraftConfig, physicsEnabled);

  // ✅ UPDATE CONTROL INPUTS
  const handleControlChange = (controlType, value) => {
    const newInputs = { ...controlInputs };
    newInputs[controlType] = value;
    setControlInputs(newInputs);
    
    // Apply to physics engine
    switch (controlType) {
      case 'throttle':
        setThrottle(value);
        break;
      case 'pitch':
        setPitch(value);
        break;
      case 'roll':
        setRoll(value);
        break;
      case 'yaw':
        setYaw(value);
        break;
    }
  };

  // ✅ HANDLE PHYSICS RESET
  const handlePhysicsReset = () => {
    resetAircraft();
    setControlInputs({
      throttle: 47,
      pitch: 3.0,
      roll: 0,
      yaw: 0
    });
  };

  // ✅ GENERATE RANDOM TIME/SEASON
  const generateRandomTime = () => {
    const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
    const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
    return `${hours}:${minutes}Z`;
  };

  const generateRandomSeason = () => {
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    return seasons[Math.floor(Math.random() * seasons.length)];
  };

  // ✅ FALLBACK FLIGHT DATA (when physics not initialized)
  const fallbackFlightData = {
    heading: 245,
    trueAirspeed: 480,
    groundSpeed: 465,
    indicatedAirspeed: 250,
    radioFreq: 121.5,
    pitch: 2.5,
    roll: 0.5,
    verticalSpeed: 1200,
    altitude: 28000,
    altimeter: 29.92,
    engineN1: [89.2, 88.7],
    engineN2: [95.1, 94.8],
    engineEGT: [625, 618],
    fuel: 8500,
    hydraulicPressure: 2950,
    circuitBreakers: {
      engine1: true,
      engine2: true,
      hydraulics: true,
      electrical: true,
      instruments: true
    },
    alarms: [],
    autopilot: true,
    flightDirector: true,
    altitudeHold: true,
    headingHold: true,
    flightPhase: 'CLIMB',
    nextWaypoint: selectedArrival ? selectedArrival.iata : 'DEST',
    distanceToWaypoint: flightPlan ? flightPlan.distance.nauticalMiles : 0,
    timeToWaypoint: flightPlan ? flightPlan.time : 0
  };

  // ✅ USE PHYSICS DATA OR FALLBACK
  const activeFlightData = isInitialized && physicsFlightData ? physicsFlightData : fallbackFlightData;

  return React.createElement('div', { className: 'App' }, [
    // ✅ HEADER WITH PHYSICS STATUS
    React.createElement('header', { key: 'header', className: 'app-header' }, [
      React.createElement('h1', { key: 'title' }, 'Flight in Progress - ', callsign || 'Unnamed Flight'),
      React.createElement('p', { key: 'subtitle' }, 'Difficulty: ', difficulty.toUpperCase(), ' | Aircraft: ', aircraftModel),
      React.createElement('div', { key: 'physics-status', className: 'physics-status' }, [
        React.createElement('span', { 
          key: 'physics-indicator',
          className: `physics-indicator ${isInitialized ? 'active' : 'inactive'}`,
          style: { 
            color: isInitialized ? '#10B981' : '#EF4444',
            fontSize: '0.9em',
            marginLeft: '10px'
          }
        }, isInitialized ? '🛩️ PHYSICS ACTIVE' : '⚠️ PHYSICS OFFLINE'),
        React.createElement('button', { 
          key: 'physics-reset-btn',
          onClick: handlePhysicsReset,
          style: { 
            marginLeft: '10px',
            padding: '5px 10px',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, 'Reset Physics')
      ]),
      React.createElement('button', { 
        key: 'reset-btn',
        onClick: handleResetFlight, 
        className: 'reset-btn',
        style: {
          marginLeft: '10px',
          padding: '5px 10px',
          backgroundColor: '#EF4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      }, 'Reset Flight')
    ]),

    React.createElement('main', { key: 'main', className: 'app-main' }, [
      React.createElement('div', { key: 'flight-progress', className: 'flight-in-progress' }, [
        React.createElement('div', { key: 'summary', className: 'flight-summary' }, [
          React.createElement('div', { key: 'route', className: 'summary-item' }, [
            React.createElement('strong', { key: 'route-label' }, 'Route:'),
            ' ', selectedDeparture.iata, ' → ', selectedArrival.iata
          ]),
          React.createElement('div', { key: 'distance', className: 'summary-item' }, [
            React.createElement('strong', { key: 'distance-label' }, 'Distance:'),
            ' ', flightPlan ? formatDistance(flightPlan.distance.nauticalMiles) : 'Calculating...'
          ]),
          React.createElement('div', { key: 'time', className: 'summary-item' }, [
            React.createElement('strong', { key: 'time-label' }, 'Flight Time:'),
            ' ', flightPlan ? formatFlightTime(flightPlan.time) : 'Calculating...'
          ]),
          React.createElement('div', { key: 'fuel', className: 'summary-item' }, [
            React.createElement('strong', { key: 'fuel-label' }, 'Fuel:'),
            ' ', flightPlan ? formatFuel(flightPlan.fuel) : 'Calculating...'
          ])
        ]),
        
        // ✅ INTEGRATED FLIGHT PHYSICS DASHBOARD
        React.createElement(FlightPhysicsDashboard, {
          key: 'physics-dashboard',
          flightData: activeFlightData,
          physicsState: physicsState,
          debugData: debugData,
          isInitialized: isInitialized,
          aircraftConfig: aircraftConfig
        }),
        
        // ✅ PID AUTOPILOT CONTROL PANEL
        React.createElement(PIDAutopilotPanel, {
          key: 'pid-autopilot',
          physicsService: physicsState,
          onAutopilotToggle: (enabled) => {
            console.log('Autopilot toggled:', enabled);
          }
        }),
        
        // Flight Panel Cockpit Display (using physics data)
        React.createElement(FlightPanel, {
          key: 'cockpit-display',
          flightData: activeFlightData,
          aircraftModel: aircraftModel,
          onActionRequest: (action) => {
            console.log('Action requested:', action);
            if (action === 'reset-to-initiation') {
              handleResetFlight();
            }
          }
        }),
        
        // ✅ PHYSICS CONTROL PANEL
        React.createElement('div', { key: 'physics-controls', className: 'physics-controls', style: {
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#1F2937',
          borderRadius: '8px',
          border: '1px solid #374151'
        }}, [
          React.createElement('h3', { key: 'controls-title', style: { color: '#60A5FA', marginBottom: '15px' } }, '🎮 Physics Controls'),
          
          // Throttle Control
          React.createElement('div', { key: 'throttle-control', style: { marginBottom: '15px' }}, [
            React.createElement('label', { 
              key: 'throttle-label',
              style: { color: '#D1D5DB', display: 'block', marginBottom: '5px' }
            }, `Throttle: ${controlInputs.throttle}%`),
            React.createElement('input', {
              key: 'throttle-slider',
              type: 'range',
              min: '0',
              max: '100',
              value: controlInputs.throttle,
              onChange: (e) => handleControlChange('throttle', parseInt(e.target.value)),
              style: { width: '100%' }
            })
          ]),
          
          // Pitch Control
          React.createElement('div', { key: 'pitch-control', style: { marginBottom: '15px' }}, [
            React.createElement('label', { 
              key: 'pitch-label',
              style: { color: '#D1D5DB', display: 'block', marginBottom: '5px' }
            }, `Pitch: ${controlInputs.pitch.toFixed(1)}°`),
            React.createElement('input', {
              key: 'pitch-slider',
              type: 'range',
              min: '-20',
              max: '20',
              step: '0.1',
              value: controlInputs.pitch,
              onChange: (e) => handleControlChange('pitch', parseFloat(e.target.value)),
              style: { width: '100%' }
            })
          ]),
          
          // Roll Control
          React.createElement('div', { key: 'roll-control', style: { marginBottom: '15px' }}, [
            React.createElement('label', { 
              key: 'roll-label',
              style: { color: '#D1D5DB', display: 'block', marginBottom: '5px' }
            }, `Roll: ${controlInputs.roll.toFixed(1)}°`),
            React.createElement('input', {
              key: 'roll-slider',
              type: 'range',
              min: '-45',
              max: '45',
              step: '0.1',
              value: controlInputs.roll,
              onChange: (e) => handleControlChange('roll', parseFloat(e.target.value)),
              style: { width: '100%' }
            })
          ]),
          
          // Yaw Control
          React.createElement('div', { key: 'yaw-control', style: { marginBottom: '15px' }}, [
            React.createElement('label', { 
              key: 'yaw-label',
              style: { color: '#D1D5DB', display: 'block', marginBottom: '5px' }
            }, `Yaw: ${controlInputs.yaw.toFixed(1)}°`),
            React.createElement('input', {
              key: 'yaw-slider',
              type: 'range',
              min: '-15',
              max: '15',
              step: '0.1',
              value: controlInputs.yaw,
              onChange: (e) => handleControlChange('yaw', parseFloat(e.target.value)),
              style: { width: '100%' }
            })
          ])
        ]),
        
        React.createElement('div', { key: 'details', className: 'flight-details' }, [
          React.createElement('h3', { key: 'params-title' }, 'Flight Parameters'),
          React.createElement('div', { key: 'params-grid', className: 'parameters-grid' }, [
            React.createElement('div', { key: 'airline', className: 'param-item' }, [
              React.createElement('strong', { key: 'airline-label' }, 'Airline:'),
              ' ', airline || 'Not specified'
            ]),
            React.createElement('div', { key: 'callsign', className: 'param-item' }, [
              React.createElement('strong', { key: 'callsign-label' }, 'Callsign:'),
              ' ', callsign || 'Not specified'
            ]),
            React.createElement('div', { key: 'pax', className: 'param-item' }, [
              React.createElement('strong', { key: 'pax-label' }, 'PAX:'),
              ' ', pax
            ]),
            React.createElement('div', { key: 'payload', className: 'param-item' }, [
              React.createElement('strong', { key: 'payload-label' }, 'Payload:'),
              ' ', payload, ' kg'
            ]),
            React.createElement('div', { key: 'fuel-reserve', className: 'param-item' }, [
              React.createElement('strong', { key: 'fuel-reserve-label' }, 'Fuel Reserve:'),
              ' ', fuelReserve * 100, '%'
            ]),
            React.createElement('div', { key: 'cruise', className: 'param-item' }, [
              React.createElement('strong', { key: 'cruise-label' }, 'Cruise Height:'),
              ' ', cruiseHeight, ' ft'
            ]),
            React.createElement('div', { key: 'time-zulu', className: 'param-item' }, [
              React.createElement('strong', { key: 'time-zulu-label' }, 'Time (Zulu):'),
              ' ', useRandomTime ? generateRandomTime() : timeZulu
            ]),
            React.createElement('div', { key: 'season', className: 'param-item' }, [
              React.createElement('strong', { key: 'season-label' }, 'Season:'),
              ' ', useRandomSeason ? generateRandomSeason() : season
            ])
          ])
        ]),
        
        // Weather and Failure Conditions Display
        React.createElement('div', { key: 'conditions', className: 'conditions-display' }, [
          React.createElement('h3', { key: 'conditions-title' }, 'Weather & Failure Conditions'),
          React.createElement('div', { key: 'conditions-grid', className: 'conditions-grid' }, [
            React.createElement('div', { key: 'weather', className: 'condition-item' }, [
              React.createElement('strong', { key: 'weather-label' }, 'Weather:'),
              ' ', weatherData?.type ? weatherData.type.charAt(0).toUpperCase() + weatherData.type.slice(1) : 'Clear',
              weatherData?.windSpeed ? `, Wind: ${weatherData.windSpeed} kts` : '',
              weatherData?.visibility ? `, Visibility: ${weatherData.visibility} mi` : ''
            ]),
            React.createElement('div', { key: 'failure', className: 'condition-item' }, [
              React.createElement('strong', { key: 'failure-label' }, 'Failure Type:'),
              ' ', failureType ? failureType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'None'
            ]),
            React.createElement('div', { key: 'crew', className: 'condition-item' }, [
              React.createElement('strong', { key: 'crew-label' }, 'Crew Count:'),
              ' ', crewCount || 2
            ])
          ])
        ])
      ])
    ])
  ]);
};

export default FlightInProgress;