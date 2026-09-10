// Shared static SVG instruments; no simulation dependencies.
/* eslint-disable react/prop-types */
const seq = (n) => Array.from({ length: n }, (_, i) => i);
export function Label({ x, y, children, ...props }) { return <text x={x} y={y} textAnchor="middle" {...props}>{children}</text>; }
export function Screw({ x, y }) { return <g transform={`translate(${x} ${y})`}><circle r="2.3" fill="#292c2c" stroke="#919799" strokeWidth=".5" /><path d="M-1.3 1.3 1.3-1.3" stroke="#aaa" strokeWidth=".6" /></g>; }
export function Plate({ x, y, w, h, children }) { return <g transform={`translate(${x} ${y})`}><rect width={w} height={h} rx="3" fill="url(#metal)" stroke="#252c30" />{[[5,5],[w-5,5],[5,h-5],[w-5,h-5]].map(([a,b],i)=><Screw key={i} x={a} y={b} />)}{children}</g>; }
export function Knob({ x, y, r = 8, dark = false, angle = 0 }) { return <g transform={`translate(${x} ${y}) rotate(${angle})`}><circle r={r+2} fill="#252a2d" stroke="#949a9b" strokeWidth=".5" /><circle r={r} fill={dark?'url(#blackKnob)':'url(#knob)'} stroke="#171b1c" />{seq(12).map(i=><path key={i} d={`M0 ${-r+1}v2`} transform={`rotate(${i*30})`} stroke={dark?'#525758':'#b6bbba'} strokeWidth="1" />)}<path d={`M0 ${-r+2}v${r*.65}`} stroke={dark?'#e1e5df':'#343a3b'} strokeWidth="2" /></g>; }
export function Push({ x, y, w = 19, h = 13, label, lit = false }) { return <g transform={`translate(${x} ${y})`}><rect width={w} height={h} rx="1" fill="#242a2b" stroke="#a0a7a7" strokeWidth=".5" />{lit&&<rect x="3" y="2" width={w-6} height="2" fill="#6cd165" />}<Label x={w/2} y={h-3} className="tiny">{label}</Label></g>; }
export function Toggle({ x, y, label }) { return <g transform={`translate(${x} ${y})`}><Label x="0" y="-12" className="tiny">{label}</Label><circle r="4" fill="#1a2021" stroke="#b9babb" /><path d="M0 1 2-7" stroke="#ddd" strokeWidth="3" strokeLinecap="round" /></g>; }
export function Dial({ x, y, r=25, type='clock' }) {
  const ticks = type === 'flaps' ? ['UP','1','5','15','20','25','30'] : type === 'speed' ? ['60','100','150','200','250','300','350','400'] : type === 'alt' ? ['0','1','2','3','4','5','6','7','8','9'] : ['12','1','2','3','4','5','6','7','8','9','10','11'];
  return <g transform={`translate(${x} ${y})`}>
    <rect x={-r-4} y={-r-4} width={2*r+8} height={2*r+8} rx="4" fill="url(#metal)" stroke="#aaa98c" strokeWidth=".7"/>
    <circle r={r} fill="#101718" stroke="#333c39" strokeWidth="2"/>
    {type === 'attitude' ? <>
      <path d={`M${-r+2} 0a${r-2} ${r-2} 0 0 1 ${2*r-4} 0`} fill="#408da9"/>
      <path d={`M${-r+2} 0a${r-2} ${r-2} 0 0 0 ${2*r-4} 0`} fill="#836136"/>
      {[-10,-5,6,11].map(n=><path key={n} d={`M-7 ${n}h14`} stroke="white" strokeWidth=".5"/>)}
      <path d="M-16 1h11l5 4 5-4h11" fill="none" stroke="#f6cc49" strokeWidth="2"/>
    </> : <>
      {ticks.map((t,i)=>{ const angle=type==='flaps'?-125+i*250/(ticks.length-1):i*360/ticks.length; return <g key={t} transform={`rotate(${angle})`}>
        <path d={`M0 ${-r+3}v3`} stroke="#ddd" strokeWidth=".7"/>
        <text transform={`translate(0 ${-r+9}) rotate(${-angle})`} textAnchor="middle" style={{fontSize:type==='speed'?3:4}}>{t}</text>
      </g>;})}
      <path d={`M0 0 5 ${-r+8}`} stroke="white" strokeWidth="1.2"/>
      {type==='clock' && <path d="M0 0-9 6" stroke="white" strokeWidth="1.4"/>}
      <circle r="1.5" fill="#ddd"/>
      {type==='alt' && <rect x="-9" y="5" width="18" height="6" fill="#353c39"/>}
      <Label x="0" y={type==='alt'?10:12} className="tiny">{type==='clock'?'10:08':type==='speed'?'KNOTS':type==='flaps'?'FLAPS':'00400'}</Label>
    </>}
  </g>;
}
export function Screen({ x, y, size=139, children }) { return <g transform={`translate(${x} ${y})`}><rect width={size} height={size} rx="5" fill="#343a3d" stroke="#a3a9a9" strokeWidth="1" /><rect x="6" y="6" width={size-12} height={size-12} rx="4" fill="#080711" stroke="#101114" strokeWidth="3" />{[[4,4],[size-4,4],[4,size-4],[size-4,size-4]].map(([a,b],i)=><Screw key={i} x={a} y={b}/>)}<svg className="screen" x="10" y="10" width={size-20} height={size-20} viewBox="0 0 120 120" overflow="hidden">{children}</svg></g>; }
export function PFD({ x, y }) { return <Screen x={x} y={y}><Label x="60" y="7" className="green">N1    LNAV    VNAV PTH</Label><path d="M40 0v12m40-12v12" stroke="#ddd" strokeWidth=".5" /><Label x="60" y="17" className="green">CMD</Label><rect x="24" y="22" width="69" height="67" fill="#2466b6" /><rect x="24" y="55" width="69" height="34" fill="#8e5428" /><path d="M24 55h69" stroke="white" />{[-20,-10,10,20].map((n,i)=><g key={n}><path d={`M${i%2?46:41} ${55+n}h${i%2?25:35}`} stroke="white" strokeWidth=".7"/><Label x="37" y={57+n} style={{fontSize:5}}>{Math.abs(n)}</Label></g>)}<path d="M31 55h17v4m38-4H69v4M55 55h7" stroke="#111" strokeWidth="4" fill="none"/><path d="M31 55h17v4m38-4H69v4M55 55h7" stroke="#fff" strokeWidth="1.2" fill="none"/><path d="M59 26v57M29 56h60" stroke="#e355eb" strokeWidth="1.5" /><path d="M37 32Q59 12 81 32" fill="none" stroke="white" strokeWidth=".7"/><path d="m59 21-3 5h6z" fill="white"/><rect x="3" y="25" width="18" height="65" fill="#333740"/><rect x="96" y="25" width="19" height="65" fill="#333740"/>{seq(6).map(i=><g key={i}><Label x="11" y={33+i*10} style={{fontSize:6}}>{180-i*10}</Label><Label x="105" y={33+i*10} style={{fontSize:6}}>{'0'+(6-i)*20}</Label></g>)}<path d="M1 50h17l5 6-5 6H1zM118 50H99l-6 6 6 6h19z" fill="#07090b" stroke="white" strokeWidth=".6"/><Label x="11" y="59">145</Label><Label x="106" y="59">040</Label><Label x="12" y="21" className="magenta">145</Label><Label x="103" y="21" className="magenta">3000</Label><path d="M29 104q30-25 60 0" fill="none" stroke="white"/>{seq(7).map(i=><path key={i} d={`M${32+i*9} ${101-Math.sin(i/6*Math.PI)*10}v4`} stroke="white"/>)}<Label x="59" y="108">273</Label><Label x="101" y="98" className="green">29.92</Label><Label x="59" y="118" style={{fontSize:6}}>ILS 108.50     DME 8.2</Label></Screen>; }
export function ND({ x, y }) { return <Screen x={x} y={y}><Label x="23" y="7" style={{fontSize:6}}>GS 142 TAS 148</Label><Label x="91" y="7" className="magenta">DAG  8.2NM</Label><Label x="60" y="17">273 MAG</Label>{[35,65,88].map(r=><path key={r} d={`M${60-r} 106a${r} ${r} 0 0 1 ${r*2} 0`} fill="none" stroke="#b6a8bc" strokeWidth=".6" strokeDasharray={r===35?'3 4':undefined}/>)}{seq(13).map(i=><g key={i} transform={`translate(60 106) rotate(${-80+i*13.3})`}><path d="M0-88v5" stroke="white"/><Label x="0" y="-76" style={{fontSize:6}}>{(19+i)%36}</Label></g>)}<path d="M60 108 64 74 47 41 56 20" fill="none" stroke="#e652d9" strokeWidth="1.4"/>{[[64,74,'DAG'],[47,41,'HEC']].map(([a,b,t])=><g key={t}><path d={`M${a} ${b-3}l3 3-3 3-3-3z`} fill="none" stroke="#e652d9"/><text x={a+5} y={b} className="magenta" style={{fontSize:6}}>{t}</text></g>)}<path d="m60 99-4 10 4-2 4 2z" fill="none" stroke="white"/><Label x="17" y="115" className="cyan">VOR 1</Label><Label x="101" y="115" className="cyan">VOR 2</Label></Screen>; }
