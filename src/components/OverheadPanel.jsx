
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
      background: active && hasPower ? (color === 'red' ? '#ff3333' : color === 'blue' ? '#00ccff' : (color === 'green' ? '#00ff00' : '#ffaa00')) : '#222',
      color: active && hasPower ? '#000' : '#444',
      fontSize: '9px',
      fontWeight: 'bold',
      padding: '2px 4px',
      borderRadius: '1px',
      textAlign: 'center',
      minWidth: '40px',
      boxShadow: active && hasPower ? `0 0 8px ${color === 'red' ? '#f00' : (color === 'blue' ? '#0cf' : (color === 'green' ? '#0f0' : '#fa0'))}` : 'none',
      border: '1px solid #111',
      marginTop: '2px',
      opacity: active && hasPower ? 1 : 0.7,
      transition: 'all 0.1s'
    }}>
      {label}
    </div>
  );

  // 737 Style: Metallic Round Toggle Switch
  const MetallicToggleSwitch = ({ label, active, onClick, annunciator, subLabel, enabled = true }) => (
    <div className="metallic-switch-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px' }}>
      {/* 737 Lights are usually above the switch */}
      {annunciator && (
        <div style={{ marginBottom: '4px' }}>
          <Annunciator label={annunciator.label} active={annunciator.active} color={annunciator.color} />
        </div>
      )}
      
      <div 
        onClick={enabled ? onClick : undefined}
        style={{ 
          width: '40px', 
          height: '40px', 
          position: 'relative',
          cursor: enabled ? 'pointer' : 'default',
          opacity: enabled ? 1 : 0.6
        }}
      >
        {/* Base Plate */}
        <div style={{
          position: 'absolute', top: '5px', left: '5px', right: '5px', bottom: '5px',
          background: '#888',
          borderRadius: '50%',
          boxShadow: 'inset 0 0 5px #000',
          border: '1px solid #555'
        }}></div>

        {/* Toggle Lever */}
        <div style={{
          position: 'absolute',
          top: active ? '2px' : '18px',
          left: '12px',
          width: '16px',
          height: '24px',
          background: 'linear-gradient(90deg, #d0d0d0, #f8f8f8, #a0a0a0)',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
          transition: 'top 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 2
        }}>
            {/* Cap highlight */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px 8px 0 0' }}></div>
        </div>
      </div>
      <span style={{ fontSize: '10px', marginTop: '2px', color: '#eee', textAlign: 'center', fontWeight: 'bold', textShadow: '0 1px 2px #000' }}>{label}</span>
      {subLabel && <span style={{ fontSize: '8px', color: '#ccc' }}>{subLabel}</span>}
    </div>
  );

  // 7X7 Style: Square Button (Top Green ON, Bottom Amber FAULT)
  const BoeingSquareButton = ({ label, active, onClick, fault = false, subLabel = "ON", invertLight = false, specialLabel = null, enabled = true, annunciator }) => {
    // Logic:
    // Top Half: ON (Green) - Active state
    // Bottom Half: FAULT (Amber) or OFF/PRESS (Amber) - Fault state or Annunciator state
    
    const isTopLit = hasPower && active; 
    const isBottomLit = hasPower && (fault || (annunciator && annunciator.active));
    
    const topText = specialLabel || subLabel || 'ON';
    const bottomText = fault ? 'FAULT' : (annunciator ? annunciator.label : '');
    const bottomColor = fault ? '#ff9900' : (annunciator ? (annunciator.color === 'blue' ? '#00ffff' : '#ff9900') : '#ff9900');

    return (
        <div className="boeing-btn-wrapper" style={{ margin: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px', fontWeight: 'bold' }}>{label}</div>
            <div 
                onClick={enabled ? onClick : undefined}
                style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#111', 
                    border: '2px solid #555',
                    borderRadius: '2px',
                    cursor: enabled ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: enabled ? 1 : 0.6,
                    boxShadow: active ? 'inset 0 0 5px #000' : '0 2px 4px rgba(0,0,0,0.5)'
                }}
            >
                {/* Top Half (Green ON) */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    borderBottom: '1px solid #333',
                    background: isTopLit ? 'rgba(0, 255, 0, 0.2)' : 'transparent'
                }}>
                    <span style={{ 
                        fontSize: '9px', fontWeight: 'bold', 
                        color: isTopLit ? '#00ff00' : '#444',
                        textShadow: isTopLit ? '0 0 5px #00ff00' : 'none',
                        visibility: isTopLit ? 'visible' : 'hidden' // Hide text when off per user "dark when off"
                    }}>{topText}</span>
                </div>

                {/* Bottom Half (Amber FAULT/Status) */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: isBottomLit ? `rgba(${bottomColor === '#00ffff' ? '0,255,255' : '255,160,0'}, 0.2)` : 'transparent'
                }}>
                     <span style={{ 
                        fontSize: '8px', fontWeight: 'bold', 
                        color: isBottomLit ? bottomColor : '#444',
                        textShadow: isBottomLit ? `0 0 5px ${bottomColor}` : 'none',
                        visibility: isBottomLit ? 'visible' : 'hidden'
                    }}>{bottomText}</span>
                </div>
            </div>
        </div>
    );
  };

  // A3XX Style: Airbus Square Button (Bottom Boxed)
  const AirbusButton = ({ label, active, onClick, fault = false, subLabel = "ON", invertLight = false, specialLabel = null, enabled = true, annunciator }) => {
    // "Lights Out" Philosophy:
    // Top: System Label (always visible? Or hidden? User said "bottom boxed on/off") -> usually printed on button
    // Bottom: Status Light (Boxed)
    //   - OFF: White "OFF"
    //   - FAULT: Amber "FAULT"
    //   - ON: Green/Cyan (if invertLight or special)

    let statusText = null;
    let statusColor = null;
    let isLit = false;

    if (hasPower && enabled) {
        if (fault) {
            statusText = 'FAULT';
            statusColor = '#ff9900'; // Amber
            isLit = true;
        } else if (annunciator && annunciator.active) {
            statusText = annunciator.label;
            statusColor = annunciator.color === 'blue' ? '#00ffff' : (annunciator.color === 'green' ? '#00ff00' : '#ff9900');
            isLit = true;
        } else if (specialLabel) {
            statusText = specialLabel;
            statusColor = '#00ff00'; // Green
            isLit = true;
        } else if (invertLight) {
            // Active = Light ON
            if (active) {
                statusText = subLabel || 'ON';
                statusColor = '#00ffff'; // Cyan (Airbus often uses cyan/blue for ON)
                isLit = true;
            }
        } else {
            // Standard: Inactive = Light ON (OFF white)
            if (!active) {
                statusText = 'OFF';
                statusColor = '#ffffff'; // White
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
              border: '2px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between', // Top label, bottom light
              alignItems: 'center',
              boxShadow: active ? 'inset 0 0 5px rgba(0,0,0,0.8)' : 'inset 0 0 2px rgba(255,255,255,0.1)',
              position: 'relative',
              padding: '4px 0'
            }}
          >
            {/* Label (Printed on button) */}
            <div style={{ fontSize: '9px', color: '#bbb', textAlign: 'center', lineHeight: '1.1' }}>{label}</div>
            
            {/* Status Light Area (Boxed) */}
            <div style={{ 
                height: '16px', 
                width: '36px',
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginBottom: '2px'
            }}>
                {isLit && (
                    <div style={{ 
                        color: statusColor, 
                        fontSize: '9px', 
                        fontWeight: 'bold', 
                        textShadow: `0 0 4px ${statusColor}`,
                        // boxed look
                        width: '100%',
                        textAlign: 'center',
                        background: 'rgba(0,0,0,0.4)' 
                    }}>
                        {statusText}
                    </div>
                )}
            </div>
          </div>
        </div>
    );
  };

  const InopModule = ({ title }) => (
    <div className="panel-section">
      <h4 className="panel-title">{title}</h4>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60px' }}>
        <Annunciator label="INOP" color="amber" active={hasPower} />
      </div>
    </div>
  );

  const Switch = isAirbus ? AirbusButton : (is737 ? MetallicToggleSwitch : BoeingSquareButton);


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

  const RotarySelector = ({ label, active, onClick, subLabel, enabled = true }) => {
      // 737 Style Knob
      // Active (true) = Horizontal (Open/Connected) - User Preference
      // Inactive (false) = Vertical (Closed/Off)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px' }}>
            <div 
                onClick={enabled ? onClick : undefined}
                style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'conic-gradient(#ddd 0deg, #999 90deg, #ddd 180deg, #999 270deg)',
                    border: '1px solid #444',
                    position: 'relative',
                    transform: active ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    cursor: enabled ? 'pointer' : 'default',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '36px', height: '6px',
                    background: '#e0e0e0',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '2px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}></div>
                 <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '4px', height: '16px',
                    background: '#333',
                    transform: 'translate(-50%, -100%)', // Pointer part
                    borderRadius: '1px'
                }}></div>
            </div>
            <div style={{ fontSize: '9px', marginTop: '4px', color: '#eee', fontWeight: 'bold' }}>{label}</div>
            {subLabel && <div style={{ fontSize: '8px', color: '#aaa' }}>{subLabel}</div>}
        </div>
      );
  };

  // --- SUB-PANELS ---

  const B737FuelPanel = () => {
    const tankL = getSys('fuel.tanks.left', 0);
    const tankR = getSys('fuel.tanks.right', 0);
    const tankC = getSys('fuel.tanks.center', 0);
    const pressL = getSys('fuel.pressL', 0);
    const pressR = getSys('fuel.pressR', 0);
    const pressC = getSys('fuel.pressC', 0);
    
    // Line Logic
    const lPumpsOn = getSys('fuel.leftPumps');
    const rPumpsOn = getSys('fuel.rightPumps');
    const cPumpsOn = getSys('fuel.centerPumps');
    const xFeedOpen = getSys('fuel.crossfeed');

    return (
        <div className="panel-section" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <h4 className="panel-title">FUEL</h4>
            
            {/* Qty Display */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '15px', background: '#000', padding: '4px', border: '2px solid #555' }}>
                 <div className="digital-qty" style={{ textAlign: 'center' }}>{Math.round(tankL)}</div>
                 <div className="digital-qty" style={{ textAlign: 'center' }}>{Math.round(tankC)}</div>
                 <div className="digital-qty" style={{ textAlign: 'center' }}>{Math.round(tankR)}</div>
            </div>

            {/* Main Grid for Pumps & Lines */}
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '80px 80px', padding: '10px 0' }}>
                 
                 {/* SVG Overlay - Dynamic Green Lines */}
                 <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.8, zIndex: 0 }}>
                    {/* Vertical Lines Left */}
                    <line x1="12.5%" y1="25%" x2="12.5%" y2="75%" stroke={lPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                    <line x1="37.5%" y1="25%" x2="37.5%" y2="50%" stroke={cPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                    {/* Vertical Lines Right */}
                    <line x1="62.5%" y1="25%" x2="62.5%" y2="50%" stroke={cPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                    <line x1="87.5%" y1="25%" x2="87.5%" y2="75%" stroke={rPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                    
                    {/* Horizontal Crossfeed Manifold - Aligned with Row 2 (75%) */}
                    <line x1="12.5%" y1="75%" x2="87.5%" y2="75%" stroke={xFeedOpen ? '#0f0' : '#444'} strokeWidth="3" />
                    
                    {/* Crossfeed Valve Circle */}
                    <circle cx="50%" cy="75%" r="18" stroke={xFeedOpen ? '#0f0' : '#444'} strokeWidth="2" fill="#1a1a1a" />
                 </svg>

                 {/* Row 1: FWD/Center Pumps */}
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="L PUMP 1" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                        annunciator={{ label: 'LOW PRESS', active: pressL < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="CTR L" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                        annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="CTR R" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                        annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="R PUMP 1" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                        annunciator={{ label: 'LOW PRESS', active: pressR < 10, color: 'amber' }} enabled={hasPower} />
                 </div>

                 {/* Row 2: AFT Pumps & Crossfeed */}
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="L PUMP 2" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                        annunciator={{ label: 'LOW PRESS', active: pressL < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
                 
                 {/* Crossfeed spans middle 2 cols */}
                 <div style={{ gridColumn: '2 / span 2', justifySelf: 'center', alignSelf: 'center', zIndex: 2 }}>
                     <RotarySelector label="CROSSFEED" active={getSys('fuel.crossfeed')} onClick={() => onSystemAction('fuel', 'crossfeed')} subLabel="VALVE" />
                     <div style={{ fontSize: '8px', color: '#0af', textAlign: 'center', marginTop: '2px', background: '#000', padding: '1px' }}>
                         {getSys('fuel.crossfeed') ? 'OPEN' : ''}
                     </div>
                 </div>

                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="R PUMP 2" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                        annunciator={{ label: 'LOW PRESS', active: pressR < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
            </div>
        </div>
    );
  };

  const B737ElectricalPanel = () => {
    const dcVolts = getSys('electrical.dcVolts', 0);
    const acVolts = getSys('electrical.acVolts', 0);
    const bat = getSys('electrical.battery');
    
    // Line Logic
    const gen1 = getSys('electrical.gen1');
    const gen2 = getSys('electrical.gen2');
    const apuGen = getSys('electrical.apuGen');
    const busPowered = gen1 || gen2 || apuGen || bat;

    return (
        <div className="panel-section" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
             <h4 className="panel-title">ELECTRICAL</h4>
             
             {/* Meters */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto 1fr 1fr', gap: '5px', marginBottom: '15px', background: '#111', padding: '5px', border: '1px solid #444' }}>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '9px', color: '#ccc' }}>DC AMPS</div>
                     <div style={{ fontSize: '14px', color: '#0f0', fontFamily: 'monospace' }}>0</div>
                 </div>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '9px', color: '#ccc' }}>DC VOLTS</div>
                     <div style={{ fontSize: '14px', color: '#0f0', fontFamily: 'monospace' }}>{Math.round(dcVolts)}</div>
                 </div>
                 <div style={{ width: '1px', background: '#444' }}></div>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '9px', color: '#ccc' }}>AC FREQ</div>
                     <div style={{ fontSize: '14px', color: '#0f0', fontFamily: 'monospace' }}>400</div>
                 </div>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '9px', color: '#ccc' }}>AC VOLTS</div>
                     <div style={{ fontSize: '14px', color: '#0f0', fontFamily: 'monospace' }}>{Math.round(acVolts)}</div>
                 </div>
             </div>

             {/* Main Switch Grid */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', rowGap: '20px', position: 'relative', paddingBottom: '10px' }}>
                 
                 {/* Lines Overlay - Dynamic Green */}
                 <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.8 }}>
                     {/* Battery Bus (Top) */}
                     <line x1="16.67%" y1="25%" x2="83.33%" y2="25%" stroke={bat ? '#0f0' : '#444'} strokeWidth="2" />
                     
                     {/* Main Bus (Middle) */}
                     <line x1="16.67%" y1="50%" x2="83.33%" y2="50%" stroke={busPowered ? '#0f0' : '#444'} strokeWidth="2" />
                     
                     {/* Gen 1 Line */}
                     <line x1="16.67%" y1="75%" x2="16.67%" y2="50%" stroke={gen1 ? '#0f0' : '#444'} strokeWidth="2" />
                     
                     {/* Gen 2 Line */}
                     <line x1="83.33%" y1="75%" x2="83.33%" y2="50%" stroke={gen2 ? '#0f0' : '#444'} strokeWidth="2" />
                     
                     {/* APU Gen Line */}
                     <line x1="50%" y1="75%" x2="50%" y2="50%" stroke={apuGen ? '#0f0' : '#444'} strokeWidth="2" />
                 </svg>

                 {/* Row 1: Battery & Standby */}
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <Switch label="BAT" active={bat} onClick={() => onSystemAction('electrical', 'battery')} 
                        subLabel="ON"
                        annunciator={{ label: 'DISCHARGE', active: !getSys('electrical.gen1') && bat, color: 'amber' }} 
                     />
                 </div>
                 
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     {/* Empty Center Top */}
                 </div>

                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <RotarySelector label="STBY PWR" active={getSys('electrical.stbyPower')} onClick={() => onSystemAction('electrical', 'stbyPower')} 
                        subLabel="AUTO" 
                     />
                 </div>

                 {/* Row 2: Generators */}
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <Switch label="GEN 1" active={getSys('electrical.gen1')} onClick={() => onSystemAction('electrical', 'gen1')}
                         annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff1'), color: 'blue' }}
                         subLabel="ON"
                     />
                 </div>
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <Switch label="APU GEN" active={getSys('electrical.apuGen')} onClick={() => onSystemAction('electrical', 'apuGen')}
                         annunciator={{ label: 'OFF BUS', active: getSys('electrical.apuGenOff'), color: 'blue' }}
                         subLabel="ON"
                     />
                 </div>
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <Switch label="GEN 2" active={getSys('electrical.gen2')} onClick={() => onSystemAction('electrical', 'gen2')}
                         annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff2'), color: 'blue' }}
                         subLabel="ON"
                     />
                 </div>
             </div>
        </div>
    );
  };

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

    // Line Logic
    const gen1On = elecSys['gen1'];
    const gen2On = elecSys['gen2'];
    const apuGenOn = getSys('electrical.apuGen');
    const busPowered = gen1On || gen2On || apuGenOn || bat;

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

        {/* Switches with Lines */}
        <div style={{ position: 'relative', padding: '10px 0' }}>
             
             {/* SVG Overlay - Dynamic Green Lines */}
             <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.8 }}>
                 {/* Main Bus (Middle Horizontal) */}
                 <line x1="10%" y1="45%" x2="90%" y2="45%" stroke={busPowered ? '#0f0' : '#444'} strokeWidth="2" />
                 
                 {/* Battery Line (From Top) */}
                 <line x1="30%" y1="15%" x2="30%" y2="45%" stroke={bat ? '#0f0' : '#444'} strokeWidth="2" />
                 
                 {/* Standby Line (From Top) */}
                 <line x1="70%" y1="15%" x2="70%" y2="45%" stroke={getSys('electrical.stbyPower') ? '#0f0' : '#444'} strokeWidth="2" />

                 {/* Gen 1 Line (From Bottom) */}
                 <line x1="20%" y1="85%" x2="20%" y2="45%" stroke={gen1On ? '#0f0' : '#444'} strokeWidth="2" />
                 
                 {/* APU Gen Line (From Bottom Center) */}
                 <line x1="50%" y1="85%" x2="50%" y2="45%" stroke={apuGenOn ? '#0f0' : '#444'} strokeWidth="2" />
                 
                 {/* Gen 2 Line (From Bottom) */}
                 <line x1="80%" y1="85%" x2="80%" y2="45%" stroke={gen2On ? '#0f0' : '#444'} strokeWidth="2" />
             </svg>

             {/* Row 1: DC/Stby */}
             <div style={{ display: 'flex', justifyContent: 'space-evenly', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                 <div style={{ width: '20%' }}></div> {/* Spacer to push BAT to 30% approx */}
                 <Switch label="BAT" active={bat} onClick={() => onSystemAction('electrical', 'battery')} 
                    annunciator={{ label: 'DISCH', active: !getSys('electrical.gen1') && !getSys('electrical.gen2') && bat, color: 'amber' }} 
                 />
                 <Switch label="STBY PWR" active={getSys('electrical.stbyPower')} onClick={() => onSystemAction('electrical', 'stbyPower')} subLabel="AUTO" 
                    annunciator={{ label: 'OFF', active: !getSys('electrical.stbyPower'), color: 'amber' }}
                 />
                 <div style={{ width: '20%' }}></div>
             </div>
          
             {/* Row 2: AC Sources */}
             <div style={{ display: 'flex', justifyContent: 'space-evenly', position: 'relative', zIndex: 1 }}>
                 {/* Gen 1 */}
                 {genKeys.includes('gen1') && (
                      <Switch label="GEN 1" active={elecSys['gen1']} onClick={() => onSystemAction('electrical', 'gen1')}
                         annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff1'), color: 'blue' }}
                      />
                 )}
                 
                 {/* APU Gen */}
                 <Switch label="APU GEN" active={getSys('electrical.apuGen')} onClick={() => onSystemAction('electrical', 'apuGen')}
                    annunciator={{ label: 'OFF BUS', active: getSys('electrical.apuGenOff'), color: 'blue' }}
                    fault={getSys('electrical.apuGenOff')}
                 />
                 
                 {/* Gen 2 */}
                 {genKeys.includes('gen2') && (
                      <Switch label="GEN 2" active={elecSys['gen2']} onClick={() => onSystemAction('electrical', 'gen2')}
                         annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff2'), color: 'blue' }}
                      />
                 )}
                 
                 {/* Other Gens (if any, e.g. A380) - just dump them here without lines for now */}
                 {genKeys.filter(k => k !== 'gen1' && k !== 'gen2').map((key, i) => (
                      <Switch key={key} label={`GEN ${key.replace('gen', '')}`} active={elecSys[key]} onClick={() => onSystemAction('electrical', key)}
                         annunciator={{ label: 'OFF BUS', active: getSys(`electrical.sourceOff${key.replace('gen', '')}`), color: 'blue' }}
                      />
                 ))}
             </div>
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

    // Line Logic
    const lPumpsOn = getSys('fuel.leftPumps');
    const rPumpsOn = getSys('fuel.rightPumps');
    const cPumpsOn = getSys('fuel.centerPumps');
    const xFeedOpen = getSys('fuel.crossfeed');

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', position: 'relative' }}>
            
            {/* SVG Overlay - Dynamic Green Lines */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.8, zIndex: 0 }}>
                {/* Left Line */}
                <line x1="16.67%" y1="10%" x2="16.67%" y2="90%" stroke={lPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                {/* Right Line */}
                <line x1="83.33%" y1="10%" x2="83.33%" y2="90%" stroke={rPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                {/* Center Line */}
                <line x1="50%" y1="10%" x2="50%" y2="60%" stroke={cPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                
                {/* Crossfeed Manifold (Connecting L/R) */}
                <line x1="16.67%" y1="80%" x2="83.33%" y2="80%" stroke={xFeedOpen ? '#0f0' : '#444'} strokeWidth="3" />
            </svg>

            {/* Left Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
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
                    // Use flightState top-level arrays which are reliably updated from physics
                    const n2Val = flightState.engineN2 ? flightState.engineN2[i] : (eng.n2 || 0);
                    const egtVal = flightState.engineEGT ? flightState.engineEGT[i] : (eng.egt || 0);

                    return (
                        <div key={key} style={{ display: 'flex', gap: '5px' }}>
                            <Gauge label={`N2 ${i+1}`} value={Math.round(n2Val)} unit="%" max={105} />
                            <Gauge label={`EGT ${i+1}`} value={Math.round(egtVal)} unit="°C" max={1000} color={egtVal > 850 ? '#f00' : '#0f0'} />
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

  const CommPanel = () => {
      const comms = getSys('comms', {});
      const transponder = getSys('transponder', {});
      const vhf1 = comms.vhf1 || { active: '118.500', stby: '121.500' };
      const vhf2 = comms.vhf2 || { active: '121.900', stby: '119.100' };

      const RadioDisplay = ({ label, freq, onSwap }) => (
          <div style={{ background: '#000', padding: '4px', borderRadius: '4px', border: '1px solid #444', marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>{label}</span>
                  <button onClick={onSwap} style={{ 
                      fontSize: '8px', background: '#333', border: '1px solid #555', 
                      color: '#fff', cursor: 'pointer', padding: '1px 4px', borderRadius: '2px' 
                  }}>
                    SWAP
                  </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#ff9900', fontWeight: 'bold', letterSpacing: '1px' }}>{freq.active}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#cc7700', opacity: 0.8 }}>{freq.stby}</div>
              </div>
          </div>
      );

      return (
          <div className="panel-section">
              <h4 className="panel-title">COMM / XPDR</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <RadioDisplay label="VHF 1" freq={vhf1} onSwap={() => onSystemAction('comms', 'swap_vhf1')} />
                  <RadioDisplay label="VHF 2" freq={vhf2} onSwap={() => onSystemAction('comms', 'swap_vhf2')} />
                  
                  {/* Transponder */}
                  <div style={{ background: '#000', padding: '4px', borderRadius: '4px', border: '1px solid #444', marginTop: '2px' }}>
                       <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                           <span>XPDR</span>
                           <span style={{ color: transponder.ident ? '#0f0' : '#444' }}>IDENT</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div style={{ 
                               fontSize: '14px', fontFamily: 'monospace', color: '#0f0', fontWeight: 'bold', 
                               background: '#111', padding: '2px 4px', border: '1px solid #333', letterSpacing: '1px' 
                           }}>
                               {transponder.code || '1200'}
                           </div>
                           <div style={{ transform: 'scale(0.8)' }}>
                               <RotarySelector label="MODE" active={transponder.mode === 'TA/RA'} onClick={() => {
                                   const modes = ['STBY', 'ALT', 'TA/RA'];
                                   const currentIdx = modes.indexOf(transponder.mode || 'STBY');
                                   const nextMode = modes[(currentIdx + 1) % modes.length];
                                   onSystemAction('transponder', 'mode', nextMode);
                               }} subLabel={transponder.mode || 'STBY'} />
                           </div>
                       </div>
                  </div>
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

  const B737IcePanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">WINDOW HEAT</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
                  <Switch label="L SIDE" active={true} onClick={() => {}} subLabel="ON" />
                  <Switch label="L FWD" active={true} onClick={() => {}} subLabel="ON" />
                  <Switch label="R FWD" active={true} onClick={() => {}} subLabel="ON" />
                  <Switch label="R SIDE" active={true} onClick={() => {}} subLabel="ON" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '8px', borderTop: '1px solid #444', paddingTop: '4px' }}>
                  <Switch label="PROBE A" active={getSys('ice.probeHeat', true)} onClick={() => onSystemAction('ice', 'probeHeat')} subLabel="ON" />
                  <Switch label="PROBE B" active={getSys('ice.probeHeat', true)} onClick={() => onSystemAction('ice', 'probeHeat')} subLabel="ON" />
              </div>
              <h4 className="panel-title" style={{ marginTop: '4px' }}>WING / ENG ANTI-ICE</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Switch label="WING" active={getSys('ice.wingAntiIce')} onClick={() => onSystemAction('ice', 'wingAntiIce')} 
                      annunciator={{ label: 'VALVE OPEN', active: getSys('ice.wingAntiIce'), color: 'blue' }}
                  />
                  <Switch label="ENG 1" active={getSys('ice.eng1AntiIce')} onClick={() => onSystemAction('ice', 'eng1AntiIce')} 
                      annunciator={{ label: 'COWL VALVE', active: getSys('ice.eng1AntiIce'), color: 'blue' }}
                  />
                  <Switch label="ENG 2" active={getSys('ice.eng2AntiIce')} onClick={() => onSystemAction('ice', 'eng2AntiIce')} 
                      annunciator={{ label: 'COWL VALVE', active: getSys('ice.eng2AntiIce'), color: 'blue' }}
                  />
              </div>
          </div>
      );
  };

  const B737CabinPressPanel = () => {
      return (
          <div className="panel-section" style={{ position: 'relative' }}>
              <h4 className="panel-title">CABIN PRESS</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <Gauge label="DIFF PRESS" value={0} unit="PSI" max={10} />
                  <Gauge label="CAB ALT" value={0} unit="FT" max={40000} />
                  <Gauge label="CLIMB" value={0} unit="FT/MIN" max={4000} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <RotarySelector label="FLT ALT" active={false} onClick={() => {}} subLabel="35000" />
                  <RotarySelector label="LAND ALT" active={false} onClick={() => {}} subLabel="50" />
                  <RotarySelector label="MODE" active={true} onClick={() => {}} subLabel="AUTO" />
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', 
                  border: '2px solid red', color: 'red', padding: '2px 5px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', opacity: 0.7 
              }}>INOP</div>
          </div>
      );
  };

  const B737MiscPanel = () => {
      return (
          <div className="panel-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                      <h4 className="panel-title">EQUIP COOLING</h4>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <Switch label="SUPPLY" active={true} onClick={() => {}} subLabel="NORM" />
                          <Switch label="EXHAUST" active={true} onClick={() => {}} subLabel="NORM" />
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '5px', border: '1px solid red', color: 'red', fontSize: '10px', transform: 'rotate(-5deg)', opacity: 0.7 }}>INOP</div>
                  </div>
                  <div>
                      <h4 className="panel-title">EMER LIGHTS</h4>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <Switch label="EMER LTS" active={getSys('lighting.emergencyLights', true)} onClick={() => onSystemAction('lighting', 'emergencyLights')} 
                              subLabel="ARM"
                              annunciator={{ label: 'NOT ARMED', active: !getSys('lighting.emergencyLights', true), color: 'amber' }}
                          />
                      </div>
                  </div>
              </div>
              <div style={{ borderTop: '1px solid #444', marginTop: '10px', paddingTop: '5px' }}>
                  <h4 className="panel-title">SIGNS</h4>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                      <Switch label="SEAT BELTS" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')} 
                          subLabel="ON" invertLight={true}
                      />
                      <Switch label="NO SMOKE" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')} 
                          subLabel="ON" invertLight={true}
                      />
                      <Switch label="ATTEND" active={false} onClick={() => {}} subLabel="CALL" />
                      <Switch label="GRD CALL" active={false} onClick={() => {}} subLabel="CALL" />
                  </div>
              </div>
          </div>
      );
  };

  const WipersPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">WIPERS</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Switch label="L WIPER" active={getSys('wipers.left')} onClick={() => onSystemAction('wipers', 'left')} />
                  <Switch label="R WIPER" active={getSys('wipers.right')} onClick={() => onSystemAction('wipers', 'right')} />
              </div>
          </div>
      );
  };

  const B737FlightControlPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">FLT CONTROL</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', justifyItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', color: '#aaa', marginBottom: '2px' }}>FLT CONTROL</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                          <Switch label="A" active={false} onClick={() => {}} subLabel="STBY RUD" annunciator={{ label: 'LOW PRESS', active: false, color: 'amber' }} />
                          <Switch label="B" active={false} onClick={() => {}} subLabel="STBY RUD" annunciator={{ label: 'LOW PRESS', active: false, color: 'amber' }} />
                      </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', color: '#aaa', marginBottom: '2px' }}>SPOILER</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                          <Switch label="A" active={false} onClick={() => {}} />
                          <Switch label="B" active={false} onClick={() => {}} />
                      </div>
                  </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px', gap: '10px' }}>
                  <Switch label="YAW DAMPER" active={getSys('flightControls.yawDamper', true)} onClick={() => onSystemAction('flightControls', 'yawDamper')} 
                      annunciator={{ label: 'YAW DAMPER', active: !getSys('flightControls.yawDamper', true), color: 'amber' }}
                  />
                  <Switch label="ALT FLAPS" active={false} onClick={() => {}} subLabel="ARM" />
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', 
                  border: '2px solid red', color: 'red', padding: '2px 5px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', opacity: 0.7 
              }}>INOP</div>
          </div>
      );
  };

  const B737NavPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">NAVIGATION</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <RotarySelector label="VHF NAV" active={false} onClick={() => {}} subLabel="NORMAL" />
                  <RotarySelector label="IRS" active={false} onClick={() => {}} subLabel="NORMAL" />
                  <RotarySelector label="FMC" active={false} onClick={() => {}} subLabel="NORMAL" />
                  <RotarySelector label="DISPLAYS" active={false} onClick={() => {}} subLabel="AUTO" />
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', 
                  border: '2px solid red', color: 'red', padding: '2px 5px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', opacity: 0.7 
              }}>INOP</div>
          </div>
      );
  };

  const B737Overhead = () => {
      // 737 Dense Layout (3 Column Stacks)
      return (
          <div className="b737-overhead-grid">
              {/* Column 1 (Left) */}
              <div style={{ gridArea: 'col1', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                   <B737FlightControlPanel />
                   <B737NavPanel />
                   <B737FuelPanel />
                   <HydraulicsPanel />
                   <CommPanel />
              </div>

              {/* Column 2 (Center) */}
              <div style={{ gridArea: 'col2', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                   <B737ElectricalPanel />
                   <EnginePanel />
                   <APUPanel />
                   <FirePanel />
              </div>

              {/* Column 3 (Right) */}
              <div style={{ gridArea: 'col3', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                   <B737IcePanel />
                   <PneumaticPanel />
                   <B737MiscPanel />
                   <LightsPanel />
              </div>
          </div>
      );
  };

  const BoeingOverhead = () => {
      // Generic Boeing Layout (3 Column Stacks) - 777/787/747 style
      // Vertical alignment to avoid empty rows
      // Layout based on 777 Overhead:
      // Left: ADIRS, Electrical, Hydraulics
      // Center: Fire, Engine, APU, Fuel
      // Right: Air/Pneumatic, Ice/Rain, Lights
      return (
          <div className="b737-overhead-grid" style={{ gap: '15px' }}>
              {/* Column 1 (Left) */}
              <div style={{ gridArea: 'col1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <ADIRSPanel />
                   <ElectricalPanel />
                   <HydraulicsPanel />
                   <CommPanel />
              </div>

              {/* Column 2 (Center) */}
              <div style={{ gridArea: 'col2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <FirePanel />
                   <MiscPanel />
                   <EnginePanel />
                   <APUPanel />
                   <FuelPanel />
              </div>

              {/* Column 3 (Right) */}
              <div style={{ gridArea: 'col3', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <PneumaticPanel />
                   <IceRainPanel />
                   <LightsPanel />
              </div>
          </div>
      );
  };

  const MiscPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">MISC</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
        <button className="close-btn" onClick={onClose}>X</button>

        <div className="overhead-grid">
            {isAirbus && (
              <div className="airbus-overhead-grid">
                <div style={{ gridArea: 'adirs' }}><ADIRSPanel /></div>
                <div style={{ gridArea: 'fire' }}><FirePanel /></div>
                <div style={{ gridArea: 'lights' }}><LightsPanel /></div>
                <div style={{ gridArea: 'hyd' }}><HydraulicsPanel /></div>
                <div style={{ gridArea: 'elec' }}><ElectricalPanel /></div>
                <div style={{ gridArea: 'aircond' }}><PneumaticPanel /></div>
                <div style={{ gridArea: 'fuel' }}><FuelPanel /></div>
                <div style={{ gridArea: 'engine' }}><EnginePanel /></div>
                <div style={{ gridArea: 'apu' }}><APUPanel /></div>
                 <div style={{ gridArea: 'misc' }}>
                     <CommPanel />
                     <MiscPanel />
                 </div>
               </div>
             )}
            {is737 && !isAirbus && (
              <B737Overhead />
            )}
            {isOtherBoeing && !isAirbus && !is737 && (
              <BoeingOverhead />
            )}
            {!isAirbus && !is737 && !isOtherBoeing && (
              <BoeingOverhead />
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
            width: 960px; height: 720px;
            background: #252525;
            border: 4px solid #444; border-radius: 10px;
            display: flex; flexDirection: column;
            padding: 10px;
            color: #eee;
            font-family: 'Roboto', sans-serif;
            box-shadow: 0 0 50px #000;
            position: relative;
        }
        .close-btn {
            position: absolute; top: 10px; right: 10px;
            background: #c00; color: white; border: 1px solid #fff; 
            width: 24px; height: 24px;
            font-weight: bold; cursor: pointer; border-radius: 4px;
            z-index: 10; display: flex; align-items: center; justify-content: center;
        }
        .overhead-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
            flex: 1; overflow-y: auto;
            transform: scale(0.95); transform-origin: center top;
        }

        .b737-overhead-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-areas: "col1 col2 col3";
            gap: 5px;
            height: 100%;
        }
        .airbus-overhead-grid {
            display: grid;
            grid-template-columns: 1fr 1.5fr 1fr;
            grid-template-areas:
                "adirs fire lights"
                "hyd elec aircond"
                "fuel engine apu"
                "misc misc misc";
             gap: 4px;
        }
        .panel-section {
            background: #1a1a1a; border: 2px solid #333;
            border-radius: 6px; padding: 5px; margin-bottom: 0;
        }
        .panel-title {
            margin: 0 0 5px 0; border-bottom: 1px solid #444;
            font-size: 12px; color: #ccc; text-align: center;
            padding-bottom: 2px;
        }
        .fuel-qty {
            text-align: center; font-size: 10px; color: #aaa;
        }
        .fuel-qty .digital {
            display: block; font-size: 14px; color: #fff; font-family: monospace;
        }
        .digital-qty {
            font-family: monospace; color: #ffaa00;
            background: #222; padding: 2px 5px; border: 1px solid #444;
            font-size: 14px; min-width: 40px; text-align: right;
        }
        /* Boeing Switch Animation */
        .boeing-switch { transition: background 0.2s; }
        .boeing-switch.active { background: linear-gradient(to right, #ccc, #eee, #ccc); }
      `}</style>
    </div>
  );
};

export default OverheadPanel;
