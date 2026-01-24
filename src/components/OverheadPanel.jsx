
import React, { useState, useEffect } from 'react';
import './FlightPanel.css';

const OverheadPanel = ({ onClose, flightState, onSystemAction, aircraftModel }) => {
  const modelLower = (aircraftModel || '').toLowerCase();
  const isAirbus = modelLower.includes('a3') || modelLower.includes('airbus');
  const is737 = modelLower.includes('737') || modelLower.includes('b73');
  const isBoeing = modelLower.includes('boeing') || modelLower.startsWith('b7');
  const isOtherBoeing = isBoeing && !is737 && !isAirbus;
  
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

  const hasPower = getSys('electrical.dcVolts', 0) > 15;
  const acVoltsMain = getSys('electrical.acVolts', 0);
  const hasACPower = acVoltsMain > 100;
  const apuRunning = getSys('apu.running', false);
  const ductPressL = getSys('pressurization.ductPressL', 0);
  const ductPressR = getSys('pressurization.ductPressR', 0);
  const hasEngineStartAir = ductPressL > 20 || ductPressR > 20;

  // --- REUSABLE UI COMPONENTS ---

  const Annunciator = ({ label, color = 'amber', active }) => (
    <div style={{
      background: active && hasPower ? (color === 'red' ? '#ff3333' : color === 'blue' ? '#00ccff' : '#ffaa00') : '#111',
      color: active && hasPower ? '#000' : '#333',
      fontSize: '9px',
      fontWeight: 'bold',
      padding: '2px 4px',
      borderRadius: '2px',
      textAlign: 'center',
      minWidth: '40px',
      boxShadow: active && hasPower ? `0 0 5px ${color === 'red' ? '#f00' : '#fa0'}` : 'none',
      border: '1px solid #333',
      marginTop: '4px',
      opacity: active && hasPower ? 1 : 0.5
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

  const AirbusButton = ({ label, active, onClick, fault = false, subLabel = "ON", invertLight = false, specialLabel = null, enabled = true }) => {
    // "Lights Off" Philosophy:
    // Normal Operation (Active) -> Dark
    // Abnormal/Off (Inactive) -> White "OFF" Light
    // Fault -> Amber "FAULT" Light
    // InvertLight (e.g. Ext Lights) -> Active = Blue/Green Light, Inactive = Dark

    let lightText = null;
    let lightColor = null;
    let isLit = false;
    
    if (hasPower && enabled) {
        if (fault) {
            lightText = 'FAULT';
            lightColor = '#ff9900'; // Amber
            isLit = true;
        } else if (specialLabel) {
            // Override (e.g. AVAIL)
            lightText = specialLabel;
            lightColor = '#00ff00'; // Green
            isLit = true;
        } else if (invertLight) {
            // Light ON when Active (e.g. APU Master, Ext Lights)
            if (active) {
                lightText = subLabel || 'ON';
                lightColor = '#00ffff'; // Cyan
                isLit = true;
            }
        } else {
            // Standard: Light ON when Inactive (OFF)
            if (!active) {
                lightText = 'OFF';
                lightColor = '#ffffff'; // White
                isLit = true;
            }
        }
    }

    return (
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
              boxShadow: active ? 'inset 0 0 5px rgba(0,0,0,0.8)' : 'inset 0 0 2px rgba(255,255,255,0.1)', // Depressed effect
              position: 'relative'
            }}
          >
            {/* Label (Always visible but dim) */}
            <div style={{ fontSize: '8px', color: '#888', textAlign: 'center', marginBottom: '2px', position: 'absolute', top: '4px', width: '100%' }}>{label}</div>
            
            {/* Annunciator Area */}
            <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'end', alignItems: 'center', paddingBottom: '4px' }}>
                {isLit ? (
                    <div style={{ 
                        color: lightColor, 
                        fontSize: '9px', 
                        fontWeight: 'bold', 
                        textShadow: `0 0 4px ${lightColor}`,
                        border: `1px solid ${lightColor}`,
                        padding: '1px 3px',
                        background: 'rgba(0,0,0,0.5)',
                        marginTop: '12px'
                    }}>
                        {lightText}
                    </div>
                ) : (
                    // Faint/Dark Status (Placeholder to keep layout or faint text)
                    <div style={{ height: '15px' }}></div> 
                )}
            </div>
          </div>
        </div>
    );
  };

  const BoeingLightButton = ({ label, active, onClick, fault = false, subLabel = "ON", invertLight = false, specialLabel = null, enabled = true }) => {
    let lightText = null;
    let lightColor = null;
    let isLit = false;
    
    if (hasPower && enabled) {
        if (fault) {
            lightText = 'FAULT';
            lightColor = '#ff9900';
            isLit = true;
        } else if (specialLabel) {
            lightText = specialLabel;
            lightColor = '#00ff00';
            isLit = true;
        } else if (active) {
            lightText = subLabel || 'ON';
            lightColor = '#00ff00';
            isLit = true;
        }
    }

    return (
        <div className="airbus-button-container" style={{ margin: '6px' }}>
          <div 
            onClick={enabled ? onClick : undefined}
            style={{ 
              width: '45px', 
              height: '45px', 
              background: '#151515', 
              border: '2px solid #444',
              borderRadius: '4px',
              cursor: enabled ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: active ? 'inset 0 0 5px rgba(0,0,0,0.8)' : 'inset 0 0 2px rgba(255,255,255,0.1)',
              position: 'relative',
              opacity: enabled ? 1 : 0.5
            }}
          >
            <div style={{ fontSize: '8px', color: '#888', textAlign: 'center', marginBottom: '2px', position: 'absolute', top: '4px', width: '100%' }}>{label}</div>
            
            <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'end', alignItems: 'center', paddingBottom: '4px' }}>
                {isLit ? (
                    <div style={{ 
                        color: lightColor, 
                        fontSize: '9px', 
                        fontWeight: 'bold', 
                        textShadow: `0 0 4px ${lightColor}`,
                        border: `1px solid ${lightColor}`,
                        padding: '1px 3px',
                        background: 'rgba(0,0,0,0.5)',
                        marginTop: '12px'
                    }}>
                        {lightText}
                    </div>
                ) : (
                    <div style={{ height: '15px' }}></div> 
                )}
            </div>
          </div>
        </div>
    );
  };

  const Switch = isAirbus ? AirbusButton : (isOtherBoeing ? BoeingLightButton : BoeingSwitch);

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
    
    // Dynamic Generators
    const elecSys = getSys('electrical', {});
    const genKeys = Object.keys(elecSys).filter(k => k.match(/^gen\d+$/)).sort();

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

          {genKeys.map((key, i) => {
              const index = i + 1;
              return (
                  <Switch key={key} label={`GEN ${index}`} active={elecSys[key]} onClick={() => onSystemAction('electrical', key)}
                     annunciator={{ label: 'OFF BUS', active: getSys(`electrical.sourceOff${index}`), color: 'blue' }}
                  />
              );
          })}
          
          <Switch label="APU GEN" active={getSys('electrical.apuGen')} onClick={() => onSystemAction('electrical', 'apuGen')}
             annunciator={{ label: 'OFF BUS', active: getSys('electrical.apuGenOff'), color: 'blue' }}
             fault={getSys('electrical.apuGenOff')}
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
               invertLight={true} // Blue ON when Active
               subLabel="ON"
            />
            <Switch label="START" active={getSys('apu.start')} onClick={() => onSystemAction('apu', 'start')} 
               subLabel={running ? "AVAIL" : (starting ? "ON" : "")} 
               annunciator={{ label: 'MAINT', active: false, color: 'blue' }}
               invertLight={true}
               specialLabel={running ? "AVAIL" : (starting ? "ON" : null)}
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
                    enabled={hasPower}
                />
                <Switch label="L PUMP 2" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: pressL < 10, color: 'amber' }}
                     enabled={hasPower}
                />
            </div>
            
            {/* Center Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Switch label="CTR L" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                    annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }}
                    enabled={hasPower}
                />
                <Switch label="CTR R" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }}
                     enabled={hasPower}
                />
                <div style={{ marginTop: '10px' }}>
                    <Switch label="X-FEED" active={getSys('fuel.crossfeed')} onClick={() => onSystemAction('fuel', 'crossfeed')} subLabel="VALVE OPEN" 
                        annunciator={{ label: 'VALVE OPEN', active: getSys('fuel.crossfeed'), color: 'blue' }}
                        enabled={hasPower}
                    />
                </div>
            </div>

            {/* Right Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Switch label="R PUMP 1" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                    annunciator={{ label: 'LOW PRESS', active: pressR < 10, color: 'amber' }}
                    enabled={hasPower}
                />
                <Switch label="R PUMP 2" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: pressR < 10, color: 'amber' }}
                     enabled={hasPower}
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
    
    // Dynamic Bleeds
    const pneuSys = getSys('pressurization', {});
    const bleedKeys = Object.keys(pneuSys).filter(k => k.match(/^bleed\d+$/)).sort();

    return (
      <div className="panel-section">
        <h4 className="panel-title">AIR CONDITIONING</h4>
        
        {/* Duct Pressures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <Gauge label="DUCT L" value={Math.round(ductL)} unit="PSI" max={60} />
            <Gauge label="DUCT R" value={Math.round(ductR)} unit="PSI" max={60} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {bleedKeys.map((key, i) => (
                <Switch key={key} label={`BLEED ${i+1}`} active={pneuSys[key]} onClick={() => onSystemAction('pressurization', key)} 
                    annunciator={{ label: 'OFF', active: !pneuSys[key], color: 'amber' }}
                    enabled={hasACPower || apuRunning}
                />
            ))}
            
            <Switch label="APU BLEED" active={getSys('apu.bleed')} onClick={() => onSystemAction('apu', 'bleed')} 
                annunciator={{ label: 'VALVE OPEN', active: getSys('apu.bleed') && getSys('apu.running'), color: 'blue' }}
                enabled={apuRunning}
            />
        </div>
        
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
             <Switch label="ISOLATION" active={getSys('pressurization.isolationValve')} onClick={() => onSystemAction('pressurization', 'isolationValve')} subLabel="VALVE"
                annunciator={{ label: 'OPEN', active: getSys('pressurization.isolationValve'), color: 'blue' }}
            />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px' }}>
            <Switch label="PACK L" active={getSys('pressurization.packL')} onClick={() => onSystemAction('pressurization', 'packL')} subLabel="AUTO" enabled={hasACPower || apuRunning} />
            <Switch label="PACK R" active={getSys('pressurization.packR')} onClick={() => onSystemAction('pressurization', 'packR')} subLabel="AUTO" enabled={hasACPower || apuRunning} />
        </div>
        
        {/* Cabin Info */}
        <div style={{ marginTop: '10px', background: '#000', padding: '5px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#0f0' }}>
            CAB ALT: {Math.round(cabAlt)} FT | DIFF: {diff.toFixed(1)} PSI
        </div>
      </div>
    );
  };

  const EnginePanel = () => {
    const engines = getSys('engines', {});
    const engineKeys = Object.keys(engines).filter(k => k.startsWith('eng')).sort();
    
    const StartSwitch = ({ label, value, onClick, enabled }) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '5px' }}>
            <div 
                onClick={enabled ? onClick : undefined}
                style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    background: enabled ? '#333' : '#222', border: '2px solid #555',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    cursor: enabled ? 'pointer' : 'default', position: 'relative', opacity: enabled ? 1 : 0.5
                }}
            >
                <div style={{ 
                    width: '4px', height: '15px', background: '#fff', 
                    transform: value === 'GRD' ? 'rotate(-45deg)' : 
                               value === 'CONT' ? 'rotate(45deg)' : 
                               value === 'FLT' ? 'rotate(90deg)' : 'rotate(0deg)',
                    transformOrigin: 'bottom center', position: 'absolute', top: '5px'
                }} />
                <div style={{ fontSize: '8px', color: '#fff', marginTop: '45px' }}>{value}</div>
            </div>
            <div style={{ fontSize: '10px', color: '#ccc', marginTop: '5px' }}>{label}</div>
        </div>
    );

    return (
        <div className="panel-section">
            <h4 className="panel-title">ENGINES</h4>
            
            {/* Gauges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                {engineKeys.map((key, i) => {
                    const eng = engines[key];
                    return (
                        <div key={key} style={{ display: 'flex', gap: '5px' }}>
                            <Gauge label={`N2 ${i+1}`} value={Math.round(eng.n2 || 0)} unit="%" max={105} />
                            <Gauge label={`EGT ${i+1}`} value={Math.round(eng.egt || 0)} unit="°C" max={900} color={(eng.egt || 0) > 800 ? '#f00' : '#0f0'} />
                        </div>
                    );
                })}
            </div>

            {/* Start Switches */}
            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #444', paddingTop: '10px', flexWrap: 'wrap' }}>
                {engineKeys.map((key, i) => {
                     const eng = engines[key];
                     return (
                        <StartSwitch
                          key={key}
                          label={`ENG ${i+1} START`}
                          value={eng.startSwitch || 'OFF'}
                          onClick={() => onSystemAction('engines', `${key}_start_toggle`)}
                          enabled={hasEngineStartAir}
                        />
                     );
                })}
            </div>

            {/* Fuel Control */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px', flexWrap: 'wrap' }}>
                {engineKeys.map((key, i) => {
                     const eng = engines[key];
                     return (
                        <Switch
                          key={key}
                          label={`ENG ${i+1}`}
                          active={eng.fuelControl}
                          onClick={() => onSystemAction('engines', `${key}_fuel`)}
                          subLabel="CUTOFF"
                          annunciator={{ label: 'RUN', active: eng.fuelControl, color: 'green' }}
                          enabled={hasEngineStartAir}
                        />
                     );
                })}
            </div>
        </div>
    );
  };

  const FirePanel = () => {
      const fire = getSys('fire', {});
      const fireHandles = Object.keys(fire).filter(k => k.match(/^eng\d+Handle$/)).sort();
      
      const Handle = ({ label, active, pulled, onClick, onDischarge }) => (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '5px' }}>
              <div onClick={onClick} style={{
                  width: '50px', height: '60px', 
                  background: pulled ? '#500' : '#333',
                  border: '2px solid #555', borderRadius: '4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: active ? '0 0 10px #f00' : 'none',
                  transform: pulled ? 'translateY(10px)' : 'none',
                  transition: 'transform 0.2s'
              }}>
                  <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{label}</div>
                  <div style={{ width: '30px', height: '30px', background: active ? '#f00' : '#550000', borderRadius: '50%', marginTop: '5px' }}></div>
                  <div style={{ fontSize: '8px', color: '#ccc' }}>{pulled ? 'PULLED' : 'IN'}</div>
              </div>

              {/* Discharge Buttons (Visible when pulled) */}
              {pulled && (
                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDischarge(1); }}
                        style={{ fontSize: '8px', padding: '2px', background: '#444', color: '#fff', border: '1px solid #666', cursor: 'pointer' }}
                      >
                        BTL 1
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDischarge(2); }}
                        style={{ fontSize: '8px', padding: '2px', background: '#444', color: '#fff', border: '1px solid #666', cursor: 'pointer' }}
                      >
                        BTL 2
                      </button>
                  </div>
              )}
          </div>
      );

      return (
          <div className="panel-section">
              <h4 className="panel-title">FIRE PROTECTION</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  {fireHandles.map((key, i) => {
                      const engId = key.replace('Handle', ''); // eng1, eng2
                      return (
                        <Handle 
                            key={key}
                            label={`ENG ${i+1}`} 
                            active={fire[engId]} // Detect
                            pulled={fire[key]} // Handle state
                            onClick={() => onSystemAction('fire', key)}
                            onDischarge={(btl) => onSystemAction('fire', `bottle${btl}_discharge`)}
                        />
                      );
                  })}
                  
                  <Handle 
                    label="APU" 
                    active={fire.apu} 
                    pulled={fire.apuHandle} 
                    onClick={() => onSystemAction('fire', 'apuHandle')}
                    onDischarge={(btl) => onSystemAction('fire', `bottle${btl}_discharge`)}
                  />
              </div>
          </div>
      );
  };

  const HydraulicsPanel = () => {
    const hyd = getSys('hydraulics', {});
    const hydKeys = Object.keys(hyd).sort();

    return (
      <div className="panel-section">
        <h4 className="panel-title">HYDRAULICS</h4>
        {/* Dynamic Gauges Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hydKeys.length}, 1fr)`, gap: '10px' }}>
            {hydKeys.map((key) => {
                 const label = key.replace('sys', 'SYS ').toUpperCase();
                 const sys = hyd[key];
                 return (
                    <div key={key} style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#aaa' }}>{label}</span>
                        <Gauge label="PRESS" value={Math.round(sys.pressure || 0)} unit="PSI" max={4000} />
                        <div style={{ fontSize: '10px', marginTop: '2px' }}>QTY: {Math.round(sys.qty || 0)}%</div>
                    </div>
                 );
            })}
        </div>
        
        {/* Dynamic Switches */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
             {hydKeys.map((key, i) => {
                 const sys = hyd[key];
                 const label = key.replace('sys', 'SYS ').toUpperCase();
                 
                 const engPump = (
                     <Switch key={`${key}_eng`} label={`ENG ${i+1}`} active={sys.engPump} onClick={() => onSystemAction('hydraulics', `${key}.engPump`)} 
                        annunciator={{ label: 'LOW PRESS', active: (sys.pressure || 0) < 1500, color: 'amber' }}
                        enabled={hasACPower}
                     />
                 );

                 const elecPump = (
                     <Switch key={`${key}_elec`} label={`ELEC ${i+1}`} active={sys.elecPump} onClick={() => onSystemAction('hydraulics', `${key}.elecPump`)} 
                        annunciator={{ label: 'OVERHEAT', active: false, color: 'amber' }}
                        enabled={hasACPower}
                     />
                 );

                 return (
                     <div key={key} style={{ display: 'flex', gap: '5px' }}>
                         {engPump}
                         {elecPump}
                     </div>
                 );
             })}
        </div>
      </div>
    );
  };

  const LightsPanel = () => {
    return (
      <div className="panel-section">
        <h4 className="panel-title">EXT LIGHTS</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', justifyItems: 'center' }}>
            <Switch label="LANDING" active={getSys('lighting.landing')} onClick={() => onSystemAction('lighting', 'landing')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="TAXI" active={getSys('lighting.taxi')} onClick={() => onSystemAction('lighting', 'taxi')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="STROBE" active={getSys('lighting.strobe')} onClick={() => onSystemAction('lighting', 'strobe')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="BEACON" active={getSys('lighting.beacon')} onClick={() => onSystemAction('lighting', 'beacon')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="NAV" active={getSys('lighting.nav')} onClick={() => onSystemAction('lighting', 'nav')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="LOGO" active={getSys('lighting.logo')} onClick={() => onSystemAction('lighting', 'logo')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="WING" active={getSys('lighting.wing')} onClick={() => onSystemAction('lighting', 'wing')} invertLight={true} subLabel="ON" enabled={hasACPower} />
        </div>
      </div>
    );
  };

  const ADIRSPanel = () => {
    const ir1 = getSys('adirs.ir1', 'OFF');
    const ir2 = getSys('adirs.ir2', 'OFF');
    const aligned = getSys('adirs.aligned', false);
    const alignState = getSys('adirs.alignState', 0);
    const onBat = getSys('adirs.onBat', false);
    
    const toggleIRS = (id) => {
        const current = getSys(`adirs.${id}`, 'OFF');
        const next = current === 'OFF' ? 'NAV' : 'OFF';
        onSystemAction('adirs', id, next);
    };

    return (
      <div className="panel-section">
        <h4 className="panel-title">ADIRS</h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <Switch label="IRS 1" active={ir1 === 'NAV'} onClick={() => toggleIRS('ir1')} 
               subLabel="NAV"
               annunciator={{ label: 'ON BAT', active: onBat, color: 'amber' }}
               enabled={hasPower}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px' }}>ALIGN</div>
                {aligned ? (
                     <div style={{ color: '#0f0', fontWeight: 'bold' }}>RDY</div>
                ) : (
                    ir1 !== 'OFF' || ir2 !== 'OFF' ? (
                        <div style={{ width: '40px', background: '#333', height: '6px', borderRadius: '3px' }}>
                             <div style={{ width: `${alignState}%`, background: '#fa0', height: '100%', borderRadius: '3px' }}></div>
                        </div>
                    ) : <div style={{ color: '#444' }}>OFF</div>
                )}
            </div>

            <Switch label="IRS 2" active={ir2 === 'NAV'} onClick={() => toggleIRS('ir2')} 
               subLabel="NAV"
               annunciator={{ label: 'ON BAT', active: onBat, color: 'amber' }}
               enabled={hasPower}
            />
        </div>
      </div>
    );
  };

  const IceRainPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">ICE & RAIN</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                  <Switch label="WING" active={getSys('ice.wingAntiIce')} onClick={() => onSystemAction('ice', 'wingAntiIce')} 
                      annunciator={{ label: 'VALVE OPEN', active: getSys('ice.wingAntiIce'), color: 'blue' }}
                      invertLight={true} subLabel="ON"
                  />
                  <Switch label="ENG 1" active={getSys('ice.eng1AntiIce')} onClick={() => onSystemAction('ice', 'eng1AntiIce')} 
                      annunciator={{ label: 'VALVE OPEN', active: getSys('ice.eng1AntiIce'), color: 'blue' }}
                      invertLight={true} subLabel="ON"
                  />
                  <Switch label="ENG 2" active={getSys('ice.eng2AntiIce')} onClick={() => onSystemAction('ice', 'eng2AntiIce')} 
                      annunciator={{ label: 'VALVE OPEN', active: getSys('ice.eng2AntiIce'), color: 'blue' }}
                      invertLight={true} subLabel="ON"
                  />
                  <div style={{ width: '100%', height: '5px' }}></div>
                  <Switch label="PROBE" active={getSys('ice.probeHeat', true)} onClick={() => onSystemAction('ice', 'probeHeat')} 
                  />
              </div>
          </div>
      );
  };

  const MiscPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">MISC</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <Switch label="YAW DAMPER" active={getSys('flightControls.yawDamper', true)} onClick={() => onSystemAction('flightControls', 'yawDamper')} 
                      annunciator={{ label: 'OFF', active: !getSys('flightControls.yawDamper', true), color: 'amber' }}
                  />
                  <Switch label="EMER LTS" active={getSys('lighting.emergencyLights', true)} onClick={() => onSystemAction('lighting', 'emergencyLights')} 
                      subLabel="ARM"
                      annunciator={{ label: 'OFF', active: !getSys('lighting.emergencyLights', true), color: 'amber' }}
                  />
                  <Switch label="SEAT BELTS" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')} 
                      subLabel="ON" invertLight={true}
                  />
                  <Switch label="NO SMOKE" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')} 
                      subLabel="ON" invertLight={true}
                  />
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
            {isAirbus && (
              <>
                <div className="col">
                    <ADIRSPanel />
                    <FuelPanel />
                    <IceRainPanel />
                </div>
                <div className="col">
                    <ElectricalPanel />
                    <APUPanel />
                    <PneumaticPanel />
                    <HydraulicsPanel />
                </div>
                <div className="col">
                    <EnginePanel />
                    <FirePanel />
                    <LightsPanel />
                    <MiscPanel />
                </div>
              </>
            )}
            {is737 && !isAirbus && (
              <>
                <div className="col">
                    <ElectricalPanel />
                    <APUPanel />
                    <FuelPanel />
                </div>
                <div className="col">
                    <PneumaticPanel />
                    <HydraulicsPanel />
                    <EnginePanel />
                </div>
                <div className="col">
                    <FirePanel />
                    <IceRainPanel />
                    <LightsPanel />
                    <MiscPanel />
                </div>
              </>
            )}
            {isOtherBoeing && !isAirbus && !is737 && (
              <>
                <div className="col">
                    <ADIRSPanel />
                    <ElectricalPanel />
                    <APUPanel />
                </div>
                <div className="col">
                    <FuelPanel />
                    <PneumaticPanel />
                    <HydraulicsPanel />
                </div>
                <div className="col">
                    <EnginePanel />
                    <FirePanel />
                    <IceRainPanel />
                    <LightsPanel />
                    <MiscPanel />
                </div>
              </>
            )}
            {!isAirbus && !is737 && !isOtherBoeing && (
              <>
                <div className="col">
                    <ElectricalPanel />
                    <APUPanel />
                    <FuelPanel />
                </div>
                <div className="col">
                    <PneumaticPanel />
                    <HydraulicsPanel />
                    <EnginePanel />
                </div>
                <div className="col">
                    <FirePanel />
                    <IceRainPanel />
                    <LightsPanel />
                    <MiscPanel />
                </div>
              </>
            )}
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
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;
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
