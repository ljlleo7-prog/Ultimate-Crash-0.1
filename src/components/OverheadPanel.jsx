
import React, { useState, useEffect } from 'react';
import './FlightPanel.css';

const OverheadPanel = ({ onClose, flightState, onSystemAction, aircraftModel }) => {
  const isAirbus = aircraftModel?.toLowerCase().includes('a3') || aircraftModel?.toLowerCase().includes('airbus');
  
  // Helper to get system state
  const getSys = (path, def) => {
    if (!flightState.systems) return def;
    const parts = path.split('.');
    let current = flightState.systems;
    for (const part of parts) {
      if (current === undefined || current === null) return def;
      current = current[part];
    }
    return current ?? def;
  };

  // --- COMPONENTS ---

  const BoeingSwitch = ({ label, active, onClick, color = 'green', type = 'toggle' }) => (
    <div className="boeing-switch-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px' }}>
      <div 
        className={`boeing-switch ${active ? 'active' : ''}`} 
        onClick={onClick}
        style={{ 
          width: '40px', 
          height: '60px', 
          background: 'linear-gradient(to right, #ccc, #eee, #ccc)', 
          borderRadius: '5px',
          position: 'relative',
          cursor: 'pointer',
          border: '2px solid #555',
          boxShadow: 'inset 0 0 5px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{
          position: 'absolute',
          top: active ? '5px' : '30px',
          left: '5px',
          width: '26px',
          height: '24px',
          background: '#888',
          borderRadius: '3px',
          border: '1px solid #666',
          boxShadow: '0 2px 2px rgba(0,0,0,0.4)',
          transition: 'top 0.1s ease-in-out'
        }}/>
      </div>
      <span style={{ fontSize: '10px', marginTop: '5px', color: '#ddd', textAlign: 'center', fontWeight: 'bold' }}>{label}</span>
      {/* Light Indicator (if applicable) */}
      <div style={{
        marginTop: '4px',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: active ? (color === 'red' ? '#ff4444' : '#44ff44') : '#222',
        boxShadow: active ? `0 0 5px ${color === 'red' ? '#ff4444' : '#44ff44'}` : 'none'
      }}></div>
    </div>
  );

  const AirbusButton = ({ label, active, onClick, fault = false, subLabel = "ON" }) => (
    <div className="airbus-button-container" style={{ margin: '8px' }}>
      <div 
        onClick={onClick}
        style={{ 
          width: '50px', 
          height: '50px', 
          background: '#111', 
          border: '2px solid #444',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: active ? 'inset 0 0 10px rgba(0,0,0,0.8)' : 'inset 0 0 2px rgba(255,255,255,0.1)'
        }}
      >
        {/* Top Label (Always visible or white when OFF?) - Actually Airbus logic is complex. 
            Simple version: 
            - Pressed IN (Active) -> No light (Dark cockpit) OR 'ON' (Blue/White) depending on system
            - Released (Inactive/Off) -> 'OFF' (White)
            - Fault -> 'FAULT' (Amber)
        */}
        <div style={{ fontSize: '9px', color: '#ccc', textAlign: 'center', marginBottom: '2px' }}>{label}</div>
        
        {/* Status Light */}
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          height: '100%', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
            {/* Upper: FAULT or ON */}
            {fault && (
                <div style={{ color: '#ffaa00', fontSize: '9px', fontWeight: 'bold', textShadow: '0 0 2px #ffaa00' }}>FAULT</div>
            )}
            {!fault && active && subLabel && (
                <div style={{ color: '#00ffff', fontSize: '9px', fontWeight: 'bold', textShadow: '0 0 2px #00ffff' }}>{subLabel}</div>
            )}
            
            {/* Lower: OFF */}
            {!active && (
                <div style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', marginTop: '2px', textShadow: '0 0 2px #fff' }}>OFF</div>
            )}
        </div>
      </div>
    </div>
  );

  const SwitchComponent = isAirbus ? AirbusButton : BoeingSwitch;

  // --- TRANSPONDER LOGIC ---
  const TransponderPanel = () => {
    const code = getSys('transponder')?.code || 2000;
    const mode = getSys('transponder')?.mode || 'STBY';

    const handleDigit = (digit) => {
        // Logic to update code one digit at a time would require local state tracking of "cursor"
        // For simplicity, let's just cycle or set a random code for now, OR implement a keypad.
        // Let's implement a simple way: Shift left? No, standard is 4 knobs.
        // Let's do a simple prompt for now to save UI space, or just 4 up/down buttons.
    };

    const cycleMode = () => {
        const modes = ['STBY', 'ALT', 'TA/RA'];
        const currentIdx = modes.indexOf(mode);
        const nextMode = modes[(currentIdx + 1) % modes.length];
        onSystemAction('transponder', 'mode', nextMode);
    };
    
    // Simple up/down for code digits
    const updateDigit = (pos, delta) => {
        let str = code.toString().padStart(4, '0');
        let val = parseInt(str[pos]);
        val = (val + delta + 8) % 8; // Octal 0-7
        const newCode = parseInt(str.substring(0, pos) + val + str.substring(pos + 1));
        onSystemAction('transponder', 'code', newCode);
    };

    return (
        <div className="panel-section" style={{ border: '1px solid #555', padding: '10px', background: '#222', borderRadius: '6px' }}>
            <h4 style={{ color: '#ccc', margin: '0 0 10px 0', borderBottom: '1px solid #444' }}>TRANSPONDER</h4>
            
            {/* Display */}
            <div style={{ 
                background: '#000', 
                color: '#ff8800', 
                fontFamily: 'digital-7, monospace', 
                fontSize: '24px', 
                padding: '5px 15px', 
                borderRadius: '4px', 
                marginBottom: '10px',
                textAlign: 'center',
                letterSpacing: '5px',
                border: '1px solid #444'
            }}>
                {code.toString().padStart(4, '0')}
            </div>

            {/* Digit Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
                {[0, 1, 2, 3].map(pos => (
                    <div key={pos} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button onClick={() => updateDigit(pos, 1)} style={{ background: '#444', border: 'none', color: 'white', cursor: 'pointer', fontSize: '10px', padding: '2px 5px' }}>▲</button>
                        <button onClick={() => updateDigit(pos, -1)} style={{ background: '#444', border: 'none', color: 'white', cursor: 'pointer', fontSize: '10px', padding: '2px 5px' }}>▼</button>
                    </div>
                ))}
            </div>

            {/* Mode Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#333', padding: '5px', borderRadius: '4px' }}>
                <span style={{ fontSize: '12px', color: '#aaa' }}>MODE:</span>
                <button 
                    onClick={cycleMode}
                    style={{ 
                        background: mode === 'TA/RA' ? '#0f0' : (mode === 'ALT' ? '#fa0' : '#888'), 
                        border: '1px solid #555', 
                        color: '#000', 
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        minWidth: '60px'
                    }}
                >
                    {mode}
                </button>
            </div>
            
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
                 <button 
                    onClick={() => onSystemAction('transponder', 'ident', true)}
                    style={{ background: '#333', color: '#fff', border: '1px solid #666', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', padding: '4px 10px' }}
                 >IDENT</button>
            </div>
        </div>
    );
  };

  return (
    <div className="overhead-panel-overlay" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '950px',
      height: '750px',
      backgroundColor: isAirbus ? '#3a4b5c' : '#1a1a1a', // Airbus Blue-Grey vs Boeing Dark Grey
      border: '4px solid #444',
      borderRadius: '15px',
      zIndex: 3000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 0 50px rgba(0,0,0,0.9)',
      padding: '20px',
      color: '#eee',
      fontFamily: 'sans-serif'
    }}>
      <div className="overhead-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #555', paddingBottom: '10px' }}>
        <div>
            <h2 style={{ margin: 0, fontSize: '24px' }}>{aircraftModel || 'AIRCRAFT'} SYSTEMS</h2>
            <span style={{ fontSize: '12px', color: '#aaa' }}>OVERHEAD PANEL - {isAirbus ? 'AIRBUS STYLE' : 'BOEING STYLE'}</span>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: '#c00',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '5px 20px',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >CLOSE</button>
      </div>

      <div className="overhead-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gridTemplateRows: 'auto auto', 
        gap: '15px', 
        flex: 1,
        overflowY: 'auto'
      }}>
        
        {/* COLUMN 1: ELEC */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="panel-section" style={{ border: '1px solid #555', padding: '10px', borderRadius: '5px', background: '#222' }}>
                <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>ELECTRICAL</h4>
                <div style={{ marginBottom: '10px', fontSize: '12px', textAlign: 'center' }}>
                    <div>DC: <span style={{ color: getSys('electrical.dcVolts') > 20 ? '#0f0' : '#f00' }}>{getSys('electrical.dcVolts', 0).toFixed(1)}V</span></div>
                    <div>AC: <span style={{ color: getSys('electrical.acAmps') > 0 ? '#0f0' : '#888' }}>{getSys('electrical.acAmps', 0)}A</span></div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <SwitchComponent label="BAT" active={getSys('electrical.battery')} onClick={() => onSystemAction('electrical', 'battery')} />
                    <SwitchComponent label="STBY PWR" active={getSys('electrical.stbyPower')} onClick={() => onSystemAction('electrical', 'stbyPower')} subLabel="AUTO" />
                    <SwitchComponent label="GEN 1" active={getSys('electrical.gen1')} onClick={() => onSystemAction('electrical', 'gen1')} fault={!getSys('electrical.gen1') && getSys('electrical.battery')} />
                    <SwitchComponent label="GEN 2" active={getSys('electrical.gen2')} onClick={() => onSystemAction('electrical', 'gen2')} fault={!getSys('electrical.gen2') && getSys('electrical.battery')} />
                    <SwitchComponent label="APU GEN" active={getSys('electrical.apuGen')} onClick={() => onSystemAction('electrical', 'apuGen')} />
                </div>
            </div>

            <div className="panel-section" style={{ border: '1px solid #555', padding: '10px', borderRadius: '5px', background: '#222' }}>
                <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>APU</h4>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    EGT: <span style={{ color: '#0f0' }}>{Math.round(getSys('apu.egt', 0))}°C</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <SwitchComponent label="MASTER" active={getSys('apu.master')} onClick={() => onSystemAction('apu', 'master')} />
                    <SwitchComponent label="START" active={getSys('apu.start')} onClick={() => onSystemAction('apu', 'start')} subLabel="AVAIL" />
                    <SwitchComponent label="BLEED" active={getSys('apu.bleed')} onClick={() => onSystemAction('apu', 'bleed')} />
                </div>
            </div>
        </div>

        {/* COLUMN 2: FUEL & HYD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="panel-section" style={{ border: '1px solid #555', padding: '10px', borderRadius: '5px', background: '#222' }}>
                <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>FUEL PUMPS</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <SwitchComponent label="L PUMP 1" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} />
                    <SwitchComponent label="L PUMP 2" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} />
                    <SwitchComponent label="CTR L" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} />
                    <SwitchComponent label="CTR R" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} />
                    <SwitchComponent label="R PUMP 1" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} />
                    <SwitchComponent label="R PUMP 2" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} />
                    <SwitchComponent label="X-FEED" active={getSys('fuel.crossfeed')} onClick={() => onSystemAction('fuel', 'crossfeed')} subLabel="OPEN" />
                </div>
            </div>

            <div className="panel-section" style={{ border: '1px solid #555', padding: '10px', borderRadius: '5px', background: '#222' }}>
                <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>HYDRAULICS</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
                   <span>SYS A: {Math.round(getSys('hydraulics.sysA.pressure', 0))} PSI</span>
                   <span>SYS B: {Math.round(getSys('hydraulics.sysB.pressure', 0))} PSI</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <SwitchComponent label="ENG 1" active={getSys('hydraulics.sysA.engPump')} onClick={() => onSystemAction('hydraulics', 'eng1Pump')} />
                    <SwitchComponent label="ELEC 1" active={getSys('hydraulics.sysA.elecPump')} onClick={() => onSystemAction('hydraulics', 'elec1Pump')} />
                    <SwitchComponent label="ELEC 2" active={getSys('hydraulics.sysB.elecPump')} onClick={() => onSystemAction('hydraulics', 'elec2Pump')} />
                    <SwitchComponent label="ENG 2" active={getSys('hydraulics.sysB.engPump')} onClick={() => onSystemAction('hydraulics', 'eng2Pump')} />
                </div>
            </div>
        </div>

        {/* COLUMN 3: AIR & LIGHTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <div className="panel-section" style={{ border: '1px solid #555', padding: '10px', borderRadius: '5px', background: '#222' }}>
                <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>AIR COND</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <SwitchComponent label="L PACK" active={getSys('pressurization.packL')} onClick={() => onSystemAction('pressurization', 'packL')} subLabel="AUTO" />
                    <SwitchComponent label="R PACK" active={getSys('pressurization.packR')} onClick={() => onSystemAction('pressurization', 'packR')} subLabel="AUTO" />
                    <SwitchComponent label="BLEED 1" active={getSys('pressurization.bleed1')} onClick={() => onSystemAction('pressurization', 'bleed1')} />
                    <SwitchComponent label="BLEED 2" active={getSys('pressurization.bleed2')} onClick={() => onSystemAction('pressurization', 'bleed2')} />
                </div>
                <div style={{ marginTop: '10px', background: '#000', padding: '5px', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }}>
                    CABIN ALT: <span style={{ color: '#0f0' }}>{Math.round(getSys('pressurization.cabinAlt', 0))}</span> FT
                    <br/>
                    DIFF PRESS: <span style={{ color: '#0f0' }}>{getSys('pressurization.diffPressure', 0).toFixed(1)}</span> PSI
                </div>
            </div>

            <div className="panel-section" style={{ border: '1px solid #555', padding: '10px', borderRadius: '5px', background: '#222' }}>
                <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>EXT LIGHTS</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <SwitchComponent label="LANDING" active={getSys('lighting.landing')} onClick={() => onSystemAction('lighting', 'landing')} />
                    <SwitchComponent label="TAXI" active={getSys('lighting.taxi')} onClick={() => onSystemAction('lighting', 'taxi')} />
                    <SwitchComponent label="STROBE" active={getSys('lighting.strobe')} onClick={() => onSystemAction('lighting', 'strobe')} />
                    <SwitchComponent label="BEACON" active={getSys('lighting.beacon')} onClick={() => onSystemAction('lighting', 'beacon')} />
                    <SwitchComponent label="NAV" active={getSys('lighting.nav')} onClick={() => onSystemAction('lighting', 'nav')} />
                    <SwitchComponent label="LOGO" active={getSys('lighting.logo')} onClick={() => onSystemAction('lighting', 'logo')} />
                </div>
            </div>
        </div>

        {/* COLUMN 4: TRANSPONDER & MISC */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <TransponderPanel />

            <div className="panel-section" style={{ border: '1px solid #555', padding: '10px', borderRadius: '5px', background: '#222' }}>
                <h4 style={{ borderBottom: '1px solid #555', marginTop: 0 }}>MISC</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                     <SwitchComponent label="SEAT BELTS" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')} />
                     <SwitchComponent label="NO SMOKE" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')} />
                     <SwitchComponent label="WIPER L" active={getSys('wipers.left')} onClick={() => onSystemAction('wipers', 'left')} />
                     <SwitchComponent label="WIPER R" active={getSys('wipers.right')} onClick={() => onSystemAction('wipers', 'right')} />
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default OverheadPanel;
