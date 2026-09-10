/* eslint-disable react/prop-types */
import React from 'react';
import { BoeingControl as Control, BoeingModule as Module, BoeingRow as Row, BoeingReadout as Readout, BoeingGauge as Gauge } from './BoeingControls';

const SystemsContext = React.createContext({ systems: {}, action: undefined });
const read = (systems, path) => path.split('.').reduce((value, key) => value?.[key], systems);
export function BoeingSystemsProvider({ flightState, onSystemAction, children }) {
  return <SystemsContext.Provider value={{ systems: flightState?.systems || {}, action: onSystemAction }}>{children}</SystemsContext.Provider>;
}

export function BoeingBoundControl({ path, label, kind, note, legend }) {
  const { systems, action } = React.useContext(SystemsContext);
  const value = read(systems, path);
  const [system, ...parts] = path.split('.');
  return <Control label={label} kind={kind} value={value} legend={legend} note={note} onChange={typeof value === 'boolean' && action ? () => action(system, parts.join('.'), !value) : undefined} />;
}
const Bound = BoeingBoundControl;

export function BoeingApuSelector() {
  const { systems, action } = React.useContext(SystemsContext);
  const apu = systems.apu;
  const value = !apu?.master ? 'OFF' : apu.start && !apu.running ? 'START' : 'ON';
  return <Control label="APU" kind="rotary" positions value={value} note="Cycle OFF → ON → START → OFF" onChange={apu && action ? () => {
    if (value === 'OFF') action('apu', 'master', true);
    else if (value === 'ON' && !apu.running) action('apu', 'start', true);
    else { action('apu', 'start', false); action('apu', 'master', false); }
  } : undefined} />;
}

export function BoeingEngineStart({ tripleSeven = false }) {
  const { systems, action } = React.useContext(SystemsContext);
  return <Module title="ENGINE START / IGNITION" height={155}>
    <Row><Control label="L EEC MODE" /><Control label={tripleSeven ? 'AUTOSTART' : 'IGNITION BOTH'} kind={tripleSeven ? 'push' : 'rotary'} /><Control label="R EEC MODE" /></Row>
    <Row>{[1, 2].map(n => {
      const value = systems.engines?.[`eng${n}`]?.startSwitch;
      const states = tripleSeven ? ['OFF', 'GRD'] : ['OFF', 'GRD', 'CONT', 'FLT'];
      const display = tripleSeven ? value === 'GRD' ? 'START' : 'NORM' : value;
      return <Control key={n} label={`${n === 1 ? 'L' : 'R'} START`} kind="rotary" positions value={display || 'OFF'} note={tripleSeven ? 'NORM / START; starter only. Fuel control is on pedestal.' : 'OFF / GRD / CONT / FLT; AUTO is not simulated.'} onChange={value !== undefined && action ? () => action('engines', `eng${n}_start`, states[(states.indexOf(value) + 1) % states.length]) : undefined} />;
    })}</Row>
  </Module>;
}

export function BoeingFuel({ tripleSeven = false }) {
  const { systems } = React.useContext(SystemsContext);
  const tanks = systems.fuel?.tanks;
  return <Module title="FUEL" height={tripleSeven ? 258 : 230}>
    <div style={{ position: 'relative' }}>
      <svg aria-hidden="true" viewBox="0 0 190 165" preserveAspectRatio="none" style={{ position: 'absolute', width: '100%', height: 166, pointerEvents: 'none', opacity: .65 }}>
        <path d="M28 45H160 M28 45V128H77V150 M160 45V128H117V150 M95 45V90 M28 80H160" fill="none" stroke="#dce5bd" strokeWidth="3" />
        <path d="M28 45H160 M28 45V128H77V150 M160 45V128H117V150 M95 45V90 M28 80H160" fill="none" stroke="#776c56" strokeWidth="1" />
      </svg>
      <Row style={{ position: 'relative' }}><Bound label="L FWD" path="fuel.leftPumps" note="Left bank: FWD and AFT pumps operate together" /><Bound label={tripleSeven ? 'XFEED FWD' : 'CROSSFEED'} path="fuel.crossfeed" note="Common crossfeed valve" /><Bound label="R FWD" path="fuel.rightPumps" note="Right bank: FWD and AFT pumps operate together" /></Row>
      <Row style={{ position: 'relative' }}><Bound label="L AFT" path="fuel.leftPumps" /><>{tripleSeven && <Control label="XFEED AFT" />}</><Bound label="R AFT" path="fuel.rightPumps" /></Row>
      <Row style={{ position: 'relative' }}><Bound label="CTR L" path="fuel.centerPumps" note="Center pump pair operates together" /><Bound label="CTR R" path="fuel.centerPumps" note="Center pump pair operates together" /></Row>
    </div>
    {!tripleSeven && <Row>{['left', 'center', 'right'].map(key => <Readout key={key} label={key.toUpperCase()} value={Number.isFinite(tanks?.[key]) ? (tanks[key] / 1000).toFixed(1) : undefined} unit="KG ×1000" />)}</Row>}
  </Module>;
}

export function BoeingElectrical({ tripleSeven = false }) {
  const { systems } = React.useContext(SystemsContext);
  return <Module title="ELECTRICAL" height={tripleSeven ? 315 : 320}>
    <Row><Bound label="BATTERY" path="electrical.battery" /><>{tripleSeven ? <BoeingApuSelector /> : <Control label="STBY POWER" kind="rotary" />}</></Row>
    <div style={{ border: '1px solid #c3c4a0', borderRadius: 9, padding: '0 2px' }}>
      <Row><Control label="L BUS TIE" /><Bound label="APU GEN" path="electrical.apuGen" /><Control label="R BUS TIE" /></Row>
      <Row>{tripleSeven ? <><Control label="SEC EXT PWR" /><Control label="PRI EXT PWR" /></> : <><Control label="L UTIL BUS" /><Control label="EXT PWR" /><Control label="R UTIL BUS" /></>}</Row>
      <Row><Bound label="L GEN CTRL" path="electrical.gen1" /><>{tripleSeven && <Control label="BACKUP GEN" />}</><Bound label="R GEN CTRL" path="electrical.gen2" /></Row>
    </div>
    <Row><Control label="L DRIVE DISC" guarded /><Control label="R DRIVE DISC" guarded /></Row>
    {!tripleSeven && <Row><Readout label="DC" value={systems.electrical?.dcVolts} unit="V" /><Readout label="AC" value={systems.electrical?.acVolts} unit="V" /></Row>}
  </Module>;
}

export function BoeingHydraulics({ tripleSeven = false }) {
  return <Module title="HYDRAULIC" height={tripleSeven ? 270 : 180}>
    {tripleSeven && <Row><Control label="RAM AIR TURBINE" guarded /></Row>}
    <div style={{ textAlign: 'center', fontSize: 7 }}>{tripleSeven ? 'PRIMARY' : 'HYD PUMPS'}</div>
    <Row><Control label="L ENG" /><Control label={tripleSeven ? 'C1 ELEC' : 'C ELEC 1'} /><Control label={tripleSeven ? 'C2 ELEC' : 'C ELEC 2'} /><Control label="R ENG" /></Row>
    <div style={{ textAlign: 'center', fontSize: 7 }}>{tripleSeven ? 'DEMAND · OFF / AUTO / ON' : 'ELECTRIC'}</div>
    <Row><Control label="L ELEC" kind={tripleSeven ? 'rotary' : 'push'} />{tripleSeven && <><Control label="C1 AIR" kind="rotary" /><Control label="C2 AIR" kind="rotary" /></>}<Control label="R ELEC" kind={tripleSeven ? 'rotary' : 'push'} /></Row>
  </Module>;
}

export function BoeingAirConditioning({ tripleSeven = false }) {
  return <Module title="AIR CONDITIONING" height={tripleSeven ? 230 : 303}>
    <Row><Control label="EQUIP COOLING" />{tripleSeven && <Control label="GASPER" />}</Row>
    <Row><Control label="RECIRC L" /><Control label="RECIRC R" /></Row>
    <Row><Control label="FLT DECK TEMP" kind="rotary" /><Control label={tripleSeven ? 'CABIN TEMP' : 'FWD CAB'} kind="rotary" />{!tripleSeven && <Control label="AFT CAB" kind="rotary" />}</Row>
    <Row><Bound label="L PACK" path="pressurization.packL" /><Control label="TRIM AIR" /><Bound label="R PACK" path="pressurization.packR" /></Row>
    {!tripleSeven && <Row><Control label="L PACK FLOW" kind="rotary" /><Control label="R PACK FLOW" kind="rotary" /></Row>}
  </Module>;
}

export function BoeingBleed({ tripleSeven = false }) {
  const { systems } = React.useContext(SystemsContext);
  return <Module title="BLEED AIR" height={tripleSeven ? 182 : 245}>
    {!tripleSeven && <Row><Gauge label="DUCT PRESS" value={systems.pressurization?.ductPressL} max={80} unit="PSI · LEFT" /></Row>}
    <div style={{ border: '2px solid #c2d4ae', padding: '2px 0', borderRadius: 5 }}>
      <Row>{tripleSeven ? <><Control label="L ISLN" /><Control label="C ISLN" /><Control label="R ISLN" /></> : <Bound label="ISOLATION" path="pressurization.isolationValve" />}</Row>
      <Row><Bound label="L ENG" path="pressurization.bleed1" /><Bound label="APU" path="apu.bleed" /><Bound label="R ENG" path="pressurization.bleed2" /></Row>
    </div>
  </Module>;
}

export function BoeingAntiIce({ tripleSeven = false }) {
  return <Module title="ANTI-ICE" height={108}><Row><Bound label="WING" path="ice.wingAntiIce" kind={tripleSeven ? 'rotary' : 'push'} /><Bound label="L ENGINE" path="ice.eng1AntiIce" kind={tripleSeven ? 'rotary' : 'push'} /><Bound label="R ENGINE" path="ice.eng2AntiIce" kind={tripleSeven ? 'rotary' : 'push'} /></Row></Module>;
}

export function BoeingSigns() {
  return <Module title="PASS SIGNS" height={108}><Row><Bound label="NO SMOKING" path="signs.noSmoking" kind="rotary" /><Bound label="SEAT BELTS" path="signs.seatBelts" kind="rotary" /></Row></Module>;
}

export function BoeingWindowHeat() {
  return <Module title="WINDOW HEAT" height={103}><Row>{['L SIDE', 'L FWD', 'R FWD', 'R SIDE'].map(label => <Control key={label} label={label} />)}</Row></Module>;
}

export function BoeingPressurization({ tripleSeven = false }) {
  const { systems } = React.useContext(SystemsContext);
  return <Module title="PRESSURIZATION" height={tripleSeven ? 190 : 248}>
    {tripleSeven ? <><Row><Control label="FWD OUTFLOW" /><Control label="AFT OUTFLOW" /></Row><Row><Control label="FWD MANUAL" kind="toggle" /><Control label="LAND ALT" kind="rotary" /><Control label="AFT MANUAL" kind="toggle" /></Row></> : <><Row><Control label="CABIN ALT MAN" kind="rotary" /><Control label="AUTO RATE" kind="rotary" /></Row><Row><Readout label="CABIN ALT" value={Number.isFinite(systems.pressurization?.cabinAlt) ? Math.round(systems.pressurization.cabinAlt) : undefined} unit="FT" /><Control label="MODE SELECT" kind="rotary" /></Row><Row><Gauge label="CABIN ALT" value={systems.pressurization?.cabinAlt} unit="FT" max={14000} /><Gauge label="DIFF PRESS" value={systems.pressurization?.diffPressure} unit="PSI" max={10} /></Row></>}
  </Module>;
}

export function BoeingExteriorLights({ tripleSeven = false }) {
  return <Module title="EXTERIOR LIGHTS" height={165}>
    <Row><Bound label={tripleSeven ? 'BEACON' : 'ANTI COLL RED'} path="lighting.beacon" /><Bound label="POSITION" path="lighting.nav" />{tripleSeven && <Bound label="LOGO" path="lighting.logo" />}<Control label="WING" /></Row>
    <Row><Bound label="LANDING" kind="toggle" path="lighting.landing" note="All landing lights operate together" /><Bound label="TAXI" kind="toggle" path="lighting.taxi" /><Bound label="STROBE" kind="toggle" path="lighting.strobe" /></Row>
  </Module>;
}
