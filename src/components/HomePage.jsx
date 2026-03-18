import React from 'react';
import './HomePage.css'; // We'll create this CSS file

const HomePage = ({ onStartSinglePlayer, onStartTutorial, onOpenSettings }) => {
  return (
    <div className="homepage-container">
      <div className="homepage-content">
        <h1 className="game-title">ULTIMATE CRASH</h1>
        <h2 className="game-subtitle">FLIGHT SIMULATOR</h2>
        
        <div className="menu-options">
          <button className="menu-btn" onClick={onStartSinglePlayer}>
            <span className="btn-icon">✈️</span>
            <span className="btn-text">SINGLE PLAYER</span>
            <span className="btn-desc">Start a new flight simulation</span>
          </button>
          
          <button className="menu-btn disabled" title="Coming Soon">
            <span className="btn-icon">🌐</span>
            <span className="btn-text">MULTIPLAYER</span>
            <span className="btn-desc">Join pilots worldwide (Coming Soon)</span>
          </button>
          
          <button className="menu-btn" onClick={onStartTutorial}>
            <span className="btn-icon">🎓</span>
            <span className="btn-text">TUTORIAL</span>
            <span className="btn-desc">Learn the basics of flight</span>
          </button>
          
          <button className="menu-btn" onClick={onOpenSettings}>
            <span className="btn-icon">⚙️</span>
            <span className="btn-text">SETTINGS</span>
            <span className="btn-desc">Configure game options</span>
          </button>
        </div>
      </div>
      
      <div className="homepage-footer">
        <p>Version 0.1-legacy | ©2026 GeeksProductionStudio</p>
      </div>
    </div>
  );
};

export default HomePage;
