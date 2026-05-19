import React from 'react';

// ─── style constants ──────────────────────────────────────────────────────────
const AMBER = '#ffaa00';
const BLUE  = '#00ccff';

const sp = (h, extra={}) => ({
  position:'relative', width:'100%', flexShrink:0, height:h,
  background:'#2c353b', border:'2px solid #333',
  borderRadius:5, padding:5, color:'#eee', overflow:'hidden', ...extra,
});
const pt = { margin:'0 0 4px', fontSize:9, fontWeight:700, letterSpacing:'.06em', textAlign:'center', color:'#ccc', borderBottom:'1px solid #3a3a3a', paddingBottom:2 };
const row = (extra={}) => ({ display:'flex', justifyContent:'center', gap:4, alignItems:'flex-start', marginTop:3, ...extra });
const seam = { borderTop:'1px solid #3a3a3a', margin:'3px 0' };

// ─── primitives ───────────────────────────────────────────────────────────────
const Sc = ({ pos }) => {
  const m = { tl:{top:3,left:3}, tr:{top:3,right:3}, bl:{bottom:3,left:3}, br:{bottom:3,right:3} };
  return <div style={{ position:'absolute', width:6, height:6, borderRadius:'50%', background:'#1a1e20', border:'1px solid #5a6268', ...m[pos] }}/>;
};

const Ann = ({ label, color='amber', lit=false, style:sx={} }) => {
  const litColor = color==='blue'?BLUE:color==='green'?'#00e000':color==='red'?'#ff3333':'#111';
  const bg  = lit ? litColor : '#111';
  const fg  = lit ? (color!=='amber'?'#000':AMBER) : '#444';
  const shadow = lit ? `0 0 8px ${litColor}, 0 0 3px ${litColor}` : 'none';
  return (
    <div style={{ background:bg, color:fg, fontSize:7, fontWeight:'bold', padding:'1px 3px', border:`1px solid ${lit?litColor:'#2a2a2a'}`, textAlign:'center', minWidth:30, lineHeight:1.1, borderRadius:1, boxShadow:shadow, whiteSpace:'pre-line', ...sx }}>{label}</div>
  );
};

const Sw = ({ label, sub, lever='dn', onClick, inop=false, stateLabel, children }) => {
  const top = lever==='up'?1:lever==='mid'?4:8;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', margin:1, cursor:(!inop&&onClick)?'pointer':'default', opacity:inop?0.45:1 }} onClick={(!inop&&onClick)||undefined}>
      {children}
      <div style={{ width:22, height:22, position:'relative' }}>
        <div style={{ position:'absolute', top:2, left:2, right:2, bottom:2, background:'#777', borderRadius:2, border:'1px solid #444', boxShadow:'inset 0 0 4px #000' }}/>
        <div style={{ position:'absolute', left:7, width:8, height:14, top, background:'linear-gradient(90deg,#c8c8c8,#f0f0f0,#989898)', borderRadius:5, boxShadow:'0 3px 5px rgba(0,0,0,.5)', zIndex:2 }}>
          <div style={{ width:'100%', height:2, background:'rgba(255,255,255,.7)', borderRadius:'5px 5px 0 0' }}/>
        </div>
      </div>
      {label && <div style={{ fontSize:7, marginTop:1, color:'#ddd', textAlign:'center', fontWeight:'bold', lineHeight:1.05 }}>{label}</div>}
      {stateLabel && <div style={{ fontSize:6, color:'#ffcc44', textAlign:'center', lineHeight:1 }}>{stateLabel}</div>}
      {sub && !stateLabel && <div style={{ fontSize:6, color:'#aaa', textAlign:'center', lineHeight:1 }}>{sub}</div>}
    </div>
  );
};

const Rot = ({ label, sub, angle=0, inop=false, onClick }) => {
  const handleWheel = (e) => {
    if (inop || !onClick) return;
    onClick();
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', margin:1, opacity:inop?0.45:1, cursor:onClick?'pointer':'default' }} onClick={(!inop&&onClick)||undefined} onWheel={handleWheel}>
      <div style={{ width:28, height:28, borderRadius:'50%', background:'radial-gradient(circle at 35% 35%,#555,#222)', border:'2px solid #666', position:'relative' }}>
        <div style={{ position:'absolute', width:2, height:10, background:'#ddd', top:3, left:12, transform:`rotate(${angle}deg)`, transformOrigin:'bottom center' }}/>
      </div>
      {label && <div style={{ fontSize:7, marginTop:1, color:'#ddd', textAlign:'center', fontWeight:'bold', lineHeight:1.05 }}>{label}</div>}
      {sub   && <div style={{ fontSize:6, color:'#aaa', textAlign:'center', lineHeight:1 }}>{sub}</div>}
    </div>
  );
};

const Dial = ({ label, angle=0, dig, size=46 }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', margin:'0 2px' }}>
    <div style={{ width:size, height:size, borderRadius:'50%', position:'relative', background:'radial-gradient(circle at 35% 35%,#1f1f1f,#0c0c0c 70%,#000)', border:'2px solid #666', boxShadow:'inset 0 0 0 2px #222,inset 0 0 0 4px #111' }}>
      <div style={{ position:'absolute', inset:7, borderRadius:'50%', border:'1px solid rgba(255,255,255,.16)' }}/>
      <div style={{ position:'absolute', left:size/2-1, top:size*0.17, width:2, height:size*0.33, background:'#fff', transform:`rotate(${angle}deg)`, transformOrigin:'bottom center' }}>
        <div style={{ position:'absolute', left:-2, bottom:-2, width:6, height:6, borderRadius:'50%', background:'#111', border:'1px solid #999' }}/>
      </div>
      {dig!=null && <div style={{ position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)', fontFamily:'Courier New,monospace', fontSize:6, color:'#9ffd5c', background:'#000', border:'1px solid #333', borderRadius:1, padding:'0 2px', whiteSpace:'nowrap', lineHeight:1.3 }}>{dig}</div>}
    </div>
    {label && <div style={{ fontSize:6, color:'#f0f0f0', marginTop:2, textAlign:'center', fontWeight:'bold', lineHeight:1.05 }}>{label}</div>}
  </div>
);

const Seg = ({ value, style:sx={} }) => (
  <span style={{ fontFamily:'Courier New,monospace', background:'#000', color:'#9ffd5c', border:'1px solid #333', borderRadius:2, letterSpacing:2, fontWeight:'bold', display:'inline-block', padding:'1px 3px', ...sx }}>{value}</span>
);

const Guard = ({ label }) => (
  <div style={{ position:'relative', display:'inline-flex', alignItems:'flex-end', justifyContent:'center', background:'linear-gradient(180deg,#c00,#800)', border:'1px solid #600', borderRadius:'2px 2px 0 0', padding:'2px 3px 1px', opacity:0.55 }}>
    <div style={{ position:'absolute', top:-5, left:'50%', transform:'translateX(-50%)', width:'60%', height:6, background:'linear-gradient(180deg,#a00,#c00)', border:'1px solid #600', borderRadius:'2px 2px 0 0' }}/>
    <div style={{ fontSize:5, color:'#f44', textAlign:'center', fontWeight:'bold' }}>{label}</div>
  </div>
);

const ThreePosSw = ({ label, pos=1, onPosChange, inop=false, children, stateLabels=['START','ON','OFF'] }) => {
  const dragRef = React.useRef(null);
  const [visualPos, setVisualPos] = React.useState(null);
  const isDragging = React.useRef(false);
  // Only sync visual pos from prop when not dragging
  const displayPos = isDragging.current ? (visualPos !== null ? visualPos : pos) : pos;

  const handleMouseDown = (e) => {
    if (inop) return;
    e.preventDefault();
    const startY = e.clientY;
    const startPos = pos;
    dragRef.current = startPos;
    isDragging.current = true;
    setVisualPos(startPos);

    const onMove = (ev) => {
      const dy = startY - ev.clientY;
      const newPos = Math.max(0, Math.min(2, startPos - Math.round(dy / 6)));
      setVisualPos(newPos);
      if (newPos !== dragRef.current) {
        dragRef.current = newPos;
        if (onPosChange) onPosChange(newPos);
      }
    };
    const onUp = () => {
      isDragging.current = false;
      setVisualPos(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const top = displayPos === 0 ? 2 : displayPos === 1 ? 11 : 20;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', margin:1, cursor:inop?'default':'ns-resize', opacity:inop?0.45:1 }}>
      {children}
      <div style={{ width:22, height:36, position:'relative', background:'#777', borderRadius:2, border:'1px solid #444', boxShadow:'inset 0 0 4px #000' }} onMouseDown={handleMouseDown}>
        <div style={{ position:'absolute', left:7, width:8, height:14, top, background:'linear-gradient(90deg,#c8c8c8,#f0f0f0,#989898)', borderRadius:5, boxShadow:'0 3px 5px rgba(0,0,0,.5)', zIndex:2, transition:'top 0.08s' }}>
          <div style={{ width:'100%', height:2, background:'rgba(255,255,255,.7)', borderRadius:'5px 5px 0 0' }}/>
        </div>
      </div>
      {label && <div style={{ fontSize:7, marginTop:1, color:'#ddd', textAlign:'center', fontWeight:'bold', lineHeight:1.05 }}>{label}</div>}
      <div style={{ fontSize:6, color:'#ffcc44', textAlign:'center', lineHeight:1 }}>{stateLabels[displayPos] ?? ''}</div>
    </div>
  );
};

const EngineRunSwitch = ({ label, running = false, onClick }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, margin:1 }}>
    <div style={{ fontSize:4, color:'#aaa' }}>CUTOFF</div>
    <Sw lever={running ? 'up' : 'dn'} onClick={onClick}/>
    <div style={{ fontSize:4, color:'#aaa' }}>RUN</div>
    <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>{label}</div>
  </div>
);

// double-stroke pipeline line
const PL = ({ x1,y1,x2,y2 }) => <>
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="4"/>
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#666" strokeWidth="2"/>
</>;

// ─── Col 1 panels ─────────────────────────────────────────────────────────────

const FltControlPanel = ({ getSys }) => {
  const ydOn = getSys('flightControls.yawDamper', false);
  return (
    <div style={sp(240)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>FLT CONTROL</div>
      <div style={row({ gap:3, marginBottom:3 })}>
        <Ann label={'FEEL DIFF\nPRESS'}/><Ann label={'SPEED TRIM\nFAIL'}/>
      </div>
      <div style={row({ gap:3, marginBottom:3 })}>
        <Ann label={'MACH TRIM\nFAIL'}/><Ann label={'AUTO SLAT\nFAIL'}/>
      </div>
      <div style={row({ gap:2, marginBottom:2 })}>
        <Sw label="SPOILER A" inop><Ann label="LOW PRESS"/></Sw>
        <Sw label="SPOILER B" inop><Ann label="LOW PRESS"/></Sw>
        <Sw label="YAW DMPR" lever="up"><Ann label="ON" lit={ydOn}/></Sw>
      </div>
      <div style={seam}/>
      <div style={pt}>STBY HYD</div>
      <div style={row({ gap:2, marginBottom:2 })}>
        <Sw label="STBY RUD" inop><Ann label="LOW PRESS"/></Sw>
        <Sw label="STBY HYD" inop><Ann label="LOW PRESS"/></Sw>
      </div>
      <div style={seam}/>
      <div style={row({ gap:2 })}>
        <Sw label="ALT FLAPS" sub="ARM" inop/>
        <Guard label="DISCON"/>
      </div>
    </div>
  );
};

const NavDisplayPanel = () => (
  <div style={sp(146)}>
    <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
    <div style={pt}>NAVIGATION / DISPLAY</div>
    <div style={row()}>
      <Rot label="VHF NAV" sub="NORM" angle={-18} inop/>
      <Rot label="IRS" sub="BOTH" inop/>
      <Rot label="FMC" sub="AUTO" angle={18} inop/>
    </div>
    <div style={row()}>
      <Rot label="SOURCE" sub="AUTO" angle={-18} inop/>
      <Rot label="CTRL PNL" sub="NORM" angle={18} inop/>
    </div>
  </div>
);

const FuelPanel = ({ getSys, onSystemAction, flightState = {} }) => {
  const lP = getSys('fuel.leftPumps', false);
  const rP = getSys('fuel.rightPumps', false);
  const cP = getSys('fuel.centerPumps', false);
  const xf = getSys('fuel.crossfeed', false);
  const tanks = getSys('fuel.tanks', { left:0, center:0, right:0 });
  const elecPowered = getSys('electrical.dcVolts', 0) > 15 || getSys('electrical.acVolts', 0) > 100;
  return (
    <div style={sp(275)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>FUEL PUMPS</div>
      <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 36px', alignItems:'start', gap:2, marginBottom:2 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
          <Ann label={'ENG VLV\nCLOSED'} color="blue" lit={false} style={{ fontSize:5, minWidth:0 }}/>
          <Ann label={'FILTER\nBYPASS'} color="blue" lit={false} style={{ fontSize:5, minWidth:0 }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'center' }}>{(() => { const ft = getSys('fuel.fuelTemp', null) ?? (flightState?.weather?.temperature ?? 15); const fa = Math.min(Math.max((ft/60)*80, -80), 80); return <Dial label="FUEL TEMP" angle={fa} dig={`${Math.round(ft)}°`}/>; })()}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:1, alignItems:'flex-end' }}>
          <Ann label={'ENG VLV\nCLOSED'} color="blue" lit={false} style={{ fontSize:5, minWidth:0 }}/>
          <Ann label={'FILTER\nBYPASS'} color="blue" lit={false} style={{ fontSize:5, minWidth:0 }}/>
        </div>
      </div>
      <div style={{ background:'#000', border:'2px solid #333', borderRadius:3, padding:'3px 4px', margin:'2px 0', boxShadow:'inset 0 0 6px #000' }}>
        <div style={{ display:'flex', justifyContent:'center' }}>
          <Seg value={`${Math.round(tanks.left)}  ${Math.round(tanks.center)}  ${Math.round(tanks.right)}`} style={{ fontSize:9, letterSpacing:1 }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', padding:'0 14px', marginTop:1 }}>
          <span style={{ fontSize:5, color:'#666' }}>L</span><span style={{ fontSize:5, color:'#666' }}>CTR</span><span style={{ fontSize:5, color:'#666' }}>R</span>
        </div>
      </div>
      <div style={{ position:'relative', top:8, height:110 }}>
        <svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }} viewBox="0 0 154 110" preserveAspectRatio="none">
          <PL x1="8" y1="65" x2="50" y2="65"/><PL x1="104" y1="65" x2="147" y2="65"/>
          <PL x1="8" y1="5" x2="147" y2="5"/>
          <PL x1="8" y1="5" x2="8" y2="65"/><PL x1="51" y1="5" x2="51" y2="25"/>
          <PL x1="146" y1="5" x2="146" y2="65"/><PL x1="102" y1="5" x2="102" y2="25"/>
          <PL x1="8" y1="65" x2="8" y2="85"/><PL x1="49" y1="65" x2="49" y2="85"/>
          <PL x1="105" y1="65" x2="105" y2="85"/><PL x1="146" y1="65" x2="146" y2="85"/>
        </svg>
        {/* XFEED */}
        <div style={{ position:'absolute', left:60, top:-15, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <Ann label="OPEN" color="blue" lit={elecPowered && xf} style={{ fontSize:5, padding:'0 2px' }}/>
          <div style={{ position:'relative', width:26, height:26, cursor:'pointer' }} onClick={() => onSystemAction('fuel','crossfeed')}>
            <svg width="26" height="26" style={{ position:'absolute', top:0, left:0, transform: xf ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }}>
              <defs><radialGradient id="xg" cx="35%" cy="35%"><stop offset="0%" stopColor="#333"/><stop offset="100%" stopColor="#1a1a1a"/></radialGradient></defs>
              <circle cx="13" cy="13" r="12" fill="url(#xg)" stroke="#777" strokeWidth="1.5"/>
              <line x1="2" y1="13" x2="24" y2="13" stroke="#fff" strokeWidth="3"/>
              <line x1="2" y1="13" x2="24" y2="13" stroke="#444" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>
        {[
          { key:'centerPumps', val:cP, left:30,  top:14, lbl:'CTR L' },
          { key:'centerPumps', val:cP, left:80,  top:14, lbl:'CTR R' },
          { key:'leftPumps',   val:lP, left:-8,  top:70, lbl:'L AFT' },
          { key:'leftPumps',   val:lP, left:30,  top:70, lbl:'L FWD' },
          { key:'rightPumps',  val:rP, left:83,  top:70, lbl:'R FWD' },
          { key:'rightPumps',  val:rP, left:123, top:70, lbl:'R AFT' },
        ].map(({ key, val, left, top, lbl }) => (
          <div key={lbl} style={{ position:'absolute', left, top, display:'flex', flexDirection:'column', alignItems:'center' }}>
            <Ann label={'LOW\nPRESS'} color="amber" lit={elecPowered && !val} style={{ fontSize:5 }}/>
            <Sw label={lbl} lever={val?'up':'dn'} onClick={() => onSystemAction('fuel', key)}/>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Col 2 panels ─────────────────────────────────────────────────────────────

const IRSPanel = ({ getSys }) => {
  const ir1 = getSys('adirs.ir1', 'OFF');
  const ir2 = getSys('adirs.ir2', 'OFF');
  const aligned = getSys('adirs.aligned', false);
  return (
    <div style={sp(100)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>IRS L / R</div>
      <div style={row({ gap:12, alignItems:'flex-start' })}>
        {[['IRS L', ir1], ['IRS R', ir2]].map(([lbl, val]) => (
          <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <div style={row({ gap:2, marginTop:0 })}>
              <Ann label="ALIGN" color="amber" lit={val==='ALIGN'} style={{ fontSize:5, color: val==='ALIGN'?'#000':'#fff', borderColor:'#555' }}/>
              <Ann label="ON DC" color="amber" lit={false} style={{ fontSize:5 }}/>
            </div>
            <div style={row({ gap:2, marginTop:1 })}>
              <Ann label="FAULT" style={{ fontSize:5 }}/>
              <Ann label="DC FAIL" color="amber" style={{ fontSize:5 }}/>
            </div>
            <Rot label={lbl} sub="OFF·ALIGN·NAV" angle={val==='NAV'?18:val==='ALIGN'?0:-18}/>
          </div>
        ))}
      </div>
    </div>
  );
};

const ElecPanel = ({ getSys, onSystemAction }) => {
  const dcV = getSys('electrical.dcVolts', 0);
  const acV = getSys('electrical.acVolts', 0);
  const acA = getSys('electrical.acAmps', 0);
  const acF = getSys('electrical.acFreq', 0);
  const batterySelector = getSys('electrical.batterySelector', getSys('electrical.battery', false) ? 'AUTO' : 'OFF');
  const batteryConnected = batterySelector !== 'OFF';
  const powered = dcV > 15 || acV > 100;
  const selectorPos = batterySelector === 'BAT' ? 0 : batterySelector === 'AUTO' ? 1 : 2;
  return (
    <div style={sp(220)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>ELECTRICAL</div>
      <div style={{ background:'#000', border:'2px solid #333', borderRadius:3, padding:'4px 3px', marginBottom:4, boxShadow:'inset 0 0 6px #000' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:5, color:'#666', letterSpacing:'.05em' }}>DC AMPS</div>
            <Seg value={powered ? String(Math.round(acA * 0.2)) : '--'} style={{ fontSize:10 }}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:5, color:'#666' }}>CPS FREQ</div>
            <Seg value={powered ? String(Math.round(acF) || 0) : '---'} style={{ fontSize:10 }}/>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:5, color:'#666' }}>DC VOLTS</div>
            <Seg value={powered ? String(Math.round(dcV) || 0) : '--'} style={{ fontSize:10 }}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:5, color:'#666' }}>AC AMPS</div>
            <Seg value={powered ? String(Math.round(acA) || 0) : '--'} style={{ fontSize:10 }}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:5, color:'#666' }}>AC VOLTS</div>
            <Seg value={powered ? String(Math.round(acV) || 0) : '---'} style={{ fontSize:10 }}/>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-around', marginBottom:4 }}>
        <Ann label={'BAT\nDISCHARGE'} color="amber" lit={batteryConnected && !powered} style={{ fontSize:5 }}/>
        <Ann label={'TR\nUNIT'} color="amber" lit={false} style={{ fontSize:5 }}/>
        <Ann label="ELEC" color="amber" lit={false} style={{ fontSize:5 }}/>
      </div>
      <div style={row({ justifyContent:'space-around', marginTop:2 })}>
        <Rot label="DC/AC" sub="SELECT" angle={-22} inop/>
        <Rot label="METER" sub="SELECT" angle={10} inop/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:8 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:44 }}>
          <Sw label="BATTERY" lever={batteryConnected?'up':'dn'} onClick={() => onSystemAction('electrical','batterySelector', batteryConnected ? 'OFF' : 'AUTO')}>
            <Ann label={'BAT\nDISCHARGE'} color="amber" lit={batteryConnected && !powered} style={{ fontSize:5 }}/>
          </Sw>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:9, fontSize:6, color:'#ddd', fontWeight:'bold', lineHeight:1, marginTop:2 }}>
            <span>BAT</span>
            <span>OFF</span>
            <span>AUTO</span>
          </div>
          <ThreePosSw
            label="STBY PWR"
            pos={selectorPos}
            onPosChange={(pos) => onSystemAction('electrical','batterySelector', ['BAT', 'OFF', 'AUTO'][pos])}
          >
            <Ann label={'STANDBY\nPWR OFF'} color="amber" lit={batterySelector === 'OFF' && batteryConnected} style={{ fontSize:5 }}/>
          </ThreePosSw>
        </div>
      </div>
    </div>
  );
};

const StbyPowerPanel = ({ getSys, onSystemAction }) => {
  const batterySelector = getSys('electrical.batterySelector', getSys('electrical.battery', false) ? 'AUTO' : 'OFF');
  const selectorPos = batterySelector === 'BAT' ? 0 : batterySelector === 'AUTO' ? 1 : 2;
  return (
    <div style={sp(86)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>STANDBY POWER</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:2 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
          <div style={{ fontSize:7, color:'#aaa' }}>1</div>
          <Ann label={'STANDBY\nPWR OFF'} color="amber" lit={false} style={{ fontSize:4 }}/>
          <div style={{ fontSize:7, color:'#aaa' }}>2</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:7, fontSize:5, color:'#bbb', fontWeight:'bold', lineHeight:1 }}>
            <span>BAT</span>
            <span>OFF</span>
            <span>AUTO</span>
          </div>
          <ThreePosSw
            label="STBY PWR"
            pos={selectorPos}
            onPosChange={(pos) => onSystemAction('electrical','batterySelector', ['BAT', 'OFF', 'AUTO'][pos])}
          />
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-around', marginTop:1 }}>
        <Guard label="DISCON"/>
        <Guard label="DISCON"/>
      </div>
    </div>
  );
};

const GenSystemPanel = ({ getSys, onSystemAction, flightState = {} }) => {
  const gen1 = getSys('electrical.gen1', false);
  const gen2 = getSys('electrical.gen2', false);
  const apuGen1 = getSys('electrical.apuGen1', getSys('electrical.apuGen', false));
  const apuGen2 = getSys('electrical.apuGen2', getSys('electrical.apuGen', false));
  const batterySelector = getSys('electrical.batterySelector', getSys('electrical.battery', false) ? 'AUTO' : 'OFF');
  const batteryConnected = batterySelector !== 'OFF';
  const powered = getSys('electrical.dcVolts', 0) > 15 || getSys('electrical.acVolts', 0) > 100;
  const srcOff1 = getSys('electrical.sourceOff1', true);
  const srcOff2 = getSys('electrical.sourceOff2', true);
  const eng1n2 = getSys('engines.eng1.n2', 0);
  const eng2n2 = getSys('engines.eng2.n2', 0);
  const alt = flightState.altitude ?? flightState.derived?.altitude_ft ?? 0;
  const onGround = alt < 100 && (flightState.gearValue !== false);
  const enginesOff = eng1n2 < 5 && eng2n2 < 5;
  const grdPwrAvail = onGround && enginesOff;
  return (
    <div style={sp(165)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>GEN SYSTEM</div>
      <div style={{ position:'relative', height:160, top:-10 }}>
        <svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }} viewBox="0 0 154 160" preserveAspectRatio="none">
          <PL x1="20" y1="90" x2="70" y2="90"/><PL x1="84" y1="90" x2="134" y2="90"/>
          <PL x1="20" y1="90" x2="20" y2="130"/><PL x1="70" y1="90" x2="70" y2="130"/>
          <PL x1="70" y1="130" x2="60" y2="130"/><PL x1="84" y1="90" x2="84" y2="130"/>
          <PL x1="84" y1="130" x2="94" y2="130"/><PL x1="134" y1="90" x2="134" y2="130"/>
        </svg>
        {/* GRD PWR */}
        <div style={{ position:'absolute', left:55, top:10 }}>
          <Sw label="GRD PWR" lever={srcOff1?'dn':'up'} onClick={() => onSystemAction('electrical','sourceOff1')}>
            <Ann label={'GRD PWR\nAVAILABLE'} color="blue" lit={batteryConnected && grdPwrAvail} style={{ fontSize:5 }}/>
          </Sw>
        </div>
        {/* BUS TRANS */}
        <div style={{ position:'absolute', left:43, top:65, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:2, background:'#333', border:'1px solid #555', borderRadius:3, padding:'2px 6px' }}>
            <div style={{ width:28, height:10, background:'#666', borderRadius:2, border:'1px solid #888', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:6, height:8, background:'linear-gradient(90deg,#c8c8c8,#f0f0f0,#989898)', borderRadius:2 }}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, marginTop:1 }}>
            <span style={{ fontSize:5, color:'#aaa' }}>OFF</span>
            <span style={{ fontSize:5, color:'#ddd', fontWeight:'bold' }}>BUS TRANS</span>
            <span style={{ fontSize:5, color:'#aaa' }}>AUTO</span>
          </div>
        </div>
        {/* GEN 1 */}
        <div style={{ position:'absolute', left:1, top:65 }}>
          <Ann label={'TRANSFER\nBUS OFF'} color="amber" lit={powered && srcOff1} style={{ fontSize:5 }}/>
          <Ann label={'SOURCE\nOFF'} color="amber" lit={powered && srcOff1} style={{ fontSize:5 }}/>
          <Ann label={'GEN OFF\nBUS'} color="blue" lit={powered && srcOff1 && !gen1 && !apuGen1} style={{ fontSize:5 }}/>
          <Sw label="GEN 1" lever={gen1?'up':'dn'} onClick={() => onSystemAction('electrical','gen1')}/>
        </div>
        {/* APU GEN */}
        <div style={{ position:'absolute', left:59, top:95 }}>
          <Ann label={'APU GEN\nOFF BUS'} color="blue" lit={powered && srcOff1 && !apuGen1} style={{ fontSize:5 }}/>
        </div>
        <div style={{ position:'absolute', left:40, top:117 }}>
          <Sw lever={apuGen1?'up':'dn'} onClick={() => onSystemAction('electrical','apuGen1')}/>
        </div>
        <div style={{ position:'absolute', left:85, top:117 }}>
          <Sw lever={apuGen2?'up':'dn'} onClick={() => onSystemAction('electrical','apuGen2')}/>
        </div>
        {/* GEN 2 */}
        <div style={{ position:'absolute', left:112, top:65 }}>
          <Ann label={'TRANSFER\nBUS OFF'} color="amber" lit={powered && srcOff2} style={{ fontSize:5 }}/>
          <Ann label={'SOURCE\nOFF'} color="amber" lit={powered && srcOff2} style={{ fontSize:5 }}/>
          <Ann label={'GEN OFF\nBUS'} color="blue" lit={powered && srcOff2 && !gen2 && !apuGen2} style={{ fontSize:5 }}/>
          <Sw label="GEN 2" lever={gen2?'up':'dn'} onClick={() => onSystemAction('electrical','gen2')}/>
        </div>
      </div>
    </div>
  );
};

const ApuEgtWiperPanel = ({ getSys, onSystemAction }) => {
  const egt   = getSys('apu.egt', 0);
  const state = getSys('apu.state', 'OFF');
  const wL    = getSys('wipers.left', false);
  const ang   = Math.min(Math.max((egt/900)*160 - 80, -80), 80);
  return (
    <div style={sp(75)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>APU EGT / L WIPER</div>
      <div style={row()}>
        <Dial label="APU EGT" angle={ang} dig={Math.round(egt)||'0'}/>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <div style={{ fontSize:6, color: state==='RUNNING'?'#0f0':state==='OFF'?'#555':'#ffaa00' }}>{state}</div>
          <Rot label="L WIPER" sub={wL?'ON':'OFF'} angle={wL?0:-28} onClick={() => onSystemAction('wipers','left')}/>
        </div>
      </div>
    </div>
  );
};

// ─── Col 4 panels ────────────────────────────────────────────────────────────

const WindowHeatPanel = ({ getSys }) => {
  const wL = getSys('ice.windowHeatL', false);
  const wR = getSys('ice.windowHeatR', false);
  const ph = getSys('ice.probeHeat', false);
  return (
    <div style={sp(196)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>WINDOW HEAT / PROBE</div>
      <div style={row({ gap:2, marginBottom:2 })}>
        {[['L SIDE',wL],['L FWD',wL],['R FWD',wR],['R SIDE',wR]].map(([lbl,on]) => (
          <Sw key={lbl} label={lbl} sub="ON" lever="up" inop>
            <Ann label="OVHT" color="amber" style={{ fontSize:5 }}/>
            <Ann label="ON" color="amber" lit={on} style={{ fontSize:5 }}/>
          </Sw>
        ))}
      </div>
      <div style={seam}/>
      <div style={{ display:'grid', gridTemplateColumns:'36px 72px 36px', gap:3, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {['CAPT\nPITOT','L ELEV\nPITOT','L ALPHA\nVANE','TEMP\nPROBE'].map(l => (
            <Ann key={l} label={l} color="amber" style={{ fontSize:4, minWidth:0, padding:'1px 2px' }}/>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{ display:'flex', gap:2 }}>
            <Sw label="CAPT" sub="ON" lever="up" inop/>
            <Sw label="F/O" sub="ON" lever="up" inop/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:5, color:'#aaa' }}>PWR TEST</div>
            <Sw label="PROBE" lever="dn" inop/>
            <div style={{ fontSize:5, color:'#aaa' }}>ON HEAT</div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {['F/O\nPITOT','R ELEV\nPITOT','R ALPHA\nVANE','AUX\nPITOT'].map(l => (
            <Ann key={l} label={l} color="amber" style={{ fontSize:4, minWidth:0, padding:'1px 2px' }}/>
          ))}
        </div>
      </div>
      <div style={{ fontSize:5, color:'#888', textAlign:'center', marginTop:2, letterSpacing:'.05em' }}>TAT TEST</div>
    </div>
  );
};

const AntiIcePanel = ({ getSys, onSystemAction }) => {
  const wing = getSys('ice.wingAntiIce', false);
  const e1   = getSys('ice.eng1AntiIce', false);
  const e2   = getSys('ice.eng2AntiIce', false);
  return (
    <div style={sp(110)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>ANTI-ICE</div>
      <div style={row({ gap:4 })}>
        <Sw label="WING" sub="ANTI-ICE" lever={wing?'up':'dn'} onClick={() => onSystemAction('ice','wingAntiIce')}>
          <div style={row({ gap:2, marginTop:0 })}>
            <Ann label={'L VALVE\nOPEN'} color="blue" lit={wing} style={{ fontSize:5 }}/>
            <Ann label={'R VALVE\nOPEN'} color="blue" lit={wing} style={{ fontSize:5 }}/>
          </div>
        </Sw>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={row({ gap:2, marginTop:0 })}>
            <Ann label={'COWL\nANTI-ICE'} color="amber" lit={e1} style={{ fontSize:5 }}/>
            <Ann label={'COWL\nANTI-ICE'} color="amber" lit={e2} style={{ fontSize:5 }}/>
          </div>
          <div style={row({ gap:2 })}>
            <Ann label={'COWL\nVLV OPEN'} color="blue" lit={e1} style={{ fontSize:5 }}/>
            <Ann label={'COWL\nVLV OPEN'} color="blue" lit={e2} style={{ fontSize:5 }}/>
          </div>
          <div style={row({ gap:2 })}>
            <Sw label="ENG 1" sub="COWL" lever={e1?'up':'dn'} onClick={() => onSystemAction('ice','eng1AntiIce')}/>
            <Sw label="ENG 2" sub="COWL" lever={e2?'up':'dn'} onClick={() => onSystemAction('ice','eng2AntiIce')}/>
          </div>
        </div>
      </div>
    </div>
  );
};

const HydraulicsPanel = ({ getSys, onSystemAction }) => {
  const sA = getSys('hydraulics.sysA', {});
  const sB = getSys('hydraulics.sysB', {});
  const lowA = (sA.pressure||0) < 1500;
  const lowB = (sB.pressure||0) < 1500;
  const elecPowered = getSys('electrical.dcVolts', 0) > 15 || getSys('electrical.acVolts', 0) > 100;
  return (
    <div style={sp(190)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>HYDRAULIC PUMPS</div>
      <div style={{ display:'flex', justifyContent:'space-around', marginBottom:1 }}>
        <span style={{ fontSize:6, color:'#aaa' }}>SYS A</span>
        <span style={{ fontSize:6, color:'#aaa' }}>SYS B</span>
      </div>
      <div style={row({ gap:2 })}>
        {[
          { lbl:'ENG 1', low:lowA, lever:sA.engPump?'up':'dn',   act:'eng1Pump' },
          { lbl:'ELEC 1', low:lowA, lever:sA.elecPump?'up':'dn', act:'elec1Pump' },
          { lbl:'ELEC 2', low:lowB, lever:sB.elecPump?'up':'dn', act:'elec2Pump' },
          { lbl:'ENG 2', low:lowB, lever:sB.engPump?'up':'dn',   act:'eng2Pump' },
        ].map(({ lbl, low, lever, act }) => (
          <Sw key={lbl} label={lbl} lever={lever} onClick={() => onSystemAction('hydraulics', act)}>
            <Ann label={'LOW\nPRESS'} color="amber" lit={elecPowered && low} style={{ fontSize:5 }}/>
            <Ann label="OVHT" color="amber" lit={false} style={{ fontSize:5 }}/>
          </Sw>
        ))}
      </div>
      <div style={row({ marginTop:3 })}>
        <Ann label={'FLT\nCONTROL'} color="amber" lit={false} style={{ fontSize:5 }}/>
        <Ann label={'LOW\nQTY'} color="amber" lit={false} style={{ fontSize:5 }}/>
        <Ann label={'FILTER\nBYPASS'} lit={false} style={{ fontSize:5 }}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginTop:3 }}>
        {['FWD\nENTRY','FWD\nSERVICE','FWD\nCARGO','L AFT\nOVERWING','R AFT\nOVERWING','AFT\nCARGO','AFT\nENTRY','AFT\nSERVICE','EQUIP'].map(l => (
          <Ann key={l} label={l} color="amber" lit={false} style={{ fontSize:4, padding:'1px 2px', width:'100%' }}/>
        ))}
      </div>
    </div>
  );
};

const CabinAltPanel = ({ getSys }) => {
  const cabAlt = getSys('pressurization.cabinAlt', 0);
  const cabClb = getSys('pressurization.diffPressure', 0);
  return (
    <div style={sp(158)}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>CABIN ALT / CABIN CLIMB</div>
      <div style={row()}>
        <Dial label="CAB ALT" size={64} angle={Math.min((cabAlt/10000)*160-80, 80)} dig={Math.round(cabAlt)}/>
        <Dial label="CAB CLB" size={64} angle={Math.min((cabClb/0.5)*40-20, 80)} dig={Math.round(cabClb*100)/100}/>
      </div>
    </div>
  );
};

// ─── Col 5 panels ────────────────────────────────────────────────────────────

const AirCondPanel = ({ getSys = () => undefined, flightState = {} }) => {
  const oat = flightState?.weather?.temperature ?? 22;
  const airTempAngle = Math.min(Math.max((oat / 50) * 80, -80), 80);
  return (
  <div style={sp(200)}>
    <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
    <div style={pt}>AIR CONDITIONING</div>
    <div style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:3 }}>
      <Dial label="AIR TEMP" size={54} angle={airTempAngle} dig={`${Math.round(oat)}°C`}/>
      <Rot label="SUPPLY" sub="DUCT" inop/>
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
      <div style={{ fontSize:5, color:'#aaa' }}>TRIM-AIR</div>
      <Sw lever="up" inop/>
      <div style={{ fontSize:5, color:'#aaa' }}>ON</div>
    </div>
    <div style={{ display:'flex', justifyContent:'space-around' }}>
      {['CONT CAB','FWD CAB','AFT CAB'].map(z => (
        <div key={z} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
          <Ann label={'ZONE\nTEMP'} color="amber" style={{ fontSize:4 }}/>
          <Rot inop/>
          <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>{z}</div>
          <div style={{ display:'flex', gap:4 }}>
            {['C','AUTO','W'].map(l => <span key={l} style={{ fontSize:4, color:'#aaa' }}>{l}</span>)}
          </div>
          <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
        </div>
      ))}
    </div>
  </div>
  );
};

const BleedPanel = ({ getSys, onSystemAction }) => {
  const isoV  = getSys('pressurization.isolationValve', false);
  const packL = getSys('pressurization.packL', false);
  const packR = getSys('pressurization.packR', false);
  const b1    = getSys('pressurization.bleed1', false);
  const b2    = getSys('pressurization.bleed2', false);
  const apuB  = getSys('apu.bleed', false);
  const ductL = getSys('pressurization.ductPressL', 0);
  const ductR = getSys('pressurization.ductPressR', 0);
  const ductAvg = (ductL + ductR) / 2;
  return (
    <div style={{ ...sp(260), position:'relative' }}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>BLEED / DUCT PRESS</div>
      {/* top anns */}
      <div style={{ position:'absolute', top:18, left:4 }}><Ann label={'DUAL\nBLEED'} color="blue" style={{ fontSize:4 }}/></div>
      <div style={{ position:'absolute', top:18, left:36 }}><Ann label={'RAM DOOR\nFULL OPEN'} color="blue" style={{ fontSize:4 }}/></div>
      <div style={{ position:'absolute', top:18, right:4 }}><Ann label={'RAM DOOR\nFULL OPEN'} color="blue" style={{ fontSize:4 }}/></div>
      {/* recirc fans */}
      <div style={{ position:'absolute', top:44, left:4, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:4, color:'#aaa', textAlign:'center' }}>L RECIRC{'\n'}FAN</div>
        <Sw label="AUTO" lever="up" inop/>
      </div>
      <div style={{ position:'absolute', top:44, right:4, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:4, color:'#aaa', textAlign:'center' }}>R RECIRC{'\n'}FAN</div>
        <Sw label="AUTO" lever="up" inop/>
      </div>
      {/* duct press dial */}
      <div style={{ position:'absolute', top:38, left:'50%', transform:'translateX(-50%)' }}>
        <Dial label="DUCT PRESS" size={60} angle={Math.min((ductAvg/60)*80-40, 80)} dig={Math.round(ductAvg)}/>
      </div>
      {/* SVG pipelines */}
      <svg style={{ position:'absolute', top:110, left:0, width:'100%', height:60, overflow:'visible', pointerEvents:'none' }} viewBox="0 0 120 60" preserveAspectRatio="none">
        <PL x1="13" y1="20" x2="107" y2="20"/>
        <PL x1="13" y1="80" x2="50" y2="80"/>
        <PL x1="13" y1="10" x2="13" y2="90"/>
        <PL x1="107" y1="10" x2="107" y2="90"/>
        <PL x1="50" y1="90" x2="50" y2="80"/>
      </svg>
      {/* isolation valve */}
      <div style={{ position:'absolute', top:108, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:4, color:'#aaa' }}>AUTO</div>
        <Sw label="ISOLATION" sub="VALVE" lever={isoV?'up':'dn'} onClick={() => onSystemAction('pressurization','isolationValve')}>
          <Ann label="OPEN" color="blue" lit={isoV} style={{ fontSize:4 }}/>
        </Sw>
        <div style={{ fontSize:4, color:'#aaa' }}>CLOSE</div>
      </div>
      {/* L PACK */}
      <div style={{ position:'absolute', top:84, left:5, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:5, color:'#ccc', fontWeight:'bold' }}>L PACK</div>
        <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
        <Sw lever={packL?'mid':'dn'} onClick={() => onSystemAction('pressurization','packL')}/>
        <div style={{ fontSize:4, color:'#aaa' }}>AUTO</div>
        <div style={{ fontSize:4, color:'#aaa' }}>HIGH</div>
      </div>
      {/* R PACK */}
      <div style={{ position:'absolute', top:84, right:5, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:5, color:'#ccc', fontWeight:'bold' }}>R PACK</div>
        <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
        <Sw lever={packR?'mid':'dn'} onClick={() => onSystemAction('pressurization','packR')}/>
        <div style={{ fontSize:4, color:'#aaa' }}>AUTO</div>
        <div style={{ fontSize:4, color:'#aaa' }}>HIGH</div>
      </div>
      {/* pack/bleed anns */}
      <div style={{ position:'absolute', top:142, left:27, display:'flex', gap:2 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
          <Ann label="PACK" color="amber" style={{ fontSize:4, fontWeight:'bold' }}/>
          <Ann label={'WING BODY\nOVERHEAT'} color="amber" style={{ fontSize:4 }}/>
          <Ann label={'BLEED\nTRIP OFF'} color="amber" style={{ fontSize:4 }}/>
        </div>
      </div>
      <div style={{ position:'absolute', top:142, right:27, display:'flex', gap:2, flexDirection:'row-reverse' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
          <Ann label="PACK" color="amber" style={{ fontSize:4, fontWeight:'bold' }}/>
          <Ann label={'WING BODY\nOVERHEAT'} color="amber" style={{ fontSize:4 }}/>
          <Ann label={'BLEED\nTRIP OFF'} color="amber" style={{ fontSize:4 }}/>
        </div>
      </div>
      {/* bleed switches */}
      <div style={{ position:'absolute', top:190, left:5, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
        <Sw label="ENG 1" sub="BLEED" lever={b1?'mid':'dn'} onClick={() => onSystemAction('pressurization','bleed1')}/>
        <div style={{ fontSize:4, color:'#aaa' }}>ON</div>
      </div>
      <div style={{ position:'absolute', top:190, left:67, transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
        <Sw label="APU" sub="BLEED" lever={apuB?'up':'dn'} onClick={() => onSystemAction('apu','bleed')}/>
        <div style={{ fontSize:4, color:'#aaa' }}>ON</div>
      </div>
      <div style={{ position:'absolute', top:190, right:5, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
        <Sw label="ENG 2" sub="BLEED" lever={b2?'mid':'dn'} onClick={() => onSystemAction('pressurization','bleed2')}/>
        <div style={{ fontSize:4, color:'#aaa' }}>ON</div>
      </div>
    </div>
  );
};

const PressPanel = ({ getSys }) => {
  const fltAlt  = getSys('pressurization.fltAlt', 35000);
  const landAlt = getSys('pressurization.landAlt', 50);
  const cabAlt  = getSys('pressurization.cabinAlt', 0);
  return (
    <div style={{ ...sp(200), position:'relative' }}>
      <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
      <div style={pt}>PRESSURIZATION</div>
      <div style={{ position:'absolute', top:18, left:2, right:2, display:'flex', gap:2 }}>
        <Ann label={'AUTO\nFAIL'} color="amber" style={{ fontSize:4 }}/>
        <Ann label={'OFF SCHED\nDESCENT'} color="amber" style={{ fontSize:4 }}/>
        <Ann label="AL TN" style={{ fontSize:4 }}/>
        <Ann label="MANUAL" style={{ fontSize:4 }}/>
      </div>
      <div style={{ position:'absolute', top:42, left:26, fontSize:8, color:'#ccc' }}>AUTO</div>
      <div style={{ position:'absolute', top:42, right:26, fontSize:8, color:'#ccc' }}>MANUAL</div>
      {/* FLT ALT */}
      <div style={{ position:'absolute', top:50, left:14, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ background:'#000', border:'1px solid #333', borderRadius:2, padding:'1px 3px' }}>
          <Seg value={String(Math.round(fltAlt)).padStart(5,'0')} style={{ fontSize:8 }}/>
        </div>
        <Rot angle={20} inop/>
        <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>FLT ALT</div>
      </div>
      {/* LAND ALT */}
      <div style={{ position:'absolute', top:115, left:14, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ background:'#000', border:'1px solid #333', borderRadius:2, padding:'1px 3px' }}>
          <Seg value={String(Math.round(landAlt)).padStart(5,'0')} style={{ fontSize:8 }}/>
        </div>
        <Rot angle={-10} inop/>
        <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>LAND ALT</div>
      </div>
      {/* outflow valve */}
      <div style={{ position:'absolute', top:46, right:4, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <div style={{ fontSize:4, color:'#aaa', writingMode:'vertical-rl', letterSpacing:1 }}>VALVE</div>
        <Dial size={36} angle={Math.min(Math.max((getSys('pressurization.diffPressure',0)/8.6)*80-40, -40), 40)}/>
        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
          <div style={{ fontSize:4, color:'#aaa' }}>CLOSE</div>
          <Sw lever="up" inop/>
          <div style={{ fontSize:4, color:'#aaa' }}>OPEN</div>
        </div>
      </div>
      {/* ALTN/AUTO/MAN */}
      <div style={{ position:'absolute', top:130, right:12, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
        <Rot angle={10} inop/>
        <div style={{ display:'flex', gap:2 }}>
          {['ALTN','AUTO','MAN'].map(l => <div key={l} style={{ fontSize:4, color:'#aaa' }}>{l}</div>)}
        </div>
      </div>
      {/* cab alt strip */}
      <div style={{ position:'absolute', bottom:2, left:2, right:2, background:'#111', border:'1px solid #333', borderRadius:2, padding:2, display:'flex', gap:4, alignItems:'center' }}>
        <div style={{ fontSize:4, color:'#aaa' }}>CAB ALT</div>
        {['2000','4000','6000','8000'].map(v => <div key={v} style={{ fontSize:4, color:'#aaa' }}>{v}</div>)}
      </div>
    </div>
  );
};

// ─── Bottom row ───────────────────────────────────────────────────────────────

const BottomRow = ({ getSys, onSystemAction }) => {
  const landing = getSys('lighting.landing', false);
  const taxi    = getSys('lighting.taxi', false);
  const strobe  = getSys('lighting.strobe', false);
  const beacon  = getSys('lighting.beacon', false);
  const nav     = getSys('lighting.nav', false);
  const logo    = getSys('lighting.logo', false);
  const wing    = getSys('lighting.wing', false);
  const apuMaster  = getSys('apu.master', false);
  const apuRunning = getSys('apu.running', false);
  const eng1Run = getSys('engines.eng1.fuelControl', false);
  const eng2Run = getSys('engines.eng2.fuelControl', false);
  // pos: 0=START(master on, not yet running), 1=ON(running), 2=OFF
  const apuPos = apuRunning ? 1 : apuMaster ? 0 : 2;
  const e1sw    = getSys('engines.eng1.startSwitch', 'OFF');
  const e2sw    = getSys('engines.eng2.startSwitch', 'OFF');
  const startAngle = (state) => state === 'GRD' ? -60 : state === 'OFF' ? -20 : state === 'CONT' ? 20 : 60;

  return (
    <div style={{ position:'absolute', left:100, right:100, bottom:8, height:90 }}>
      <div style={{ ...sp(90), width:'100%', display:'flex', alignItems:'center', gap:0, overflow:'hidden' }}>
        <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>

        {/* LANDING */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 6px', borderRight:'1px solid #3a3a3a' }}>
          <div style={pt}>LANDING</div>
          <div style={{ display:'flex', gap:3 }}>
            {['L','R','L','R'].map((s,i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
                <Sw lever={landing?'up':'dn'} onClick={() => onSystemAction('lighting','landing')}/>
                <div style={{ fontSize:4, color:'#aaa' }}>ON</div>
                <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:4, marginTop:1 }}>
            <div style={{ fontSize:4, color:'#aaa', flex:2, textAlign:'center' }}>RETRACTABLE</div>
            <div style={{ fontSize:4, color:'#aaa', flex:2, textAlign:'center' }}>FIXED</div>
          </div>
        </div>

        {/* RUNWAY TURNOFF */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 4px', borderRight:'1px solid #3a3a3a' }}>
          <div style={pt}>RUNWAY{'\n'}TURNOFF</div>
          <div style={{ display:'flex', gap:3 }}>
            {['L','R'].map(s => (
              <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
                <Sw lever="up" inop/>
                <div style={{ fontSize:4, color:'#aaa' }}>ON</div>
                <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TAXI */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 4px', borderRight:'1px solid #3a3a3a' }}>
          <div style={pt}>TAXI</div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
            <Sw lever={taxi?'up':'dn'} onClick={() => onSystemAction('lighting','taxi')}/>
            <div style={{ fontSize:4, color:'#aaa' }}>ON</div>
          </div>
        </div>

        {/* APU */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 4px', borderRight:'1px solid #3a3a3a' }}>
          <div style={pt}>APU</div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <ThreePosSw
              pos={apuPos}
              onPosChange={(p) => {
                if (p === 0) {
                  onSystemAction('apu','master', true);
                  onSystemAction('apu','start', true);
                } else if (p === 1) {
                  onSystemAction('apu','master', true);
                } else {
                  onSystemAction('apu','master', false);
                }
              }}
            />
          </div>
        </div>

        {/* ENGINE START */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 4px', borderRight:'1px solid #3a3a3a', flex:1 }}>
          <div style={pt}>ENGINE START</div>
          <div style={{ display:'flex', gap:4, alignItems:'flex-start' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
              <div style={{ fontSize:4, color:'#aaa' }}>GRD</div>
              <Rot angle={startAngle(e1sw)} onClick={() => onSystemAction('engines','eng1_start')} sub={e1sw}/>
              <div style={{ display:'flex', gap:3 }}>
                <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
                <div style={{ fontSize:4, color:'#aaa' }}>CONT</div>
              </div>
              <div style={{ fontSize:4, color:'#aaa' }}>FLT</div>
              <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>1</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, margin:'0 4px' }}>
              <div style={{ fontSize:4, color:'#aaa' }}>BOTH</div>
              <Sw lever="mid" inop/>
              <div style={{ fontSize:4, color:'#aaa' }}>GRD</div>
              <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
              <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>BOTH</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
              <div style={{ fontSize:4, color:'#aaa' }}>GRD</div>
              <Rot angle={startAngle(e2sw)} onClick={() => onSystemAction('engines','eng2_start')} sub={e2sw}/>
              <div style={{ display:'flex', gap:3 }}>
                <div style={{ fontSize:4, color:'#aaa' }}>OFF</div>
                <div style={{ fontSize:4, color:'#aaa' }}>CONT</div>
              </div>
              <div style={{ fontSize:4, color:'#aaa' }}>FLT</div>
              <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold' }}>2</div>
            </div>
          </div>
        </div>

        {/* LIGHTS */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 6px' }}>
          <div style={pt}>LIGHTS</div>
          <div style={{ display:'flex', gap:3 }}>
            {[
              { lbl:'LOGO',  key:'logo',   on:logo,   pos:['OFF','ON'] },
              { lbl:'POS',   key:'nav',    on:nav,    pos:['OFF','STEADY'] },
              { lbl:'ANTI\nCOLL', key:'beacon', on:beacon, pos:['OFF','ON'] },
              { lbl:'WING',  key:'wing',   on:wing,   pos:['OFF','ON'] },
              { lbl:'WHEEL\nWELL', key:'strobe', on:strobe, pos:['OFF','ON'] },
            ].map(({ lbl, key, on, pos }) => (
              <div key={key} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                <div style={{ fontSize:4, color:'#aaa' }}>{pos[0]}</div>
                <Sw lever={on?'up':'dn'} onClick={() => onSystemAction('lighting', key)}/>
                <div style={{ fontSize:4, color:'#aaa' }}>{pos[1]}</div>
                <div style={{ fontSize:7, color:'#ddd', fontWeight:'bold', textAlign:'center', whiteSpace:'pre-line' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Col 3 (mid) panels ───────────────────────────────────────────────────────

const MidColPanels = ({ getSys, onSystemAction }) => {
  const noSmoke = getSys('signs.noSmoking', false);
  const seatBelts = getSys('signs.seatBelts', false);
  return (
    <>
      <div style={sp(134)}>
        <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
        <div style={pt}>PANEL BRIGHTNESS</div>
        <div style={row()}><Rot label="PANEL" sub="BRT" inop/></div>
        <div style={row()}><Rot label="FLOOD" sub="DIM" angle={10} inop/></div>
      </div>
      <div style={sp(54)}>
        <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
        <div style={pt}>LAVATORY WARNING</div>
        <div style={row()}>
          <Ann label="SMOKE" color="amber"/>
          <Ann label="CALL" color="amber"/>
        </div>
      </div>
      <div style={sp(106)}>
        <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
        <div style={pt}>EQUIP COOLING</div>
        <div style={row()}>
          <Sw label="SUPPLY" sub="NORM" lever="up" inop><Ann label="OFF" color="amber" style={{ fontSize:5 }}/></Sw>
          <Sw label="EXHAUST" sub="NORM" lever="up" inop><Ann label="OFF" color="amber" style={{ fontSize:5 }}/></Sw>
        </div>
      </div>
      <div style={sp(96)}>
        <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
        <div style={pt}>EMER EXIT LIGHTS</div>
        <div style={row()}>
          <Sw label="EMER EXIT" sub="ARM" lever="up" inop>
            <Ann label="NOT ARMED" color="amber"/>
          </Sw>
        </div>
      </div>
      <div style={sp(168)}>
        <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
        <div style={pt}>NO SMOKING / BELTS / ATTEND / GRD CALL</div>
        <div style={row({ gap:2 })}>
          <Sw label="NO SMOKE" lever={noSmoke?'up':'dn'} onClick={() => onSystemAction('signs','noSmoking')}/>
          <Sw label="SEAT BELTS" lever={seatBelts?'up':'dn'} onClick={() => onSystemAction('signs','seatBelts')}/>
        </div>
        <div style={row({ gap:2 })}>
          <Sw label="ATTEND" lever="dn" inop/>
          <Sw label="GRD CALL" lever="dn" inop/>
        </div>
        <div style={row()}><Ann label="CALL" color="blue" style={{ fontSize:5 }}/></div>
      </div>
      <div style={sp(80)}>
        <Sc pos="tl"/><Sc pos="tr"/><Sc pos="bl"/><Sc pos="br"/>
        <div style={pt}>R WIPER</div>
        <div style={row()}>
          <Rot label="R WIPER" sub={getSys('wipers.right',false)?'ON':'OFF'} angle={getSys('wipers.right',false)?0:-28} onClick={() => onSystemAction('wipers','right')}/>
        </div>
      </div>
    </>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────

const B738OverheadPanel = ({ flightState = {}, onSystemAction = () => {}, onClose }) => {
  const getSys = (path, def) => {
    if (!flightState.systems) return def;
    return path.split('.').reduce((o, k) => (o == null ? def : o[k]), flightState.systems) ?? def;
  };

  const col = (left, width) => ({
    position:'absolute', top:14, bottom:106, left,
    width, display:'flex', flexDirection:'column', gap:8,
  });

  return (
    <div style={{ position:'relative', width:890, height:800, background:'#4c555b', border:'2px solid #23282c', clipPath:'polygon(1% 0,99% 0,99% 90%,86% 99%,14% 99%,1% 90%)', boxShadow:'0 20px 48px rgba(0,0,0,.4)', overflow:'hidden', fontFamily:'Arial,sans-serif', fontSize:11, color:'#eee' }}>
      {/* grain overlay */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0 1px,transparent 1px 6px)' }}/>

      {/* close button */}
      {onClose && (
        <button onClick={onClose} style={{ position:'absolute', top:6, right:8, zIndex:10, background:'#333', border:'1px solid #555', color:'#ccc', fontSize:10, padding:'2px 6px', cursor:'pointer', borderRadius:2 }}>✕</button>
      )}

      {/* Col 1 */}
      <div style={col(60, 164)}>
        <FltControlPanel getSys={getSys}/>
        <NavDisplayPanel/>
        <FuelPanel getSys={getSys} onSystemAction={onSystemAction} flightState={flightState}/>
      </div>

      {/* Col 2 */}
      <div style={col(232, 164)}>
        <IRSPanel getSys={getSys}/>
        <ElecPanel getSys={getSys} onSystemAction={onSystemAction}/>
        <StbyPowerPanel getSys={getSys} onSystemAction={onSystemAction}/>
        <GenSystemPanel getSys={getSys} onSystemAction={onSystemAction} flightState={flightState}/>
        <ApuEgtWiperPanel getSys={getSys} onSystemAction={onSystemAction}/>
      </div>

      {/* Col 3 mid */}
      <div style={col(404, 80)}>
        <MidColPanels getSys={getSys} onSystemAction={onSystemAction}/>
      </div>

      {/* Col 4 */}
      <div style={col(492, 164)}>
        <WindowHeatPanel getSys={getSys}/>
        <AntiIcePanel getSys={getSys} onSystemAction={onSystemAction}/>
        <HydraulicsPanel getSys={getSys} onSystemAction={onSystemAction}/>
        <CabinAltPanel getSys={getSys}/>
      </div>

      {/* Col 5 */}
      <div style={col(664, 164)}>
        <AirCondPanel getSys={getSys} flightState={flightState}/>
        <BleedPanel getSys={getSys} onSystemAction={onSystemAction}/>
        <PressPanel getSys={getSys}/>
      </div>

      {/* Bottom row */}
      <BottomRow getSys={getSys} onSystemAction={onSystemAction}/>
    </div>
  );
};

export default B738OverheadPanel;
