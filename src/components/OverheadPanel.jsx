
import React from 'react';
import './OverheadPanel.css';

const OverheadPanel = ({ onClose, flightState, onSystemAction, aircraftModel }) => {
  const isAirbus = aircraftModel?.toLowerCase().includes('a3') || aircraftModel?.toLowerCase().includes('airbus');
  
  // --- Helpers ---
  const getSys = (path, def) => {
    if (!flightState?.systems) return def;
    const parts = path.split('.');
    let current = flightState.systems;
    for (const part of parts) {
      if (current === undefined || current === null) return def;
      current = current[part];
    }
    return current ?? def;
  };

  // --- Components ---

  const Annunciator = ({ label, status = 'off' }) => {
    // status: 'off', 'on', 'amber', 'red', 'blue', 'green'
    let colorClass = '';
    if (status !== 'off') colorClass = `${status} active`;
    
    return (
      <div className={`annunciator ${colorClass}`}>
        <div className="annunciator-text">{label}</div>
      </div>
    );
  };

  const BoeingToggle = ({ label, active, onClick, subLabel, topAnnunciator, bottomAnnunciator }) => (
    <div className="toggle-switch-container">
      {topAnnunciator && (
        <Annunciator label={topAnnunciator.label} status={topAnnunciator.active ? topAnnunciator.color : 'off'} />
      )}
      
      <div className={`toggle-switch ${active ? 'on' : 'off'}`} onClick={onClick}>
        <div className="toggle-handle"></div>
      </div>
      
      <div className="switch-label">{label}</div>
      {subLabel && <div className="sub-label">{subLabel}</div>}
      
      {bottomAnnunciator && (
        <Annunciator label={bottomAnnunciator.label} status={bottomAnnunciator.active ? bottomAnnunciator.color : 'off'} />
      )}
    </div>
  );

  const AirbusPush = ({ label, active, onClick, fault, subLabel = "ON" }) => (
    <div className="korry-switch-container" onClick={onClick}>
      <div className="korry-label">{label}</div>
      <div className="korry-switch">
        <div className={`korry-upper ${fault ? 'active' : ''}`}>FAULT</div>
        <div className={`korry-lower ${active ? 'active' : 'off-state'}`}>
            {active ? subLabel : 'OFF'}
        </div>
      </div>
    </div>
  );

  // Dynamic Switch Selection
  const Switch = isAirbus ? AirbusPush : BoeingToggle;

  const Gauge = ({ label, value, unit, min, max, warnLow, warnHigh, critLow, critHigh }) => {
    let status = '';
    if (value <= critLow || value >= critHigh) status = 'crit';
    else if (value <= warnLow || value >= warnHigh) status = 'warn';

    return (
      <div className="digital-gauge">
        <div className="gauge-label">{label}</div>
        <div className={`gauge-value ${status}`}>{typeof value === 'number' ? value.toFixed(0) : value}</div>
        <div className="gauge-unit">{unit}</div>
      </div>
    );
  };

  // --- Panels ---

  const ElectricalPanel = () => {
    const bat = getSys('electrical.battery');
    const stby = getSys('electrical.stbyPower');
    const gen1 = getSys('electrical.gen1');
    const gen2 = getSys('electrical.gen2');
    const apuGen = getSys('electrical.apuGen');
    
    // Annunciator Logic
    const batDisch = !gen1 && !gen2 && bat;
    const sourceOff1 = getSys('electrical.sourceOff1');
    const sourceOff2 = getSys('electrical.sourceOff2');
    const apuGenOff = getSys('electrical.apuGenOff');

    return (
      <div className="panel-section">
        <div className="panel-title">ELECTRICAL</div>
        
        <div className="grid-2">
            <Gauge label="DC VOLTS" value={getSys('electrical.dcVolts')} unit="V" critLow={22} />
            <Gauge label="AC VOLTS" value={getSys('electrical.acVolts')} unit="V" critLow={110} />
            <Gauge label="AC FREQ" value={getSys('electrical.acFreq')} unit="Hz" critLow={390} critHigh={410} />
            <Gauge label="AC AMPS" value={getSys('electrical.acAmps')} unit="A" />
        </div>

        <div className="panel-separator"></div>

        <div className="row">
          <Switch label="BATTERY" active={bat} onClick={() => onSystemAction('electrical', 'battery')} 
            topAnnunciator={!isAirbus ? { label: 'DISCH', active: batDisch, color: 'amber' } : null}
            fault={batDisch}
          />
          <Switch label="STBY PWR" active={stby} onClick={() => onSystemAction('electrical', 'stbyPower')} subLabel="AUTO"
             topAnnunciator={!isAirbus ? { label: 'OFF', active: !stby, color: 'amber' } : null}
          />
        </div>

        <div className="row">
            <Switch label="GEN 1" active={gen1} onClick={() => onSystemAction('electrical', 'gen1')}
                bottomAnnunciator={!isAirbus ? { label: 'SOURCE OFF', active: sourceOff1, color: 'amber' } : null}
                fault={sourceOff1}
            />
            <Switch label="APU GEN" active={apuGen} onClick={() => onSystemAction('electrical', 'apuGen')}
                bottomAnnunciator={!isAirbus ? { label: 'SOURCE OFF', active: apuGenOff, color: 'amber' } : null}
                fault={apuGenOff}
            />
            <Switch label="GEN 2" active={gen2} onClick={() => onSystemAction('electrical', 'gen2')}
                bottomAnnunciator={!isAirbus ? { label: 'SOURCE OFF', active: sourceOff2, color: 'amber' } : null}
                fault={sourceOff2}
            />
        </div>
      </div>
    );
  };

  const APUPanel = () => {
    const egt = getSys('apu.egt', 0);
    const running = getSys('apu.running');
    const starting = getSys('apu.starting');
    
    return (
        <div className="panel-section">
            <div className="panel-title">APU</div>
            <div className="grid-2">
                <Gauge label="EGT" value={egt} unit="°C" warnHigh={650} critHigh={720} />
                <Gauge label="RPM" value={getSys('apu.n2', 0)} unit="%" />
            </div>
            <div className="row">
                <Switch label="MASTER" active={getSys('apu.master')} onClick={() => onSystemAction('apu', 'master')} />
                <Switch label="START" active={getSys('apu.start')} onClick={() => onSystemAction('apu', 'start')} 
                    subLabel={running ? "AVAIL" : (starting ? "START" : "")}
                    bottomAnnunciator={!isAirbus ? { label: 'MAINT', active: false, color: 'blue' } : null}
                />
            </div>
        </div>
    );
  };

  const FuelPanel = () => {
    const pressL = getSys('fuel.pressL', 0);
    const pressR = getSys('fuel.pressR', 0);
    const pressC = getSys('fuel.pressC', 0);
    const lowPressL = pressL < 10 && getSys('fuel.leftPumps');
    const lowPressR = pressR < 10 && getSys('fuel.rightPumps');
    const lowPressC = pressC < 10 && getSys('fuel.centerPumps');

    return (
        <div className="panel-section">
            <div className="panel-title">FUEL</div>
            
            {/* Quantities */}
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#000', padding: '5px 10px', borderRadius: '4px', marginBottom: '10px' }}>
                <div className="col-center"><span style={{color:'#888', fontSize:'10px'}}>LEFT</span><span style={{color:'#fff', fontFamily:'monospace'}}>{Math.round(getSys('fuel.tanks.left', 0))}</span></div>
                <div className="col-center"><span style={{color:'#888', fontSize:'10px'}}>CTR</span><span style={{color:'#fff', fontFamily:'monospace'}}>{Math.round(getSys('fuel.tanks.center', 0))}</span></div>
                <div className="col-center"><span style={{color:'#888', fontSize:'10px'}}>RIGHT</span><span style={{color:'#fff', fontFamily:'monospace'}}>{Math.round(getSys('fuel.tanks.right', 0))}</span></div>
            </div>

            <div className="row" style={{ alignItems: 'flex-start' }}>
                {/* Left */}
                <div className="col-center">
                    <Switch label="L PUMP FWD" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                        bottomAnnunciator={!isAirbus ? { label: 'LOW PRESS', active: lowPressL, color: 'amber' } : null} fault={lowPressL}
                    />
                    <Switch label="L PUMP AFT" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                        bottomAnnunciator={!isAirbus ? { label: 'LOW PRESS', active: lowPressL, color: 'amber' } : null} fault={lowPressL}
                    />
                </div>
                
                {/* Center */}
                <div className="col-center" style={{ margin: '0 10px' }}>
                     <Switch label="CTR L" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                        bottomAnnunciator={!isAirbus ? { label: 'LOW PRESS', active: lowPressC, color: 'amber' } : null} fault={lowPressC}
                     />
                     <Switch label="CTR R" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                        bottomAnnunciator={!isAirbus ? { label: 'LOW PRESS', active: lowPressC, color: 'amber' } : null} fault={lowPressC}
                     />
                     <div style={{ marginTop: '10px' }}>
                        <Switch label="CROSSFEED" active={getSys('fuel.crossfeed')} onClick={() => onSystemAction('fuel', 'crossfeed')}
                            topAnnunciator={!isAirbus ? { label: 'VALVE OPEN', active: getSys('fuel.crossfeed'), color: 'blue' } : null}
                        />
                     </div>
                </div>

                {/* Right */}
                <div className="col-center">
                    <Switch label="R PUMP FWD" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                        bottomAnnunciator={!isAirbus ? { label: 'LOW PRESS', active: lowPressR, color: 'amber' } : null} fault={lowPressR}
                    />
                    <Switch label="R PUMP AFT" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                        bottomAnnunciator={!isAirbus ? { label: 'LOW PRESS', active: lowPressR, color: 'amber' } : null} fault={lowPressR}
                    />
                </div>
            </div>
        </div>
    );
  };

  const HydraulicsPanel = () => {
      const pressA = getSys('hydraulics.sysA.pressure', 0);
      const pressB = getSys('hydraulics.sysB.pressure', 0);

      return (
          <div className="panel-section">
              <div className="panel-title">HYDRAULICS</div>
              <div className="grid-2">
                  <div className="col-center">
                      <span style={{fontSize:'10px', color:'#aaa'}}>SYS A</span>
                      <Gauge label="PRESS" value={pressA} unit="PSI" warnLow={1500} />
                      <Gauge label="QTY" value={getSys('hydraulics.sysA.qty', 0)} unit="%" warnLow={40} />
                  </div>
                  <div className="col-center">
                      <span style={{fontSize:'10px', color:'#aaa'}}>SYS B</span>
                      <Gauge label="PRESS" value={pressB} unit="PSI" warnLow={1500} />
                      <Gauge label="QTY" value={getSys('hydraulics.sysB.qty', 0)} unit="%" warnLow={40} />
                  </div>
              </div>
              <div className="panel-separator"></div>
              <div className="row">
                  <div className="col-center" style={{marginRight: '15px'}}>
                    <div style={{fontSize: '9px', color: '#888', marginBottom: '4px'}}>ENG PUMPS</div>
                    <div className="row">
                        <Switch label="ENG 1" active={getSys('hydraulics.sysA.engPump')} onClick={() => onSystemAction('hydraulics', 'eng1Pump')} 
                             bottomAnnunciator={!isAirbus ? { label: 'LOW PRESS', active: pressA < 1500, color: 'amber' } : null}
                        />
                        <Switch label="ENG 2" active={getSys('hydraulics.sysB.engPump')} onClick={() => onSystemAction('hydraulics', 'eng2Pump')} 
                             bottomAnnunciator={!isAirbus ? { label: 'LOW PRESS', active: pressB < 1500, color: 'amber' } : null}
                        />
                    </div>
                  </div>
                  <div className="col-center">
                    <div style={{fontSize: '9px', color: '#888', marginBottom: '4px'}}>ELEC PUMPS</div>
                    <div className="row">
                        <Switch label="ELEC 2" active={getSys('hydraulics.sysA.elecPump')} onClick={() => onSystemAction('hydraulics', 'elec1Pump')} 
                             bottomAnnunciator={!isAirbus ? { label: 'OVERHEAT', active: false, color: 'amber' } : null}
                        />
                        <Switch label="ELEC 1" active={getSys('hydraulics.sysB.elecPump')} onClick={() => onSystemAction('hydraulics', 'elec2Pump')} 
                             bottomAnnunciator={!isAirbus ? { label: 'OVERHEAT', active: false, color: 'amber' } : null}
                        />
                    </div>
                  </div>
              </div>
          </div>
      );
  };

  const PneumaticPanel = () => {
      const ductL = getSys('pressurization.ductPressL', 0);
      const ductR = getSys('pressurization.ductPressR', 0);
      const isoOpen = getSys('pressurization.isolationValve');
      
      return (
          <div className="panel-section">
              <div className="panel-title">AIR COND / PNEUMATICS</div>
              <div className="grid-2">
                  <Gauge label="DUCT L" value={ductL} unit="PSI" warnLow={10} />
                  <Gauge label="DUCT R" value={ductR} unit="PSI" warnLow={10} />
              </div>
              
              <div className="row" style={{ marginTop: '10px' }}>
                  <Switch label="PACK L" active={getSys('pressurization.packL')} onClick={() => onSystemAction('pressurization', 'packL')} subLabel="AUTO" />
                  <Switch label="ISOLATION" active={isoOpen} onClick={() => onSystemAction('pressurization', 'isolationValve')} subLabel="AUTO"
                      topAnnunciator={!isAirbus ? { label: 'VALVE OPEN', active: isoOpen, color: 'blue' } : null}
                  />
                  <Switch label="PACK R" active={getSys('pressurization.packR')} onClick={() => onSystemAction('pressurization', 'packR')} subLabel="AUTO" />
              </div>

              <div className="row" style={{ marginTop: '10px' }}>
                  <Switch label="BLEED 1" active={getSys('pressurization.bleed1')} onClick={() => onSystemAction('pressurization', 'bleed1')}
                      bottomAnnunciator={!isAirbus ? { label: 'OFF', active: !getSys('pressurization.bleed1'), color: 'amber' } : null}
                  />
                  <Switch label="APU BLEED" active={getSys('apu.bleed')} onClick={() => onSystemAction('apu', 'bleed')}
                      topAnnunciator={!isAirbus ? { label: 'VALVE OPEN', active: getSys('apu.bleed'), color: 'blue' } : null}
                  />
                  <Switch label="BLEED 2" active={getSys('pressurization.bleed2')} onClick={() => onSystemAction('pressurization', 'bleed2')}
                      bottomAnnunciator={!isAirbus ? { label: 'OFF', active: !getSys('pressurization.bleed2'), color: 'amber' } : null}
                  />
              </div>
              
              <div className="panel-separator"></div>
              
              <div style={{ textAlign: 'center' }}>
                  <div style={{fontSize:'10px', color:'#aaa'}}>PRESSURIZATION</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                      <Gauge label="CAB ALT" value={getSys('pressurization.cabinAlt', 0)} unit="FT" warnHigh={10000} />
                      <Gauge label="DIFF PRESS" value={getSys('pressurization.diffPressure', 0)} unit="PSI" warnHigh={8.6} />
                  </div>
              </div>
          </div>
      );
  };

  const LightsPanel = () => (
      <div className="panel-section">
          <div className="panel-title">EXTERIOR LIGHTS</div>
          <div className="row">
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

  return (
    <div className="overhead-overlay">
      <div className="overhead-container">
        <div className="overhead-header">
            <h2>{aircraftModel || 'BOEING 737-800'} OVERHEAD</h2>
            <button className="close-btn" onClick={onClose}>CLOSE</button>
        </div>

        <div className="overhead-content">
            {/* Column 1: Electrical & APU */}
            <div className="col">
                <ElectricalPanel />
                <APUPanel />
            </div>

            {/* Column 2: Fuel & Hydraulics */}
            <div className="col">
                <FuelPanel />
                <HydraulicsPanel />
            </div>

            {/* Column 3: Pneumatics */}
            <div className="col">
                <PneumaticPanel />
                <div className="panel-section">
                    <div className="panel-title">SIGNS</div>
                    <div className="row">
                        <Switch label="SEAT BELTS" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')} subLabel="AUTO" />
                        <Switch label="NO SMOKE" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')} subLabel="ON" />
                    </div>
                </div>
            </div>

            {/* Column 4: Lights & Misc */}
            <div className="col">
                <LightsPanel />
                
                <div className="panel-section">
                    <div className="panel-title">MISC</div>
                    <div className="grid-2">
                        <Gauge label="TEMP" value={flightState.temperature || 15} unit="°C" />
                        <Gauge label="TAT" value={(flightState.temperature || 15) + 5} unit="°C" />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OverheadPanel;
