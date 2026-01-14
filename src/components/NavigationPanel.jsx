import React, { useRef, useEffect, useState } from 'react';
import { calculateDistance } from '../utils/distanceCalculator';

// Navigation Panel Component
const NavigationPanel = ({ flightState, selectedArrival }) => {
  const radarCanvasRef = useRef(null);
  const [distanceToWaypoint, setDistanceToWaypoint] = useState(0);

  // Safe access to properties with defaults
  const groundSpeed = flightState?.groundSpeed || 0;
  const trueAirspeed = flightState?.trueAirspeed || 0;
  const heading = flightState?.heading || 0;
  const nextWaypoint = selectedArrival?.iata || selectedArrival?.icao || 'N/A';

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
  }, [flightState, selectedArrival]);

  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to match its CSS size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const size = canvas.width; // Use the dynamically set width
    const center = size / 2;
    const radius = size / 2 - 10; // Padding

    const drawRadar = () => {
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(center, center);
      // Rotate the entire radar display opposite to the aircraft's heading
      ctx.rotate((-heading * Math.PI / 180));

      // Draw radar background
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 50, 0, 0.5)';
      ctx.fill();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw concentric circles
      ctx.strokeStyle = '#00aa00';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * i / 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw cardinal directions and tick marks
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
        ctx.lineTo(0, -radius - (i % 90 === 0 ? 10 : 5)); // Longer marks for N, E, S, W
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
          ctx.rotate(-angle); // Counter-rotate text to keep it upright
          ctx.fillText(label, 0, 0);
          ctx.restore();
        } else if (i % 30 === 0) {
          const numLabel = i.toString();
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-angle); // Counter-rotate text to keep it upright
          ctx.fillText(numLabel, 0, 0);
          ctx.restore();
        }
      }

      ctx.restore(); // Restore after radar rotation

      // Draw fixed aircraft pointer (always pointing up)
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
  }, [flightState, heading]);
  
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
          React.createElement('span', { className: 'label' }, 'DIST'),
          React.createElement('span', { className: 'value' }, `${distanceToWaypoint.toFixed(1)}nm`)
        )
      ),
      React.createElement('canvas', { ref: radarCanvasRef, className: 'radial-radar-canvas' })
    )
  );
};

export default NavigationPanel;