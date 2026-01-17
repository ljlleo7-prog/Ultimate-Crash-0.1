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

const CommunicationModule = ({ flightState, setRadioFreq, flightPlan, radioMessages = [] }) => {
  const currentFreq = flightState?.radioFreq || 121.500;
  const [connectionStatus, setConnectionStatus] = useState({ name: 'No Signal', type: '', connected: false });
  const [availableStations, setAvailableStations] = useState([]);
  const [nearbyAirports, setNearbyAirports] = useState([]);
  const [referencePos, setReferencePos] = useState(null);
  const [viewMode, setViewMode] = useState('LOG'); // 'LOG' or 'SIGNALS'
  const logContainerRef = useRef(null);
  const lastCheckPos = useRef({ lat: null, lon: null });

  // Auto-scroll log
  useEffect(() => {
    if (viewMode === 'LOG' && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [radioMessages, viewMode]);


  // 1. Optimize: Update nearby airports only when position changes significantly
  useEffect(() => {
    const lat = flightState?.latitude;
    const lon = flightState?.longitude;
    
    if (lat === undefined || lon === undefined) return;

    // Initialize or check distance
    if (lastCheckPos.current.lat !== null) {
      const dist = Math.sqrt(
        Math.pow(lat - lastCheckPos.current.lat, 2) + 
        Math.pow(lon - lastCheckPos.current.lon, 2)
      );
      // 0.1 degrees is roughly 11km. Update if moved more than that.
      if (dist < 0.1) return;
    }

    lastCheckPos.current = { lat, lon };
    
    // 500nm detection radius as requested
    const detectionRadiusNm = 500;
    const airports = airportService.getAirportsWithinRadius(lat, lon, detectionRadiusNm);
    
    // Calculate distance for airports immediately
    const airportsWithDist = airports.map(ap => ({
      ...ap,
      distance: airportService.calculateDistance(
        { latitude: lat, longitude: lon },
        { latitude: ap.latitude, longitude: ap.longitude }
      )
    }));

    setNearbyAirports(airportsWithDist);
    setReferencePos({ lat, lon });
    
  }, [flightState?.latitude, flightState?.longitude]);

  // 2. Build available stations list when airports or flight plan changes
  useEffect(() => {
    const stations = [];
    const currentPos = referencePos || { lat: flightState?.latitude, lon: flightState?.longitude };

    // Add Airports
    for (const airport of nearbyAirports) {
      if (airport.frequencies) {
        airport.frequencies.forEach(f => {
          stations.push({
            name: airport.iata,
            type: f.type,
            frequency: f.frequency,
            desc: `${airport.iata} ${f.type}`,
            distance: airport.distance // Use pre-calculated distance
          });
        });
      }
    }
    
    // Add Waypoints
    if (flightPlan && currentPos.lat !== undefined) {
      const getDist = (target) => {
        if (target.latitude && target.longitude) {
          return airportService.calculateDistance(
            { latitude: currentPos.lat, longitude: currentPos.lon },
            { latitude: target.latitude, longitude: target.longitude }
          );
        }
        return 99999; // Far away if no coords
      };

      // Departure
      if (flightPlan.departure && flightPlan.departure.frequency) {
         stations.push({
           name: flightPlan.departure.name,
           type: 'Departure',
           frequency: flightPlan.departure.frequency,
           desc: `DEP ${flightPlan.departure.name}`,
           distance: getDist(flightPlan.departure)
         });
      }
      
      // Arrival
      if (flightPlan.arrival && flightPlan.arrival.frequency) {
         stations.push({
           name: flightPlan.arrival.name,
           type: 'Arrival',
           frequency: flightPlan.arrival.frequency,
           desc: `ARR ${flightPlan.arrival.name}`,
           distance: getDist(flightPlan.arrival)
         });
      }

      // Waypoints
      if (flightPlan.waypoints) {
        for (const wp of flightPlan.waypoints) {
          if (wp.frequency) {
            stations.push({
              name: wp.name,
              type: 'Waypoint ATC',
              frequency: wp.frequency,
              desc: `${wp.name}`,
              distance: getDist(wp)
            });
          }
        }
      }
    }

    // Sort and deduplicate
    const uniqueStations = [];
    const seen = new Set();
    
    // Sort by distance first
    stations.sort((a, b) => (a.distance || 99999) - (b.distance || 99999));

    stations.forEach(s => {
      const key = `${s.desc}-${s.frequency}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStations.push(s);
      }
    });
    
    // Take nearest 3
    const nearest3 = uniqueStations.slice(0, 3);
    
    // Sort by frequency for display? Or keep by distance?
    // User said "only display the nearest 3". Usually implies seeing them in order of distance or just the subset.
    // I'll keep them sorted by distance as that's most useful.
    setAvailableStations(nearest3);
  }, [nearbyAirports, flightPlan, referencePos]);

  // 3. Check connection status (fast, runs on freq change)
  useEffect(() => {
    let found = null;
    
    // Use a small epsilon for float comparison
    const match = availableStations.find(s => Math.abs(s.frequency - currentFreq) < 0.01);
    
    if (match) {
      found = { 
        name: match.name, 
        type: match.type, 
        connected: true 
      };
    }

    if (found) {
      setConnectionStatus(found);
    } else {
      setConnectionStatus({ name: 'No Signal', type: '', connected: false });
    }
    
  }, [currentFreq, availableStations]);

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
        width: '140px',
        flexShrink: 0,
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
          maxWidth: '100%'
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

    // Middle: Communication Log & Nearby Signals
    React.createElement('div', {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #334155',
        height: '100%',
        padding: '0', // Removed padding to let tabs flush
        overflow: 'hidden',
        position: 'relative'
      }
    },
      // Tabs Header
      React.createElement('div', {
        style: {
          display: 'flex',
          borderBottom: '1px solid #334155',
          background: 'rgba(15, 23, 42, 0.5)'
        }
      },
        ['LOG', 'SIGNALS'].map(mode => 
          React.createElement('button', {
            key: mode,
            onClick: () => setViewMode(mode),
            style: {
              flex: 1,
              background: viewMode === mode ? 'transparent' : 'rgba(30, 41, 59, 0.5)',
              border: 'none',
              borderBottom: viewMode === mode ? '2px solid #38bdf8' : 'none',
              color: viewMode === mode ? '#38bdf8' : '#64748b',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '4px',
              cursor: 'pointer'
            }
          }, mode)
        )
      ),

      // Content
      viewMode === 'SIGNALS' ? (
        // Existing Nearby Signals Logic
        React.createElement('div', {
          className: 'no-scrollbar',
          style: {
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '4px 8px'
          }
        },
          availableStations.length > 0 ? availableStations.map((station, idx) => 
            React.createElement('div', {
              key: idx,
              onClick: () => setRadioFreq(station.frequency),
              style: {
                fontSize: '10px',
                color: Math.abs(station.frequency - currentFreq) < 0.01 ? '#4ade80' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2px 4px',
                borderRadius: '2px',
                backgroundColor: Math.abs(station.frequency - currentFreq) < 0.01 ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                transition: 'background-color 0.2s'
              },
              onMouseEnter: (e) => {
                 if (Math.abs(station.frequency - currentFreq) >= 0.01) e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
              },
              onMouseLeave: (e) => {
                 if (Math.abs(station.frequency - currentFreq) >= 0.01) e.currentTarget.style.backgroundColor = 'transparent';
              }
            },
              React.createElement('span', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' } }, station.desc),
              React.createElement('span', { style: { fontFamily: 'monospace' } }, station.frequency.toFixed(3))
            )
          ) : React.createElement('div', { style: { fontSize: '10px', color: '#475569', fontStyle: 'italic', padding: '4px' } }, 'No signals detected')
        )
      ) : (
        // LOG VIEW
        React.createElement('div', {
          ref: logContainerRef,
          className: 'no-scrollbar',
          style: {
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '8px'
          }
        },
          radioMessages.length > 0 ? radioMessages.map((msg, idx) => 
            React.createElement('div', {
              key: idx,
              style: {
                alignSelf: msg.sender === 'Pilot' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '4px 8px',
                borderRadius: '4px',
                background: msg.sender === 'Pilot' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: msg.sender === 'Pilot' ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(148, 163, 184, 0.2)',
                color: msg.sender === 'Pilot' ? '#bae6fd' : '#e2e8f0',
                fontSize: '11px',
                lineHeight: '1.4'
              }
            },
              React.createElement('div', { style: { fontSize: '9px', opacity: 0.7, marginBottom: '2px' } }, msg.sender),
              msg.text
            )
          ) : React.createElement('div', { style: { fontSize: '10px', color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: '10px' } }, 'Radio silent')
        )
      )
    ),

    // Right: Frequency Controls (Compact)
    React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        width: '90px' // Fixed smaller width
      }
    },
      // Frequency Display
      React.createElement('div', {
        style: {
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '4px',
          padding: '2px 6px',
          fontFamily: 'monospace',
          fontSize: '14px', // Smaller font
          color: '#38bdf8',
          fontWeight: 'bold',
          letterSpacing: '1px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
          minWidth: '80px',
          textAlign: 'center'
        }
      }, currentFreq.toFixed(3)),

      // Knobs Row
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end'
        }
      },
        React.createElement(FrequencyKnob, {
          label: 'MHz',
          size: 24, // Smaller knob
          onChange: handleCoarseChange,
          color: '#94a3b8'
        }),
        React.createElement(FrequencyKnob, {
          label: 'kHz',
          size: 18, // Smaller knob
          onChange: handleFineChange,
          color: '#cbd5e1'
        })
      )
    )
  );
};

export default CommunicationModule;
