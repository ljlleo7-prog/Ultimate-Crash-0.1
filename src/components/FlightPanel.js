import React, { useState, useEffect, useRef } from 'react';
import './FlightPanel.css';

const FlightPanel = ({ flightData, onActionRequest }) => {
  const [flightState, setFlightState] = useState({
    // Navigation
    heading: 0,
    trueAirspeed: 0,
    groundSpeed: 0,
    indicatedAirspeed: 0,
    radioFreq: 121.5,
    
    // Flight Pose
    pitch: 0,
    roll: 0,
    verticalSpeed: 0,
    altitude: 0,
    altimeter: 29.92,
    
    // Engine
    engineN1: [0, 0],
    engineN2: [0, 0],
    engineEGT: [0, 0],
    fuel: 10000,
    
    // Systems
    hydraulicPressure: 3000,
    circuitBreakers: {
      engine1: true,
      engine2: true,
      hydraulics: true,
      electrical: true,
      instruments: true
    },
    alarms: [],
    
    // Autopilot
    autopilot: false,
    flightDirector: false,
    altitudeHold: false,
    headingHold: false,
    
    // Central Display
    flightPhase: 'CLIMB',
    nextWaypoint: 'WPT1',
    distanceToWaypoint: 0,
    timeToWaypoint: 0
  });

  const flightDataRef = useRef(flightState);
  
  // Update flight state with real data when flightData prop changes
  useEffect(() => {
    if (flightData) {
      setFlightState(prev => ({
        ...prev,
        ...flightData
      }));
    }
  }, [flightData]);

  // Simulate flight data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setFlightState(prev => ({
        ...prev,
        heading: (prev.heading + 0.1) % 360,
        altitude: prev.altitude + (prev.verticalSpeed / 60),
        trueAirspeed: Math.max(250, prev.trueAirspeed + (Math.random() - 0.5) * 0.5),
        groundSpeed: Math.max(240, prev.groundSpeed + (Math.random() - 0.5) * 0.3),
        indicatedAirspeed: Math.max(240, prev.indicatedAirspeed + (Math.random() - 0.5) * 0.4),
        engineN1: prev.engineN1.map(n1 => Math.max(20, n1 + (Math.random() - 0.5) * 0.1)),
        engineN2: prev.engineN2.map(n2 => Math.max(60, n2 + (Math.random() - 0.5) * 0.05)),
        engineEGT: prev.engineEGT.map(egt => Math.max(300, egt + (Math.random() - 0.5) * 0.2)),
        fuel: Math.max(0, prev.fuel - 10),
        verticalSpeed: prev.verticalSpeed + (Math.random() - 0.5) * 0.1,
        pitch: Math.max(-10, Math.min(10, prev.pitch + (Math.random() - 0.5) * 0.05)),
        roll: Math.max(-30, Math.min(30, prev.roll + (Math.random() - 0.5) * 0.1))
      }));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return React.createElement('div', {
    className: 'flight-panel cockpit-display'
  }, [
    React.createElement('div', {
      key: 'navigation-group',
      className: 'instrument-group navigation-group'
    }, [
      React.createElement('h3', { key: 'nav-title' }, 'Navigation'),
      React.createElement('div', { key: 'nav-data' }, [
        React.createElement('div', { key: 'hdg' }, `HDG: ${flightState.heading.toFixed(1)}°`),
        React.createElement('div', { key: 'tas' }, `TAS: ${flightState.trueAirspeed.toFixed(0)}`),
        React.createElement('div', { key: 'gs' }, `GS: ${flightState.groundSpeed.toFixed(0)}`),
        React.createElement('div', { key: 'ias' }, `IAS: ${flightState.indicatedAirspeed.toFixed(0)}`),
        React.createElement('div', { key: 'radio' }, `RADIO: ${flightState.radioFreq}`)
      ])
    ]),
    
    React.createElement('div', {
      key: 'flight-pose-group',
      className: 'instrument-group flight-pose-group'
    }, [
      React.createElement('h3', { key: 'pose-title' }, 'Flight Pose'),
      React.createElement('div', { key: 'pose-data' }, [
        React.createElement('div', { key: 'pitch' }, `Pitch: ${flightState.pitch.toFixed(1)}°`),
        React.createElement('div', { key: 'roll' }, `Roll: ${flightState.roll.toFixed(1)}°`),
        React.createElement('div', { key: 'vs' }, `V/S: ${flightState.verticalSpeed.toFixed(0)}`),
        React.createElement('div', { key: 'alt' }, `ALT: ${Math.round(flightState.altitude)}`),
        React.createElement('div', { key: 'altimeter' }, `Altimeter: ${flightState.altimeter}`)
      ])
    ]),
    
    React.createElement('div', {
      key: 'engine-group',
      className: 'instrument-group engine-group'
    }, [
      React.createElement('h3', { key: 'engine-title' }, 'Engines'),
      React.createElement('div', { key: 'engine-data' }, [
        React.createElement('div', { key: 'n1' }, `N1: ${flightState.engineN1[0].toFixed(1)}% / ${flightState.engineN1[1].toFixed(1)}%`),
        React.createElement('div', { key: 'n2' }, `N2: ${flightState.engineN2[0].toFixed(1)}% / ${flightState.engineN2[1].toFixed(1)}%`),
        React.createElement('div', { key: 'egt' }, `EGT: ${flightState.engineEGT[0].toFixed(0)}° / ${flightState.engineEGT[1].toFixed(0)}°`),
        React.createElement('div', { key: 'fuel' }, `Fuel: ${Math.round(flightState.fuel)}`)
      ])
    ]),
    
    React.createElement('div', {
      key: 'systems-group',
      className: 'instrument-group systems-group'
    }, [
      React.createElement('h3', { key: 'systems-title' }, 'Systems'),
      React.createElement('div', { key: 'systems-data' }, [
        React.createElement('div', { key: 'hyd' }, `Hydraulic: ${flightState.hydraulicPressure}`),
        React.createElement('div', { key: 'breakers' }, 'Circuit Breakers: OK'),
        React.createElement('div', { key: 'alarms' }, `Alarms: ${flightState.alarms.length}`)
      ])
    ]),
    
    React.createElement('div', {
      key: 'autopilot-group',
      className: 'instrument-group autopilot-group'
    }, [
      React.createElement('h3', { key: 'ap-title' }, 'Autopilot'),
      React.createElement('div', { key: 'ap-data' }, [
        React.createElement('div', { key: 'ap' }, `AP: ${flightState.autopilot ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'fd' }, `FD: ${flightState.flightDirector ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'alt-hold' }, `ALT HOLD: ${flightState.altitudeHold ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'hdg-hold' }, `HDG HOLD: ${flightState.headingHold ? 'ON' : 'OFF'}`)
      ])
    ]),
    
    React.createElement('div', {
      key: 'central-display',
      className: 'instrument-group central-display'
    }, [
      React.createElement('h3', { key: 'central-title' }, 'Central Display'),
      React.createElement('div', { key: 'central-data' }, [
        React.createElement('div', { key: 'phase' }, `Phase: ${flightState.flightPhase}`),
        React.createElement('div', { key: 'waypoint' }, `Next: ${flightState.nextWaypoint}`),
        React.createElement('div', { key: 'distance' }, `Distance: ${flightState.distanceToWaypoint.toFixed(1)}`),
        React.createElement('div', { key: 'time' }, `Time: ${flightState.timeToWaypoint.toFixed(1)}`)
      ])
    ]),
    
    React.createElement('div', {
      key: 'future-actions',
      className: 'future-actions-panel'
    }, [
      React.createElement('h3', { key: 'actions-title' }, 'Future Actions'),
      React.createElement('div', { key: 'actions-list' }, [
        React.createElement('div', { key: 'action1' }, '• Request clearance for approach'),
        React.createElement('div', { key: 'action2' }, '• Check weather at destination'),
        React.createElement('div', { key: 'action3' }, '• Prepare for landing checklist')
      ])
    ]),
    
    React.createElement('div', {
      key: 'typebox',
      className: 'typebox-container'
    }, [
      React.createElement('h3', { key: 'typebox-title' }, 'Input'),
      React.createElement('input', {
        key: 'typebox-input',
        type: 'text',
        placeholder: 'Enter command...',
        className: 'typebox-input'
      })
    ])
  ]);
};

export default FlightPanel;