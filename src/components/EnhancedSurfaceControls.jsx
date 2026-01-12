import React, { useState, useEffect } from 'react';

// Multi-position lever component for flaps
const FLAP_POSITIONS = {
  0: { label: 'UP', color: '#3b82f6', angle: 0 },
  1: { label: 'TO', color: '#f59e0b', angle: 30 },
  2: { label: 'LDG', color: '#ef4444', angle: 60 }
};

// Binary lever component for gear and speedbrakes
const BINARY_POSITIONS = {
  up: { label: 'UP', color: '#3b82f6', angle: 0 },
  down: { label: 'DOWN', color: '#10b981', angle: 60 }
};

const MultiPositionLeverControl = ({ label, position, maxPosition, onToggle, colorMap, disabled }) => {
  const nextPosition = () => {
    if (disabled) return;
    onToggle((position + 1) % (maxPosition + 1));
  };

  const positionInfo = colorMap[position];

  return (
    <div style={leverContainerStyle}>
      <div style={labelStyle}>{label}</div>
      <div 
        style={{
          ...leverBaseStyle,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1
        }}
        onClick={nextPosition}
      >
        <div 
          style={{
            ...leverHandleStyle,
            background: positionInfo.color,
            borderColor: `${positionInfo.color}88`,
            transform: `rotate(${positionInfo.angle}deg)`,
            boxShadow: `0 ${positionInfo.angle > 0 ? '2px' : '-2px'} 8px ${positionInfo.color}40`
          }}
        />
      </div>
      <div style={{
        ...positionIndicatorStyle,
        color: positionInfo.color
      }}>
        {positionInfo.label}
      </div>
      <div style={{
        ...statusLightStyle,
        background: positionInfo.color
      }} />
    </div>
  );
};

const BinaryLeverControl = ({ label, position, onToggle, colorMap, disabled }) => {
  const togglePosition = () => {
    if (disabled) return;
    onToggle(position === 'up' ? 'down' : 'up');
  };

  const positionInfo = colorMap[position];

  return (
    <div style={leverContainerStyle}>
      <div style={labelStyle}>{label}</div>
      <div 
        style={{
          ...leverBaseStyle,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1
        }}
        onClick={togglePosition}
      >
        <div 
          style={{
            ...leverHandleStyle,
            background: positionInfo.color,
            borderColor: `${positionInfo.color}88`,
            transform: `rotate(${positionInfo.angle}deg)`,
            boxShadow: `0 ${positionInfo.angle > 0 ? '2px' : '-2px'} 8px ${positionInfo.color}40`
          }}
        />
      </div>
      <div style={{
        ...positionIndicatorStyle,
        color: positionInfo.color
      }}>
        {positionInfo.label}
      </div>
      <div style={{
        ...statusLightStyle,
        background: positionInfo.color
      }} />
    </div>
  );
};

const EnhancedSurfaceControls = ({ controlFlaps, controlGear, controlAirBrakes, flightState }) => {
  // Initialize control states
  const [flapsPosition, setFlapsPosition] = useState(flightState?.flapsValue || 0);
  const [gearPosition, setGearPosition] = useState(
    flightState?.gearPosition === 'down' || flightState?.gearValue ? 'down' : 'up'
  );
  const [airBrakesPosition, setAirBrakesPosition] = useState(
    flightState?.airBrakesPosition === 'down' || flightState?.airBrakesValue ? 'down' : 'up'
  );
  
  // Update local state when flightState changes
  useEffect(() => {
    if (flightState) {
      // Update flaps position from physics service
      if (flightState.flapsValue !== undefined) {
        setFlapsPosition(Math.max(0, Math.min(2, flightState.flapsValue)));
      } else if (flightState.flapsPosition) {
        setFlapsPosition(flightState.flapsPosition === 'up' ? 0 : 1);
      }
      
      // Update gear position
      if (flightState.gearPosition !== undefined) {
        setGearPosition(flightState.gearPosition);
      } else if (flightState.gearValue !== undefined) {
        setGearPosition(flightState.gearValue ? 'down' : 'up');
      }
      
      // Update airbrakes position
      if (flightState.airBrakesPosition !== undefined) {
        setAirBrakesPosition(flightState.airBrakesPosition);
      } else if (flightState.airBrakesValue !== undefined) {
        setAirBrakesPosition(flightState.airBrakesValue ? 'down' : 'up');
      }
    }
  }, [flightState]);

  const handleFlapsToggle = (newPosition) => {
    setFlapsPosition(newPosition);
    controlFlaps(newPosition);
  };

  const handleGearToggle = (newPosition) => {
    setGearPosition(newPosition);
    controlGear(newPosition);
  };

  const handleAirBrakesToggle = (newPosition) => {
    setAirBrakesPosition(newPosition);
    controlAirBrakes(newPosition);
  };

  // Check if physics service is providing real data
  const hasPhysicsData = flightState && (
    flightState.flapsValue !== undefined ||
    flightState.gearValue !== undefined ||
    flightState.airBrakesValue !== undefined
  );

  return (
    <div style={containerStyle}>
      {/* Flaps Multi-Position Lever */}
      <MultiPositionLeverControl
        label="FLAPS"
        position={flapsPosition}
        maxPosition={2}
        onToggle={handleFlapsToggle}
        colorMap={FLAP_POSITIONS}
        disabled={flightState?.autopilot || flightState?.hasCrashed}
      />
      
      {/* Gear Binary Lever */}
      <BinaryLeverControl
        label="GEAR"
        position={gearPosition}
        onToggle={handleGearToggle}
        colorMap={BINARY_POSITIONS}
        disabled={flightState?.autopilot || flightState?.hasCrashed}
      />
      
      {/* Air Brakes Binary Lever */}
      <BinaryLeverControl
        label="BRAKES"
        position={airBrakesPosition}
        onToggle={handleAirBrakesToggle}
        colorMap={BINARY_POSITIONS}
        disabled={flightState?.autopilot || flightState?.hasCrashed}
      />
      
      {/* Status Indicator */}
      <div style={statusContainerStyle}>
        <div style={statusLabelStyle}>STATUS</div>
        <div style={{
          ...statusLightStyle,
          background: hasPhysicsData ? '#10b981' : '#f59e0b',
          boxShadow: hasPhysicsData ? '0 0 8px #10b981' : '0 0 8px #f59e0b'
        }} />
        <div style={{
          ...statusTextStyle,
          color: hasPhysicsData ? '#10b981' : '#f59e0b'
        }}>
          {hasPhysicsData ? 'SYNC' : 'LOCAL'}
        </div>
      </div>
    </div>
  );
};

// Styles
const containerStyle = {
  position: 'absolute',
  bottom: '20px',
  right: '20px',
  display: 'flex',
  gap: '15px',
  zIndex: 100,
  background: 'rgba(0,0,0,0.85)',
  padding: '20px',
  borderRadius: '15px',
  border: '2px solid #444',
  backdropFilter: 'blur(5px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
};

const leverContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '12px',
  background: '#1a1a1a',
  borderRadius: '12px',
  border: '2px solid #333',
  minWidth: '80px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#ccc',
  marginBottom: '10px',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const leverBaseStyle = {
  position: 'relative',
  width: '35px',
  height: '90px',
  background: '#2d2d2d',
  border: '3px solid #555',
  borderRadius: '18px',
  marginBottom: '10px',
  transition: 'all 0.2s ease'
};

const leverHandleStyle = {
  position: 'absolute',
  width: '100%',
  height: '28px',
  borderRadius: '10px',
  left: 0,
  bottom: '2px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '2px solid',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
};

const positionIndicatorStyle = {
  fontSize: '14px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  marginBottom: '8px'
};

const statusLightStyle = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  marginTop: '5px',
  boxShadow: '0 0 8px rgba(255,255,255,0.3)'
};

const statusContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '15px',
  background: '#1a1a1a',
  borderRadius: '12px',
  border: '2px solid #333'
};

const statusLabelStyle = {
  fontSize: '10px',
  color: '#888',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const statusTextStyle = {
  fontSize: '8px',
  fontFamily: 'monospace',
  marginTop: '5px',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

export default EnhancedSurfaceControls;
