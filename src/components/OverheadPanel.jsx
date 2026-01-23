
import React, { useState, useEffect } from 'react';
import './FlightPanel.css';

const OverheadPanel = ({ onClose, flightState, onSystemAction, aircraftModel }) => {
  const isAirbus = aircraftModel?.toLowerCase().includes('a3') || aircraftModel?.toLowerCase().includes('airbus');
  
  // Helper to get system state safely
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

  // --- REUSABLE UI COMPONENTS ---

  const Annunciator = ({ label, color = 'amber', active }) => (
    <div style={{
      background: active ? (color === 'red' ? '#ff3333' : color === 'blue' ? '#00ccff' : '#ffaa00') : '#222',
      color: active ? '#000' : '#444',
      fontSize: '9px',
      fontWeight: 'bold',
      padding: '2px 4px',
      borderRadius: '2px',
      textAlign: 'center',
      minWidth: '40px',
      boxShadow: active ? `0 0 5px ${color === 'red' ? '#f00' : '#fa0'}` : 'none',
      border: '1px solid #333',
      marginTop: '4px'
    }}>
      {label}
    </div>
  );

  const BoeingSwitch = ({ label, active, onClick, annunciator, subLabel }) => (
    <div className="boeing-switch-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px' }}>
      {/* Top Annunciator (if any) */}
      {annunciator && (
        <Annunciator label={annunciator.label} active={annunciator.active} color={annunciator.color} />
      )}
      
      <div 
        className={`boeing-switch ${active ? 'active' : ''}`} 
        onClick={onClick}
        style={{ 
          width: '36px', 
          height: '50px', 
          background: 'linear-gradient(to right, #ccc, #eee, #ccc)', 
          borderRadius: '4px',
          position: 'relative',
          cursor: 'pointer',
          border: '2px solid #555',
          marginTop: '5px'
        }}
      >
        <div style={{
          position: 'absolute',
          top: active ? '4px' : '22px',
          left: '4px',
          width: '24px',
          height: '20px',
          background: '#888',
          borderRadius: '2px',
          border: '1px solid #666',
          boxShadow: '0 2px 2px rgba(0,0,0,0.4)',
          transition: 'top 0.1s'
        }}/>
      </div>
      <span style={{ fontSize: '10px', marginTop: '4px', color: '#ddd', textAlign: 'center', fontWeight: 'bold' }}>{label}</span>
      {subLabel && <span style={{ fontSize: '8px', color: '#aaa' }}>{subLabel}</span>}
    </div>
  );

  const AirbusButton = ({ label, active, onClick, fault = false, subLabel = "ON" }) => (
    <div className="airbus-button-container" style={{ margin: '6px' }}>
      <div 
        onClick={onClick}
        style={{ 
          width: '45px', 
          height: '45px', 
          background: '#151515', 
          border: '2px solid #444',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: active ? 'inset 0 0 5px rgba(0,0,0,0.5)' : 'inset 0 0 2px rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ fontSize: '8px', color: '#ccc', textAlign: 'center', marginBottom: '2px' }}>{label}</div>
        <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {fault && <div style={{ color: '#ffaa00', fontSize: '9px', fontWeight: 'bold', textShadow: '0 0 3px #fa0' }}>FAULT</div>}
            {!fault && active && subLabel && <div style={{ color: '#00ffff', fontSize: '9px', fontWeight: 'bold', textShadow: '0 0 3px #0ff' }}>{subLabel}</div>}
            {!active && <div style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', marginTop: '2px' }}>OFF</div>}
        </div>
      </div>
    </div>
  );

  const Switch = isAirbus ? AirbusButton : BoeingSwitch;

  const Gauge = ({ label, value, unit, min = 0, max = 100, color = '#0f0' }) => (
    <div style={{ background: '#111', padding: '5px', borderRadius: '4px', border: '1px solid #333', textAlign: 'center', minWidth: '60px' }}>
      <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontFamily: 'monospace', color: color, fontWeight: 'bold' }}>
        {value}
      </div>
      <div style={{ fontSize: '8px', color: '#666' }}>{unit}</div>
      {/* Simple Bar */}
      <div style={{ width: '100%', height: '3px', background: '#333', marginTop: '3px' }}>
        <div style={{ 
          width: `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%`, 
          height: '100%', 
          background: color 
        }}/>
      </div>
    </div>
  );

  // --- SUB-PANELS ---

  const ElectricalPanel = () => {
    const bat = getSys('electrical.battery');
    const batCharge = getSys('electrical.batteryCharge', 100);
    const dcVolts = getSys('electrical.dcVolts', 0);
    const acVolts = getSys('electrical.acVolts', 0);
    const acFreq = getSys('electrical.acFreq', 0);
    const acAmps = getSys('electrical.acAmps', 0);
    
    return (
      <div className="panel-section">
        <h4 className="panel-title">ELECTRICAL</h4>
        
        {/* Meters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '10px' }}>
          <Gauge label="DC VOLTS" value={dcVolts.toFixed(1)} unit="V" max={30} color={dcVolts > 22 ? '#0f0' : '#f00'} />
          <Gauge label="DC AMPS" value={(acAmps * 0.2).toFixed(0)} unit="A" max={100} /> {/* Fake DC Amps */}
          <Gauge label="AC VOLTS" value={Math.round(acVolts)} unit="V" min={0} max={130} color={acVolts > 110 ? '#0f0' : '#fa0'} />
          <Gauge label="AC FREQ" value={Math.round(acFreq)} unit="Hz" min={380} max={420} />
        </div>

        {/* Switches */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Switch label="BAT" active={bat} onClick={() => onSystemAction('electrical', 'battery')} 
            annunciator={{ label: 'DISCH', active: !getSys('electrical.gen1') && !getSys('electrical.gen2') && bat, color: 'amber' }} 
          />
          
          <Switch label="STBY PWR" active={getSys('electrical.stbyPower')} onClick={() => onSystemAction('electrical', 'stbyPower')} subLabel="AUTO" 
             annunciator={{ label: 'OFF', active: !getSys('electrical.stbyPower'), color: 'amber' }}
          />
          
          <div style={{ width: '10px' }} /> {/* Spacer */}

          <Switch label="GEN 1" active={getSys('electrical.gen1')} onClick={() => onSystemAction('electrical', 'gen1')}
             annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff1'), color: 'blue' }}
          />
          <Switch label="GEN 2" active={getSys('electrical.gen2')} onClick={() => onSystemAction('electrical', 'gen2')}
             annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff2'), color: 'blue' }}
          />
          
          <Switch label="APU GEN" active={getSys('electrical.apuGen')} onClick={() => onSystemAction('electrical', 'apuGen')}
             annunciator={{ label: 'OFF BUS', active: getSys('electrical.apuGenOff'), color: 'blue' }}
          />
        </div>
      </div>
    );
  };

  const APUPanel = () => {
    const egt = getSys('apu.egt', 0);
    const n2 = getSys('apu.n2', 0); // Need to expose N2 in service
    const running = getSys('apu.running');
    const starting = getSys('apu.starting');
    
    return (
      <div className="panel-section">
        <h4 className="panel-title">APU</h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            <Gauge label="EGT" value={Math.round(egt)} unit="°C" max={800} color={egt > 700 ? '#f00' : '#0f0'} />
            <Gauge label="RPM" value={Math.round(n2)} unit="%" max={110} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <Switch label="MASTER" active={getSys('apu.master')} onClick={() => onSystemAction('apu', 'master')} 
               annunciator={{ label: 'FAULT', active: false, color: 'amber' }}
            />
            <Switch label="START" active={getSys('apu.start')} onClick={() => onSystemAction('apu', 'start')} subLabel={running ? "AVAIL" : (starting ? "START" : "")} 
               annunciator={{ label: 'MAINT', active: false, color: 'blue' }}
            />
        </div>
      </div>
    );
  };

  const FuelPanel = () => {
    // Quantities
    const tankL = getSys('fuel.tanks.left', 0);
    const tankR = getSys('fuel.tanks.right', 0);
    const tankC = getSys('fuel.tanks.center', 0);
    
    // Pressures
    const pressL = getSys('fuel.pressL', 0);
    const pressR = getSys('fuel.pressR', 0);
    const pressC = getSys('fuel.pressC', 0);

    return (
      <div className="panel-section">
        <h4 className="panel-title">FUEL</h4>
        
        {/* Quantities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', background: '#000', padding: '5px', borderRadius: '4px' }}>
            <div className="fuel-qty">
                <span>LEFT</span>
                <span className="digital">{Math.round(tankL)}</span>
            </div>
            <div className="fuel-qty">
                <span>CTR</span>
                <span className="digital">{Math.round(tankC)}</span>
            </div>
            <div className="fuel-qty">
                <span>RIGHT</span>
                <span className="digital">{Math.round(tankR)}</span>
            </div>
        </div>

        {/* Pumps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {/* Left Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Switch label="L PUMP 1" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                    annunciator={{ label: 'LOW PRESS', active: pressL < 10, color: 'amber' }}
                />
                <Switch label="L PUMP 2" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: pressL < 10, color: 'amber' }}
                />
            </div>
            
            {/* Center Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Switch label="CTR L" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                    annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }}
                />
                <Switch label="CTR R" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }}
                />
                <div style={{ marginTop: '10px' }}>
                    <Switch label="X-FEED" active={getSys('fuel.crossfeed')} onClick={() => onSystemAction('fuel', 'crossfeed')} subLabel="VALVE OPEN" 
                        annunciator={{ label: 'VALVE OPEN', active: getSys('fuel.crossfeed'), color: 'blue' }}
                    />
                </div>
            </div>

            {/* Right Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Switch label="R PUMP 1" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                    annunciator={{ label: 'LOW PRESS', active: pressR < 10, color: 'amber' }}
                />
                <Switch label="R PUMP 2" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: pressR < 10, color: 'amber' }}
                />
            </div>
        </div>
      </div>
    );
  };

  const PneumaticPanel = () => {
    const ductL = getSys('pressurization.ductPressL', 0);
    const ductR = getSys('pressurization.ductPressR', 0);
    const cabAlt = getSys('pressurization.cabinAlt', 0);
    const diff = getSys('pressurization.diffPressure', 0);

    return (
      <div className="panel-section">
        <h4 className="panel-title">AIR CONDITIONING</h4>
        
        {/* Duct Pressures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <Gauge label="DUCT L" value={Math.round(ductL)} unit="PSI" max={60} />
            <Gauge label="DUCT R" value={Math.round(ductR)} unit="PSI" max={60} />
        </div>

        {/* Bleed Switches */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Switch label="BLEED 1" active={getSys('pressurization.bleed1')} onClick={() => onSystemAction('pressurization', 'bleed1')} 
                annunciator={{ label: 'OFF', active: !getSys('pressurization.bleed1'), color: 'amber' }}
            />
            <Switch label="APU BLEED" active={getSys('apu.bleed')} onClick={() => onSystemAction('apu', 'bleed')} 
                annunciator={{ label: 'VALVE OPEN', active: getSys('apu.bleed') && getSys('apu.running'), color: 'blue' }}
            />
            <Switch label="BLEED 2" active={getSys('pressurization.bleed2')} onClick={() => onSystemAction('pressurization', 'bleed2')} 
                annunciator={{ label: 'OFF', active: !getSys('pressurization.bleed2'), color: 'amber' }}
            />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <Switch label="ISOLATION" active={getSys('pressurization.isolationValve')} onClick={() => onSystemAction('pressurization', 'isolationValve')} subLabel="AUTO" 
                annunciator={{ label: 'VALVE OPEN', active: getSys('pressurization.isolationValve'), color: 'blue' }}
            />
        </div>

        {/* Packs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px' }}>
            <Switch label="PACK L" active={getSys('pressurization.packL')} onClick={() => onSystemAction('pressurization', 'packL')} subLabel="AUTO" />
            <Switch label="PACK R" active={getSys('pressurization.packR')} onClick={() => onSystemAction('pressurization', 'packR')} subLabel="AUTO" />
        </div>
        
        {/* Cabin Info */}
        <div style={{ marginTop: '10px', background: '#000', padding: '5px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#0f0' }}>
            CAB ALT: {Math.round(cabAlt)} FT | DIFF: {diff.toFixed(1)} PSI
        </div>
      </div>
    );
  };

  const HydraulicsPanel = () => {
    return (
      <div className="panel-section">
        <h4 className="panel-title">HYDRAULICS</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#aaa' }}>SYS A</span>
                <Gauge label="PRESS" value={Math.round(getSys('hydraulics.sysA.pressure', 0))} unit="PSI" max={4000} />
                <div style={{ fontSize: '10px', marginTop: '2px' }}>QTY: {Math.round(getSys('hydraulics.sysA.qty', 0))}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#aaa' }}>SYS B</span>
                <Gauge label="PRESS" value={Math.round(getSys('hydraulics.sysB.pressure', 0))} unit="PSI" max={4000} />
                <div style={{ fontSize: '10px', marginTop: '2px' }}>QTY: {Math.round(getSys('hydraulics.sysB.qty', 0))}%</div>
            </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
             <Switch label="ENG 1" active={getSys('hydraulics.sysA.engPump')} onClick={() => onSystemAction('hydraulics', 'eng1Pump')} 
                annunciator={{ label: 'LOW PRESS', active: getSys('hydraulics.sysA.pressure') < 1500, color: 'amber' }}
             />
             <Switch label="ELEC 2" active={getSys('hydraulics.sysA.elecPump')} onClick={() => onSystemAction('hydraulics', 'elec1Pump')} 
                annunciator={{ label: 'OVERHEAT', active: false, color: 'amber' }}
             />
             <Switch label="ELEC 1" active={getSys('hydraulics.sysB.elecPump')} onClick={() => onSystemAction('hydraulics', 'elec2Pump')} 
                annunciator={{ label: 'OVERHEAT', active: false, color: 'amber' }}
             />
             <Switch label="ENG 2" active={getSys('hydraulics.sysB.engPump')} onClick={() => onSystemAction('hydraulics', 'eng2Pump')} 
                annunciator={{ label: 'LOW PRESS', active: getSys('hydraulics.sysB.pressure') < 1500, color: 'amber' }}
             />
        </div>
      </div>
    );
  };

  const LightsPanel = () => {
    return (
      <div className="panel-section">
        <h4 className="panel-title">EXT LIGHTS</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            <Switch label="LANDING" active={getSys('lighting.landing')} onClick={() => onSystemAction('lighting', 'landing')} />
            <Switch label="TAXI" active={getSys('lighting.taxi')} onClick={() => onSystemAction('lighting', 'taxi')} />
            <Switch label="STROBE" active={getSys('lighting.strobe')} onClick={() => onSystemAction('lighting', 'strobe')} />
            <Switch label="BEACON" active={getSys('lighting.beacon')} onClick={() => onSystemAction('lighting', 'beacon')} />
            <Switch label="NAV" active={getSys('lighting.nav')} onClick={() => onSystemAction('lighting', 'nav')} />
            <Switch label="LOGO" active={getSys('lighting.logo')} onClick={() => onSystemAction('lighting', 'logo')} />
            <Switch label="WING" active={getSys('lighting.wing')} onClick={() => onSystemAction('lighting', 'wing')} />
        </div>
      </div>
    );
  };

  return (
    <div className="overhead-overlay">
      <div className="overhead-container">
        <div className="overhead-header">
            <div>
                <h2>{aircraftModel || 'BOEING 737-800'}</h2>
                <span>OVERHEAD SYSTEM PANEL</span>
            </div>
            <button className="close-btn" onClick={onClose}>CLOSE</button>
        </div>

        <div className="overhead-grid">
            <div className="col">
                <ElectricalPanel />
                <APUPanel />
            </div>
            <div className="col">
                <FuelPanel />
                <HydraulicsPanel />
            </div>
            <div className="col">
                <PneumaticPanel />
                <LightsPanel />
            </div>
            <div className="col">
                <div className="panel-section">
                    <h4 className="panel-title">MISC</h4>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <Switch label="SEAT BELTS" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')} subLabel="AUTO" />
                        <Switch label="NO SMOKE" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')} subLabel="ON" />
                    </div>
                </div>
                {/* Transponder could go here or be separate */}
            </div>
        </div>
      </div>
      
      {/* Inline Styles for convenience, ideally move to CSS */}
      <style>{`
        .overhead-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 2000;
            display: flex; justify-content: center; align-items: center;
        }
        .overhead-container {
            width: 1000px; height: 800px;
            background: #252525;
            border: 4px solid #444; border-radius: 10px;
            display: flex; flexDirection: column;
            padding: 20px;
            color: #eee;
            font-family: 'Roboto', sans-serif;
            box-shadow: 0 0 50px #000;
        }
        .overhead-header {
            display: flex; justify-content: space-between;
            border-bottom: 2px solid #444; padding-bottom: 10px; margin-bottom: 15px;
        }
        .close-btn {
            background: #c00; color: white; border: none; padding: 5px 20px;
            font-weight: bold; cursor: pointer; border-radius: 4px;
        }
        .overhead-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;
            flex: 1; overflow-y: auto;
        }
        .panel-section {
            background: #1a1a1a; border: 2px solid #333;
            border-radius: 6px; padding: 10px; margin-bottom: 15px;
        }
        .panel-title {
            margin: 0 0 10px 0; border-bottom: 1px solid #444;
            font-size: 14px; color: #ccc; text-align: center;
            padding-bottom: 5px;
        }
        .fuel-qty {
            text-align: center; font-size: 10px; color: #aaa;
        }
        .fuel-qty .digital {
            display: block; font-size: 14px; color: #fff; font-family: monospace;
        }
        /* Boeing Switch Animation */
        .boeing-switch { transition: background 0.2s; }
        .boeing-switch.active { background: linear-gradient(to right, #ccc, #eee, #ccc); }
      `}</style>
    </div>
  );
};

export default OverheadPanel;
