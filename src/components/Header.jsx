import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ devMode, setDevMode, handleDevStart }) => {
  const { t } = useLanguage();
  const { user, signInWithSSO, signOut } = useAuth();

  return (
    <header className="app-header">
      <div className="auth-status" style={{ position: 'absolute', top: '20px', left: '20px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#fff' }}>
              {user.email}
            </span>
            <button
              onClick={signOut}
              style={{
                background: 'transparent',
                border: '1px solid #fff',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithSSO}
            style={{
              backgroundColor: '#333',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🔐</span> SSO Sign in
          </button>
        )}
      </div>

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
