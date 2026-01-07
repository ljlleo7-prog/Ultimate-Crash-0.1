import React, { useState, useEffect } from 'react';

const AutopilotDebugPanel = ({ flightPhysicsRef }) => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!showDebug) return;
    
    const interval = setInterval(() => {
      if (flightPhysicsRef.current) {
        // Get detailed autopilot debug information
        const info = flightPhysicsRef.current.getAutopilotDebugInfo ? 
          flightPhysicsRef.current.getAutopilotDebugInfo() : 
          getFallbackDebugInfo(flightPhysicsRef.current);
        setDebugInfo(info);
      }
    }, 200); // Update every 200ms for real-time monitoring
    
    return () => clearInterval(interval);
  }, [showDebug, flightPhysicsRef]);

  // Fallback function if getAutopilotDebugInfo doesn't exist
  const getFallbackDebugInfo = (physicsService) => {
    const currentAoA = physicsService.calculateAngleOfAttack ? 
      physicsService.calculateAngleOfAttack() : 0;
    
    return {
      currentAoA: currentAoA,
      pitch: physicsService.state?.pitch || 0,
      altitude: physicsService.state?.altitude || 0,
      airspeed: physicsService.state?.indicatedAirspeed || 0,
      autopilotActive: physicsService.state?.autopilot || false,
      stallProtectionActive: false,
      targetAoA: 2.5,
      stallWarningAoA: 12.0,
      criticalStallAoA: 16.0,
      aoaCorrection: 0,
      targetPitch: 0,
      pitchError: 0
    };
  };

  if (!showDebug) {
    return (
      <button 
        onClick={() => setShowDebug(true)}
        style={{
          position: 'fixed',
          top: '50px',
          right: '10px',
          zIndex: 1000,
          background: '#8b5cf6',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        Show AP Debug
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '50px',
      right: '10px',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      maxWidth: '350px',
      border: '2px solid #8b5cf6',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#8b5cf6', fontSize: '14px' }}>AUTOPILOT DEBUG</h3>
        <button 
          onClick={() => setShowDebug(false)}
          style={{
            background: '#666',
            color: 'white',
            border: 'none',
            padding: '3px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Hide
        </button>
      </div>
      
      {debugInfo && (
        <div style={{ lineHeight: '1.4' }}>
          {/* Status Indicators */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '10px',
            paddingBottom: '5px',
            borderBottom: '1px solid #374151'
          }}>
            <span style={{ color: '#9ca3af' }}>AP Status:</span>
            <span style={{ 
              color: debugInfo.autopilotActive ? '#10b981' : '#ef4444',
              fontWeight: 'bold'
            }}>
              {debugInfo.autopilotActive ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '10px',
            paddingBottom: '5px',
            borderBottom: '1px solid #374151'
          }}>
            <span style={{ color: '#9ca3af' }}>Stall Protection:</span>
            <span style={{ 
              color: debugInfo.stallProtectionActive ? '#ef4444' : '#10b981',
              fontWeight: 'bold'
            }}>
              {debugInfo.stallProtectionActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          
          {/* Angle of Attack Information */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '5px' }}>ANGLE OF ATTACK</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Current AoA:</span>
              <span style={{ 
                color: Math.abs(debugInfo.currentAoA) > debugInfo.criticalStallAoA ? '#ef4444' : 
                       Math.abs(debugInfo.currentAoA) > debugInfo.stallWarningAoA ? '#f59e0b' : '#10b981',
                fontWeight: 'bold'
              }}>
                {debugInfo.currentAoA.toFixed(1)}°
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Target AoA:</span>
              <span>{debugInfo.targetAoA}°</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Warning Level:</span>
              <span>{debugInfo.stallWarningAoA}°</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Critical Level:</span>
              <span>{debugInfo.criticalStallAoA}°</span>
            </div>
          </div>
          
          {/* Pitch Control Information */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '5px' }}>PITCH CONTROL</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Current Pitch:</span>
              <span>{debugInfo.pitch.toFixed(1)}°</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Target Pitch:</span>
              <span style={{ 
                color: debugInfo.targetPitch < debugInfo.pitch ? '#10b981' : '#ef4444'
              }}>
                {debugInfo.targetPitch.toFixed(1)}°
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Pitch Error:</span>
              <span style={{ 
                color: Math.abs(debugInfo.pitchError) > 5 ? '#ef4444' : 
                       Math.abs(debugInfo.pitchError) > 1 ? '#f59e0b' : '#10b981'
              }}>
                {debugInfo.pitchError.toFixed(1)}°
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>AoA Correction:</span>
              <span style={{ 
                color: debugInfo.aoaCorrection < 0 ? '#10b981' : '#ef4444'
              }}>
                {debugInfo.aoaCorrection.toFixed(1)}°
              </span>
            </div>
          </div>
          
          {/* Flight Parameters */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '5px' }}>FLIGHT PARAMETERS</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Altitude:</span>
              <span>{Math.round(debugInfo.altitude)} ft</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Airspeed:</span>
              <span>{Math.round(debugInfo.airspeed)} kts</span>
            </div>
          </div>
          
          {/* Stall Protection Status */}
          {debugInfo.stallProtectionActive && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              padding: '8px',
              marginTop: '10px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#ef4444'
            }}>
              ⚠️ STALL PROTECTION ACTIVE ⚠️
            </div>
          )}
          
          {/* Test Controls */}
          <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #374151' }}>
            <div style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '5px' }}>TEST CONTROLS</div>
            <div style={{ display: 'flex', gap: '5px', fontSize: '10px' }}>
              <button 
                onClick={() => flightPhysicsRef.current.setTestConfiguration(3000, 190)}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '3px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Low Alt
              </button>
              <button 
                onClick={() => flightPhysicsRef.current.setTestConfiguration(35000, 250)}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '3px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                High Alt
              </button>
              <button 
                onClick={() => flightPhysicsRef.current.setTestConfiguration(10000, 140)}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '3px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Slow Flight
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutopilotDebugPanel;