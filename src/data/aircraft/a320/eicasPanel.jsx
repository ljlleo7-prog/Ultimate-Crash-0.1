import React from 'react';
import { ArcGauge2, PlainVal, WarningsList } from '../../../components/eicas/shared.jsx';

const n1Mode = (n1) => {
  if (n1 >= 95) return 'TOGA';
  if (n1 >= 85) return 'CLB';
  if (n1 >= 70) return 'CRZ';
  return 'IDLE';
};

const EngineColumn = ({ egt, n1, n2, ff, size = 56 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
    <ArcGauge2 value={egt||0} max={1000} label="EGT" yellowline={850} redline={920} size={size} />
    <ArcGauge2 value={n1||0} max={110} label="N1" yellowline={98} redline={104} size={size} />
    <PlainVal label="N2" value={`${(n2||0).toFixed(1)}%`} />
    <PlainVal label="FF" value={(ff||0).toFixed(0)} />
  </div>
);

const EICASPanel = ({ flightState }) => {
  const n1  = flightState?.engineN1  || [0, 0];
  const n2  = flightState?.engineN2  || [0, 0];
  const egt = flightState?.engineEGT || [0, 0];
  const ff  = flightState?.engineFuelFlow || [0, 0];
  const fuel = flightState?.fuel || 0;
  const warnings = flightState?.activeWarnings || [];
  const crashWarning = flightState?.crashWarning || '';
  const avgN1 = ((n1[0] || 0) + (n1[1] || 0)) / 2;
  const mode = flightState?.fadecMode || n1Mode(avgN1);

  return (
    <div style={{ background: '#000', border: '1px solid #333', borderRadius: '4px', padding: '6px', fontFamily: 'monospace', color: '#00ff00', fontSize: '9px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
        {/* Q1: Engine gauges */}
        <div>
          <div style={{ color: '#aaa', borderBottom: '1px solid #333', marginBottom: '3px' }}>ENG</div>
          <div style={{ display: 'flex', gap: '2px', justifyContent: 'space-around' }}>
            {[0, 1].map(i => (
              <div key={i} style={{ fontSize: '8px', color: '#aaa', textAlign: 'center' }}>
                <div>{i + 1}</div>
                <EngineColumn egt={egt[i]} n1={n1[i]} n2={n2[i]} ff={ff[i]} />
              </div>
            ))}
          </div>
        </div>
        {/* Q2: N1 target mode + FOB + sys */}
        <div>
          <div style={{ color: '#aaa', borderBottom: '1px solid #333', marginBottom: '3px' }}>SYS</div>
          <div style={{ textAlign: 'right', marginBottom: '4px', lineHeight: 1.3 }}>
            <div style={{ fontSize: '10px', color: '#00ffff', fontWeight: 'bold' }}>{mode}</div>
            <div style={{ fontSize: '12px', color: '#00ff00', fontWeight: 'bold' }}>{avgN1.toFixed(1)}%</div>
          </div>
          <div style={{ fontSize: '11px', color: '#00ffff', marginBottom: '4px' }}>FOB {fuel.toFixed(0)} KG</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '9px' }}>
            <div><span style={{ color: '#888' }}>BLEED </span><span style={{ color: '#00ff00' }}>{flightState?.systems?.bleed ? 'ON' : 'OFF'}</span></div>
            <div><span style={{ color: '#888' }}>APU </span><span style={{ color: '#00ff00' }}>{flightState?.systems?.apu?.running ? 'RUN' : 'OFF'}</span></div>
            <div><span style={{ color: '#888' }}>ELEC </span><span style={{ color: '#00ff00' }}>NORM</span></div>
          </div>
        </div>
      </div>
      {/* Q3+Q4: Warnings */}
      <div style={{ borderTop: '1px solid #333', paddingTop: '3px' }}>
        <div style={{ color: '#aaa', marginBottom: '2px' }}>MEMO</div>
        <WarningsList warnings={warnings} crashWarning={crashWarning} />
      </div>
    </div>
  );
};

export default EICASPanel;
