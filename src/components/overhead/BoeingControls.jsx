/* eslint-disable react/prop-types */
import { createContext, useContext } from 'react';

const PowerContext = createContext(false);

export const BoeingRow = ({ children, style }) => <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'flex-start', gap: 5, margin: '9px 0', ...style }}>{children}</div>;

export function BoeingModule({ title, children, height, style }) {
  return <section aria-label={title} style={{ position: 'relative', minHeight: height, padding: '13px 9px 9px', background: 'linear-gradient(125deg,#81745f,#6d6051 78%)', border: '2px solid #453d32', borderRadius: 5, boxShadow: 'inset 0 1px #ac9980, 1px 2px 3px #302b26', ...style }}>
    {[{ top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, left: 4 }, { bottom: 4, right: 4 }].map((pos, i) => <span key={i} aria-hidden="true" style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(130deg,#b2a085,#403a31)', border: '1px solid #3d362d', ...pos }} />)}
    {title && <div style={{ textAlign: 'center', color: '#faf4df', fontWeight: 700, fontSize: 10, letterSpacing: '.09em', marginBottom: 8 }}>{title}</div>}
    {children}
  </section>;
}

export function BoeingControl({ label, kind = 'push', value = false, onChange, positions, note, legend, guarded = false }) {
  const powered = useContext(PowerContext);
  const disabled = !onChange;
  const active = typeof value === 'boolean' ? value : value !== 'OFF' && value !== 'NORM';
  const state = positions ? String(value) : active ? 'ON' : 'OFF';
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 1 60px', minWidth: 33, textAlign: 'center' }}>
    <span style={{ fontSize: 8, lineHeight: 1.15, whiteSpace: 'pre-line', minHeight: 10 }}>{label}</span>
    <button type="button" disabled={disabled} aria-label={`${label}${disabled ? ' (INOP)' : ''}`} aria-pressed={positions ? undefined : active} title={disabled ? 'INOP — system not simulated' : note || `${label}: ${state}`} onClick={onChange} style={{ position: 'relative', padding: 0, width: kind === 'rotary' ? 38 : 35, height: kind === 'rotary' ? 38 : 34, border: kind === 'rotary' ? '2px solid #bcae8c' : '2px solid #c5c7a6', borderRadius: kind === 'rotary' ? '50%' : 4, background: kind === 'rotary' ? 'radial-gradient(circle at 30% 20%,#e5d8b5,#9b8a66)' : guarded ? 'linear-gradient(#9e2520,#4d1310)' : '#262822', boxShadow: '0 3px 4px #372f27,inset 0 0 0 2px #171a17', color: '#f6f2d9', cursor: disabled ? 'default' : 'pointer' }}>
      {kind === 'push' && <><span style={{ display: 'block', fontSize: 7, color: active && !disabled && powered ? '#c2fac4' : '#676759' }}>{active && !disabled ? legend || 'ON' : legend || 'OFF'}</span><span style={{ display: 'block', fontSize: 6, marginTop: 3, color: '#676759' }}>{guarded ? 'GUARD' : ' '}</span></>}
      {kind === 'rotary' && <span aria-hidden="true" style={{ position: 'absolute', left: 13, top: 1, width: 8, height: 29, background: 'linear-gradient(90deg,#ac9d7c,#f0e2be,#c3b18c)', borderRadius: 4, transform: `rotate(${active ? 25 : -28}deg)`, boxShadow: '2px 2px 3px #574a35' }}><span style={{ position: 'absolute', height: 12, width: 2, background: '#302b24', left: 3, top: 1 }} /></span>}
      {kind === 'toggle' && <span aria-hidden="true" style={{ position: 'absolute', top: active ? 3 : 14, left: 13, width: 8, height: 20, background: 'linear-gradient(90deg,#777,#eee,#aaa)', borderRadius: 5, boxShadow: '2px 3px 3px #111' }} />}
    </button>
    <span style={{ fontSize: 7, color: disabled ? '#d2c2a5' : '#ecdfb7', minHeight: 8 }}>{disabled ? 'INOP' : state}</span>
  </div>;
}

export function BoeingReadout({ label, value, unit = '' }) {
  return <div style={{ textAlign: 'center', flex: 1 }}><div style={{ background: '#171c18', color: '#c1dbc2', font: '14px monospace', border: '2px solid #413e34', padding: '4px 2px', letterSpacing: 1 }}>{value ?? '—'}</div><div style={{ fontSize: 7, marginTop: 4 }}>{label} {unit}</div></div>;
}

export function BoeingGauge({ label, value, unit, max = 100 }) {
  const finite = Number.isFinite(value);
  return <div style={{ textAlign: 'center' }}><div style={{ position: 'relative', width: 65, height: 65, borderRadius: '50%', background: 'radial-gradient(#222b29,#101716)', border: '3px solid #afa185', boxShadow: '0 2px 3px #302a22' }}>
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <span key={i} style={{ position: 'absolute', top: 4, left: 28, width: 1, height: 5, background: '#e5e8ce', transformOrigin: '1px 26px', transform: `rotate(${i * 38 - 130}deg)` }} />)}
    <span style={{ position: 'absolute', left: 28, top: 10, width: 2, height: 21, background: finite ? '#e9edd8' : '#454b43', transformOrigin: 'bottom center', transform: `rotate(${finite ? Math.max(0, Math.min(value / max, 1)) * 260 - 130 : -130}deg)` }} />
    <span style={{ position: 'absolute', bottom: 9, left: 0, right: 0, fontSize: 8 }}>{finite ? Math.round(value) : '—'}</span>
  </div><div style={{ fontSize: 7, marginTop: 4 }}>{label}<br />{unit}</div></div>;
}

export function BoeingShell({ aircraft, children, columns = 4, onClose, powered = false }) {
  return <PowerContext.Provider value={powered}><div data-boeing-panel={aircraft} style={{ width: 890, minHeight: 940, boxSizing: 'border-box', position: 'relative', padding: '30px 22px 24px', background: 'linear-gradient(100deg,#493f35,#9a876b 45%,#514739)', border: '5px solid #342e28', borderRadius: '22px 22px 95px 95px', color: '#f1efd9', fontFamily: 'Arial,sans-serif', boxShadow: '0 15px 35px #0008' }}>
    <div style={{ position: 'absolute', top: 8, left: 24, fontSize: 9, letterSpacing: '.2em' }}>{aircraft} · OVERHEAD</div>
    {onClose && <button type="button" onClick={onClose} aria-label="Close overhead panel" style={{ position: 'absolute', top: 4, right: 18, color: '#fff', background: '#443d33', border: '1px solid #baaa8b', cursor: 'pointer' }}>×</button>}
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`, gap: 5, alignItems: 'start' }}>{children}</div>
    <div style={{ fontSize: 8, textAlign: 'center', marginTop: 14, letterSpacing: '.07em', color: '#e0d5bd' }}>INOP = NOT SIMULATED · FUEL PUMP PAIRS SHARE BANK CONTROLS</div>
  </div></PowerContext.Provider>;
}
