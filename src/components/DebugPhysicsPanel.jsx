import React from 'react';

const DebugPhysicsPanel = ({ debugPhysicsData, thrust, drag, waypoints = [], flightData, groundStatus, remainingRunwayLength }) => {
  if (!debugPhysicsData) {
    return null;
  }

  const { 
    theta, 
    dynamicPressure_q, 
    pitchMoment_y, 
    pitchRate_q, 
    altitude_z, 
    isOnGround,
    lift,
    pitchTorque,
    alpha,
    Cm,
    CL,
    elevator,
    trim
  } = debugPhysicsData;

  // Extract LNAV/Autopilot info
  const autopilotMode = flightData?.autopilotMode || 'N/A';
  const targetHeading = flightData?.autopilotTargets?.heading !== undefined ? flightData.autopilotTargets.heading : 'N/A';
  const currentHeading = flightData?.heading !== undefined ? flightData.heading : 'N/A';
  const currentLat = flightData?.position?.latitude;
  const currentLon = flightData?.position?.longitude;
  const currentWaypointIndex = flightData?.currentWaypointIndex;
  
  // Find next waypoint
  let nextWaypoint = null;
  if (waypoints && typeof currentWaypointIndex === 'number' && waypoints[currentWaypointIndex]) {
    nextWaypoint = waypoints[currentWaypointIndex];
  }

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.85)',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: '11px',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 1000,
      border: '1px solid #333',
      minWidth: '220px',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '3px', color: '#cyan' }}>NAV / LNAV DEBUG</div>
      <div>Mode: <span style={{ color: autopilotMode === 'LNAV' ? '#3b82f6' : '#8b5cf6', fontWeight: 'bold' }}>{autopilotMode}</span></div>
      <div>Lat: {typeof currentLat === 'number' ? currentLat.toFixed(4) : 'N/A'}</div>
      <div>Lon: {typeof currentLon === 'number' ? currentLon.toFixed(4) : 'N/A'}</div>
      <div>Hdg (Cur): {typeof currentHeading === 'number' ? currentHeading.toFixed(1) : 'N/A'}°</div>
      <div>Hdg (Tgt): {typeof targetHeading === 'number' ? targetHeading.toFixed(1) : 'N/A'}°</div>
      <div>Next WP: {nextWaypoint ? (nextWaypoint.label || nextWaypoint.name || `Idx ${currentWaypointIndex}`) : 'None'}</div>
      {nextWaypoint && (
        <div style={{ paddingLeft: '8px', fontSize: '10px', color: '#aaa' }}>
          Loc: {nextWaypoint.latitude?.toFixed(4)}, {nextWaypoint.longitude?.toFixed(4)}
        </div>
      )}
      
      <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '3px' }}>DEBUG PHYSICS</div>
      <div>Pitch (θ): {typeof theta === 'number' ? (theta * 180 / Math.PI).toFixed(2) : 'N/A'} deg</div>
      <div>Alpha (α): {typeof alpha === 'number' ? (alpha * 180 / Math.PI).toFixed(2) : 'N/A'} deg</div>
      <div>Pitch Rate (q): {typeof pitchRate_q === 'number' ? (pitchRate_q * 180 / Math.PI).toFixed(2) : 'N/A'} deg/s</div>
      <div>Pitch Moment: {typeof pitchMoment_y === 'number' ? pitchMoment_y.toFixed(0) : 'N/A'} N·m</div>
      <div>Cm: {typeof Cm === 'number' ? Cm.toFixed(4) : 'N/A'}</div>
      <div>Elevator: {typeof elevator === 'number' ? elevator.toFixed(2) : 'N/A'}</div>
      <div>Trim: {typeof trim === 'number' ? trim.toFixed(2) : 'N/A'}</div>
      
      <div>Ground Moment Y: {debugPhysicsData.groundMomentY ? debugPhysicsData.groundMomentY.toFixed(0) : '0'}</div>

      <div>Lift: {typeof lift === 'number' ? (lift / 1000).toFixed(1) : 'N/A'} kN (CL: {typeof CL === 'number' ? CL.toFixed(2) : 'N/A'})</div>
      <div>Dynamic Pressure (q): {typeof dynamicPressure_q === 'number' ? dynamicPressure_q.toFixed(2) : 'N/A'} Pa</div>
      <div>Altitude (Z): {typeof altitude_z === 'number' ? altitude_z.toFixed(2) : 'N/A'} m</div>
      <div>On Ground: {isOnGround ? 'YES' : 'NO'}</div>
      
      <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '3px' }}>GROUND STATUS</div>
      <div>
        Status:{' '}
        <span
          style={{
            color:
              (groundStatus || 'UNKNOWN') === 'RUNWAY'
                ? '#0f0'
                : (groundStatus || 'UNKNOWN') === 'GRASS'
                ? '#ff0'
                : '#f00',
            fontWeight: 'bold'
          }}
        >
          {groundStatus || 'UNKNOWN'}
        </span>
      </div>
      <div>
        Remaining Runway:{' '}
        {typeof remainingRunwayLength === 'number'
          ? remainingRunwayLength.toFixed(0)
          : '0'}{' '}
        m
      </div>

      <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '3px' }}>FORCES</div>
      <div>Thrust: {typeof thrust === 'number' ? (thrust / 1000).toFixed(1) : '0.0'} kN</div>
      <div>Drag: {typeof drag === 'number' ? (drag / 1000).toFixed(1) : '0.0'} kN</div>
      
      {Array.isArray(waypoints) && waypoints.length > 0 && (
        <div style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '3px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>WAYPOINTS ({waypoints.length})</div>
          {waypoints.map((wp, idx) => (
            <div key={idx}>
              {wp.name} ({typeof wp.latitude === 'number' ? wp.latitude.toFixed(2) : 'N/A'}, {typeof wp.longitude === 'number' ? wp.longitude.toFixed(2) : 'N/A'})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugPhysicsPanel;
