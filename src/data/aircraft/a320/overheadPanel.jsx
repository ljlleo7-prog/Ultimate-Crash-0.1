/* eslint-disable react/prop-types */
import { createContext, useContext } from 'react';
const PowerContext = createContext(false);

// Geometry follows 320-OH-PNL.jpg. Repeated hardware shares primitives; each
// system owns its controls. Missing simulator capabilities remain visibly INOP.
const palette = { plate: '#557084', ink: '#f0eee1', line: '#9fbfb1' };
const rowStyle = { display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: 8, margin: '9px 0' };
const labelStyle = { fontSize: 8, letterSpacing: '.035em', textAlign: 'center', lineHeight: 1.2 };

function Section({ title, children, style }) {
  return <section aria-label={title} style={{ position: 'relative', padding: '12px 10px 8px', border: '2px solid #293c49', borderRadius: 4, background: 'linear-gradient(115deg,#688396,#526c7e 75%)', boxShadow: 'inset 0 1px 2px #adc0c9', ...style }}>
    {['left', 'right'].map(side => <span key={side} aria-hidden="true" style={{ position: 'absolute', top: 3, [side]: 3, width: 7, height: 7, borderRadius: '50%', background: 'linear-gradient(135deg,#222 38%,#d1d4cb 40%,#d1d4cb 55%,#333 57%)', border: '1px solid #aab7ba' }} />)}
    <h3 style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.13em', textAlign: 'center', margin: '0 0 9px' }}>{title}</h3>
    {children}
  </section>;
}

function PushButton({ label, active = false, onClick, legend = 'OFF', color = '#eee', fault = false, detail, guarded = false }) {
  const powered = useContext(PowerContext);
  return <div style={{ ...labelStyle, minWidth: 38, flex: '1 1 0' }}>
    <div style={{ minHeight: 19, whiteSpace: 'pre-line' }}>{label}</div>
    <button type="button" disabled={!onClick} aria-label={`${label}${!onClick ? ' (INOP)' : ''}`} aria-pressed={onClick ? active : undefined} title={detail || (!onClick ? 'Not simulated' : label)} onClick={onClick} style={{ width: 37, height: 39, padding: 3, border: guarded ? '3px solid #af2920' : '2px solid #bcc7c6', borderRadius: 3, background: '#121b22', color: palette.ink, boxShadow: '0 2px 4px #26343e,inset 0 0 3px #000', cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ display: 'block', fontSize: 7, height: 13, color: fault && powered ? '#ffb54c' : '#45515a' }}>FAULT</span>
      <span style={{ display: 'block', border: '1px solid #45505b', padding: '2px 0', fontSize: 8, color: active && powered ? color : '#3e4b54', textShadow: active && powered ? `0 0 5px ${color}` : 'none' }}>{legend}</span>
    </button>
    {!onClick && <div style={{ color: '#c2cbd0', fontSize: 6, marginTop: 2 }}>INOP</div>}
  </div>;
}

function Rotary({ label, value = 'NORM', values = ['OFF', 'ON'], onChange }) {
  return <div style={{ ...labelStyle, flex: '1 1 0', minWidth: 40 }}>
    <div style={{ minHeight: 19 }}>{label}</div>
    <div style={{ fontSize: 6, marginBottom: 4 }}>{values.join(' · ')}</div>
    <button type="button" disabled={!onChange} aria-label={`${label}: ${value}${!onChange ? ' (INOP)' : ''}`} title={!onChange ? 'Not simulated' : `Select ${label}`} onClick={() => onChange(values[(values.indexOf(value) + 1) % values.length])} style={{ width: 37, height: 37, borderRadius: '50%', border: '2px solid #a6b0ad', background: 'linear-gradient(100deg,#929e9d,#e0e1ce 50%,#8b9794)', boxShadow: '1px 3px 5px #25343d', cursor: onChange ? 'pointer' : 'default' }}>
      <span style={{ display: 'block', width: 3, height: 25, background: '#3e494c', margin: '0 auto', transform: `rotate(${values.indexOf(value) * 35 - 35}deg)` }} />
    </button>
    <div style={{ fontSize: 7, marginTop: 4 }}>{onChange ? value : 'INOP'}</div>
  </div>;
}
const Row = ({ children }) => <div style={rowStyle}>{children}</div>;
const InopButtons = ({ labels }) => <Row>{labels.map(label => <PushButton key={label} label={label} />)}</Row>;

function AdirsPanel({ read, act }) {
  return <Section title="ADIRS">
    <Row>{[1, 3, 2].map(n => <div key={n} style={{ flex: 1 }}>
      <PushButton label={`IR ${n}`} legend="ALIGN" active={false} />
      <div style={{ margin: '10px 0' }}><Rotary label={`IR ${n} MODE`} value={read(`adirs.ir${n}`, 'OFF')} values={['OFF', 'NAV', 'ATT']} onChange={act('adirs', `ir${n}`)} /></div>
      <PushButton label={`ADR ${n}`} />
    </div>)}</Row>
  </Section>;
}

function HydraulicPanel({ read, act }) {
  return <Section title="HYD" style={{ borderBottom: '1px solid #c0ccd0' }}>
    <div style={{ ...labelStyle, display: 'flex', justifyContent: 'space-around', color: '#d6e2d8', borderBottom: `2px solid ${palette.line}`, paddingBottom: 4 }}><span>GREEN</span><span>BLUE</span><span>YELLOW</span></div>
    <Row>
      <PushButton label="ENG 1 PUMP" active={!read('hydraulics.sysA.engPump')} onClick={act('hydraulics', 'sysA.engPump')} detail="Green pump; simulator hydraulic system A" />
      <PushButton label="RAT MAN ON" guarded />
      <PushButton label="ELEC PUMP" />
      <PushButton label="PTU" />
      <PushButton label="ENG 2 PUMP" active={!read('hydraulics.sysB.engPump')} onClick={act('hydraulics', 'sysB.engPump')} detail="Yellow pump; simulator hydraulic system B" />
      <PushButton label="ELEC PUMP" active={!read('hydraulics.sysB.elecPump')} onClick={act('hydraulics', 'sysB.elecPump')} />
    </Row>
  </Section>;
}

function FuelPanel({ read, act }) {
  return <Section title="FUEL">
    <Row><span style={labelStyle}>ENG 1 ←</span><PushButton label="X FEED" legend="ON" active={read('fuel.crossfeed')} onClick={act('fuel', 'crossfeed')} color="#8be2fa" /><span style={labelStyle}>→ ENG 2</span></Row>
    <div style={{ height: 7, margin: '0 28px', border: `2px solid ${palette.line}`, borderBottom: 0 }} />
    <Row>{[['L TK 1', 'leftPumps'], ['L TK 2', 'leftPumps'], ['CTR TK 1', 'centerPumps']].map(([label, key]) => <PushButton key={label} label={label} active={!read(`fuel.${key}`)} onClick={act('fuel', key)} detail="Both pumps in this tank are simulated as one group" />)}
      <PushButton label="MODE SEL" legend="MAN" />
      { [['CTR TK 2', 'centerPumps'], ['R TK 1', 'rightPumps'], ['R TK 2', 'rightPumps']].map(([label, key]) => <PushButton key={label} label={label} active={!read(`fuel.${key}`)} onClick={act('fuel', key)} detail="Both pumps in this tank are simulated as one group" />)}
    </Row>
  </Section>;
}

function ElectricalPanel({ read, act }) {
  const volts = Number(read('electrical.dcVolts', 0));
  return <Section title="ELEC">
    <Row><PushButton label="GALY & CAB" />
      {[1, 2].map(n => <div key={n} style={{ textAlign: 'center' }}><output aria-label={`Battery ${n} bus voltage`} style={{ display: 'block', background: '#231c20', color: '#ff625b', font: 'bold 20px monospace', padding: 3, marginBottom: 5 }}>{volts > 0 ? volts.toFixed(1) : '—'}</output><PushButton label={`BAT ${n}`} active={!read('electrical.battery')} onClick={act('electrical', 'batterySelector', read('electrical.battery') ? 'OFF' : 'AUTO')} detail="Shared simulator battery bus; both buttons control the same battery selector" /></div>)}
      <PushButton label="AC ESS FEED" legend="ALTN" />
    </Row>
    <div style={{ borderTop: `2px solid ${palette.line}`, margin: '12px 25px 0' }} />
    <Row><PushButton label="IDG 1" guarded /><PushButton label="GEN 1" active={!read('electrical.gen1')} onClick={act('electrical', 'gen1')} />
      <PushButton label="APU GEN" active={!read('electrical.apuGen')} onClick={act('electrical', 'apuGen')} />
      <PushButton label="BUS TIE" active={!read('electrical.busTie')} onClick={act('electrical', 'busTie')} />
      <PushButton label="EXT PWR" legend="AVAIL" /><PushButton label="GEN 2" active={!read('electrical.gen2')} onClick={act('electrical', 'gen2')} /><PushButton label="IDG 2" guarded />
    </Row>
  </Section>;
}

function AirPanel({ read, act }) {
  return <Section title="AIR COND">
    <Row><Rotary label="PACK FLOW" values={['LO', 'NORM', 'HI']} />{['COCKPIT', 'FWD CABIN', 'AFT CABIN'].map(label => <Rotary key={label} label={label} values={['COLD', 'HOT']} />)}<PushButton label="HOT AIR" /></Row>
    <div style={{ height: 8, margin: '0 35px', border: `2px solid ${palette.line}`, borderBottom: 0 }} />
    <Row><PushButton label="PACK 1" active={!read('pressurization.packL')} onClick={act('pressurization', 'packL')} /><PushButton label="RAM AIR" guarded />
      <Rotary label="X BLEED" values={['SHUT', 'OPEN']} value={read('pressurization.isolationValve') ? 'OPEN' : 'SHUT'} onChange={act('pressurization', 'isolationValve', !read('pressurization.isolationValve'))} />
      <PushButton label="PACK 2" active={!read('pressurization.packR')} onClick={act('pressurization', 'packR')} /></Row>
    <Row><PushButton label="ENG 1 BLEED" active={!read('pressurization.bleed1')} onClick={act('pressurization', 'bleed1')} /><PushButton label="APU BLEED" legend="ON" color="#89d6ff" active={read('apu.bleed')} onClick={act('apu', 'bleed')} /><PushButton label="ENG 2 BLEED" active={!read('pressurization.bleed2')} onClick={act('pressurization', 'bleed2')} /></Row>
  </Section>;
}

function IcePressurePanel({ read, act }) {
  return <Section title="ANTI ICE · PROBE / WINDOW · CABIN PRESS">
    <Row>{[['WING', 'wingAntiIce'], ['ENG 1', 'eng1AntiIce'], ['ENG 2', 'eng2AntiIce']].map(([label, key]) => <PushButton key={key} label={label} legend="ON" color="#89d6ff" active={read(`ice.${key}`)} onClick={act('ice', key)} />)}
      <PushButton label="PROBE / WINDOW" legend="ON" color="#89d6ff" active={read('ice.probeHeat') && read('ice.windowHeat')} onClick={act('ice', 'probeHeat') && (() => { const next = !(read('ice.probeHeat') && read('ice.windowHeat')); act('ice', 'probeHeat', next)?.(); act('ice', 'windowHeat', next)?.(); })} />
      <Rotary label="LDG ELEV" value="AUTO" values={['AUTO', 'MAN']} /><PushButton label="DITCHING" guarded /></Row>
  </Section>;
}

function LowerPanel({ read, act }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .45fr 1fr', gap: 3 }}>
    <Section title="EXT LT"><Row>{[['STROBE', 'strobe'], ['BEACON', 'beacon'], ['WING', 'wing'], ['NAV', 'nav']].map(([label, key]) => <Rotary key={key} label={label} value={read(`lighting.${key}`) ? 'ON' : 'OFF'} onChange={act('lighting', key, !read(`lighting.${key}`))} />)}</Row><Row><Rotary label="LAND" value={read('lighting.landing') ? 'ON' : 'OFF'} onChange={act('lighting', 'landing', !read('lighting.landing'))} /><Rotary label="NOSE" value={read('lighting.taxi') ? 'ON' : 'OFF'} onChange={act('lighting', 'taxi', !read('lighting.taxi'))} /><Rotary label="LOGO" value={read('lighting.logo') ? 'ON' : 'OFF'} onChange={act('lighting', 'logo', !read('lighting.logo'))} /></Row></Section>
    <Section title="APU"><PushButton label="MASTER SW" legend="ON" color="#89d6ff" active={read('apu.master')} onClick={act('apu', 'master')} /><div style={{ height: 15 }} /><PushButton label="START" legend={read('apu.running') ? 'AVAIL' : 'ON'} color={read('apu.running') ? '#83ffb0' : '#89d6ff'} active={read('apu.running') || read('apu.start')} onClick={act('apu', 'start', true)} /></Section>
    <Section title="INT LT / SIGNS"><Row><Rotary label="OVHD INTEG" /><Rotary label="DOME" /></Row><Row><Rotary label="SEAT BELTS" value={read('signs.seatBelts') ? 'ON' : 'OFF'} onChange={act('signs', 'seatBelts', !read('signs.seatBelts'))} /><Rotary label="NO SMOKING" value={read('signs.noSmoking') ? 'ON' : 'OFF'} onChange={act('signs', 'noSmoking', !read('signs.noSmoking'))} /><PushButton label="EMER EXIT" guarded /></Row></Section>
  </div>;
}

export default function OverheadPanelA320({ flightState = {}, onSystemAction, onClose }) {
  const read = (path, fallback = false) => path.split('.').reduce((value, key) => value?.[key], flightState.systems) ?? fallback;
  const act = (system, action, value) => {
    const path = `${system}.${action}`;
    const exists = read(path, null) !== null || (system === 'electrical' && action === 'batterySelector' && read('electrical.battery', null) !== null);
    return onSystemAction && exists ? (next) => onSystemAction(system, action, value !== undefined ? value : (typeof next === 'string' ? next : undefined)) : undefined;
  };
  const props = { read, act };
  return <PowerContext.Provider value={read('electrical.dcVolts', 0) > 15}><div className="a320-overhead" style={{ width: 1040, minHeight: 970, boxSizing: 'border-box', padding: 12, background: '#263a49', color: palette.ink, fontFamily: 'Arial, sans-serif', border: '3px solid #14202a', borderRadius: '10px 10px 55px 55px', position: 'relative' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0 8px 10px', fontSize: 10, letterSpacing: '.12em' }}><span>A320 · OVERHEAD</span><span>INOP = NOT SIMULATED</span>{onClose && <button aria-label="Close overhead panel" onClick={onClose}>×</button>}</div>
    <div style={{ display: 'grid', gridTemplateColumns: '230px 536px 230px', gap: 4, alignItems: 'start' }}>
      <div><AdirsPanel {...props} /><Section title="FLT CTL"><InopButtons labels={['ELAC 1', 'SEC 1', 'FAC 1']} /></Section><Section title="EMER ELEC PWR"><InopButtons labels={['EMER GEN TEST', 'GEN 1 LINE', 'RAT MAN ON']} /></Section><Section title="GPWS"><InopButtons labels={['TERR', 'SYS', 'G/S MODE', 'FLAP MODE']} /></Section><Section title="RCDR"><InopButtons labels={['GND CTL', 'CVR ERASE', 'CVR TEST']} /></Section><Section title="OXYGEN"><PushButton label="MASK MAN ON" guarded legend="ON" active={read('oxygen.masks')} onClick={act('oxygen', 'masks')} /></Section><Section title="CALLS"><InopButtons labels={['MECH', 'FWD', 'AFT', 'EMER']} /></Section><Section title="WIPER"><Rotary label="CAPT" value={read('wipers.left') ? 'ON' : 'OFF'} onChange={act('wipers', 'left', !read('wipers.left'))} /></Section></div>
      <div><HydraulicPanel {...props} /><FuelPanel {...props} /><ElectricalPanel {...props} /><AirPanel {...props} /><IcePressurePanel {...props} /><LowerPanel {...props} /></div>
      <div><Section title="A320 OVHD" style={{ height: 245 }}><div style={{ margin: '70px 20px', border: '1px solid #8cabb9', padding: 14, textAlign: 'center', fontSize: 13, letterSpacing: '.14em' }}>AIRBUS<br /><span style={{ fontSize: 8 }}>A320-200</span></div></Section><Section title="FLT CTL"><InopButtons labels={['ELAC 2', 'SEC 2', 'SEC 3', 'FAC 2']} /></Section><Section title="CARGO VENT"><InopButtons labels={['ISOL VALVE', 'HOT AIR']} /></Section><Section title="CARGO SMOKE"><InopButtons labels={['FWD DISCH', 'TEST', 'AFT DISCH']} /></Section><Section title="VENTILATION"><InopButtons labels={['BLOWER', 'EXTRACT', 'CAB FANS']} /></Section><Section title="ENG MAN START"><InopButtons labels={['1', '2']} /></Section><Section title="WIPER / RAIN RPLNT"><Rotary label="F/O" value={read('wipers.right') ? 'ON' : 'OFF'} onChange={act('wipers', 'right', !read('wipers.right'))} /></Section></div>
    </div>
  </div></PowerContext.Provider>;
}
