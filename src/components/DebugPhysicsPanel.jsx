import React from 'react';

const DebugPhysicsPanel = ({ debugPhysicsData, thrust, drag, waypoints = [], flightData, groundStatus, remainingRunwayLength, embedded = false }) => {
  const safeDebugPhysicsData = debugPhysicsData ?? {};
  const formatFixed = (value, digits = 2, suffix = '') => (Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : 'N/A');
  const formatConvertedFeet = (valueInMeters) => (Number.isFinite(valueInMeters) ? `${(valueInMeters * 3.28084).toFixed(0)} ft` : 'N/A');

  const velocity = flightData?.position && flightData?.orientation ? flightData.velocity : null;
  const angularRates = flightData?.angularRates ?? null;
  const derivedGroundSpeed = flightData?.derived?.groundSpeed ?? flightData?.groundSpeed;

  const {
    theta,
    dynamicPressure_q,
    pitchMoment_y,
    pitchRate_q,
    altitude_z,
    altitude_amsl,
    altitude_agl,
    isOnGround,
    lift,
    pitchTorque,
    alpha,
    Cm,
    CL,
    elevator,
    trim
  } = safeDebugPhysicsData;

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

  const panelStyle = embedded
    ? {
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.88)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '11px',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 10001,
        border: '1px solid #333',
        width: '320px',
        minWidth: '320px',
        maxWidth: '320px',
        maxHeight: '320px',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.45)',
        flexShrink: 0
      }
    : {
        position: 'absolute',
        top: '84px',
        left: '108px',
        background: 'rgba(0, 0, 0, 0.88)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '11px',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 10001,
        border: '1px solid #333',
        width: 'min(360px, calc(100vw - 140px))',
        maxWidth: 'min(360px, calc(100vw - 140px))',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.45)'
      };

  return (
    <div style={panelStyle}>
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
      <div>Pitch (θ): {formatFixed(typeof theta === 'number' ? theta * 180 / Math.PI : NaN, 2, ' deg')}</div>
      <div>Alpha (α): {formatFixed(typeof alpha === 'number' ? alpha * 180 / Math.PI : NaN, 2, ' deg')}</div>
      <div>Pitch Rate (q): {formatFixed(typeof pitchRate_q === 'number' ? pitchRate_q * 180 / Math.PI : NaN, 2, ' deg/s')}</div>
      <div>Pitch Moment: {formatFixed(pitchMoment_y, 0, ' N·m')}</div>
      <div>Cm: {formatFixed(Cm, 4)}</div>
      <div>Elevator: {formatFixed(elevator, 2)}</div>
      <div>Trim: {formatFixed(trim, 2)}</div>
      
      <div>Ground Moment Y: {safeDebugPhysicsData.groundMomentY ? safeDebugPhysicsData.groundMomentY.toFixed(0) : '0'}</div>

      <div>Lift: {formatFixed(typeof lift === 'number' ? lift / 1000 : NaN, 1, ' kN')} (CL: {formatFixed(CL, 2)})</div>
      <div>Dynamic Pressure (q): {formatFixed(dynamicPressure_q, 2, ' Pa')}</div>
      <div>Altitude (Z - Rel): {formatFixed(altitude_z, 2, ' m')}</div>
      <div>Altitude (AMSL): {formatFixed(altitude_amsl, 2, ' m')} ({formatConvertedFeet(altitude_amsl)})</div>
      <div>Altitude (AGL): {formatFixed(altitude_agl, 2, ' m')} ({formatConvertedFeet(altitude_agl)})</div>
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
        {Number.isFinite(remainingRunwayLength)
          ? remainingRunwayLength.toFixed(0)
          : 'N/A'}{' '}
        m
      </div>

      <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '3px' }}>FORCES</div>
      <div>Thrust: {formatFixed(typeof thrust === 'number' ? thrust / 1000 : NaN, 1, ' kN')}</div>
      <div>Drag: {formatFixed(typeof drag === 'number' ? drag / 1000 : NaN, 1, ' kN')}</div>
      <div>Lift: {formatFixed(typeof lift === 'number' ? lift / 1000 : NaN, 1, ' kN')}</div>
      <div>Pitch Torque: {formatFixed(pitchTorque, 0, ' N·m')}</div>
      <div>Yaw Moment: {formatFixed(safeDebugPhysicsData.yawMoment_n, 0, ' N·m')}</div>
      <div>Steering Moment: {formatFixed(safeDebugPhysicsData.steeringMoment_n, 0, ' N·m')}</div>

      <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '3px' }}>KINEMATICS</div>
      <div>TAS: {formatFixed(flightData?.derived?.trueAirspeed ?? flightData?.derived?.airspeed, 1, ' kts')}</div>
      <div>IAS: {formatFixed(flightData?.derived?.indicatedAirspeed, 1, ' kts')}</div>
      <div>GS: {formatFixed(derivedGroundSpeed, 1, ' kts')}</div>
      <div style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '3px' }}>WIND</div>
      <div>Speed: {formatFixed(flightData?.environment?.windSpeed, 1, ' kts')}</div>
      <div>Dir: {formatFixed(flightData?.environment?.windDirection, 0, '°')}</div>
      <div>Gust: {formatFixed(flightData?.environment?.windGust, 1, ' kts')}</div>
      <div>Body Vel U: {formatFixed(velocity?.u, 2, ' m/s')}</div>
      <div>Body Vel V: {formatFixed(velocity?.v, 2, ' m/s')}</div>
      <div>Body Vel W: {formatFixed(velocity?.w, 2, ' m/s')}</div>
      <div>Roll Rate P: {formatFixed(typeof angularRates?.p === 'number' ? angularRates.p * 180 / Math.PI : NaN, 2, ' deg/s')}</div>
      <div>Pitch Rate Q: {formatFixed(typeof angularRates?.q === 'number' ? angularRates.q * 180 / Math.PI : NaN, 2, ' deg/s')}</div>
      <div>Yaw Rate R: {formatFixed(typeof angularRates?.r === 'number' ? angularRates.r * 180 / Math.PI : NaN, 2, ' deg/s')}</div>
      
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
