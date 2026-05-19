import React from 'react';
import { WarningsList } from '../../../components/eicas/shared.jsx';

// Boeing 747-400 EICAS: digital vertical columns, 4 engines
const DigitalColumn = ({ title, value, topColor = '#00ff00' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
    <div style={{ fontSize: '8px', color: '#aaa' }}>{title}</div>
    <div style={{ width: '18px', height: '44px', background: '#0a0a0a', border: '1px solid #666', position: 'relative' }}>
      <div style={{ position: 'absolute', left: '6px', right: '6px', top: '4px', bottom: '4px', background: 'linear-gradient(to bottom, #ddd, #777)' }} />
      <div style={{ position: 'absolute', top: '0px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: topColor, fontFamily: 'monospace', background: '#000', padding: '0 1px' }}>{value}</div>
    </div>
  </div>
);

const EICASPanel = ({ flightState }) => {
  const n1  = flightState?.engineN1  || [0,0,0,0];
  const n2  = flightState?.engineN2  || [0,0,0,0];
  const egt = flightState?.engineEGT || [0,0,0,0];
  const warnings = flightState?.activeWarnings || [];
  const crashWarning = flightState?.crashWarning || '';
  const fuel = flightState?.fuel || 0;
  const engineCount = Math.max(4, n1.length || 4);

  return (
    <div style={{ background:'#000', border:'1px solid #333', borderRadius:'4px', padding:'6px', fontFamily:'monospace', color:'#fff' }}>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${engineCount}, 1fr)`, gap:'8px', marginBottom:'8px' }}>
        {Array.from({ length: engineCount }).map((_, i) => (
          <div key={i} style={{ display:'grid', gridTemplateRows:'auto auto', rowGap:'6px', justifyItems:'center' }}>
            <DigitalColumn title={`ENG ${i+1}`} value={(n1[i]||0).toFixed(0)} topColor="#00ff00" />
            <DigitalColumn title="EGT" value={(egt[i]||0).toFixed(0)} topColor="#ffaa00" />
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px', fontSize:'10px' }}>
        <div style={{ color:'#00ffff' }}>OIL TEMP</div>
        <div style={{ color:'#00ffff' }}>TOTAL FUEL {fuel.toFixed(1)} KG</div>
      </div>
      <WarningsList warnings={warnings} crashWarning={crashWarning} />
    </div>
  );
};

export default EICASPanel;
