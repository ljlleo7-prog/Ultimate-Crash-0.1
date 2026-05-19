import React from 'react';
import NavigationPanel from '../NavigationPanel';

const BoeingRadar = ({ flightState, selectedArrival, flightPlan, npcs = [], weatherData, efisFontFamily }) => (
  <NavigationPanel
    flightState={flightState}
    selectedArrival={selectedArrival}
    flightPlan={flightPlan}
    npcs={npcs}
    weatherData={weatherData}
    theme={{
      panelBackground: '#050607',
      panelBorder: '#555',
      infoColor: '#7CFF7C',
      accentColor: '#d8b4fe',
      headingBorder: '#7CFF7C',
      headingText: '#ffffff',
      backgroundFill: 'rgba(0, 20, 0, 0.18)',
      outerRing: '#00ff00',
      ringColor: 'rgba(0,255,0,0.45)',
      centerline: '#ffffff',
      airportColor: '#00ffff',
      routeColor: '#d8b4fe',
      targetColor: '#d8b4fe',
      controlBorder: '#7CFF7C',
      fontFamily: efisFontFamily || 'monospace'
    }}
    showRangeRings={false}
    planeStyle="triangle"
  />
);

export default BoeingRadar;
