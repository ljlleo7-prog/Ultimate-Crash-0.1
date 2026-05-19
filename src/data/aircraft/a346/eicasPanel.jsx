import React from 'react';
import { ArcGauge2, PlainVal, WarningsList } from '../../../components/eicas/shared.jsx';

const n1Mode = (n1) => {
  if (n1 >= 95) return 'TOGA';
  if (n1 >= 85) return 'CLB';
  if (n1 >= 70) return 'CRZ';
  return 'IDLE';
};

const EngPair = ({ indices, n1, n2, egt, ff, size = 52 }) => (
  <div style={{ display: 'flex', gap: '2px', justifyContent: 'space-around' }}>
    {indices.map(i => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <div style={{ fontSize: '8px', color: '#aaa' }}>{i + 1}</div>
        <ArcGauge2 value={egt[i]||0} max={1000} label="EGT" yellowline={850} redline={920} size={size} />
        <ArcGauge2 value={n1[i]||0} max={110} label="N1" yellowline={98} redline={104} size={size} />
        <PlainVal label="N2" value={`${(n2[i]||0).toFixed(1)}%`} />
        <PlainVal label="FF" value={(ff[i]||0).toFixed(0)} />
      </div>
    ))}
  </div>
);

const EICASPanel = ({ flightState }) => {
  const n1  = flightState?.engineN1  || [0, 0, 0, 0];
  const n2  = flightState?.engineN2  || [0, 0, 0, 0];
  const egt = flightState?.engineEGT || [0, 0, 0, 0];
  const ff  = flightState?.engineFuelFlow || [0, 0, 0, 0];
  const fuel = flightState?.fuel || 0;
  const warnings = flightState?.activeWarnings || [];
  const crashWarning = flightState?.crashWarning || '';
  const avgN1 = n1.reduce((a, v) => a + (v || 0), 0) / (n1.length || 1);
  const mode = n1Mode(avgN1);

  return (
    <div style={{ background: '#000', border: '1px solid #333', borderRadius: '4px', padding: '6px', fontFamily: 'monospace', color: '#00ff00', fontSize: '9px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #333', marginBottom: '3px' }}>
        <span style={{ color: '#aaa' }}>ENG</span>
        <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
          <div style={{ fontSize: '10px', color: '#00ffff', fontWeight: 'bold' }}>{mode}</div>
          <div style={{ fontSize: '12px', color: '#00ff00', fontWeight: 'bold' }}>{avgN1.toFixed(1)}%</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
        <EngPair indices={[0, 1]} n1={n1} n2={n2} egt={egt} ff={ff} />
        <EngPair indices={[2, 3]} n1={n1} n2={n2} egt={egt} ff={ff} />
      </div>
      <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginBottom: '4px', fontSize: '11px', color: '#00ffff' }}>
        FOB {fuel.toFixed(0)} KG
      </div>
      <div style={{ borderTop: '1px solid #333', paddingTop: '3px' }}>
        <div style={{ color: '#aaa', marginBottom: '2px' }}>MEMO</div>
        <WarningsList warnings={warnings} crashWarning={crashWarning} />
      </div>
    </div>
  );
};

export default EICASPanel;
