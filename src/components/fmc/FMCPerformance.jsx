import { useState } from 'react';
import PropTypes from 'prop-types';

const FMCPerformance = ({ fmcService, aircraftData, flightState }) => {
  const data = fmcService.getData();
  const [vr, setVr] = useState(data.takeoff.vr);
  const [v2, setV2] = useState(data.takeoff.v2);
  const [vref, setVref] = useState(data.landing.vref);

  const handleCalculateTO = () => {
    const weight = (aircraftData?.mass || 70000) + (flightState?.fuel || 0);
    const estimatedVr = Math.sqrt(weight / 100) * 1.2;
    const estimatedV2 = estimatedVr * 1.13;
    setVr(Math.round(estimatedVr));
    setV2(Math.round(estimatedV2));
  };

  const handleCalculateLanding = () => {
    const weight = (aircraftData?.mass || 70000) + (flightState?.fuel || 0);
    const estimatedVref = Math.sqrt(weight / 100) * 1.15;
    setVref(Math.round(estimatedVref));
  };

  return (
    <div className="fmc-page">
      <h4 className="fmc-page-title">PERFORMANCE</h4>

      <div className="fmc-section">
        <div className="fmc-label">TAKEOFF</div>
        <div className="fmc-perf-grid">
          <div className="fmc-input-group">
            <label>V<sub>R</sub> (kt)</label>
            <input type="number" value={vr} onChange={(e) => setVr(Number(e.target.value))} />
          </div>
          <div className="fmc-input-group">
            <label>V<sub>2</sub> (kt)</label>
            <input type="number" value={v2} onChange={(e) => setV2(Number(e.target.value))} />
          </div>
        </div>
        <button className="fmc-btn-secondary" onClick={handleCalculateTO}>Calculate</button>
      </div>

      <div className="fmc-section">
        <div className="fmc-label">LANDING</div>
        <div className="fmc-input-group">
          <label>V<sub>REF</sub> (kt)</label>
          <input type="number" value={vref} onChange={(e) => setVref(Number(e.target.value))} />
        </div>
        <button className="fmc-btn-secondary" onClick={handleCalculateLanding}>Calculate</button>
      </div>

      {flightState && (
        <div className="fmc-section">
          <div className="fmc-label">CURRENT WEIGHT</div>
          <div className="fmc-value">
            {((aircraftData?.mass || 0) + (flightState.fuel || 0)).toFixed(0)} KG
          </div>
        </div>
      )}
    </div>
  );
};

FMCPerformance.propTypes = {
  fmcService: PropTypes.object.isRequired,
  aircraftData: PropTypes.object,
  flightState: PropTypes.object
};

export default FMCPerformance;
