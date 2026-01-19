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
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'auto',
      minWidth: '300px',
      height: 'auto',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontSize: '4rem',
      fontWeight: 'bold',
      color: '#ff0000',
      textShadow: '0 0 20px #ff0000, 0 0 40px #ff0000',
      padding: '30px 60px',
      borderRadius: '10px',
      border: '4px solid #ff0000',
      boxShadow: '0 0 50px rgba(255, 0, 0, 0.5)',
      animation: blinkAnimation,
      pointerEvents: 'none',
      transition: 'opacity 0.3s ease',
      fontFamily: 'monospace',
      letterSpacing: '5px'
    }
  }, flashText);
};

export default CrashWarningFlash;
