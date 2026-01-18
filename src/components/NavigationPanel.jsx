import React, { useRef, useEffect, useState } from 'react';
import { calculateDistance } from '../utils/distanceCalculator';
import { airportService } from '../services/airportService';

// Navigation Panel Component
const NavigationPanel = ({ flightState, selectedArrival, flightPlan }) => {
  const radarCanvasRef = useRef(null);
  const [distanceToWaypoint, setDistanceToWaypoint] = useState(0);
  const [mapRange, setMapRange] = useState(40); // Default 40nm
  const [nearbyRunways, setNearbyRunways] = useState([]);

  const groundSpeed = flightState?.groundSpeed || 0;
  const trueAirspeed = flightState?.trueAirspeed || 0;
  const heading = flightState?.heading || 0;

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

  // Effect to find nearby runways
  useEffect(() => {
    if (!flightState?.latitude || !flightState?.longitude) return;

    // Throttle: Only run if we haven't run in the last 2 seconds, 
    // or use a simpler approach: Run every time but inside a debounce/interval? 
    // Since flightState updates frequently, we should throttle.
    // For now, let's just run it. The service is local and fast enough for < 10 airports.
    
    // Optimization: Only check every 60 frames (~1s) or check distance changes.
    // We'll rely on the fact that getAirportsWithinRadius is efficient.
    
    // Only search if range is small enough to matter, or always?
    // User wants "within 10nm", so we must search when near.
    
    const airports = airportService.getAirportsWithinRadius(flightState.latitude, flightState.longitude, 15); // Search 15nm
    const runways = [];

    airports.forEach(airport => {
      // Get all runways for this airport
      let airportRunways = [];
      if (airport.runways && Array.isArray(airport.runways)) {
        airportRunways = airport.runways;
      } else if (airport.runway) {
        airportRunways = [{ name: airport.runway, length: airport.runwayLength }];
      } else {
        // Default mock if nothing exists
        airportRunways = [{ name: "09/27", length: 8000 }];
      }

      airportRunways.forEach(r => {
        const geom = airportService.getRunwayGeometry(airport.iata || airport.icao, r.name);
        if (geom) {
          runways.push(geom);
        }
      });
    });

    setNearbyRunways(runways);

  }, [flightState?.latitude, flightState?.longitude]); // Depends on position


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
          setCurrentNextWaypointName(activeWaypoint.name);
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

    const drawRadar = () => {
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate((-heading * Math.PI / 180));

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 50, 0, 0.5)';
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
          ctx.fillText(label, 0, 0);
          ctx.restore();
        } else if (i % 30 === 0) {
          const numLabel = i.toString();
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-angle);
          ctx.fillText(numLabel, 0, 0);
          ctx.restore();
        }
      }

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

      let alignmentBarData = null;

      if (nearbyRunways.length > 0 && typeof flightState?.latitude === 'number') {
        let closestRw = null;
        let minRwDist = Infinity;

        nearbyRunways.forEach(rw => {
          const midLat = (rw.thresholdStart.latitude + rw.thresholdEnd.latitude) / 2;
          const midLon = (rw.thresholdStart.longitude + rw.thresholdEnd.longitude) / 2;
          const d = calculateDistance(flightState.latitude, flightState.longitude, midLat, midLon);
          if (d < minRwDist) {
            minRwDist = d;
            closestRw = { ...rw, midLat, midLon };
          }
        });

        if (closestRw && minRwDist < 10) {
          const bearingToCenter = bearingTo(flightState.latitude, flightState.longitude, closestRw.midLat, closestRw.midLon);
          let relBearing = (bearingToCenter - heading + 360) % 360;
          if (relBearing > 180) relBearing -= 360;

          // Store for drawing outside rotation context
          alignmentBarData = { relBearing };
        }
      }

      // Draw Runways (Purple Lines)
      if (nearbyRunways.length > 0 && typeof flightState?.latitude === 'number') {
         ctx.strokeStyle = '#d8b4fe'; // Light Purple
         ctx.lineWidth = 3;

         nearbyRunways.forEach(rw => {
            // Check distance to runway start
            const distNm = calculateDistance(flightState.latitude, flightState.longitude, rw.thresholdStart.latitude, rw.thresholdStart.longitude);
            
            if (distNm < 10) { // Only show if within 10nm
                 // Calculate Start Point
                 const brgStart = bearingTo(flightState.latitude, flightState.longitude, rw.thresholdStart.latitude, rw.thresholdStart.longitude) * Math.PI / 180;
                 const rStart = Math.min(1, distNm / mapRange) * radius;
                 const xStart = rStart * Math.sin(brgStart);
                 const yStart = -rStart * Math.cos(brgStart);

                 // Calculate End Point
                 const distEnd = calculateDistance(flightState.latitude, flightState.longitude, rw.thresholdEnd.latitude, rw.thresholdEnd.longitude);
                 const brgEnd = bearingTo(flightState.latitude, flightState.longitude, rw.thresholdEnd.latitude, rw.thresholdEnd.longitude) * Math.PI / 180;
                 const rEnd = Math.min(1, distEnd / mapRange) * radius;
                 const xEnd = rEnd * Math.sin(brgEnd);
                 const yEnd = -rEnd * Math.cos(brgEnd);

                 ctx.beginPath();
                 ctx.moveTo(xStart, yStart);
                 ctx.lineTo(xEnd, yEnd);
                 ctx.stroke();
            }
         });
      }

      if (Array.isArray(waypoints) && waypoints.length > 0 && typeof flightState?.latitude === 'number' && typeof flightState?.longitude === 'number') {
        const maxRangeNm = mapRange; 
        const points = waypoints.map(wp => {
          const distNm = calculateDistance(flightState.latitude, flightState.longitude, wp.latitude, wp.longitude);
          const brg = bearingTo(flightState.latitude, flightState.longitude, wp.latitude, wp.longitude) * Math.PI / 180;
          const r = Math.min(1, distNm / maxRangeNm) * radius;
          const x = r * Math.sin(brg);
          const y = -r * Math.cos(brg);
          return { x, y, name: wp.name, distNm };
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
            // Optional: Show distance for waypoints
            // ctx.font = '9px Arial';
            // ctx.fillStyle = '#aaaaaa';
            // ctx.fillText(`${points[i].distNm.toFixed(0)}nm`, 0, 5);
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
  }, [flightState, heading, waypoints, currentNextWaypointName, mapRange, nearbyRunways]);
  
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
                React.createElement('span', { style: { fontWeight: 'bold', color: wp.name === currentNextWaypointName ? '#ffdd00' : '#00ff00' } }, wp.name),
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
