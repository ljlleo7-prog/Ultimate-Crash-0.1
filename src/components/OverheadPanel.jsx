import React, { useState } from 'react';
import './FlightPanel.css'; // Re-using existing styles for consistency

const OverheadPanel = ({ onClose, flightState, onSystemAction }) => {
  // Local state for toggle switches if not yet in flightState
  // Ideally, all state should come from flightState (physics service), 
  // but for UI responsiveness we might need local or optimistically update.
  // We will assume flightState contains the system states.
  
  // Helper to get system state or default
  const getSys = (path, def) => {
    return flightState.systems?.[path] ?? def;
  };

  const ToggleSwitch = ({ label, active, onClick, color = 'green' }) => (
    <div className="toggle-switch-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '5px' }}>
      <div 
        className={`toggle-switch ${active ? 'active' : ''}`} 
        onClick={onClick}
        style={{ 
          width: '40px', 
          height: '60px', 
          background: '#333', 
          borderRadius: '5px',
          position: 'relative',
          cursor: 'pointer',
          border: '2px solid #555'
        }}
      >
        <div style={{
          position: 'absolute',
          top: active ? '5px' : 'auto',
          bottom: active ? 'auto' : '5px',
          left: '5px',
          width: '26px',
          height: '26px',
          background: active ? (color === 'red' ? '#ff4444' : '#00ff00') : '#888',
          borderRadius: '3px',
          boxShadow: active ? `0 0 10px ${color === 'red' ? '#ff4444' : '#00ff00'}` : 'none',
          transition: 'all 0.2s'
        }}/>
      </div>
      <span style={{ fontSize: '10px', marginTop: '5px', color: '#ccc', textAlign: 'center' }}>{label}</span>
    </div>
  );

  return (
    <div className="overhead-panel-overlay" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '900px',
      height: '700px',
      backgroundColor: '#1a1a1a',
      border: '4px solid #444',
      borderRadius: '15px',
      zIndex: 3000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 0 50px rgba(0,0,0,0.8)',
      padding: '20px',
      color: '#eee',
      fontFamily: 'monospace'
    }}>
      <div className="overhead-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0 }}>OVERHEAD SYSTEMS PANEL</h2>
        <button 
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid #666',
            color: '#fff',
            cursor: 'pointer',
            padding: '5px 15px',
            borderRadius: '5px'
          }}
        >CLOSE X</button>
      </div>

      <div className="overhead-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gridTemplateRows: '1fr 1fr', 
        gap: '15px', 
        flex: 1,
        overflowY: 'auto'
      }}>
        
        {/* ELEC / BATT */}
        <div className="panel-section" style={{ border: '1px solid #444', padding: '10px', borderRadius: '5px', background: '#222' }}>
          <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>ELECTRICAL</h4>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
             <div style={{ textAlign: 'center', width: '100%', marginBottom: '10px' }}>
                <div>DC VOLTS: <span style={{ color: '#0f0' }}>28.4</span></div>
                <div>AC AMPS: <span style={{ color: '#0f0' }}>140</span></div>
             </div>
             <ToggleSwitch label="BATTERY" active={flightState.systems?.electrical?.battery} onClick={() => onSystemAction('electrical', 'battery')} />
             <ToggleSwitch label="STBY PWR" active={flightState.systems?.electrical?.stbyPower} onClick={() => onSystemAction('electrical', 'stbyPower')} />
             <ToggleSwitch label="GEN 1" active={flightState.systems?.electrical?.gen1} onClick={() => onSystemAction('electrical', 'gen1')} />
             <ToggleSwitch label="GEN 2" active={flightState.systems?.electrical?.gen2} onClick={() => onSystemAction('electrical', 'gen2')} />
             <ToggleSwitch label="APU GEN" active={flightState.systems?.electrical?.apuGen} onClick={() => onSystemAction('electrical', 'apuGen')} />
          </div>
        </div>

        {/* FUEL */}
        <div className="panel-section" style={{ border: '1px solid #444', padding: '10px', borderRadius: '5px', background: '#222' }}>
          <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>FUEL</h4>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
             <div style={{ textAlign: 'center', width: '100%', marginBottom: '10px' }}>
                <div>LEFT: <span style={{ color: '#0f0' }}>{(flightState.fuel * 0.45).toFixed(0)}</span></div>
                <div>RIGHT: <span style={{ color: '#0f0' }}>{(flightState.fuel * 0.45).toFixed(0)}</span></div>
                <div>CENTER: <span style={{ color: '#0f0' }}>{(flightState.fuel * 0.1).toFixed(0)}</span></div>
             </div>
             <ToggleSwitch label="L PUMPS" active={flightState.systems?.fuel?.leftPumps} onClick={() => onSystemAction('fuel', 'leftPumps')} />
             <ToggleSwitch label="CTR PUMPS" active={flightState.systems?.fuel?.centerPumps} onClick={() => onSystemAction('fuel', 'centerPumps')} />
             <ToggleSwitch label="R PUMPS" active={flightState.systems?.fuel?.rightPumps} onClick={() => onSystemAction('fuel', 'rightPumps')} />
             <ToggleSwitch label="X-FEED" active={flightState.systems?.fuel?.crossfeed} onClick={() => onSystemAction('fuel', 'crossfeed')} />
          </div>
        </div>

        {/* APU / START */}
        <div className="panel-section" style={{ border: '1px solid #444', padding: '10px', borderRadius: '5px', background: '#222' }}>
          <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>APU & START</h4>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
             <div style={{ textAlign: 'center', width: '100%', marginBottom: '10px' }}>
                <div>APU EGT: <span style={{ color: '#0f0' }}>{flightState.systems?.apu?.running ? '420' : '0'}</span></div>
             </div>
             <ToggleSwitch label="APU MASTER" active={flightState.systems?.apu?.master} onClick={() => onSystemAction('apu', 'master')} />
             <ToggleSwitch label="APU START" active={flightState.systems?.apu?.start} onClick={() => onSystemAction('apu', 'start')} />
             <ToggleSwitch label="APU BLEED" active={flightState.systems?.apu?.bleed} onClick={() => onSystemAction('apu', 'bleed')} />
             <div style={{ width: '100%', height: '10px' }}></div>
             <ToggleSwitch label="ENG 1 START" active={flightState.systems?.starters?.engine1} onClick={() => onSystemAction('starters', 'engine1')} />
             <ToggleSwitch label="ENG 2 START" active={flightState.systems?.starters?.engine2} onClick={() => onSystemAction('starters', 'engine2')} />
          </div>
        </div>

        {/* HYDRAULICS */}
        <div className="panel-section" style={{ border: '1px solid #444', padding: '10px', borderRadius: '5px', background: '#222' }}>
          <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>HYDRAULICS</h4>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
             <div style={{ textAlign: 'center', width: '100%', marginBottom: '10px' }}>
                <div>SYS A: <span style={{ color: '#0f0' }}>{flightState.systems?.hydraulics?.sysA?.pressure || 0} PSI</span></div>
                <div>SYS B: <span style={{ color: '#0f0' }}>{flightState.systems?.hydraulics?.sysB?.pressure || 0} PSI</span></div>
             </div>
             <ToggleSwitch label="ENG 1 PUMP" active={flightState.systems?.hydraulics?.sysA?.engPump} onClick={() => onSystemAction('hydraulics', 'eng1Pump')} />
             <ToggleSwitch label="ELEC 1 PUMP" active={flightState.systems?.hydraulics?.sysA?.elecPump} onClick={() => onSystemAction('hydraulics', 'elec1Pump')} />
             <ToggleSwitch label="ELEC 2 PUMP" active={flightState.systems?.hydraulics?.sysB?.elecPump} onClick={() => onSystemAction('hydraulics', 'elec2Pump')} />
             <ToggleSwitch label="ENG 2 PUMP" active={flightState.systems?.hydraulics?.sysB?.engPump} onClick={() => onSystemAction('hydraulics', 'eng2Pump')} />
          </div>
        </div>

        {/* LIGHTING */}
        <div className="panel-section" style={{ border: '1px solid #444', padding: '10px', borderRadius: '5px', background: '#222' }}>
          <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>LIGHTING</h4>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
             <ToggleSwitch label="LANDING" active={flightState.systems?.lighting?.landing} onClick={() => onSystemAction('lighting', 'landing')} />
             <ToggleSwitch label="TAXI" active={flightState.systems?.lighting?.taxi} onClick={() => onSystemAction('lighting', 'taxi')} />
             <ToggleSwitch label="NAV" active={flightState.systems?.lighting?.nav} onClick={() => onSystemAction('lighting', 'nav')} />
             <ToggleSwitch label="BEACON" active={flightState.systems?.lighting?.beacon} onClick={() => onSystemAction('lighting', 'beacon')} />
             <ToggleSwitch label="STROBE" active={flightState.systems?.lighting?.strobe} onClick={() => onSystemAction('lighting', 'strobe')} />
             <ToggleSwitch label="LOGO" active={flightState.systems?.lighting?.logo} onClick={() => onSystemAction('lighting', 'logo')} />
          </div>
        </div>

        {/* PRESSURIZATION / OXYGEN */}
        <div className="panel-section" style={{ border: '1px solid #444', padding: '10px', borderRadius: '5px', background: '#222' }}>
          <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>PRESSURIZATION</h4>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
             <div style={{ textAlign: 'center', width: '100%', marginBottom: '10px' }}>
                <div>CABIN ALT: <span style={{ color: '#0f0' }}>{flightState.systems?.pressurization?.cabinAlt || 0} FT</span></div>
                <div>DIFF PSI: <span style={{ color: '#0f0' }}>{flightState.systems?.pressurization?.diffPressure || 0}</span></div>
             </div>
             <ToggleSwitch label="PACK L" active={flightState.systems?.pressurization?.packL} onClick={() => onSystemAction('pressurization', 'packL')} />
             <ToggleSwitch label="PACK R" active={flightState.systems?.pressurization?.packR} onClick={() => onSystemAction('pressurization', 'packR')} />
             <ToggleSwitch label="BLEED 1" active={flightState.systems?.pressurization?.bleed1} onClick={() => onSystemAction('pressurization', 'bleed1')} />
             <ToggleSwitch label="BLEED 2" active={flightState.systems?.pressurization?.bleed2} onClick={() => onSystemAction('pressurization', 'bleed2')} />
             <ToggleSwitch label="OXY MASKS" active={flightState.systems?.oxygen?.masks} onClick={() => onSystemAction('oxygen', 'masks')} color="red" />
          </div>
        </div>
        
        {/* NAV / SQUAWK */}
        <div className="panel-section" style={{ border: '1px solid #444', padding: '10px', borderRadius: '5px', background: '#222' }}>
          <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>NAV / RADIO</h4>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <div style={{ marginBottom: '10px', fontSize: '20px', color: '#0f0', border: '1px solid #555', padding: '5px 15px', borderRadius: '5px' }}>
               {flightState.systems?.transponder?.code || '1200'}
             </div>
             <div style={{ display: 'flex', gap: '10px' }}>
               <ToggleSwitch label="TCAS" active={flightState.systems?.transponder?.mode === 'TA/RA'} onClick={() => onSystemAction('transponder', 'mode_tara')} />
               <ToggleSwitch label="ALT RPT" active={flightState.systems?.transponder?.altRpt} onClick={() => onSystemAction('transponder', 'altRpt')} />
               <ToggleSwitch label="IRS L" active={flightState.systems?.nav?.irsL} onClick={() => onSystemAction('nav', 'irsL')} />
               <ToggleSwitch label="IRS R" active={flightState.systems?.nav?.irsR} onClick={() => onSystemAction('nav', 'irsR')} />
             </div>
          </div>
        </div>

        {/* FIRE */}
        <div className="panel-section" style={{ border: '1px solid #444', padding: '10px', borderRadius: '5px', background: '#222' }}>
          <h4 style={{ borderBottom: '1px solid #555', marginTop: 0, color: '#ff4444' }}>FIRE PROTECTION</h4>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
             <ToggleSwitch label="ENG 1 FIRE" active={flightState.systems?.fire?.eng1} onClick={() => onSystemAction('fire', 'eng1')} color="red" />
             <ToggleSwitch label="APU FIRE" active={flightState.systems?.fire?.apu} onClick={() => onSystemAction('fire', 'apu')} color="red" />
             <ToggleSwitch label="ENG 2 FIRE" active={flightState.systems?.fire?.eng2} onClick={() => onSystemAction('fire', 'eng2')} color="red" />
             <ToggleSwitch label="CARGO FIRE" active={flightState.systems?.fire?.cargo} onClick={() => onSystemAction('fire', 'cargo')} color="red" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default OverheadPanel;
