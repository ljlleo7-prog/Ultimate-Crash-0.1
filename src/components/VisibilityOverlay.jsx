import React from 'react';

const VisibilityOverlay = ({ visibility }) => {
  // visibility is in meters
  // < 500m: Dense Fog (High Opacity)
  // 500m - 2000m: Mist (Medium Opacity)
  // 2000m - 8000m: Haze (Low Opacity)
  // > 8000m: Clear (Zero Opacity)

  if (visibility === undefined || visibility === null) return null;

  let opacity = 0;
  if (visibility < 500) {
    // 0m -> 0.95, 500m -> 0.8
    opacity = 0.95 - (visibility / 500) * 0.15;
  } else if (visibility < 2000) {
    // 500m -> 0.8, 2000m -> 0.4
    opacity = 0.8 - ((visibility - 500) / 1500) * 0.4;
  } else if (visibility < 8000) {
    // 2000m -> 0.4, 8000m -> 0.0
    opacity = 0.4 - ((visibility - 2000) / 6000) * 0.4;
  }

  if (opacity <= 0) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#e2e8f0', // Slate-200 (cloud color)
        opacity: opacity,
        pointerEvents: 'none',
        zIndex: 50, // Above everything but critical UI/Modals
        transition: 'opacity 2s ease-in-out'
      }}
    />
  );
};

export default VisibilityOverlay;
