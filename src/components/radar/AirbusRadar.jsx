import React from 'react';
import NavigationPanel from '../NavigationPanel';

const AirbusRadar = ({ flightState, selectedArrival, flightPlan, npcs = [], weatherData, efisFontFamily }) => (
  <NavigationPanel
    flightState={flightState}
    selectedArrival={selectedArrival}
    flightPlan={flightPlan}
    npcs={npcs}
    weatherData={weatherData}
    theme={{
      panelBackground: 'linear-gradient(135deg, #080c10 0%, #1a2030 100%)',
      panelBorder: '#666',
      infoColor: '#ffffff',
      accentColor: '#d8b4fe',
      headingBorder: '#ffffff',
      headingText: '#ffffff',
      backgroundFill: 'rgba(0, 10, 20, 0.2)',
      outerRing: '#ffffff',
      ringColor: 'rgba(255,255,255,0.5)',
      centerline: '#ffffff',
      airportColor: '#00ffff',
      routeColor: '#d8b4fe',
      targetColor: '#d8b4fe',
      controlBorder: '#ffffff',
      fontFamily: efisFontFamily || 'Courier New, monospace'
    }}
    showRangeRings={true}
    planeStyle="airbus"
  />
);

export default AirbusRadar;
