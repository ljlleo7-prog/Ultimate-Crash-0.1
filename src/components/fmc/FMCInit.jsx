import { useState } from 'react';
import PropTypes from 'prop-types';

const FMCInit = ({ fmcService, aircraftData }) => {
  const data = fmcService.getData();
  const [flightNum, setFlightNum] = useState(data.flightNumber);
  const [costIndex, setCostIndex] = useState(data.costIndex);
  const [cruiseAlt, setCruiseAlt] = useState(data.cruiseAlt);
  const [cruiseSpeed, setCruiseSpeed] = useState(data.cruiseSpeed);

  const handleSave = () => {
    fmcService.setFlightInfo(flightNum, costIndex);
    fmcService.setCruise(cruiseAlt, cruiseSpeed);
  };

  return (
    <div className="fmc-page">
      <h4 className="fmc-page-title">INITIALIZATION</h4>

      <div className="fmc-input-group">
        <label>Flight Number</label>
        <input
          type="text"
          value={flightNum}
          onChange={(e) => setFlightNum(e.target.value)}
          placeholder="e.g. UAL123"
        />
      </div>

      <div className="fmc-input-group">
        <label>Cost Index (0-999)</label>
        <input
          type="number"
          value={costIndex}
          onChange={(e) => setCostIndex(Number(e.target.value))}
          min="0"
          max="999"
        />
        <small>Higher = faster, more fuel</small>
      </div>

      <div className="fmc-input-group">
        <label>Cruise Altitude (ft)</label>
        <input
          type="number"
          value={cruiseAlt}
          onChange={(e) => setCruiseAlt(Number(e.target.value))}
          step="1000"
        />
      </div>

      <div className="fmc-input-group">
        <label>Cruise Speed (KTAS)</label>
        <input
          type="number"
          value={cruiseSpeed}
          onChange={(e) => setCruiseSpeed(Number(e.target.value))}
        />
      </div>

      {aircraftData && (
        <div className="fmc-section">
          <div className="fmc-label">AIRCRAFT</div>
          <div className="fmc-value">{aircraftData.name || 'Unknown'}</div>
        </div>
      )}

      <button className="fmc-btn-primary" onClick={handleSave}>Save</button>
    </div>
  );
};

FMCInit.propTypes = {
  fmcService: PropTypes.object.isRequired,
  aircraftData: PropTypes.object
};

export default FMCInit;
