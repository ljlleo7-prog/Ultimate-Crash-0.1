import React from 'react';
import PropTypes from 'prop-types';
import { useLanguage } from '../contexts/LanguageContext';

const CrashPanel = ({ showCrashPanel, resetFlight }) => {
  const { t } = useLanguage();
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
    React.createElement('h1', { style: { fontSize: '5rem', marginBottom: '2rem' } }, t('ui.crash.crashed')),
    React.createElement('div', { style: { fontSize: '2rem', marginBottom: '1rem' } }, t('ui.crash.final_score', { score: 0 })),
    React.createElement('div', { style: { fontSize: '1.5rem', marginBottom: '2rem' } }, t('ui.crash.failed_control')),
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
    }, t('ui.crash.try_again'))
  );
};

export default CrashPanel;

CrashPanel.propTypes = {
  showCrashPanel: PropTypes.bool,
  resetFlight: PropTypes.func.isRequired
};
