import React from 'react';
import { ArcGauge, WarningsList } from '../../../components/eicas/shared.jsx';

// Boeing 777 EICAS: similar to 737, but no annunciator boxes
const EICASPanel = ({ flightState }) => {
  const n1  = flightState?.engineN1  || [0, 0];
  const n2  = flightState?.engineN2  || [0, 0];
  const egt = flightState?.engineEGT || [0, 0];
  const fuel = flightState?.fuel || 0;
  const warnings = flightState?.activeWarnings || [];
  const crashWarning = flightState?.crashWarning || '';
  const engineCount = n1.length || 2;
  const engineThrottles = Array.isArray(flightState?.engineThrottles) ? flightState.engineThrottles : Array(engineCount).fill(flightState?.throttle ?? 0);
  const reverseActive = Array.from({ length: engineCount }).map((_, i) => (engineThrottles[i] ?? 0) < 0);

  return (
    <div style={{ background:'#000', border:'1px solid #333', borderRadius:'4px', padding:'6px', fontFamily:'monospace', color:'#fff' }}>
      <div style={{ fontSize:'9px', color:'#aaa', borderBottom:'1px solid #333', paddingBottom:'2px', marginBottom:'4px' }}>EICAS PRIMARY</div>
      <div style={{ display:'flex', justifyContent:'space-around', marginBottom:'6px' }}>
        {Array.from({ length: engineCount }).map((_, i) => (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
            <div style={{ fontSize:'8px', color: reverseActive[i] ? '#00ff00' : '#aaa', fontWeight: reverseActive[i] ? 'bold' : 'normal' }}>
              {reverseActive[i] ? 'REV' : `ENG ${i+1}`}
            </div>
            <ArcGauge value={n1[i]||0} max={110} label="N1" size={58} redline={104} yellowline={98} reverse={reverseActive[i]} />
            <ArcGauge value={egt[i]||0} max={1000} label="EGT" size={50} yellowline={850} redline={920} />
          </div>
        ))}
      </div>
      <div style={{ fontSize:'10px', color:'#ffaa00', textAlign:'center', marginBottom:'4px' }}>FUEL {fuel.toFixed(0)} KG</div>
      <WarningsList warnings={warnings} crashWarning={crashWarning} />
    </div>
  );
};

export default EICASPanel;
