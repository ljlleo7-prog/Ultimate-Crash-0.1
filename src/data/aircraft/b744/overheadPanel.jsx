// Boeing 747-400 overhead panel — stub
import React from 'react';

const OverheadPanelB744 = ({ flightState, onSystemAction }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#666', fontSize:'14px', fontFamily:'monospace' }}>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:'11px', color:'#444', marginBottom:'8px' }}>Boeing 747-400</div>
      <div style={{ border:'2px solid #c00', color:'#c00', padding:'4px 12px', transform:'rotate(-5deg)', opacity:0.7 }}>PANEL NOT YET IMPLEMENTED</div>
    </div>
  </div>
);

export default OverheadPanelB744;
