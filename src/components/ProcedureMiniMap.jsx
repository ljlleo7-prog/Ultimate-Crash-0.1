import React, { useMemo } from 'react';
import { airportService } from '../services/airportService.js';
import { buildSyntheticSIDWaypoints, buildSyntheticSTARWaypoints } from '../utils/routeDetails.js';

const toPoint = (point) => {
  if (!point || point.latitude == null || point.longitude == null) return null;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { ...point, latitude, longitude, name: point.name || point.label || point.identifier || 'FIX' };
};

const buildSyntheticFinal = (airport, runwayName, waypoints) => {
  const lastWaypoint = waypoints.at(-1);
  if (!airport || !lastWaypoint || !runwayName) return [];
  return [
    ...buildSyntheticSTARWaypoints(airport, runwayName, lastWaypoint),
    { ...airport, name: runwayName, type: 'RUNWAY_FIX' }
  ].map(toPoint).filter(Boolean);
};

const buildSyntheticDeparture = (airport, runwayName, waypoints) => {
  const firstWaypoint = waypoints[0];
  if (!airport || !firstWaypoint || !runwayName) return [];
  return buildSyntheticSIDWaypoints(airport, runwayName, firstWaypoint).map(toPoint).filter(Boolean);
};

const ProcedureMiniMap = ({ airport, runwayName, procedureName = '', procedureSegments = [], waypoints = [], side = 'departure', height = 150 }) => {
  const preview = useMemo(() => {
    const airportCode = airport?.icao || airport?.iata;
    const runwayGeometry = airportCode && runwayName ? airportService.getRunwayGeometry(airportCode, runwayName) : null;
    const segmentKinds = side === 'departure' ? ['sid'] : ['star', 'approach'];
    const procedurePoints = procedureSegments
      .filter((segment) => segmentKinds.includes(segment.kind || segment.segment))
      .flatMap((segment) => segment.waypoints || [])
      .map(toPoint)
      .filter(Boolean);
    const fallbackPoints = side === 'departure'
      ? buildSyntheticDeparture(airport, runwayName, waypoints.slice(0, 2))
      : buildSyntheticFinal(airport, runwayName, waypoints.slice(-2));
    const routePoints = procedurePoints.length ? procedurePoints : fallbackPoints;
    const runwayPoints = runwayGeometry
      ? [
          toPoint({ ...runwayGeometry.thresholdStart, name: `${runwayName} A`, type: 'RUNWAY_THRESHOLD' }),
          toPoint({ ...runwayGeometry.thresholdEnd, name: `${runwayName} B`, type: 'RUNWAY_THRESHOLD' })
        ].filter(Boolean)
      : airport ? [toPoint({ ...airport, name: airportCode || 'APT', type: 'AIRPORT' })].filter(Boolean) : [];
    const points = side === 'departure' ? [...runwayPoints, ...routePoints] : [...routePoints, ...runwayPoints];
    return { runwayGeometry, runwayPoints, routePoints, points, hasPublishedProcedure: procedurePoints.length > 0 };
  }, [airport, procedureSegments, runwayName, side, waypoints]);

  const bounds = useMemo(() => {
    if (!preview.points.length) return null;
    const lats = preview.points.map((point) => point.latitude);
    const lons = preview.points.map((point) => point.longitude);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons)
    };
  }, [preview.points]);

  const project = (point) => {
    if (!bounds) return { x: 50, y: 50 };
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.02);
    const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.02);
    return {
      x: 8 + ((point.longitude - bounds.minLon) / lonSpan) * 84,
      y: 92 - ((point.latitude - bounds.minLat) / latSpan) * 84
    };
  };

  if (!airport) {
    return <div className="procedure-mini-map empty" style={{ height }}>Select airport for procedure preview.</div>;
  }

  const routePath = preview.routePoints.map((point) => {
    const p = project(point);
    return `${p.x},${p.y}`;
  }).join(' ');
  const runwayPath = preview.runwayPoints.map((point) => {
    const p = project(point);
    return `${p.x},${p.y}`;
  }).join(' ');
  const color = side === 'departure' ? '#22c55e' : '#f59e0b';

  return (
    <div className="procedure-mini-map" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="procedure-mini-map-svg">
        <rect x="0" y="0" width="100" height="100" fill="#020617" />
        {[25, 50, 75].map((value) => <line key={`g-${value}`} x1={value} y1="0" x2={value} y2="100" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" />)}
        {[25, 50, 75].map((value) => <line key={`h-${value}`} x1="0" y1={value} x2="100" y2={value} stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" />)}
        {runwayPath && <polyline points={runwayPath} fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {routePath && <polyline points={routePath} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {preview.routePoints.map((point, index) => {
          const p = project(point);
          return (
            <g key={`${point.name}-${index}`}>
              <circle cx={p.x} cy={p.y} r="1.4" fill={color} vectorEffect="non-scaling-stroke" />
              <text x={Math.min(p.x + 2, 84)} y={Math.max(p.y - 1, 6)} fill="#e0f2fe" fontSize="3" fontFamily="monospace" style={{ paintOrder: 'stroke', stroke: '#020617', strokeWidth: 0.8 }}>
                {point.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="procedure-mini-map-label">
        {side === 'departure' ? 'DEP' : 'ARR'} · {runwayName || 'RWY'} · {procedureName || 'AUTO'} · {preview.hasPublishedProcedure ? 'published' : 'synthetic'}
      </div>
    </div>
  );
};

export default ProcedureMiniMap;
