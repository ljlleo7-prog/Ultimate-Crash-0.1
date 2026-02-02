import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Header = ({ devMode, setDevMode, handleDevStart }) => {
  const { t } = useLanguage();

  return (
    <header className="app-header">
      <h1>{t('initialization.title')}</h1>
      <p>{t('initialization.subtitle')}</p>
      
      {/* Development mode toggle */}
      <div className="dev-mode-toggle" style={{ marginTop: '10px' }}>
        <button
          onClick={() => setDevMode(!devMode)}
          style={{
            backgroundColor: devMode ? '#ff6b6b' : '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {devMode ? '🔧 Dev Mode: ON' : '🔧 Dev Mode: OFF'}
        </button>
      </div>
      
      {/* Development mode quick start button */}
      {devMode && (
        <div className="dev-start" style={{ marginTop: '10px' }}>
          <button
            onClick={handleDevStart}
            style={{
              backgroundColor: '#ff4757',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🚀 Quick Start Physics Test
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
