import React, { useState, useEffect, useRef } from 'react';
import './FlightPanel.css';

const FlightPanel = ({ flightData, onActionRequest }) => {
  // Static flight state for testing - no live updates
  const flightState = {
    // Navigation
    heading: 270,
    trueAirspeed: 450,
    groundSpeed: 430,
    indicatedAirspeed: 280,
    radioFreq: 121.5,
    
    // Flight Pose
    pitch: 2.5,
    roll: 0.5,
    verticalSpeed: 1200,
    altitude: 35000,
    altimeter: 29.92,
    
    // Engine
    engineN1: [85.2, 85.1],
    engineN2: [95.3, 95.2],
    engineEGT: [650, 645],
    fuel: 8500,
    
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
    autopilot: true,
    flightDirector: true,
    altitudeHold: true,
    headingHold: true,
    
    // Central Display
    flightPhase: 'CRUISE',
    nextWaypoint: 'WPT3',
    distanceToWaypoint: 125.4,
    timeToWaypoint: 18.2
  };

  return React.createElement('div', {
    className: 'flight-panel cockpit-display'
  }, 
    React.createElement('div', {
      key: 'navigation-group',
      className: 'instrument-group navigation-group'
    }, 
      React.createElement('h3', { key: 'nav-title' }, 'Navigation'),
      React.createElement('div', { key: 'nav-data' }, 
        React.createElement('div', { key: 'hdg' }, `HDG: ${flightState.heading.toFixed(1)}°`),
        React.createElement('div', { key: 'tas' }, `TAS: ${flightState.trueAirspeed.toFixed(0)}`),
        React.createElement('div', { key: 'gs' }, `GS: ${flightState.groundSpeed.toFixed(0)}`),
        React.createElement('div', { key: 'ias' }, `IAS: ${flightState.indicatedAirspeed.toFixed(0)}`),
        React.createElement('div', { key: 'radio' }, `RADIO: ${flightState.radioFreq}`)
      )
    ),
    
    React.createElement('div', {
      key: 'flight-pose-group',
      className: 'instrument-group flight-pose-group'
    }, 
      React.createElement('h3', { key: 'pose-title' }, 'Flight Pose'),
      React.createElement('div', { key: 'pose-data' }, 
        React.createElement('div', { key: 'pitch' }, `Pitch: ${flightState.pitch.toFixed(1)}°`),
        React.createElement('div', { key: 'roll' }, `Roll: ${flightState.roll.toFixed(1)}°`),
        React.createElement('div', { key: 'vs' }, `V/S: ${flightState.verticalSpeed.toFixed(0)}`),
        React.createElement('div', { key: 'alt' }, `ALT: ${Math.round(flightState.altitude)}`),
        React.createElement('div', { key: 'altimeter' }, `Altimeter: ${flightState.altimeter}`)
      )
    ),
    
    React.createElement('div', {
      key: 'engine-group',
      className: 'instrument-group engine-group'
    }, 
      React.createElement('h3', { key: 'engine-title' }, 'Engines'),
      React.createElement('div', { key: 'engine-data' }, 
        React.createElement('div', { key: 'n1' }, `N1: ${flightState.engineN1[0].toFixed(1)}% / ${flightState.engineN1[1].toFixed(1)}%`),
        React.createElement('div', { key: 'n2' }, `N2: ${flightState.engineN2[0].toFixed(1)}% / ${flightState.engineN2[1].toFixed(1)}%`),
        React.createElement('div', { key: 'egt' }, `EGT: ${flightState.engineEGT[0].toFixed(0)}° / ${flightState.engineEGT[1].toFixed(0)}°`),
        React.createElement('div', { key: 'fuel' }, `Fuel: ${Math.round(flightState.fuel)}`)
      )
    ),
    
    React.createElement('div', {
      key: 'systems-group',
      className: 'instrument-group systems-group'
    }, 
      React.createElement('h3', { key: 'systems-title' }, 'Systems'),
      React.createElement('div', { key: 'systems-data' }, 
        React.createElement('div', { key: 'hyd' }, `Hydraulic: ${flightState.hydraulicPressure}`),
        React.createElement('div', { key: 'breakers' }, 'Circuit Breakers: OK'),
        React.createElement('div', { key: 'alarms' }, `Alarms: ${flightState.alarms.length}`)
      )
    ),
    
    React.createElement('div', {
      key: 'autopilot-group',
      className: 'instrument-group autopilot-group'
    }, 
      React.createElement('h3', { key: 'ap-title' }, 'Autopilot'),
      React.createElement('div', { key: 'ap-data' }, 
        React.createElement('div', { key: 'ap' }, `AP: ${flightState.autopilot ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'fd' }, `FD: ${flightState.flightDirector ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'alt-hold' }, `ALT HOLD: ${flightState.altitudeHold ? 'ON' : 'OFF'}`),
        React.createElement('div', { key: 'hdg-hold' }, `HDG HOLD: ${flightState.headingHold ? 'ON' : 'OFF'}`)
      )
    ),
    
    React.createElement('div', {
      key: 'central-display',
      className: 'instrument-group central-display'
    }, 
      React.createElement('h3', { key: 'central-title' }, 'Central Display'),
      React.createElement('div', { key: 'central-data' }, 
        React.createElement('div', { key: 'phase' }, `Phase: ${flightState.flightPhase}`),
        React.createElement('div', { key: 'waypoint' }, `Next: ${flightState.nextWaypoint}`),
        React.createElement('div', { key: 'distance' }, `Distance: ${flightState.distanceToWaypoint.toFixed(1)}`),
        React.createElement('div', { key: 'time' }, `Time: ${flightState.timeToWaypoint.toFixed(1)}`)
      )
    ),
    
    React.createElement('div', {
      key: 'future-actions',
      className: 'future-actions-panel'
    }, 
      React.createElement('h3', { key: 'actions-title' }, 'Future Actions'),
      React.createElement('div', { key: 'actions-list' }, 
        React.createElement('div', { key: 'action1' }, '• Request clearance for approach'),
        React.createElement('div', { key: 'action2' }, '• Check weather at destination'),
        React.createElement('div', { key: 'action3' }, '• Prepare for landing checklist')
      )
    ),
    
    React.createElement('div', {
      key: 'typebox',
      className: 'typebox-container'
    }, 
      React.createElement('h3', { key: 'typebox-title' }, 'Input'),
      React.createElement('input', {
        key: 'typebox-input',
        type: 'text',
        placeholder: 'Enter command...',
        className: 'typebox-input'
      })
    )
  );
};

export default FlightPanel;