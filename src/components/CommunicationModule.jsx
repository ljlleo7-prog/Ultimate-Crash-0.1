import React, { useState, useEffect, useRef } from 'react';
import { airportService } from '../services/airportService';

// Knob Component
const FrequencyKnob = ({ label, size, innerSize, onChange, sensitivity = 1, color = '#cbd5e1' }) => {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startRotationRef = useRef(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startRotationRef.current = rotation;
    document.body.style.cursor = 'ns-resize';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaY = startYRef.current - e.clientY;
    const newRotation = startRotationRef.current + deltaY * 2; // 2 degrees per pixel
    setRotation(newRotation);
    
    // Calculate steps based on sensitivity
    // Trigger change every X degrees
    const stepDeg = 20;
    const steps = Math.floor(deltaY / 10); // Every 10 pixels
    
    if (steps !== 0) {
      // We only want to trigger on the transition, but this is continuous.
      // Better: Store last emitted value or use delta since last emit.
    }
  };

  // Simplified approach: just use delta movement to trigger increments
  const lastYRef = useRef(0);
  
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    lastYRef.current = e.clientY;
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = 'ns-resize';
  };
  
  const handleDragMove = (e) => {
    const deltaY = lastYRef.current - e.clientY;
    const threshold = 10; // Pixels to move to trigger a change
    
    if (Math.abs(deltaY) >= threshold) {
      const steps = Math.floor(Math.abs(deltaY) / threshold) * Math.sign(deltaY);
      onChange(steps);
      setRotation(prev => prev + steps * 15); // Rotate visual
      lastYRef.current = e.clientY;
    }
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = 'default';
  };

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px'
    }
  },
    React.createElement('div', {
      onMouseDown: handleDragStart,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `conic-gradient(#334155 0%, ${color} 10%, #334155 20%, #334155 100%)`,
        transform: `rotate(${rotation}deg)`,
        cursor: 'ns-resize',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
        border: '2px solid #475569',
        position: 'relative'
      }
    },
      // Indicator line
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: '0',
          left: '50%',
          width: '2px',
          height: '10px',
          background: '#f8fafc',
          transform: 'translateX(-50%)'
        }
      })
    ),
    React.createElement('span', {
      style: {
        fontSize: '9px',
        color: '#94a3b8',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      }
    }, label)
  );
};

const CommunicationModule = ({ flightState, setRadioFreq, flightPlan }) => {
  const currentFreq = flightState?.radioFreq || 121.500;
  const [connectionStatus, setConnectionStatus] = useState({ name: 'No Signal', type: '', connected: false });

  // Update connection status
  useEffect(() => {
    const lat = flightState?.latitude;
    const lon = flightState?.longitude;
    
    if (lat === undefined || lon === undefined) return;

    // 1000km is approximately 540 nautical miles
    const detectionRadiusNm = 540;
    
    // Check nearby airports
    const nearbyAirports = airportService.getAirportsWithinRadius(lat, lon, detectionRadiusNm);
    
    let found = null;
    
    // 1. Check Airports
    for (const airport of nearbyAirports) {
      if (airport.frequencies) {
        // Use a small epsilon for float comparison
        const match = airport.frequencies.find(f => Math.abs(f.frequency - currentFreq) < 0.01);
        if (match) {
          found = { 
            name: airport.name, 
            type: `${match.type} (${airport.iata})`, 
            connected: true 
          };
          break;
        }
      }
    }
    
    // 2. Check Waypoints
    if (!found && flightPlan) {
      // Check Departure
      if (flightPlan.departure && flightPlan.departure.frequency) {
         if (Math.abs(flightPlan.departure.frequency - currentFreq) < 0.01) {
             found = { name: flightPlan.departure.name, type: 'Departure', connected: true };
         }
      }
      
      // Check Arrival
      if (!found && flightPlan.arrival && flightPlan.arrival.frequency) {
         if (Math.abs(flightPlan.arrival.frequency - currentFreq) < 0.01) {
             found = { name: flightPlan.arrival.name, type: 'Arrival', connected: true };
         }
      }

      // Check standard waypoints
      if (!found && flightPlan.waypoints) {
        for (const wp of flightPlan.waypoints) {
          if (wp.frequency && Math.abs(wp.frequency - currentFreq) < 0.01) {
             found = { name: wp.name, type: 'Waypoint ATC', connected: true };
             break;
          }
        }
      }
    }

    if (found) {
      setConnectionStatus(found);
    } else {
      setConnectionStatus({ name: 'No Signal', type: '', connected: false });
    }
    
  }, [currentFreq, flightState?.latitude, flightState?.longitude, flightPlan]);

  // Handlers for frequency change
  const handleCoarseChange = (steps) => {
    // Just clamp the MHz part
    let mhz = Math.floor(currentFreq);
    let khz = currentFreq - mhz;
    
    mhz += steps;
    if (mhz < 118) mhz = 118;
    if (mhz > 136) mhz = 136;
    
    setRadioFreq(Math.round((mhz + khz) * 1000) / 1000);
  };

  const handleFineChange = (steps) => {
    // 25 kHz steps = 0.025 MHz
    let newFreq = currentFreq + (steps * 0.025);
    
    // Handle floating point errors
    newFreq = Math.round(newFreq * 1000) / 1000;
    
    // Check bounds
    if (newFreq < 118.000) newFreq = 118.000;
    if (newFreq > 136.975) newFreq = 136.975;
    
    setRadioFreq(newFreq);
  };

  return React.createElement('div', {
    className: 'communication-module',
    style: {
      padding: '8px',
      background: 'rgba(15, 23, 42, 0.9)',
      borderRadius: '8px',
      border: '1px solid #334155',
      display: 'flex',
      flexDirection: 'row',
      gap: '12px',
      alignItems: 'center',
      // height: 'fit-content', // Allow stretching
      minHeight: '84px', // Match Autopilot height roughly
      flex: 1 // Take remaining space
    }
  },
    // Left: Communication Details
    React.createElement('div', {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 8px',
        borderRight: '1px solid #334155',
        height: '100%',
        color: '#64748b'
      }
    },
      React.createElement('div', { style: { fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' } }, 'ACTIVE COMM'),
      React.createElement('div', { 
        style: { 
          fontSize: '12px', 
          color: connectionStatus.connected ? '#38bdf8' : '#64748b',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '180px'
        } 
      }, connectionStatus.name),
      React.createElement('div', { 
        style: { 
          fontSize: '11px', 
          marginTop: '4px',
          color: connectionStatus.connected ? '#4ade80' : '#64748b'
        } 
      }, connectionStatus.connected ? `${connectionStatus.type} - Connected` : 'Searching...')
    ),

    // Right: Frequency Controls
    React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }
    },
      // Frequency Display
      React.createElement('div', {
        style: {
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '4px',
          padding: '4px 8px',
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#38bdf8',
          fontWeight: 'bold',
          letterSpacing: '1px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
          minWidth: '100px',
          textAlign: 'center'
        }
      }, currentFreq.toFixed(3)),

      // Knobs Row
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }
      },
        React.createElement(FrequencyKnob, {
          label: 'MHz',
          size: 32,
          onChange: handleCoarseChange,
          color: '#94a3b8'
        }),
        React.createElement(FrequencyKnob, {
          label: 'kHz',
          size: 24,
          onChange: handleFineChange,
          color: '#cbd5e1'
        })
      )
    )
  );
};

export default CommunicationModule;
