import React, { useState, useEffect, useRef, useCallback } from 'react';

// **FIXED: Continuous control application joystick implementation**
const DraggableJoystick = ({ controlPitch, controlRoll, flightState }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const joystickRef = useRef(null);
  const maxDistance = 50;
  const controlIntervalRef = useRef(null);
  const lastControlTimeRef = useRef(0);

  // **FIX: Force proper centering on mount and resize**
  useEffect(() => {
    const centerJoystick = () => {
      if (joystickRef.current) {
        // Reset to true center (0,0)
        setPosition({ x: 0, y: 0 });
      }
    };

    centerJoystick();
    window.addEventListener('resize', centerJoystick);
    
    return () => {
      window.removeEventListener('resize', centerJoystick);
      // Cleanup control interval
      if (controlIntervalRef.current) {
        clearInterval(controlIntervalRef.current);
      }
    };
  }, []);

  // **FIX: Optimized continuous control application**
  const applyContinuousControls = useCallback(() => {
    if (!isDragging || flightState.autopilot || flightState.hasCrashed) return;
    
    // Throttle controls to prevent excessive updates
    const now = Date.now();
    if (now - lastControlTimeRef.current < 50) return; // 20 FPS max
    lastControlTimeRef.current = now;
    
    // Calculate normalized position (0 to 1)
    const normalizedX = position.x / maxDistance;
    const normalizedY = position.y / maxDistance;
    
    // Apply sensitivity curve: subtle in central 70%, more sensitive at edges
    const applyCurve = (value) => {
      const absValue = Math.abs(value);
      if (absValue <= 0.35) { // Central 70% region (35% on each side)
        // Subtle movement: cubic curve for fine control
        return value * Math.pow(absValue, 0.5) * 0.3;
      } else {
        // More sensitive at edges: quadratic curve for stronger control
        return value * Math.pow(absValue, 0.8) * 0.8;
      }
    };
    
    const pitchInput = -applyCurve(normalizedY);
    const rollInput = applyCurve(normalizedX);
    
    // Apply controls continuously
    controlPitch(pitchInput);
    controlRoll(rollInput);
  }, [isDragging, position.x, position.y, controlPitch, controlRoll, flightState.autopilot, flightState.hasCrashed]);

  // Setup continuous control interval when dragging starts
  useEffect(() => {
    if (isDragging) {
      // Apply controls immediately
      applyContinuousControls();
      
      // Set up continuous control application (10 times per second)
      controlIntervalRef.current = setInterval(applyContinuousControls, 100);
      
      return () => {
        if (controlIntervalRef.current) {
          clearInterval(controlIntervalRef.current);
          controlIntervalRef.current = null;
        }
      };
    } else {
      // Stop continuous controls when not dragging
      if (controlIntervalRef.current) {
        clearInterval(controlIntervalRef.current);
        controlIntervalRef.current = null;
      }
    }
  }, [isDragging, applyContinuousControls]);

  // Simple mouse down handler
  const handleMouseDown = (e) => {
    if (flightState.autopilot || flightState.hasCrashed) return;
    e.preventDefault();
    setIsDragging(true);
  };

  // Mouse move handler with proper event binding
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    // **FIX: Use exact center calculation**
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    // Limit to max distance
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const limitedDistance = Math.min(distance, maxDistance);
    
    if (distance > 0) {
      const ratio = limitedDistance / distance;
      const newX = deltaX * ratio;
      const newY = deltaY * ratio;
      
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // **FIX: Smooth return to true center**
      setPosition({ x: 0, y: 0 });
      
      // Apply neutral controls when released
      controlPitch(0);
      controlRoll(0);
    }
  }, [isDragging, controlPitch, controlRoll]);

  // Setup and cleanup event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Simple, clean JSX return with proper centering
  return React.createElement('div', { className: 'draggable-joystick' },
    React.createElement('h4', null, 'Flight Controls'),
    React.createElement('div', { 
      ref: joystickRef,
      className: `joystick-base ${flightState.autopilot || flightState.hasCrashed ? 'disabled' : ''}`,
      onMouseDown: handleMouseDown,
      style: { 
        userSelect: 'none',
        cursor: flightState.autopilot || flightState.hasCrashed ? 'not-allowed' : 'grab'
      }
    },
      React.createElement('div', { 
        className: 'joystick-handle',
        style: { 
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }
      }, '✈️')
    ),
    React.createElement('div', { className: 'joystick-status' })
  );
};

export default DraggableJoystick;