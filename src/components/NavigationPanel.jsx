import React, { useRef, useEffect, useState } from 'react';
import { calculateDistance } from '../utils/distanceCalculator';

// Navigation Panel Component
const NavigationPanel = ({ flightState, selectedArrival, flightPlan }) => {
  const radarCanvasRef = useRef(null);
  const [distanceToWaypoint, setDistanceToWaypoint] = useState(0);

  const groundSpeed = flightState?.groundSpeed || 0;
  const trueAirspeed = flightState?.trueAirspeed || 0;
  const heading = flightState?.heading || 0;

  const waypoints = flightPlan?.waypoints || [];
  const [currentNextWaypointName, setCurrentNextWaypointName] = useState('N/A');
  const [currentDistanceToNextWaypoint, setCurrentDistanceToNextWaypoint] = useState(0);

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
        let closestWaypoint = null;
        let minDistance = Infinity;

        for (let i = 0; i < waypoints.length; i++) {
          const wp = waypoints[i];
          const dist = calculateDistance(currentLat, currentLon, wp.latitude, wp.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closestWaypoint = wp;
          }
        }

        if (closestWaypoint) {
          setCurrentNextWaypointName(closestWaypoint.name);
          setCurrentDistanceToNextWaypoint(minDistance);
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
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * i / 3, 0, Math.PI * 2);
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

      if (Array.isArray(waypoints) && waypoints.length > 0 && typeof flightState?.latitude === 'number' && typeof flightState?.longitude === 'number') {
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
        const maxRangeNm = 200;
        const points = waypoints.map(wp => {
          const distNm = calculateDistance(flightState.latitude, flightState.longitude, wp.latitude, wp.longitude);
          const brg = bearingTo(flightState.latitude, flightState.longitude, wp.latitude, wp.longitude) * Math.PI / 180;
          const r = Math.min(1, distNm / maxRangeNm) * radius;
          const x = r * Math.sin(brg);
          const y = -r * Math.cos(brg);
          return { x, y, name: wp.name };
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

      ctx.save();
      ctx.translate(center, center);
      
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo(5, -radius + 15);
      ctx.lineTo(-5, -radius + 15);
      ctx.closePath();
      ctx.fillStyle = '#ff0000';
      ctx.fill();

      ctx.restore();
    };

    drawRadar();
  }, [flightState, heading, waypoints, currentNextWaypointName]);
  
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
        padding: '10px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '8px',
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid #00aa00'
      }
    },
      React.createElement('h4', { style: { color: '#00ff00', marginBottom: '10px', textAlign: 'center' } }, 'Flight Plan Waypoints'),
      waypoints.length > 0 ? (
        React.createElement('ul', { style: { listStyleType: 'none', padding: 0, margin: 0 } },
          waypoints.map((wp, index) =>
            React.createElement('li', {
              key: index,
              style: {
                color: '#e6e6e6',
                fontSize: '12px',
                padding: '4px 0',
                borderBottom: index < waypoints.length - 1 ? '1px dashed rgba(0, 170, 0, 0.3)' : 'none'
              }
            },
              React.createElement('span', { style: { fontWeight: 'bold', color: '#00ff00' } }, wp.name),
              ` (${wp.latitude.toFixed(2)}, ${wp.longitude.toFixed(2)})`
            )
          )
        )
      ) : (
        React.createElement('p', { style: { color: '#e6e6e6', fontSize: '12px', textAlign: 'center' } }, 'No waypoints generated.')
      )
    )
  );
};

export default NavigationPanel;
