import React, { useState, useEffect, useRef, useCallback } from 'react';

const RudderPedal = ({ controlYaw, flightState }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0); // -50 to 50
  const sliderRef = useRef(null);
  const maxDistance = 50;
  const lastControlTimeRef = useRef(0);

  // Center on mount
  useEffect(() => {
    setPosition(0);
  }, []);

  // Continuous control application
  const applyContinuousControls = useCallback(() => {
    if (!isDragging || flightState?.autopilot || flightState?.hasCrashed) return;
    
    const now = Date.now();
    if (now - lastControlTimeRef.current < 50) return; // 20 FPS max
    lastControlTimeRef.current = now;
    
    // Normalized -1 to 1
    const normalizedYaw = position / maxDistance;
    controlYaw(normalizedYaw);
  }, [isDragging, position, controlYaw, flightState]);

  useEffect(() => {
    let interval;
    if (isDragging) {
      interval = setInterval(applyContinuousControls, 50);
    }
    return () => clearInterval(interval);
  }, [isDragging, applyContinuousControls]);

  const handleMouseDown = (e) => {
    if (flightState?.autopilot || flightState?.hasCrashed) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const deltaX = e.clientX - centerX;
    
    // Clamp
    const newX = Math.max(-maxDistance, Math.min(maxDistance, deltaX));
    setPosition(newX);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setPosition(0); // Auto-center
      controlYaw(0);
    }
  }, [isDragging, controlYaw]);

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

  return (
    <div style={{
      marginTop: '10px',
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      padding: '10px',
      borderRadius: '8px',
      border: '2px solid #475569',
      width: '100%',
      maxWidth: '180px', // Match joystick width roughly
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ 
        fontSize: '10px', 
        color: '#94a3b8', 
        marginBottom: '5px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontWeight: 'bold'
      }}>
        Rudder / Steering
      </div>
      
      <div 
        ref={sliderRef}
        className={flightState?.autopilot || flightState?.hasCrashed ? 'disabled' : ''}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative',
          width: '140px',
          height: '30px',
          background: '#0f172a',
          borderRadius: '15px',
          border: '1px solid #334155',
          cursor: flightState?.autopilot || flightState?.hasCrashed ? 'not-allowed' : 'grab'
        }}
      >
        {/* Center Mark */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '5px',
          bottom: '5px',
          width: '2px',
          background: '#334155',
          transform: 'translateX(-50%)'
        }} />

        {/* Handle */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '40px',
          height: '24px',
          background: 'linear-gradient(to bottom, #f59e0b, #d97706)',
          borderRadius: '4px',
          transform: `translate(calc(-50% + ${position}px), -50%)`,
          border: '1px solid #b45309',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '2px', height: '12px', background: 'rgba(255,255,255,0.3)', margin: '0 2px' }} />
          <div style={{ width: '2px', height: '12px', background: 'rgba(255,255,255,0.3)', margin: '0 2px' }} />
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        width: '100%', 
        marginTop: '4px',
        fontSize: '9px',
        color: '#64748b'
      }}>
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  );
};

export default RudderPedal;
