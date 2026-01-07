import React from 'react';

const CrashPanel = ({ showCrashPanel, resetFlight }) => {
  if (!showCrashPanel) return null;
  
  return React.createElement('div', {
    className: 'crash-panel',
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(139, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
      color: 'white',
      fontSize: '3rem',
      fontWeight: 'bold'
    }
  },
    React.createElement('h1', { style: { fontSize: '5rem', marginBottom: '2rem' } }, 'CRASHED'),
    React.createElement('div', { style: { fontSize: '2rem', marginBottom: '1rem' } }, 'Final Score: 0'),
    React.createElement('div', { style: { fontSize: '1.5rem', marginBottom: '2rem' } }, 'You failed to maintain control of the aircraft'),
    React.createElement('button', {
      onClick: resetFlight,
      style: {
        padding: '1rem 2rem',
        fontSize: '1.5rem',
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }
    }, 'Try Again')
  );
};

export default CrashPanel;