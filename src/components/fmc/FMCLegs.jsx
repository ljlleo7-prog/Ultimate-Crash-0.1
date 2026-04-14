import { useState } from 'react';
import PropTypes from 'prop-types';

const FMCLegs = ({ flightPlan, onUpdateFlightPlan, flightState }) => {
  const waypoints = Array.isArray(flightPlan) ? flightPlan : (flightPlan?.waypoints || []);
  const [editIdx, setEditIdx] = useState(null);
  const [altConstraint, setAltConstraint] = useState('');
  const [spdConstraint, setSpdConstraint] = useState('');

  const currentIdx = flightState?.currentWaypointIndex || 0;

  const handleSaveConstraint = (idx) => {
    const newWaypoints = [...waypoints];
    newWaypoints[idx] = {
      ...newWaypoints[idx],
      altConstraint: altConstraint ? Number(altConstraint) : null,
      spdConstraint: spdConstraint ? Number(spdConstraint) : null
    };
    onUpdateFlightPlan?.(newWaypoints);
    setEditIdx(null);
    setAltConstraint('');
    setSpdConstraint('');
  };

  const handleDelete = (idx) => {
    const newWaypoints = waypoints.filter((_, i) => i !== idx);
    onUpdateFlightPlan?.(newWaypoints);
  };

  return (
    <div className="fmc-page">
      <h4 className="fmc-page-title">LEGS</h4>

      {waypoints.length === 0 ? (
        <div className="fmc-empty">No waypoints in flight plan</div>
      ) : (
        <div className="fmc-legs-list">
          {waypoints.map((wp, idx) => {
            const isActive = idx === currentIdx;
            const isPassed = idx < currentIdx;
            const waypointLabel = wp.label || wp.name || wp.id || `WPT${idx + 1}`;

            return (
              <div key={idx} className={`fmc-leg-item ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}>
                <div className="fmc-leg-header">
                  <span className="fmc-leg-num">{idx + 1}</span>
                  <span className="fmc-leg-label">{waypointLabel}</span>
                  {isActive && <span className="fmc-leg-badge">ACTIVE</span>}
                </div>

                {editIdx === idx ? (
                  <div className="fmc-leg-edit">
                    <input type="number" placeholder="Alt (ft)" value={altConstraint} onChange={(e) => setAltConstraint(e.target.value)} />
                    <input type="number" placeholder="Speed (kt)" value={spdConstraint} onChange={(e) => setSpdConstraint(e.target.value)} />
                    <button onClick={() => handleSaveConstraint(idx)}>Save</button>
                    <button onClick={() => setEditIdx(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className="fmc-leg-details">
                    <div className="fmc-leg-coords">{wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}</div>
                    {(wp.altConstraint || wp.spdConstraint) && (
                      <div className="fmc-leg-constraints">
                        {wp.altConstraint && <span>ALT: {wp.altConstraint} ft</span>}
                        {wp.spdConstraint && <span>SPD: {wp.spdConstraint} kt</span>}
                      </div>
                    )}
                    <div className="fmc-leg-actions">
                      <button onClick={() => {
                        setEditIdx(idx);
                        setAltConstraint(wp.altConstraint || '');
                        setSpdConstraint(wp.spdConstraint || '');
                      }}>Edit</button>
                      <button onClick={() => handleDelete(idx)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

FMCLegs.propTypes = {
  flightPlan: PropTypes.any,
  onUpdateFlightPlan: PropTypes.func,
  flightState: PropTypes.object
};

export default FMCLegs;
