import PropTypes from 'prop-types';
import { airportService } from '../../services/airportService';

const FMCProgress = ({ fmcService, flightPlan, flightState }) => {
  const waypoints = Array.isArray(flightPlan) ? flightPlan : (flightPlan?.waypoints || []);
  const currentIdx = flightState?.currentWaypointIndex || 0;
  const nextWp = waypoints[currentIdx];
  const gs = flightState?.groundSpeed || 0;

  let distToNext = 0, eteNext = 0;
  if (nextWp && flightState?.latitude) {
    distToNext = airportService.calculateDistance(
      { latitude: flightState.latitude, longitude: flightState.longitude },
      { latitude: nextWp.latitude, longitude: nextWp.longitude }
    );
    eteNext = gs > 10 ? (distToNext / gs) * 60 : 0;
  }

  const fuelFlow = (flightState?.engineFuelFlow || []).reduce((a, b) => a + b, 0) * 3600;
  const fuelRemain = flightState?.fuel || 0;
  const endurance = fuelFlow > 0 ? fuelRemain / fuelFlow : 0;

  const tod = fmcService.calculateTOD(flightState?.altitude || 0, 3000, gs);

  return (
    <div className="fmc-page">
      <h4 className="fmc-page-title">PROGRESS</h4>

      <div className="fmc-section">
        <div className="fmc-label">ACTIVE WAYPOINT</div>
        <div className="fmc-value large">{nextWp?.label || '---'}</div>
      </div>

      <div className="fmc-grid">
        <div className="fmc-field">
          <div className="fmc-label">DIST</div>
          <div className="fmc-value">{distToNext.toFixed(1)} NM</div>
        </div>
        <div className="fmc-field">
          <div className="fmc-label">ETE</div>
          <div className="fmc-value">{Math.floor(eteNext)}:{String(Math.floor((eteNext % 1) * 60)).padStart(2, '0')}</div>
        </div>
      </div>

      <div className="fmc-section">
        <div className="fmc-label">FUEL</div>
        <div className="fmc-grid">
          <div className="fmc-field">
            <div className="fmc-label">REMAIN</div>
            <div className="fmc-value">{fuelRemain.toFixed(0)} KG</div>
          </div>
          <div className="fmc-field">
            <div className="fmc-label">ENDURANCE</div>
            <div className="fmc-value">{Math.floor(endurance)}H {Math.floor((endurance % 1) * 60)}M</div>
          </div>
        </div>
      </div>

      {tod && (
        <div className="fmc-section">
          <div className="fmc-label">TOP OF DESCENT</div>
          <div className="fmc-value">{tod.distance.toFixed(1)} NM / {Math.floor(tod.time)} MIN</div>
        </div>
      )}

      <div className="fmc-section">
        <div className="fmc-grid">
          <div className="fmc-field">
            <div className="fmc-label">GS</div>
            <div className="fmc-value">{gs.toFixed(0)} KT</div>
          </div>
          <div className="fmc-field">
            <div className="fmc-label">ALT</div>
            <div className="fmc-value">{(flightState?.altitude || 0).toFixed(0)} FT</div>
          </div>
        </div>
      </div>
    </div>
  );
};

FMCProgress.propTypes = {
  fmcService: PropTypes.object.isRequired,
  flightPlan: PropTypes.any,
  flightState: PropTypes.object
};

export default FMCProgress;
