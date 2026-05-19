import React from 'react';

export const BoxVal = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
    <span style={{ fontSize: '9px', color: '#aaa', fontFamily: 'courier new', width: '16px' }}>{label}</span>
    <div style={{
      border: '1px solid #a8a8a8ff', padding: '1px 4px', minWidth: '36px', textAlign: 'right',
      fontSize: '11px', color: '#ffffff', fontFamily: 'courier new', fontWeight: 'bold',
    }}>{value}</div>
  </div>
);

export const PlainVal = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
    <span style={{ fontSize: '9px', color: '#888', fontFamily: 'monospace', width: '16px' }}>{label}</span>
    <span style={{ fontSize: '11px', color: '#00ff00', fontFamily: 'monospace', fontWeight: 'bold' }}>{value}</span>
  </div>
);

// Horseshoe arc gauge (Boeing EICAS style)
export const ArcGauge = ({ value, max, label, size = 64, yellowline = null, redline = null, reverse = false }) => {
  const r = size * 0.38;
  const cx = size / 2, cy = size * 0.52;
  const START = 0, SWEEP = 240;
  const toRad = d => d * Math.PI / 180;
  const pt = (frac, radius) => {
    const a = START + frac * SWEEP;
    return { x: cx + radius * Math.cos(toRad(a)), y: cy + radius * Math.sin(toRad(a)) };
  };
  const arcPath = () => {
    const p1 = pt(0, r), p2 = pt(1, r);
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 1 1 ${p2.x} ${p2.y}`;
  };
  const pct = Math.min(1, Math.max(0, value / max));
  const needle = pt(pct, r * 0.82);
  const tick = (frac, inner, outer, color, w = 2) => {
    const p1 = pt(frac, r * inner), p2 = pt(frac, r * outer);
    return <line key={frac} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={w} />;
  };
  // Sector fill from 0 to current value
  const sectorColor = reverse ? '#31e101ff'
    : (redline != null && value >= redline) ? '#ff2222ff'
    : (yellowline != null && value >= yellowline) ? '#ffcc00'
    : '#ffffffa8';
  const sectorPath = () => {
    if (pct <= 0) return null;
    const p0 = pt(0, r);
    const p1 = pt(pct, r);
    const large = pct > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
  };
  const sp = sectorPath();
  const clipId = `arc-clip-${label}-${size}`;
  // Donut clip: outer circle minus inner circle to constrain sector to arc band
  const innerR = r * 0.72;
  const donutClip = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx - 0.001} ${cy - innerR} Z`;
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <clipPath id={clipId}>
          <path d={donutClip} fillRule="evenodd" />
        </clipPath>
      </defs>
      <path d={arcPath()} fill="none" stroke="#888" strokeWidth="3" />
      {sp && <path d={sp} fill={sectorColor} opacity="0.75" clipPath={`url(#${clipId})`} />}
      {yellowline != null && tick(Math.min(1, yellowline / max), 0.76, 1.06, '#ffcc00', 2)}
      {redline != null && tick(Math.min(1, redline / max), 0.76, 1.06, '#ff2222', 2.5)}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#ffffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill="#555" stroke="#aaa" strokeWidth="1" />
      <rect x={cx+r*0.48 - size*0.26} y={cy - r*0.38 - size*0.18} width={size*0.52} height={size*0.23} fill="none" stroke="#a8a8a8" strokeWidth="1" />
      <text x={cx+r*0.48} y={cy - r * 0.38} textAnchor="middle" fill="#ffffffff" fontSize={size * 0.19} fontFamily="monospace" fontWeight="bold">
        {(value || 0).toFixed(value >= 100 ? 0 : 1)}
      </text>
      <text x={cx} y={size - 1} textAnchor="middle" fill="#888" fontSize={size * 0.14} fontFamily="monospace">{label}</text>
    </svg>
  );
};
//Airbus style
export const ArcGauge2 = ({ value, max, label, size = 64, yellowline = null, redline = null }) => {
  const r = size * 0.38;
  const cx = size / 2, cy = size * 0.52;
  const START = 120, SWEEP = 240;
  const toRad = d => d * Math.PI / 180;
  const pt = (frac, radius) => {
    const a = START + frac * SWEEP;
    return { x: cx + radius * Math.cos(toRad(a)), y: cy + radius * Math.sin(toRad(a)) };
  };
  const arcPath = () => {
    const p1 = pt(0, r), p2 = pt(1, r);
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 1 1 ${p2.x} ${p2.y}`;
  };
  const pct = Math.min(1, Math.max(0, value / max));
  const needle = pt(pct, r * 0.82);
  const tick = (frac, inner, outer, color, w = 2) => {
    const p1 = pt(frac, r * inner), p2 = pt(frac, r * outer);
    return <line key={frac} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={w} />;
  };
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <path d={arcPath()} fill="none" stroke="#888" strokeWidth="3" />
      {yellowline != null && tick(Math.min(1, yellowline / max), 0.76, 1.06, '#ffcc00', 2)}
      {redline != null && tick(Math.min(1, redline / max), 0.76, 1.06, '#ff2222', 2.5)}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#00ff00" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill="#555" stroke="#aaa" strokeWidth="1" />
      <text x={cx} y={cy + r * 0.38} textAnchor="middle" fill="#00ff00" fontSize={size * 0.19} fontFamily="courier new" fontWeight="bold">
        {(value || 0).toFixed(value >= 100 ? 0 : 1)}
      </text>
      <text x={cx} y={size - 1} textAnchor="middle" fill="#888" fontSize={size * 0.14} fontFamily="courier new">{label}</text>
    </svg>
  );
};


// Vertical bar gauge (747 ECAM style)
export const BarGauge = ({ value, max, label, color = 'rgba(255, 255, 255, 1)', height = 70, width = 18, yellowline = null, redline = null }) => {
  const pct = Math.min(1, Math.max(0, value / max));
  const fillH = pct * (height - 4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div style={{ fontSize: '8px', color: '#aaa', fontFamily: 'courier new', border: '1px solid #555', padding: '0 3px' }}>{label}</div>
      <svg width={width + 8} height={height}>
        <rect x={4} y={0} width={width} height={height} rx={2} fill="#1a1a1a" stroke="#444" strokeWidth="1" />
        <rect x={4} y={height - 2 - fillH} width={width} height={fillH} rx={1} fill={color} />
        {yellowline != null && <line x1={2} y1={height - 2 - Math.min(1, yellowline/max)*(height-4)} x2={width+6} y2={height - 2 - Math.min(1, yellowline/max)*(height-4)} stroke="#ffcc00" strokeWidth="1.5" />}
        {redline != null && <line x1={2} y1={height - 2 - Math.min(1, redline/max)*(height-4)} x2={width+6} y2={height - 2 - Math.min(1, redline/max)*(height-4)} stroke="#ff0000" strokeWidth="1.5" />}
      </svg>
      <div style={{ fontSize: '9px', color, fontFamily: 'courier new', fontWeight: 'bold', border: '1px solid #555', padding: '0 3px', minWidth: '28px', textAlign: 'right' }}>
        {(value || 0).toFixed(value >= 100 ? 0 : 1)}
      </div>
    </div>
  );
};

// Warnings / memo list
export const WarningsList = ({ warnings, crashWarning }) => {
  const all = [...(warnings || [])];
  if (crashWarning && !all.find(w => w.message === crashWarning))
    all.unshift({ id: 'CRASH', message: crashWarning, level: 'CRITICAL' });
  return (
    <div style={{ overflowY: 'auto', fontFamily: 'courier new', fontSize: '11px', padding: '4px 0' }}>
      {all.length === 0
        ? <div style={{ color: '#00ff00' }}>NORMAL</div>
        : all.map((w, i) => (
          <div key={w.id || i} style={{ color: w.level === 'CRITICAL' ? '#ff4444' : w.level === 'WARNING' ? '#ffaa00' : '#00ffff', padding: '1px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{w.message}</div>
        ))
      }
    </div>
  );
};

// Annunciator box
export const Ann = ({ label, val }) => (
  <div style={{ background: '#001800', border: '1px solid #005500', borderRadius: '2px', padding: '1px 3px', textAlign: 'center', width: '36px', boxSizing: 'border-box' }}>
    <div style={{ fontSize: '6px', color: '#888', lineHeight: 1 }}>{label}</div>
    <div style={{ fontSize: '8px', color: '#00ff00', lineHeight: 1.2 }}>{val}</div>
  </div>
);
