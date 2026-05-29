import React, { useMemo } from 'react';

const SEGMENT_STYLES = {
  sid: { stroke: '#22c55e', label: 'SID' },
  enroute: { stroke: '#38bdf8', label: 'ENR' },
  star: { stroke: '#f59e0b', label: 'STAR' },
  approach: { stroke: '#f472b6', label: 'APP' },
  runway: { stroke: '#facc15', label: 'RWY' }
};

const normalizePoint = (point) => {
  if (!point || point.latitude == null || point.longitude == null) return null;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    ...point,
    latitude,
    longitude,
    name: point.name || point.label || point.ident || 'WPT',
    segment: point.segment || point.segmentType || point.procedureSegment || 'enroute'
  };
};

const buildSegments = (points, routeObject) => {
  if (Array.isArray(routeObject?.procedureSegments) && routeObject.procedureSegments.length) {
    return routeObject.procedureSegments
      .map((segment) => ({
        kind: segment.kind || segment.segment || 'enroute',
        name: segment.name || SEGMENT_STYLES[segment.kind]?.label || 'Route',
        points: (segment.waypoints || []).map(normalizePoint).filter(Boolean)
      }))
      .filter((segment) => segment.points.length > 1);
  }

  const segments = [];
  let current = null;
  points.forEach((point) => {
    const kind = point.segment || (point.type === 'APPROACH_FIX' ? 'approach' : point.type === 'RUNWAY_FIX' ? 'runway' : 'enroute');
    if (!current || current.kind !== kind) {
      current = { kind, name: SEGMENT_STYLES[kind]?.label || kind.toUpperCase(), points: [] };
      segments.push(current);
    }
    current.points.push(point);
  });

  return segments.map((segment, index) => {
    if (index > 0 && segment.points.length > 0) {
      return { ...segment, points: [segments[index - 1].points.at(-1), ...segment.points].filter(Boolean) };
    }
    return segment;
  }).filter((segment) => segment.points.length > 1);
};

const LocalRouteMap = ({ departure, arrival, waypoints = [], routeObject = null, height = 220, aircraftPosition = null }) => {
  const points = useMemo(() => [
    normalizePoint({ ...(departure || {}), name: departure?.icao || departure?.iata || 'DEP', type: 'AIRPORT', segment: 'sid' }),
    ...(routeObject?.waypoints || waypoints).map(normalizePoint),
    normalizePoint({ ...(arrival || {}), name: arrival?.icao || arrival?.iata || 'ARR', type: 'AIRPORT', segment: 'approach' })
  ].filter(Boolean), [departure, arrival, routeObject?.waypoints, waypoints]);

  const segments = useMemo(() => buildSegments(points, routeObject), [points, routeObject]);
  const aircraftPoint = normalizePoint(aircraftPosition ? { ...aircraftPosition, name: 'OWN', type: 'AIRCRAFT' } : null);
  const allPoints = aircraftPoint ? [...points, aircraftPoint] : points;

  const bounds = useMemo(() => {
    if (allPoints.length === 0) return null;
    const lats = allPoints.map((point) => point.latitude);
    const lons = allPoints.map((point) => point.longitude);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons)
    };
  }, [allPoints]);

  const project = (point) => {
    if (!bounds) return { x: 50, y: 50 };
    const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.1);
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.1);
    const x = 8 + ((point.longitude - bounds.minLon) / lonSpan) * 84;
    const y = 92 - ((point.latitude - bounds.minLat) / latSpan) * 84;
    return { x, y };
  };

  if (points.length < 2) {
    return (
      <div style={{
        height,
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '8px',
        background: 'radial-gradient(circle at center, rgba(14, 165, 233, 0.18), rgba(2, 6, 23, 0.95))',
        color: '#bae6fd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        textAlign: 'center',
        padding: '12px'
      }}>
        Route map unavailable until departure and arrival coordinates are selected.
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.35)', background: '#020617', position: 'relative' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <radialGradient id="route-map-bg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(14, 165, 233, 0.2)" />
            <stop offset="100%" stopColor="rgba(2, 6, 23, 1)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#route-map-bg)" />
        {[20, 40, 60, 80].map((value) => <line key={`v-${value}`} x1={value} y1="0" x2={value} y2="100" stroke="rgba(56,189,248,0.08)" strokeWidth="0.4" />)}
        {[20, 40, 60, 80].map((value) => <line key={`h-${value}`} x1="0" y1={value} x2="100" y2={value} stroke="rgba(56,189,248,0.08)" strokeWidth="0.4" />)}
        {segments.map((segment, index) => {
          const path = segment.points.map((point) => {
            const projected = project(point);
            return `${projected.x},${projected.y}`;
          }).join(' ');
          return <polyline key={`${segment.kind}-${index}`} points={path} fill="none" stroke={SEGMENT_STYLES[segment.kind]?.stroke || '#38bdf8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
        })}
        {points.map((point, index) => {
          const projected = project(point);
          const isAirport = index === 0 || index === points.length - 1 || point.type === 'AIRPORT';
          const fill = isAirport ? '#facc15' : (SEGMENT_STYLES[point.segment]?.stroke || '#bae6fd');
          return (
            <g key={`${point.name}-${index}`}>
              <circle cx={projected.x} cy={projected.y} r={isAirport ? 1.8 : 1.1} fill={fill} vectorEffect="non-scaling-stroke" />
              {(isAirport || index % 2 === 0 || point.segment === 'sid' || point.segment === 'star') && (
                <text x={Math.min(projected.x + 2, 88)} y={Math.max(projected.y - 1, 5)} fill="#e0f2fe" fontSize="3" fontFamily="monospace" style={{ paintOrder: 'stroke', stroke: '#020617', strokeWidth: 0.8 }}>
                  {point.name}
                </text>
              )}
            </g>
          );
        })}
        {aircraftPoint && (() => {
          const projected = project(aircraftPoint);
          return <polygon points={`${projected.x},${projected.y - 2} ${projected.x + 1.6},${projected.y + 1.7} ${projected.x - 1.6},${projected.y + 1.7}`} fill="#ffffff" vectorEffect="non-scaling-stroke" />;
        })()}
      </svg>
      <div style={{ position: 'absolute', left: 8, bottom: 6, display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '10px', color: '#dbeafe', fontFamily: 'monospace' }}>
        {Object.entries(SEGMENT_STYLES).filter(([kind]) => segments.some((segment) => segment.kind === kind)).map(([kind, style]) => (
          <span key={kind} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 12, height: 2, background: style.stroke, display: 'inline-block' }} />{style.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LocalRouteMap;
