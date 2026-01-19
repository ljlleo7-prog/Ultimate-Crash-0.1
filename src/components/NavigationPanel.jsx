import React, { useRef, useEffect, useState } from 'react';
import { calculateDistance } from '../utils/distanceCalculator';
import { airportService } from '../services/airportService';
import { terrainRadarService } from '../services/TerrainRadarService';

// Navigation Panel Component
const NavigationPanel = ({ flightState, selectedArrival, flightPlan, npcs = [] }) => {
  const radarCanvasRef = useRef(null);
  const lastTerrainUpdateRef = useRef(0);
  const [distanceToWaypoint, setDistanceToWaypoint] = useState(0);
  const [mapRange, setMapRange] = useState(40); // Default 40nm
  const [nearbyRunways, setNearbyRunways] = useState([]);

  const groundSpeed = flightState?.groundSpeed || 0;
  const trueAirspeed = flightState?.trueAirspeed || 0;
  const heading = flightState?.heading || 0;
  const altitude = flightState?.altitude || 0;

  const waypoints = flightPlan?.waypoints || [];
  const [currentNextWaypointName, setCurrentNextWaypointName] = useState('N/A');
  const [currentDistanceToNextWaypoint, setCurrentDistanceToNextWaypoint] = useState(0);

  // Range options (Exponential)
  const rangeOptions = [5, 10, 20, 40, 80, 160, 320, 640];

  const cycleRange = () => {
    const currentIndex = rangeOptions.indexOf(mapRange);
    const nextIndex = (currentIndex + 1) % rangeOptions.length;
    setMapRange(rangeOptions[nextIndex]);
  };

  // Effect to find nearby runways and airports
  useEffect(() => {
    if (!flightState?.latitude || !flightState?.longitude) return;

    // Get airports within range for display
    const airports = airportService.getAirportsWithinRadius(flightState.latitude, flightState.longitude, Math.max(mapRange, 20)); 
    setNearbyRunways(airports); // Using this state for airports too, we'll process runways inside loop

  }, [flightState?.latitude, flightState?.longitude, mapRange]); // Depends on position and range

  // Effect to update Terrain Radar
  useEffect(() => {
    if (!flightState?.latitude || !flightState?.longitude) return;
    
    // Throttle updates to avoid heavy calculation every frame
    const now = Date.now();
    if (now - lastTerrainUpdateRef.current > 1000) {
        // Update terrain radar service with current position and range
        // Clamp range to 80nm to prevent massive queue buildup and lag
        // The user can zoom out to 640nm, but we only fetch detailed terrain within 80nm
        const fetchRange = Math.min(mapRange, 80);
        terrainRadarService.update(flightState.latitude, flightState.longitude, fetchRange);
        lastTerrainUpdateRef.current = now;
    }
    
  }, [flightState?.latitude, flightState?.longitude, mapRange]);


  useEffect(() => {
    if (flightState && selectedArrival) {
      const currentLat = flightState.latitude;
      const currentLon = flightState.longitude;
      const arrivalLat = selectedArrival.latitude;
      const arrivalLon = selectedArrival.longitude;

      if (currentLat !== undefined && currentLon !== undefined && arrivalLat !== undefined && arrivalLon !== undefined) {
        const dist = calculateDistance(currentLat, currentLon, arrivalLat, arrivalLon);
        setDistanceToWaypoint(dist);
      }
    }

    if (flightState && waypoints.length > 0) {
      const currentLat = flightState.latitude;
      const currentLon = flightState.longitude;

      if (currentLat !== undefined && currentLon !== undefined) {
        let activeWaypoint = null;
        let distanceToActive = Infinity;

        // Priority 1: Use the actual active waypoint index from flight physics
        if (typeof flightState.currentWaypointIndex === 'number' && 
            flightState.currentWaypointIndex >= 0 && 
            flightState.currentWaypointIndex < waypoints.length) {
          activeWaypoint = waypoints[flightState.currentWaypointIndex];
          distanceToActive = calculateDistance(currentLat, currentLon, activeWaypoint.latitude, activeWaypoint.longitude);
        } else {
          // Priority 2: Fallback to closest waypoint (legacy behavior)
          let minDistance = Infinity;
          for (let i = 0; i < waypoints.length; i++) {
            const wp = waypoints[i];
            const dist = calculateDistance(currentLat, currentLon, wp.latitude, wp.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              activeWaypoint = wp;
              distanceToActive = dist;
            }
          }
        }

        if (activeWaypoint) {
          setCurrentNextWaypointName(activeWaypoint.label || activeWaypoint.name || 'WPT');
          setCurrentDistanceToNextWaypoint(distanceToActive);
        }
      }
    }
  }, [flightState, selectedArrival, waypoints]);

  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const size = canvas.width;
    const center = size / 2;
    const radius = size / 2 - 10;

    const toRad = (d) => d * Math.PI / 180;
    const toDeg = (r) => r * 180 / Math.PI;
    const bearingTo = (lat1, lon1, lat2, lon2) => {
        const φ1 = toRad(lat1);
        const φ2 = toRad(lat2);
        const Δλ = toRad(lon2 - lon1);
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        return (toDeg(Math.atan2(y, x)) + 360) % 360;
    };
    
    // Terrain Gradient Color Helper
    const getTerrainColor = (height) => {
      const relativeAlt = altitude - height;
      
      // If we are high above terrain (> 5000ft), don't show or show very faint
      if (relativeAlt > 5000) return null;
      
      // Safety coloring
      if (height > altitude) return 'rgba(255, 0, 0, 0.8)'; // Terrain ABOVE us (Red)
      if (relativeAlt < 500) return 'rgba(255, 0, 0, 0.6)'; // < 500ft clearance (Red)
      if (relativeAlt < 1000) return 'rgba(255, 255, 0, 0.6)'; // < 1000ft clearance (Yellow)
      if (relativeAlt < 2000) return 'rgba(0, 255, 0, 0.4)'; // < 2000ft clearance (Green)
      
      // 2000ft to 5000ft: Fade out green
      const alpha = 0.4 * (1 - (relativeAlt - 2000) / 3000);
      return `rgba(0, 100, 0, ${alpha})`;
    };

    const drawRadar = () => {
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate((-heading * Math.PI / 180));

      // --- Draw Terrain ---
      if (flightState?.latitude && flightState?.longitude) {
        // Map range is radius in NM.
        // Canvas radius is pixels.
        const pxPerNm = radius / mapRange;
        const degPerNm = 1/60; 
        
        const gridSizeDeg = terrainRadarService.GRID_SIZE;
        const gridSizeNm = gridSizeDeg * 60;
        const gridSizePx = Math.ceil(gridSizeNm * pxPerNm);
        
        // Optimization: Limit render range to prevent lag on large maps
        // We only fetch up to 80nm, so rendering beyond that is useless anyway
        // Also implement LOD (Level of Detail) stepping for large ranges
        const renderRange = Math.min(mapRange, 160); 
        const step = mapRange > 40 ? Math.ceil(mapRange / 40) : 1;
        
        const rangeDeg = renderRange / 60;
        const startLat = flightState.latitude - rangeDeg;
        const endLat = flightState.latitude + rangeDeg;
        const startLon = flightState.longitude - rangeDeg;
        const endLon = flightState.longitude + rangeDeg;
        
        const startIdx = terrainRadarService.getGridIndices(startLat, startLon);
        const endIdx = terrainRadarService.getGridIndices(endLat, endLon);
        
        // Iterate grid indices with stepping
        for (let i = startIdx.latIdx; i <= endIdx.latIdx; i += step) {
          for (let j = startIdx.lonIdx; j <= endIdx.lonIdx; j += step) {
            const tileLat = (i + 0.5) * gridSizeDeg;
            const tileLon = (j + 0.5) * gridSizeDeg;
            
            const height = terrainRadarService.getTerrainHeight(tileLat, tileLon);
            if (height !== null) {
              const color = getTerrainColor(height);
              if (color) {
                // Calculate position relative to aircraft
                const dLatNm = (tileLat - flightState.latitude) * 60;
                // Longitude correction for latitude
                const dLonNm = (tileLon - flightState.longitude) * 60 * Math.cos(flightState.latitude * Math.PI / 180);
                
                // Convert NM to Pixels (x is East/Lon, y is North/Lat)
                // Canvas coordinates: y is down (North is -y), x is right (East is +x)
                const x = dLonNm * pxPerNm;
                const y = -dLatNm * pxPerNm; // Inverted because canvas Y is down
                
                // Only draw if within circle
                if (x*x + y*y < radius*radius) {
                   ctx.fillStyle = color;
                   // Draw rectangle centered at x, y
                   // Scale rectangle size by step
                   const size = (gridSizePx * step) + (step > 1 ? 0.5 : 0); // Slight overlap to avoid gaps
                   ctx.fillRect(x - size/2, y - size/2, size, size);
                }
              }
            }
          }
        }
      }
      // --- End Draw Terrain ---

      // --- Draw Traffic (TCAS) ---
      if (npcs && npcs.length > 0) {
          npcs.forEach(npc => {
            // Calculate relative position
            const dLat = npc.latitude - flightState.latitude;
            const dLon = npc.longitude - flightState.longitude;
            
            // Convert to NM
            const dLatNm = dLat * 60;
            const dLonNm = dLon * 60 * Math.cos(flightState.latitude * Math.PI / 180);
            
            // Convert to Pixels (x is East, y is North-ish)
            // Canvas: y is down. North is -y.
            const pxPerNm = radius / mapRange;
            const x = dLonNm * pxPerNm;
            const y = -dLatNm * pxPerNm;
            
            // Distance
            const distNm = Math.sqrt(dLatNm*dLatNm + dLonNm*dLonNm);
            const dAlt = Math.abs(npc.altitude - altitude);
            
            // Skip if out of range (plus margin)
            if (distNm > mapRange * 1.2) return;
            
            // Check Critical
            const closingSpeed = (flightState.trueAirspeed || 0) + (npc.speed || 0);
            const timeToReach = closingSpeed > 0 ? distNm / (closingSpeed / 3600) : 999; 
            const isCritical = (
                altitude > 3000 && 
                dAlt < 1000 && 
                timeToReach * 3600 < 20
            );
            
            // Color
            let color = '#38bdf8'; // Default Cyan
            if (isCritical) {
                color = '#ff0000'; // Red
            } else {
                if (dAlt < 1000) {
                    color = '#fbbf24'; // Amber/Orange
                } else if (distNm < 10) {
                     color = '#facc15'; // Yellow
                }
            }
            
            // Draw
            ctx.save();
            ctx.translate(x, y);
            
            // Rotate to NPC heading
            ctx.rotate(npc.heading * Math.PI / 180);
            
            // Draw Triangle
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(4, 4);
            ctx.lineTo(-4, 4);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            
            // Text "FL XXX"
            // Reset rotation for text to be upright on screen
            ctx.rotate(-npc.heading * Math.PI / 180); // Back to North-Up
            ctx.rotate(heading * Math.PI / 180); // Back to Screen-Up
            
            ctx.fillStyle = color;
            ctx.font = '10px monospace';
            ctx.fillText(`FL ${Math.round(npc.altitude/100)}`, 8, 3);
            
            ctx.restore();
          });
      }

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      // ctx.fillStyle = 'rgba(0, 50, 0, 0.5)'; // Old background
      ctx.fillStyle = 'rgba(0, 20, 0, 0.2)'; // More transparent to see terrain
      ctx.fill();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = '#00aa00';
      ctx.lineWidth = 1;
      const ringCount = 4; // 4 rings
      for (let i = 1; i <= ringCount; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * i / ringCount, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#00ff00';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < 360; i += 10) {
        const angle = i * Math.PI / 180;
        const x = (radius + 5) * Math.sin(angle);
        const y = -(radius + 5) * Math.cos(angle);

        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(0, -radius - (i % 90 === 0 ? 10 : 5));
        ctx.stroke();
        ctx.restore();

        if (i % 90 === 0) {
          let label = '';
          if (i === 0) label = 'N';
          else if (i === 90) label = 'E';
          else if (i === 180) label = 'S';
          else if (i === 270) label = 'W';
          
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-angle);
          ctx.rotate(heading * Math.PI / 180); // Counter-rotate to keep text upright
          ctx.fillText(label, 0, 0);
          ctx.restore();
        } else if (i % 30 === 0) {
          const numLabel = i.toString();
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-angle);
          ctx.rotate(heading * Math.PI / 180); // Counter-rotate
          ctx.fillText(numLabel, 0, 0);
          ctx.restore();
        }
      }

      let alignmentBarData = null;
      
      // Draw Airports and Runways
      if (nearbyRunways.length > 0 && typeof flightState?.latitude === 'number') {
        let closestRw = null;
        let minRwDist = Infinity;
        
        nearbyRunways.forEach(airport => {
            // Draw Airport Symbol
            const distNm = calculateDistance(flightState.latitude, flightState.longitude, airport.latitude, airport.longitude);
            if (distNm < mapRange * 1.2) {
                 const brg = bearingTo(flightState.latitude, flightState.longitude, airport.latitude, airport.longitude) * Math.PI / 180;
                 const r = Math.min(mapRange * 2, distNm) / mapRange * radius;
                 const x = r * Math.sin(brg);
                 const y = -r * Math.cos(brg);
                 
                 // Draw Circle
                 ctx.beginPath();
                 ctx.arc(x, y, 4, 0, Math.PI * 2);
                 ctx.strokeStyle = '#00ffff'; // Cyan for airports
                 ctx.lineWidth = 1;
                 ctx.stroke();
                 
                 // Draw Label
                 ctx.save();
                 ctx.translate(x, y);
                 ctx.rotate(heading * Math.PI / 180);
                 ctx.fillStyle = '#00ffff';
                 ctx.font = '9px monospace';
                 ctx.textAlign = 'center';
                 ctx.fillText(airport.iata || airport.icao, 0, 10);
                 ctx.restore();
            }
            
            // Get runways for logic
            let airportRunways = [];
            if (airport.runways && Array.isArray(airport.runways)) {
                airportRunways = airport.runways;
            } else if (airport.runway) {
                airportRunways = [{ name: airport.runway, length: airport.runwayLength }];
            } else {
                airportRunways = [{ name: "09/27", length: 8000 }];
            }
            
            airportRunways.forEach(r => {
                const geom = airportService.getRunwayGeometry(airport.iata || airport.icao, r.name);
                if (geom) {
                    // Logic for alignment bar (find closest)
                    const midLat = (geom.thresholdStart.latitude + geom.thresholdEnd.latitude) / 2;
                    const midLon = (geom.thresholdStart.longitude + geom.thresholdEnd.longitude) / 2;
                    const d = calculateDistance(flightState.latitude, flightState.longitude, midLat, midLon);
                    if (d < minRwDist) {
                        minRwDist = d;
                        closestRw = { ...geom, midLat, midLon };
                    }
                    
                    // Draw Runway Line
                    if (distNm < mapRange * 1.2) {
                         ctx.strokeStyle = '#d8b4fe'; // Light Purple
                         ctx.lineWidth = 2;
                         
                         const brgStart = bearingTo(flightState.latitude, flightState.longitude, geom.thresholdStart.latitude, geom.thresholdStart.longitude) * Math.PI / 180;
                         const rStart = Math.min(mapRange * 2, calculateDistance(flightState.latitude, flightState.longitude, geom.thresholdStart.latitude, geom.thresholdStart.longitude) / mapRange * radius);
                         const xStart = rStart * Math.sin(brgStart);
                         const yStart = -rStart * Math.cos(brgStart);
    
                         const brgEnd = bearingTo(flightState.latitude, flightState.longitude, geom.thresholdEnd.latitude, geom.thresholdEnd.longitude) * Math.PI / 180;
                         const rEnd = Math.min(mapRange * 2, calculateDistance(flightState.latitude, flightState.longitude, geom.thresholdEnd.latitude, geom.thresholdEnd.longitude) / mapRange * radius);
                         const xEnd = rEnd * Math.sin(brgEnd);
                         const yEnd = -rEnd * Math.cos(brgEnd);
    
                         ctx.beginPath();
                         ctx.moveTo(xStart, yStart);
                         ctx.lineTo(xEnd, yEnd);
                         ctx.stroke();
                    }
                }
            });
        });

        if (closestRw && minRwDist < 10) {
          const bearingToCenter = bearingTo(flightState.latitude, flightState.longitude, closestRw.midLat, closestRw.midLon);
          let relBearing = (bearingToCenter - heading + 360) % 360;
          if (relBearing > 180) relBearing -= 360;

          // Store for drawing outside rotation context
          alignmentBarData = { relBearing };
        }
      }

      if (Array.isArray(waypoints) && waypoints.length > 0 && typeof flightState?.latitude === 'number' && typeof flightState?.longitude === 'number') {
        const maxRangeNm = mapRange; 
        const points = waypoints.map(wp => {
          const distNm = calculateDistance(flightState.latitude, flightState.longitude, wp.latitude, wp.longitude);
          const brg = bearingTo(flightState.latitude, flightState.longitude, wp.latitude, wp.longitude) * Math.PI / 180;
          const r = Math.min(1, distNm / maxRangeNm) * radius;
          const x = r * Math.sin(brg);
          const y = -r * Math.cos(brg);
          return { x, y, name: wp.label || wp.name || 'WPT', distNm };
        });
        if (points.length > 0) {
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
          for (let i = 0; i < points.length; i++) {
            const isNext = points[i].name === currentNextWaypointName;
            ctx.beginPath();
            ctx.arc(points[i].x, points[i].y, isNext ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = isNext ? '#ffdd00' : '#00ff88';
            ctx.fill();

            // Draw label
            ctx.save();
            ctx.translate(points[i].x, points[i].y);
            // Counter-rotate the label so it appears upright on screen
            ctx.rotate(heading * Math.PI / 180);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(points[i].name, 0, -8);
            ctx.restore();
          }
        }
      }

      ctx.restore();

      // Draw Runway Alignment Bar (Fixed on Screen)
      if (alignmentBarData) {
        const { relBearing } = alignmentBarData;
        const barY = 20;
        const barWidth = size * 0.8;
        const barX = (size - barWidth) / 2;
        
        // Background Bar
        ctx.beginPath();
        ctx.rect(barX, barY - 2, barWidth, 4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Center Tick (Straight Ahead)
        ctx.beginPath();
        ctx.moveTo(size / 2, barY - 5);
        ctx.lineTo(size / 2, barY + 5);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Indicator Position
        const maxDeflection = 45; // Degrees for full scale
        let xOffset = relBearing * (barWidth / 2) / maxDeflection;
        
        // Clamp
        if (xOffset > barWidth / 2) xOffset = barWidth / 2;
        if (xOffset < -barWidth / 2) xOffset = -barWidth / 2;
        
        const indX = size / 2 + xOffset;

        // Color Logic
        let indColor = '#00ff00';
        if (Math.abs(relBearing) > 5) indColor = '#ffff00';
        if (Math.abs(relBearing) > 15) indColor = '#ff0000';

        // Draw Indicator (Rectangle/Diamond)
        ctx.beginPath();
        ctx.rect(indX - 4, barY - 6, 8, 12);
        ctx.fillStyle = indColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(center, center);
      
      // Draw Aircraft Symbol (Fixed Upwards)
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(6, 5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fillStyle = '#ff0000'; // Red plane for visibility
      ctx.fill();

      ctx.restore();
      
      // Draw Range and Mode Labels (Fixed on Screen)
      ctx.font = '10px monospace';
      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`RANGE: ${mapRange}NM`, 5, 5);
      
      ctx.textAlign = 'right';
      ctx.fillText('HDG UP', size - 5, 5);
    };

    drawRadar();
  }, [flightState, heading, altitude, waypoints, currentNextWaypointName, mapRange, nearbyRunways]);
  
  return React.createElement('div', { className: 'navigation-panel' },
    React.createElement('div', { className: 'radar-display-container' },
      React.createElement('div', { className: 'radar-top-info' },
        React.createElement('div', { className: 'radar-speed-info' },
          React.createElement('span', { className: 'label' }, 'TAS'),
          React.createElement('span', { className: 'value' }, `${trueAirspeed.toFixed(0)}kts`),
          React.createElement('span', { className: 'label' }, 'GS'),
          React.createElement('span', { className: 'value' }, `${groundSpeed.toFixed(0)}kts`)
        ),
        React.createElement('div', { className: 'radar-heading-info' },
          React.createElement('span', { className: 'value' }, `${heading.toFixed(0)}°`)
        ),
        React.createElement('div', { className: 'radar-waypoint-info' },
          React.createElement('span', { className: 'label' }, 'NEXT WP'),
          React.createElement('span', { className: 'value' }, `${currentNextWaypointName}`)
        )
      ),
      React.createElement('canvas', { ref: radarCanvasRef, className: 'radial-radar-canvas' })
    ),
    React.createElement('div', {
      style: {
        marginTop: '15px',
        display: 'flex',
        gap: '5px',
        height: '90px'
      }
    },
      // Waypoint List
      React.createElement('div', {
        style: {
          flex: 1,
          padding: '5px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '8px',
          overflowY: 'auto',
          border: '1px solid #00aa00'
        }
      },
        React.createElement('h4', { style: { color: '#00ff00', marginBottom: '5px', textAlign: 'center', fontSize: '12px', margin: '0 0 5px 0' } }, 'Flight Plan'),
        waypoints.length > 0 ? (
          React.createElement('ul', { style: { listStyleType: 'none', padding: 0, margin: 0 } },
            waypoints.map((wp, index) =>
              React.createElement('li', {
                key: index,
                style: {
                  color: '#e6e6e6',
                  fontSize: '11px',
                  padding: '2px 0',
                  borderBottom: index < waypoints.length - 1 ? '1px dashed rgba(0, 170, 0, 0.3)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between'
                }
              },
                React.createElement('span', { style: { fontWeight: 'bold', color: (wp.label || wp.name) === currentNextWaypointName ? '#ffdd00' : '#00ff00' } }, wp.label || wp.name || 'WPT'),
                React.createElement('span', { style: { color: '#aaaaaa' } }, `${wp.latitude.toFixed(2)}, ${wp.longitude.toFixed(2)}`)
              )
            )
          )
        ) : (
          React.createElement('p', { style: { color: '#e6e6e6', fontSize: '12px', textAlign: 'center' } }, 'No Waypoints')
        )
      ),
      
      // Range Switch
      React.createElement('div', {
        style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            border: '1px solid #00aa00',
            padding: '2px'
        }
      },
        React.createElement('span', { style: { color: '#00ff00', fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' } }, 'RNG'),
        React.createElement('button', {
            onClick: cycleRange,
            style: {
                background: '#003300',
                border: '1px solid #00ff00',
                color: '#00ff00',
                borderRadius: '4px',
                padding: '4px 2px',
                fontSize: '11px',
                cursor: 'pointer',
                width: '40px',
                textAlign: 'center',
                fontWeight: 'bold',
                boxShadow: '0 0 5px rgba(0, 255, 0, 0.3)'
            }
        }, mapRange)
      )
    )
  );
};

export default NavigationPanel;
