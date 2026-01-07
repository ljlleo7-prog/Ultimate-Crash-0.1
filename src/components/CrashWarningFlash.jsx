import React, { useState, useEffect } from 'react';

const CrashWarningFlash = ({ flashActive, flashText, onAlertComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  
  useEffect(() => {
    if (flashActive) {
      // Show the alert
      setIsVisible(true);
      setIsBlinking(true);
      
      // Blink for 3 cycles (600ms total)
      const blinkTimer = setTimeout(() => {
        setIsBlinking(false);
      }, 600);
      
      // Auto-hide after blinking completes
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        if (onAlertComplete) {
          onAlertComplete();
        }
      }, 1000); // Total display time: 1 second
      
      return () => {
        clearTimeout(blinkTimer);
        clearTimeout(hideTimer);
      };
    } else {
      // If flashActive becomes false, hide immediately
      setIsVisible(false);
      setIsBlinking(false);
    }
  }, [flashActive, onAlertComplete]);
  
  if (!isVisible) return null;
  
  const warningClass = 'crash-warning-flash';
  const blinkAnimation = isBlinking ? 'flashBlink 0.2s 3' : 'none';
  
  return React.createElement('div', {
    className: warningClass,
    style: {
      position: 'fixed',
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'auto',
      minWidth: '300px',
      height: 'auto',
      backgroundColor: 'rgba(255, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontSize: '3rem',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '2px 2px 4px black',
      padding: '20px 40px',
      borderRadius: '10px',
      border: '3px solid white',
      animation: blinkAnimation,
      pointerEvents: 'none',
      transition: 'opacity 0.3s ease'
    }
  }, flashText);
};

export default CrashWarningFlash;