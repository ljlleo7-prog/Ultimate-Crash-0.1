import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import FMCService from '../../services/FMCService';
import FMCInit from './FMCInit';
import FMCRoute from './FMCRoute';
import FMCLegs from './FMCLegs';
import FMCProgress from './FMCProgress';
import FMCPerformance from './FMCPerformance';
import './FMCPanel.css';

const FMCPanel = ({ onClose, flightPlan, onUpdateFlightPlan, flightState, aircraftData }) => {
  const [fmcService] = useState(() => new FMCService());
  const [activePage, setActivePage] = useState('progress');

  const pages = [
    { id: 'init', label: 'INIT', icon: '⚙️' },
    { id: 'route', label: 'RTE', icon: '🗺️' },
    { id: 'legs', label: 'LEGS', icon: '📍' },
    { id: 'progress', label: 'PROG', icon: '📊' },
    { id: 'perf', label: 'PERF', icon: '✈️' }
  ];

  return (
    <div className="fmc-panel">
      <div className="fmc-header">
        <h3>Flight Computer</h3>
        <button className="fmc-close" onClick={onClose}>×</button>
      </div>

      <div className="fmc-nav">
        {pages.map(page => (
          <button
            key={page.id}
            className={`fmc-nav-btn ${activePage === page.id ? 'active' : ''}`}
            onClick={() => setActivePage(page.id)}
          >
            <span className="fmc-nav-icon">{page.icon}</span>
            <span className="fmc-nav-label">{page.label}</span>
          </button>
        ))}
      </div>

      <div className="fmc-content">
        {activePage === 'init' && <FMCInit fmcService={fmcService} aircraftData={aircraftData} />}
        {activePage === 'route' && <FMCRoute fmcService={fmcService} flightState={flightState} />}
        {activePage === 'legs' && <FMCLegs flightPlan={flightPlan} onUpdateFlightPlan={onUpdateFlightPlan} flightState={flightState} />}
        {activePage === 'progress' && <FMCProgress fmcService={fmcService} flightPlan={flightPlan} flightState={flightState} />}
        {activePage === 'perf' && <FMCPerformance fmcService={fmcService} aircraftData={aircraftData} flightState={flightState} />}
      </div>
    </div>
  );
};

FMCPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
  flightPlan: PropTypes.any,
  onUpdateFlightPlan: PropTypes.func,
  flightState: PropTypes.object,
  aircraftData: PropTypes.object
};

export default FMCPanel;
