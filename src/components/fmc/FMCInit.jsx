import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { randomFlightService } from '../../services/randomFlightService';
import { procedureMatchesWaypoint } from '../../utils/routeGenerator';

const DEFAULT_RANDOM_ROUTE_DETAILS = {
  departureGate: '',
  departureTaxiway: '',
  departureRunway: '',
  sid: '',
  waypoints: [],
  star: '',
  landingRunway: '',
  landingTaxiway: '',
  arrivalGate: '',
  alternate: null
};

const FMCInit = ({ aircraftData, preflightConfig, onUpdatePreflight, aircraftSuggestions }) => {
  const [isRandomizingDispatch, setIsRandomizingDispatch] = useState(false);
  const cruiseSpeed = useMemo(() => {
    const base = 450;
    const reserveFactor = Number(preflightConfig?.fuelReserve || 0);
    return Math.max(250, Math.round(base - reserveFactor * 10));
  }, [preflightConfig?.fuelReserve]);

  const routeProcedureSummary = useMemo(() => {
    const waypoints = preflightConfig?.routeDetails?.waypoints || [];
    const firstWaypoint = waypoints[0]?.name || '';
    const lastWaypoint = waypoints[waypoints.length - 1]?.name || '';
    const sid = preflightConfig?.routeDetails?.sid || '';
    const star = preflightConfig?.routeDetails?.star || '';

    const sidValid = firstWaypoint ? procedureMatchesWaypoint(sid, firstWaypoint) : Boolean(sid);
    const starValid = lastWaypoint ? procedureMatchesWaypoint(star, lastWaypoint) : Boolean(star);

    return {
      firstWaypoint,
      lastWaypoint,
      sid,
      star,
      sidValid,
      starValid,
      hasRoute: waypoints.length > 0
    };
  }, [preflightConfig?.routeDetails]);

  const handleRandomDispatch = async () => {
    try {
      setIsRandomizingDispatch(true);
      const randomFlight = await randomFlightService.generateRandomFlightParameters();
      onUpdatePreflight?.({
        airline: randomFlight.airline,
        callsign: randomFlight.callsign,
        aircraftModel: randomFlight.aircraftModel,
        cruiseHeight: randomFlight.cruiseHeight,
        pax: randomFlight.pax,
        payload: randomFlight.payload,
        fuelReserve: randomFlight.fuelReserve,
        useRandomTime: randomFlight.useRandomTime,
        useRandomSeason: randomFlight.useRandomSeason,
        timeZulu: '',
        season: '',
        selectedDeparture: randomFlight.selectedDeparture,
        selectedArrival: randomFlight.selectedArrival,
        routeDetails: randomFlight.routeDetails || DEFAULT_RANDOM_ROUTE_DETAILS,
        flightPlan: null
      });
    } catch (error) {
      console.error('Error randomizing dispatch in tablet:', error);
    } finally {
      setIsRandomizingDispatch(false);
    }
  };

  return (
    <div className="fmc-page">
      <h4 className="fmc-page-title">INITIALIZATION</h4>

      <div className="fmc-section fmc-dispatch-randomizer">
        <div>
          <div className="fmc-label">Dispatch Draft</div>
          <div className="fmc-section-subtitle">Generate a random airline, callsign, aircraft, route, and load sheet.</div>
        </div>
        <button
          type="button"
          className="fmc-btn-secondary fmc-inline-action"
          onClick={handleRandomDispatch}
          disabled={isRandomizingDispatch}
        >
          {isRandomizingDispatch ? 'Generating…' : 'Random Dispatch'}
        </button>
      </div>

      <div className="fmc-input-group">
        <label>Flight Number</label>
        <input
          type="text"
          value={preflightConfig?.callsign || ''}
          onChange={(e) => onUpdatePreflight?.({ callsign: e.target.value })}
          placeholder="e.g. UAL123"
        />
      </div>

      <div className="fmc-input-group">
        <label>Airline</label>
        <input
          type="text"
          value={preflightConfig?.airline || ''}
          onChange={(e) => onUpdatePreflight?.({ airline: e.target.value })}
          placeholder="e.g. United"
        />
      </div>

      <div className="fmc-input-group">
        <label>Aircraft Model</label>
        <select
          value={preflightConfig?.aircraftModel || ''}
          onChange={(e) => onUpdatePreflight?.({ aircraftModel: e.target.value })}
        >
          <option value="">Select aircraft</option>
          {aircraftSuggestions?.map((aircraft) => (
            <option key={aircraft.model} value={aircraft.model}>
              {aircraft.model}
            </option>
          ))}
        </select>
      </div>

      <div className="fmc-input-group">
        <label>Cruise Altitude (ft)</label>
        <input
          type="number"
          value={preflightConfig?.cruiseHeight || 0}
          onChange={(e) => onUpdatePreflight?.({ cruiseHeight: Number(e.target.value) })}
          step="1000"
        />
      </div>

      <div className="fmc-section">
        <div className="fmc-label">EST CRUISE SPD</div>
        <div className="fmc-value">{cruiseSpeed} KTAS</div>
      </div>

      {routeProcedureSummary.hasRoute && (
        <div className="fmc-section">
          <div className="fmc-label">Route Convention</div>
          <div className="fmc-airport-meta">
            <span>SID {routeProcedureSummary.sid || '---'} → {routeProcedureSummary.firstWaypoint || '---'} {routeProcedureSummary.sidValid ? 'OK' : 'MISMATCH'}</span>
            <span>STAR {routeProcedureSummary.star || '---'} → {routeProcedureSummary.lastWaypoint || '---'} {routeProcedureSummary.starValid ? 'OK' : 'MISMATCH'}</span>
          </div>
        </div>
      )}

      {aircraftData && (
        <div className="fmc-section">
          <div className="fmc-label">AIRCRAFT</div>
          <div className="fmc-value">{aircraftData.name || preflightConfig?.aircraftModel || 'Unknown'}</div>
        </div>
      )}
    </div>
  );
};

FMCInit.propTypes = {
  aircraftData: PropTypes.object,
  preflightConfig: PropTypes.object,
  onUpdatePreflight: PropTypes.func,
  aircraftSuggestions: PropTypes.array
};

export default FMCInit;
