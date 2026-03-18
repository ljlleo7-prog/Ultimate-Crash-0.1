import { useState } from 'react';
import PropTypes from 'prop-types';
import { airportService } from '../../services/airportService';

const FMCRoute = ({ fmcService, flightState }) => {
  const data = fmcService.getData();
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDest, setSearchDest] = useState('');
  const [searchAlt, setSearchAlt] = useState('');

  const handleSetOrigin = () => {
    const results = airportService.searchAirports(searchOrigin);
    if (results.length > 0) {
      fmcService.setRoute(results[0], data.destination, data.alternate);
      setSearchOrigin('');
    }
  };

  const handleSetDest = () => {
    const results = airportService.searchAirports(searchDest);
    if (results.length > 0) {
      fmcService.setRoute(data.origin, results[0], data.alternate);
      setSearchDest('');
    }
  };

  const handleSetAlternate = () => {
    const results = airportService.searchAirports(searchAlt);
    if (results.length > 0) {
      fmcService.setRoute(data.origin, data.destination, results[0]);
      setSearchAlt('');
    }
  };

  return (
    <div className="fmc-page">
      <h4 className="fmc-page-title">ROUTE</h4>

      <div className="fmc-route-field">
        <div className="fmc-label">ORIGIN</div>
        {data.origin ? (
          <div className="fmc-value">{data.origin.icao} - {data.origin.name}</div>
        ) : (
          <div className="fmc-input-inline">
            <input
              type="text"
              value={searchOrigin}
              onChange={(e) => setSearchOrigin(e.target.value)}
              placeholder="Search ICAO/IATA"
            />
            <button onClick={handleSetOrigin}>Set</button>
          </div>
        )}
      </div>

      <div className="fmc-route-field">
        <div className="fmc-label">DESTINATION</div>
        {data.destination ? (
          <div className="fmc-value">{data.destination.icao} - {data.destination.name}</div>
        ) : (
          <div className="fmc-input-inline">
            <input
              type="text"
              value={searchDest}
              onChange={(e) => setSearchDest(e.target.value)}
              placeholder="Search ICAO/IATA"
            />
            <button onClick={handleSetDest}>Set</button>
          </div>
        )}
      </div>

      <div className="fmc-route-field">
        <div className="fmc-label">ALTERNATE</div>
        {data.alternate ? (
          <div className="fmc-value">{data.alternate.icao} - {data.alternate.name}</div>
        ) : (
          <div className="fmc-input-inline">
            <input
              type="text"
              value={searchAlt}
              onChange={(e) => setSearchAlt(e.target.value)}
              placeholder="Optional"
            />
            <button onClick={handleSetAlternate}>Set</button>
          </div>
        )}
      </div>

      {flightState && (
        <div className="fmc-section">
          <div className="fmc-label">CURRENT POSITION</div>
          <div className="fmc-value">
            {flightState.latitude?.toFixed(4)}, {flightState.longitude?.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
};

FMCRoute.propTypes = {
  fmcService: PropTypes.object.isRequired,
  flightState: PropTypes.object
};

export default FMCRoute;
