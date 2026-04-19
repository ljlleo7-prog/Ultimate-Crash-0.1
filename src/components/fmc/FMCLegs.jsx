import { useState } from 'react';
import PropTypes from 'prop-types';

const FMCLegs = ({ flightPlan, onUpdateFlightPlan, flightState, fmcService, planView }) => {
  const activeLegs = planView?.model?.fms?.activePlan?.legs || [];
  const temporaryLegs = planView?.model?.fms?.temporaryPlan?.legs || [];
  const waypoints = temporaryLegs.length > 0 ? temporaryLegs : (Array.isArray(flightPlan) ? flightPlan : (flightPlan?.waypoints || []));
  const [editIdx, setEditIdx] = useState(null);
  const [altConstraint, setAltConstraint] = useState('');
  const [spdConstraint, setSpdConstraint] = useState('');

  const currentIdx = flightState?.currentWaypointIndex || planView?.model?.fms?.currentWaypointIndex || 0;
  const isTempPlan = Boolean(planView?.validation?.execPending);

  const handleSaveConstraint = (idx) => {
    const nextPlan = fmcService.updateLegConstraints(flightPlan, idx, {
      altConstraint: altConstraint ? Number(altConstraint) : null,
      spdConstraint: spdConstraint ? Number(spdConstraint) : null
    });
    onUpdateFlightPlan?.(nextPlan);
    setEditIdx(null);
    setAltConstraint('');
    setSpdConstraint('');
  };

  const handleDelete = (idx) => {
    onUpdateFlightPlan?.(fmcService.removeLeg(flightPlan, idx));
  };

  const handleInsertDiscontinuity = (idx) => {
    onUpdateFlightPlan?.(fmcService.insertDiscontinuity(flightPlan, idx + 1));
  };

  return (
    <div className="fmc-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 className="fmc-page-title">LEGS</h4>
        <span className={`fmc-status-pill ${isTempPlan ? '' : 'ready'}`}>{isTempPlan ? 'TEMP' : 'ACTIVE'}</span>
      </div>

      {waypoints.length === 0 ? (
        <div className="fmc-empty">No waypoints in flight plan</div>
      ) : (
        <div className="fmc-legs-list">
          {waypoints.map((wp, idx) => {
            const isActive = idx === currentIdx;
            const isPassed = idx < currentIdx;
            const activeLeg = activeLegs[idx];
            const isChanged = Boolean(isTempPlan && JSON.stringify(activeLeg || null) !== JSON.stringify(wp || null));
            const waypointLabel = wp.ident || wp.label || wp.name || wp.id || `WPT${idx + 1}`;
            const isDiscontinuity = wp.type === 'discontinuity' || wp.isDiscontinuity;
            const latitudeText = Number.isFinite(wp.latitude) ? wp.latitude.toFixed(4) : '---';
            const longitudeText = Number.isFinite(wp.longitude) ? wp.longitude.toFixed(4) : '---';

            return (
              <div key={`${waypointLabel}-${idx}`} className={`fmc-leg-item ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}>
                <div className="fmc-leg-header">
                  <span className="fmc-leg-num">{idx + 1}</span>
                  <span className="fmc-leg-label">{waypointLabel}</span>
                  {isActive && <span className="fmc-leg-badge">ACTIVE</span>}
                  {isChanged && <span className="fmc-leg-badge" style={{ background: '#f59e0b', color: '#0f172a' }}>MOD</span>}
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
                    <div className="fmc-leg-coords">{latitudeText}, {longitudeText}</div>
                    {isDiscontinuity ? (
                      <div className="fmc-leg-constraints"><span>Route discontinuity — EXEC required after edits</span></div>
                    ) : (
                      (wp.altConstraint || wp.spdConstraint) && (
                        <div className="fmc-leg-constraints">
                          {wp.altConstraint && <span>ALT: {wp.altConstraint} ft</span>}
                          {wp.spdConstraint && <span>SPD: {wp.spdConstraint} kt</span>}
                        </div>
                      )
                    )}
                    <div className="fmc-leg-actions">
                      {!isDiscontinuity && (
                        <button onClick={() => {
                          setEditIdx(idx);
                          setAltConstraint(wp.altConstraint || '');
                          setSpdConstraint(wp.spdConstraint || '');
                        }}>Edit</button>
                      )}
                      <button onClick={() => handleInsertDiscontinuity(idx)}>DISCO</button>
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
  flightState: PropTypes.object,
  fmcService: PropTypes.object,
  planView: PropTypes.object
};

export default FMCLegs;
