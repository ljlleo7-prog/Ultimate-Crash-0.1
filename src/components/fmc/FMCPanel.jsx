import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import FMCService from '../../services/FMCService';
import FMCInit from './FMCInit';
import FMCRoute from './FMCRoute';
import FMCLegs from './FMCLegs';
import FMCProgress from './FMCProgress';
import FMCPerformance from './FMCPerformance';
import './FMCPanel.css';

const FMCPanel = ({
  onClose,
  flightPlan,
  onUpdateFlightPlan,
  flightState,
  aircraftData,
  aircraftSuggestions,
  weatherData,
  preflightMode = false,
  preflightConfig,
  routeDetails,
  onUpdatePreflight,
  onUpdateRouteDetails,
  onSelectDeparture,
  onSelectArrival,
  routeSearchState,
  tabletReadiness,
  routeValidation
}) => {
  const [activePage, setActivePage] = useState(preflightMode ? 'init' : 'progress');
  const fmcService = useMemo(() => new FMCService(), []);

  const pages = [
    { id: 'init', label: 'Overview', icon: '🧾' },
    { id: 'route', label: 'Route', icon: '🗺️' },
    { id: 'legs', label: 'Legs', icon: '📍' },
    { id: 'progress', label: 'Live', icon: '📊' },
    { id: 'perf', label: 'Load', icon: '✈️' }
  ];

  const visiblePages = preflightMode ? pages.filter((page) => page.id !== 'progress' || !preflightMode) : pages;

  const handleUpdateLegs = (waypoints) => {
    if (preflightMode) {
      onUpdateRouteDetails?.({ waypoints });
      return;
    }
    onUpdateFlightPlan?.(waypoints);
  };

  return (
    <div className={`fmc-panel ${preflightMode ? 'preflight-tablet' : ''}`.trim()}>
      <div className="fmc-header">
        <div>
          <div className="fmc-kicker">{preflightMode ? 'Dispatch tablet' : 'Flight computer'}</div>
          <h3>{preflightMode ? 'Preflight setup' : 'Flight Computer'}</h3>
        </div>
        {preflightMode ? (
          <div className="fmc-tablet-statusbar">
            <span className={`fmc-status-pill ${tabletReadiness?.isRouteReady ? 'ready' : ''}`}>Route</span>
            <span className={`fmc-status-pill ${tabletReadiness?.isLoadoutReady ? 'ready' : ''}`}>Loadout</span>
            <span className={`fmc-status-pill ${tabletReadiness?.isPerformanceReady ? 'ready' : ''}`}>Perf</span>
          </div>
        ) : (
          <button className="fmc-close" onClick={onClose}>×</button>
        )}
      </div>

      <div className="fmc-nav">
        {visiblePages.map((page) => (
          <button key={page.id} className={`fmc-nav-btn ${activePage === page.id ? 'active' : ''}`} onClick={() => setActivePage(page.id)}>
            <span className="fmc-nav-icon">{page.icon}</span>
            <span className="fmc-nav-label">{page.label}</span>
          </button>
        ))}
      </div>

      <div className="fmc-content">
        {activePage === 'init' && <FMCInit aircraftData={aircraftData} preflightConfig={preflightConfig} onUpdatePreflight={onUpdatePreflight} aircraftSuggestions={aircraftSuggestions} />}
        {activePage === 'route' && (
          <FMCRoute
            routeDetails={routeDetails}
            selectedDeparture={preflightConfig?.selectedDeparture}
            selectedArrival={preflightConfig?.selectedArrival}
            onSelectDeparture={onSelectDeparture}
            onSelectArrival={onSelectArrival}
            onUpdateRouteDetails={onUpdateRouteDetails}
            flightState={flightState}
            routeSearchState={routeSearchState}
            routeValidation={routeValidation}
          />
        )}
        {activePage === 'legs' && <FMCLegs flightPlan={flightPlan} onUpdateFlightPlan={handleUpdateLegs} flightState={flightState} />}
        {!preflightMode && activePage === 'progress' && <FMCProgress fmcService={fmcService} flightPlan={flightPlan} flightState={flightState} />}
        {activePage === 'perf' && (
          <FMCPerformance
            preflightConfig={preflightConfig}
            aircraftData={aircraftData}
            flightState={flightState}
            weatherData={weatherData}
            onUpdatePreflight={onUpdatePreflight}
            readiness={tabletReadiness}
          />
        )}
      </div>
    </div>
  );
};

FMCPanel.propTypes = {
  onClose: PropTypes.func,
  flightPlan: PropTypes.any,
  onUpdateFlightPlan: PropTypes.func,
  flightState: PropTypes.object,
  aircraftData: PropTypes.object,
  weatherData: PropTypes.object,
  preflightMode: PropTypes.bool,
  preflightConfig: PropTypes.object,
  routeDetails: PropTypes.object,
  onUpdatePreflight: PropTypes.func,
  onUpdateRouteDetails: PropTypes.func,
  onSelectDeparture: PropTypes.func,
  onSelectArrival: PropTypes.func,
  routeSearchState: PropTypes.object,
  tabletReadiness: PropTypes.object,
  routeValidation: PropTypes.object,
  aircraftSuggestions: PropTypes.any
};

export default FMCPanel;
