"""Build static visual studies from explicitly placed reference geometry.

Coordinates are drawing units, not flex/grid slots. Blank space is intentional.
No simulator data or React components are used to produce these documents.
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]

CSS = r"""
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 50% 20%,#35414a,#141b20 80%);color:#dce4e7;font-family:Arial,sans-serif}
.study{width:max-content;margin:25px auto 45px}.study>header{font-size:10px;letter-spacing:2px;margin-bottom:16px;color:#acbcc5}
.stage{position:relative;filter:drop-shadow(0 13px 20px #0007)}.panel{position:absolute;left:0;top:0;transform-origin:0 0;color:#e5e9e0;background:linear-gradient(110deg,#536b7b,#7a8d98 45%,#4d6475);border:0;box-shadow:inset 0 0 0 1.5px #293e4c;overflow:hidden;clip-path:polygon(0 0,100% 0,100% 94%,77% 100%,23% 100%,0 94%)}
.panel.a330{background:linear-gradient(110deg,#33576b,#4c7580,#294955)}.panel.a380{background:linear-gradient(110deg,#627c80,#85918c,#526c70)}
section{position:absolute;border:.65px solid #344d5c;border-radius:2px;background:linear-gradient(110deg,#6a8393,#607b8b);box-shadow:inset 0 0 0 .45px #b6c5c566,0 .8px 1px #243a43;overflow:visible}
.a330 section{background:linear-gradient(110deg,#496c7b,#365c6b)}.a350 section{background:linear-gradient(110deg,#687d8c,#5b7383)}.a380 section{background:linear-gradient(110deg,#768b8b,#637e80)}
section.blank{background:linear-gradient(105deg,#657c8a,#647c8b)}.screw{position:absolute;width:3.2px;height:3.2px;border:.4px solid #354d5b;border-radius:50%;background:linear-gradient(130deg,#253d48 0 39%,#97a8ab 41% 51%,#324853 53% 64%,#70858b 66%);box-shadow:0 0 0 .3px #83999e;z-index:5}.tl{left:1.7px;top:1.7px}.tr{right:1.7px;top:1.7px}.bl{left:1.7px;bottom:1.7px}.br{right:1.7px;bottom:1.7px}
.text{position:absolute;white-space:pre-line;line-height:1.12;text-align:center;font-size:3.6px;letter-spacing:.08px;z-index:3}.title{font-size:4.7px;letter-spacing:.5px}.vertical{writing-mode:vertical-rl;text-orientation:upright;font-size:5px;letter-spacing:1.5px}.muted{color:#c6d5d7}.green{color:#d9f5c5;background:#518a53;border:.3px solid #b5d1aa}.yellow{color:#24251a;background:#d0c444}.blue{background:#79b8ca;color:#193745}.tag{border:.35px solid #c1d1cd;padding:.5px 1.8px;font-size:3.4px}
.control{position:absolute;text-align:center;z-index:3}.control>.label{color:#e5e9e0;position:absolute;bottom:calc(100% + 1.5px);left:50%;transform:translateX(-50%);white-space:pre;font-size:3.2px;line-height:1.05;letter-spacing:.04px;pointer-events:none}
.push{width:10px;height:11px;border:.8px solid #b6c7c6;background:linear-gradient(110deg,#172b32,#081419);box-shadow:0 0 0 .6px #314c57,.8px 1px 1px #203e49;border-radius:.7px;padding:1px .5px;color:#536668}
.push>span:not(.label){display:block;font-size:2.3px;line-height:3.5px;height:3.7px;white-space:nowrap}.push .legend{border:.25px solid #657b7b;font-size:2.5px;line-height:3.6px}.push.lit .legend{color:#e7f4ff;border-color:#d9eef9;text-shadow:0 0 1px #a0d7ff}.push.amber .legend{color:#f3c45e;border-color:#4f5035}.push.cyan .legend{color:#b9f6fb;border-color:#77c3d2}.push.greenlit .legend{color:#b1eda1}.push.guarded{box-shadow:0 0 0 1.5px #9a2218,inset 0 0 0 .5px #1d2f34;border:.65px solid #a7b5b4}
.protected{width:12px;height:17px;border:1px solid #7e2119;border-radius:1px;background:#17272d;box-shadow:0 0 0 .7px #263d45,1px 1px 1px #20343d}.protected:before{content:'';position:absolute;inset:-2px -1.5px 5px;border:1px solid #b83225;border-radius:1px;background:linear-gradient(110deg,rgba(126,24,17,.72),rgba(224,54,39,.48));transform:perspective(20px) rotateX(-16deg);transform-origin:bottom;box-shadow:0 -1px 1px #44120e}.protected:after{content:'';position:absolute;left:4px;bottom:1px;width:3px;height:8px;border:.35px solid #829994;border-radius:1px;background:linear-gradient(90deg,#687f7d,#e1e5da,#849b96)}.protected .switch-stage{position:absolute;top:calc(100% + 1px);left:50%;transform:translateX(-50%);font-size:2.4px;color:#e4e9e2;white-space:nowrap}.protected .label{bottom:calc(100% + 5px)}
.fire{width:38px;height:24px;background:linear-gradient(#ac271e,#5a1d17);border:2px solid #b92d20;box-shadow:0 0 0 1px #3c2a24,inset 0 0 0 .7px #dd5f3e;border-radius:2px;padding:3px}.fire:before{content:'';position:absolute;top:-3px;left:1px;right:1px;height:3px;background:#29353a;border:.6px solid #a2271c}.fire:after{content:'PULL  ↶  ↷';position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);font-size:2.5px;color:#dbe2d8;white-space:nowrap}.fire>span:not(.label){display:block;background:#202a2c;border:.5px solid #7d7864;font-size:5px;line-height:12px;color:#778381}.fire.test>span:not(.label){color:#ffdd53;background:#af3420;box-shadow:0 0 7px #ff502b;text-shadow:0 0 3px #ff9c43}.fire .label{font-size:4.3px;bottom:calc(100% + 4px)}
.rotary{width:16px;height:16px;border-radius:50%;border:.6px solid #9fb3b2;background:repeating-conic-gradient(#c9d1c3 0 12deg,#a3b4ac 13deg 15deg);box-shadow:1px 1.5px 2px #2e4952}.rotary:after{content:'';position:absolute;top:-.7px;left:5.4px;width:4.4px;height:16px;border:.45px solid #a2b1a4;border-radius:1.3px;background:linear-gradient(90deg,#a9b8aa,#eeedda,#acb9a9);transform:rotate(var(--angle,0deg));box-shadow:.6px .5px .6px #7a8b7d}.rotary.black{background:radial-gradient(#27373a,#121f23);border-color:#81979b}.rotary.black:after{background:linear-gradient(90deg,#24393b,#526965,#25393b);border-color:#314a4c}.rotary.black:before{content:'';position:absolute;width:1px;height:4px;left:7px;top:1px;background:#cbd7ca;z-index:3;transform:rotate(var(--angle,0deg));transform-origin:0 7px}
.rotary.small{width:9px;height:9px}.rotary.small:after{left:2.5px;width:3px;height:9px}.rotary.small:before{left:4px;height:3px}.rotary .positions{position:absolute;left:-5px;top:-5px;width:25px;display:flex;justify-content:space-between;font-size:2.5px;white-space:pre;line-height:1}.rotary .label{bottom:calc(100% + 7px)}
.toggle{width:6.4px;height:7px;border-radius:50%;border:.6px solid #9db1b2;background:radial-gradient(#132a34 42%,#c9d5ca 45% 53%,#294857 56%);box-shadow:.5px .7px .7px #29404b}.toggle:after{content:'';position:absolute;width:2.3px;height:9px;left:1.4px;top:var(--lever,-3px);border:.35px solid #829994;border-radius:1px;background:linear-gradient(90deg,#748e8b,#e7e9d9,#8daba0);transform:rotate(var(--angle,0deg));transform-origin:50% 75%;box-shadow:.6px 1px .6px #1f3641}.toggle .label{bottom:calc(100% + 4px);font-size:3px}
.round{width:6px;height:6px;border-radius:50%;background:radial-gradient(#121f24 45%,#536e78 48% 65%,#b3c6c8 67% 74%,#3c5967 76%);border:.3px solid #4d6c79}.round.ring{background:radial-gradient(#607b8a 30%,#ccd7d0 32% 42%,#5c7887 45% 70%,#d7ddd4 72% 82%,#536b77 83%)}
.display{position:absolute;background:#142c32;border:1px solid #819896;box-shadow:inset 0 0 0 .5px #1c3945;padding:1px 2px;color:#b5d99b;font:6px 'Courier New',monospace;letter-spacing:.4px;white-space:pre;z-index:3}.display.amber{color:#edca72}.display.red{color:#ff6962}
.speaker{position:absolute;border-radius:50%;border:1.5px solid #8b9f9e;background:radial-gradient(#324b58 .65px,transparent .8px) 0 0/2.5px 2.5px,#97aaa3;box-shadow:0 0 0 .6px #536e7b}
.lamp{position:absolute;width:22px;height:24px;border-radius:50% 50% 20% 20%;background:radial-gradient(ellipse at 50% 75%,#d2b472 0 7%,#1e2c32 10% 35%,#49616a 40% 45%,#243e4b 48%);box-shadow:0 0 0 .6px #8b9f9d}
.breaker{position:absolute;width:5px;height:5px;border-radius:50%;background:linear-gradient(115deg,#a4aaa0,#6c7c7c 65%,#354f5c);border:.3px solid #3f5b69;box-shadow:.6px 1px .5px #3b5360}.plumbing{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}.plumbing path,.plumbing polyline,.plumbing line{fill:none;stroke:#8bc275;stroke-width:1.1;stroke-linecap:square;stroke-linejoin:miter}.plumbing .white{stroke:#c3d4cf;stroke-width:.55}.plumbing .yellow{stroke:#c9c15b}.plumbing .blue{stroke:#73bbc6}.plumbing rect{fill:none;stroke:#adc5c1;stroke-width:.55}.plumbing text{fill:#d7e4d7;font:3px Arial,sans-serif}.plumbing .node{fill:#7caf69;stroke:none}
.review-note{max-width:850px;color:#9aadb8;font-size:11px;line-height:1.5;margin-top:18px}
"""


def text(x, y, value, cls='', width=None, size=None):
    style = f'left:{x}px;top:{y}px;'
    if width is not None:
        style += f'width:{width}px;'
    if size:
        style += f'font-size:{size}px;'
    return f'<div class="text {cls}" style="{style}">{escape(value)}</div>'


def control(kind, x, y, label='', legend='OFF', state='', angle=0, positions=''):
    extra = f'--angle:{angle}deg;'
    inside = f'<span class="label">{escape(label)}</span>' if label else ''
    if kind.startswith('push'):
        inside += f'<span>{"FAULT" if not state else escape(state)}</span><span class="legend">{escape(legend)}</span>'
    elif kind.startswith('fire'):
        inside += '<span>FIRE</span>'
    if positions:
        inside += f'<span class="positions">{escape(positions)}</span>'
    return f'<div class="control {kind}" data-hardware="{kind.split()[0]}" aria-label="{escape(label or kind)}" style="left:{x}px;top:{y}px;{extra}">{inside}</div>'


def push(x, y, label='', legend='OFF', cls='', state=''):
    return control('push '+cls, x, y, label, legend, state)


def knob(x, y, label='', angle=0, positions='OFF  AUTO  ON', black=False, small=False):
    return control('rotary'+(' black' if black else '')+(' small' if small else ''), x, y, label, angle=angle, positions=positions)


def toggle(x, y, label='', angle=0):
    return control('toggle', x, y, label, angle=angle)


def guard(x, y, label=''):
    return f'<div class="control protected" data-hardware="protected-switch" aria-label="{escape(label or "protected switch")}" style="left:{x}px;top:{y}px"><span class="label">{escape(label)}</span><span class="switch-stage">ARM · ON</span></div>'


def circle(x, y, label='', ring=False):
    return control('round ring' if ring else 'round', x, y, label)


def display(x, y, value, cls=''):
    return f'<output class="display {cls}" style="left:{x}px;top:{y}px">{escape(value)}</output>'


def svg(w, h, paths='', labels=()):
    items = paths
    items += ''.join(f'<text x="{x}" y="{y}">{escape(label)}</text>' for x,y,label in labels)
    return f'<svg class="plumbing" aria-hidden="true" viewBox="0 0 {w} {h}">{items}</svg>'


def path(d, cls=''):
    return f'<path d="{d}" class="{cls}"/>'


def plate(name, x, y, w, h, content='', title=None, blank=False):
    screws = ''.join(f'<i class="screw {pos}" aria-hidden="true"></i>' for pos in ['tl','tr','bl','br'])
    heading = text(3, 5, title, 'vertical') if title else ''
    return f'<section aria-label="{escape(name)}" class="{"blank" if blank else ""}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">\n{screws}{heading}{content}\n</section>'


def reset_bank(w, h, rows=4):
    # Repeated spacing is specific to the photographed breaker bank, not a layout fallback.
    html = ''
    for row in range(rows):
        for col, label in enumerate(['A','B','C','D','E','F']):
            x, y = 8+col*13, 12+row*15
            html += text(x-1,y-6,label,width=7,size=2.5)
            html += f'<i class="breaker" style="left:{x}px;top:{y}px"></i>'
    return html + text(29,3,'RESET',size=3)


def audio_panel(w, h, modern=False):
    html = text(4,4,'AUDIO',size=3.5)
    if modern:
        html += display(6,18,'123.900  VHF1  125.000\n121.500  VHF2  121.225\n DATA    VHF3  128.850')
        for row in range(3):
            for col in range(6):
                html += circle(8+col*10,57+row*8)
        for x in [11,28,45,62]:
            html += knob(x,89,positions='',black=True)
    else:
        for i,label in enumerate(['VHF1','VHF2','VHF3','HF1','HF2','INT']):
            html += push(5+i*11,12,label,'',state='')
            html += knob(5+i*11,34,positions='',black=True,small=True)
        html += display(5,61,'ACTIVE    STBY\n121.500   123.625')
        for i,label in enumerate(['VHF1','VHF2','HF1','SEL']):
            html += push(6+i*15,85,label,'',state='')
        html += knob(48,110,positions='',black=True)
    return html


def side_adirs(w, h, model):
    html = text(34,5,'ADIRS',size=3.5)
    for x,n in [(12,1),(40,3),(69,2)]:
        html += push(x,17,f'IR {n}','FAULT')
        html += knob(x-2,41,'',0,'OFF NAV ATT')
        html += push(x,67,f'ADR {n}','OFF')
    return html


def side_calls(w, h):
    html = text(33,4,'CALLS',size=3.5)
    for x,label in [(9,'MECH'),(30,'FWD'),(51,'AFT'),(73,'ALL')]:
        html += circle(x,20,label)
    html += circle(40,min(36,h-8),'EMER',True)
    return html


def side_wiper(w, h):
    if h < 50:
        return text(53,3,'WIPER',size=3.5)+knob(12,11,'',-20,'OFF SLOW FAST')+circle(63,12,'RAIN',True)
    return text(31,4,'WIPER',size=3.5)+knob(18,22,'',-20,'OFF SLOW FAST')+circle(60,19,'RAIN RPLNT',True)


def side_flt(w,h,labels):
    return text(28,4,'FLT CTL',size=3.5)+''.join(push(x,19,label,'OFF') for x,label in zip([10,30,50],labels))


def side_cargo(w,h):
    return (text(19,4,'CARGO AIR COND',size=3.5)+push(11,18,'ISOL VALVES','OFF')+push(49,18,'HOT AIR','OFF')
            +knob(9,42,'FWD',-20,'COLD HOT')+knob(48,42,'AFT',-20,'COLD HOT'))


def side_smoke(w,h):
    return text(20,4,'CARGO SMOKE',size=3.5)+guard(10,21,'FWD AGENT')+guard(48,21,'AFT AGENT')+circle(33,20,'TEST')


def side_oxygen(w,h):
    return text(29,3,'OXYGEN',size=3.5)+guard(13,19,'MASK MAN ON')+push(52,17,'CREW SUPPLY','OFF')


def fire_section(w,h,count,apu=False,lit=False):
    # Engine controls are at the edges. The central test station remains small.
    if count == 2:
        xs=[13,w-52]
    else:
        xs=[12,61,w-105,w-55]
    html=''
    for n,x in enumerate(xs,1):
        html += control('fire test' if lit else 'fire',x,15,f'ENG {n}')
        html += push(x+1,47,'AGENT 1','SQUIB','amber' if lit else '')+push(x+24,47,'AGENT 2','SQUIB','amber' if lit else '')
    if apu:
        html += control('fire',w/2-18,24,'APU')+push(w/2-4,53,'','SQUIB')
        html += circle(w/2-35,47,'TEST')
    else:
        html += circle(w/2-3,47,'TEST')
    return html


def hydraulics_330(w,h):
    # Each colored circuit terminates on a pump switch edge; none traces a group border.
    html=svg(w,h,path('M22 19V25 M22 41V49 M22 44H46V48 M199 19V49')+path('M82 19V27 M82 43V48H104','blue')+path('M129 19V26 M129 42V48H150','yellow'))
    for x,label,cls in [(17,'GREEN','green'),(76,'BLUE','blue'),(123,'YELLOW','yellow'),(193,'GREEN','green')]:
        html+=text(x,8,label,cls+' tag')
    # These form an asymmetric circuit group, not six equally spaced pumps.
    html+=push(17,25,'ELEC','OFF')+push(17,49,'','OFF')+push(41,48,'ENG 1','OFF')
    html+=push(77,27,'ELEC','OFF')+push(99,48,'','OFF')
    html+=push(126,26,'ELEC','OFF')+push(145,49,'ENG 2','OFF')
    html+=push(194,49,'ENG 2','OFF')+guard(218,21,'RAT MAN ON')
    return html


def hydraulics_350(w,h):
    html=svg(w,h,path('M27 13V22 M27 16H66V22 M145 13V22 M145 16H183V22')+path('M66 13V22 M183 13V22','yellow'))
    for x,label,cls in [(17,'GREEN','green'),(57,'YELLOW','yellow'),(135,'GREEN','green'),(174,'YELLOW','yellow')]:
        html+=text(x,3,label,cls+' tag')
    for x,label in [(22,'ENG 1'),(61,'ELEC'),(140,'ENG 2'),(178,'ELEC')]:
        html+=push(x,22,label,'FAULT','guarded')
    html+=text(94,18,'HYD',size=3.5)
    return html


def hydraulics_380(w,h):
    html=svg(w,h,path('M18 14H87 M18 14V23 M36 14V23 M69 14V23 M87 14V23')+path('M131 14H200 M131 14V23 M149 14V23 M182 14V23 M200 14V23','yellow'))
    html+=text(48,5,'GREEN','green tag')+text(157,5,'YELLOW','yellow tag')
    for x,n in [(13,1),(64,2),(126,3),(177,4)]:
        html+=push(x,23,f'ENG {n} A','FAULT','guarded amber')+push(x+18,23,'B','FAULT','guarded amber')
    return html


def fuel_330(w,h):
    d='M22 10H223 M115 10V17 M22 10V43 M51 10V43 M101 23V43 M119 23V43 M137 23V43 M181 10V43 M209 10V43 M22 59V64 M209 59V64 M22 59H101V77 M209 59H145V77 M101 59H145'
    html=svg(w,h,path(d))
    html+=text(14,3,'ENG 1','tag')+text(210,3,'ENG 2','tag')+push(110,17,'WING X FEED','ON')
    for x,label in [(17,'L 1'),(46,'L 2'),(96,'CTR'),(114,'XFR'),(132,'TANK'),(176,'R 1'),(204,'R 2')]:
        html+=push(x,43,label,'OFF')
    html+=push(20,64,'L STBY','OFF')+push(203,64,'R STBY','OFF')
    html+=knob(87,76,'MODE SEL',0,'OPEN AUTO')+knob(112,76,'T TANK FEED',0,'AUTO FWD',True)+push(140,77,'ISOL','OFF')
    html+=text(180,79,'OUTR TK\nXFR',size=3)
    return html


def fuel_350(w,h):
    html=svg(w,h,path('M20 19H207 M112 9V19 M20 19V31 M38 19V31 M189 19V31 M207 19V31 M20 47V52 M207 47V52 M20 47H68V42 M207 47H155V42 M68 58H155 M68 42V58 M155 42V58'))
    html+=text(14,0,'1',size=6)+text(201,0,'2',size=6)+push(107,9,'X FEED','OFF')
    for x,y,label in [(15,31,'L 1'),(33,31,'L 2'),(15,52,'L STBY'),(184,31,'R 1'),(202,31,'R 2'),(202,52,'R STBY'),(63,42,'CTR L'),(150,42,'CTR R')]:
        html+=push(x,y,label,'OFF')
    html+=knob(95,31,'MODE SEL',0,'OPEN AUTO')
    return html


def fuel_380(w,h):
    html=svg(w,h,path('M27 8H199 M27 8V15 M82 8V15 M145 8V15 M199 8V15 M19 26V46 M33 26V46 M66 26V46 M80 26V46 M19 61V77 M33 61V77 M66 61V77 M80 61V77 M19 68H80 M19 93H80 M142 26V46 M156 26V46 M187 26V46 M201 26V46 M142 61V77 M156 61V77 M187 61V77 M201 61V77 M142 68H201 M142 93H201 M80 68H106V103 M142 68H116V103 M106 93H116'))
    for x,n in [(22,1),(77,2),(140,3),(194,4)]:
        html+=text(x,0,str(n),size=6)+push(x,15,'X FEED','ON','greenlit')
    for x,label in [(14,'FEED 1'),(61,'FEED 2'),(138,'FEED 3'),(183,'FEED 4')]:
        html+=push(x,46,label,'FAULT','amber')+push(x+14,46,'','FAULT','amber')
        html+=push(x,77,'MAIN','OFF','amber')+push(x+14,77,'STBY','OFF','amber')
    html+=push(49,103,'L INNER','OFF')+knob(106,101,'TRIM',0,'OPEN AUTO')+push(162,103,'R INNER','OFF')
    # Deliberate broad center aisle separates the two mirrored feed-tank groups.
    return html


def electrical_330(w,h):
    html=svg(w,h,path('M33 56H105 M137 56H199 M33 56V65 M69 56V65 M109 32V65 M149 56V65 M199 56V65 M105 56V70H137V56 M109 32H137'),labels=[(14,54,'AC BUS 1'),(202,54,'AC BUS 2'),(109,52,'AC ESS')])
    html+=display(15,14,'26.5','amber')+text(18,5,'BAT 1',size=3)
    for x,label in [(53,'BAT 1'),(76,'BAT 2'),(99,'APU BAT')]:html+=push(x,14,label,'OFF')
    html+=push(132,21,'AC ESS FEED','ALTN','guarded')+push(183,14,'GALLEY','OFF')+push(214,14,'COMMERCIAL','OFF')
    for x,label in [(28,'GEN 1'),(64,'APU GEN'),(104,'EXT B'),(144,'EXT A'),(194,'GEN 2')]:html+=push(x,65,label,'OFF')
    html+=push(15,80,'IDG 1','FAULT','guarded amber')+push(215,80,'IDG 2','FAULT','guarded amber')
    return html


def electrical_350(w,h):
    html=svg(w,h,path('M18 17H203 M18 17V21 M53 17V21 M89 17V21 M129 17V21 M166 17V21 M203 17V21 M29 37V52 M62 37V52 M106 37V52 M153 37V52 M189 37V52 M62 45H106V52 M106 68H153V52'),labels=[(14,13,'AC 1'),(195,13,'AC 2'),(97,66,'ESS')])
    for x,label in [(13,'GEN 1'),(48,'EXT 1'),(84,'APU GEN'),(124,'EXT 2'),(161,'GEN 2'),(198,'EXT 3')]:html+=push(x,21,label,'OFF')
    for x,label in [(24,'BAT 1'),(57,'BAT 2'),(101,'EMER'),(148,'ESS'),(184,'APU BAT')]:html+=push(x,52,label,'OFF','guarded' if x in [24,101,184] else '')
    return html


def electrical_380(w,h):
    html=svg(w,h,path('M22 31H205 M22 24V31 M75 24V31 M146 24V31 M197 24V31 M22 31V42 M74 31V42 M147 31V42 M199 31V42 M74 56H108V38 M147 56H118V38 M108 38H118 M35 58V79 M86 58V79 M140 58V79 M192 58V79'),labels=[(13,70,'AC 1'),(64,70,'AC 2'),(142,70,'AC 3'),(190,70,'AC 4')])
    for x,label in [(17,'BAT 1'),(70,'BAT 2'),(141,'ESS BAT'),(192,'APU BAT')]:html+=push(x,13,label,'OFF')
    for x,label in [(17,'GEN 1'),(69,'GEN 2'),(142,'GEN 3'),(194,'GEN 4')]:html+=push(x,42,label,'FAULT','guarded amber')
    html+=push(102,38,'BUS TIE','AUTO')+push(119,38,'','AUTO')
    for x,label in [(30,'EXT A'),(81,'APU 1'),(135,'APU 2'),(187,'EXT B')]:html+=push(x,79,label,'OFF','greenlit')
    return html


def air_section(w,h,model):
    html=svg(w,h,path(f'M30 38H{w-32} M30 38V44 M{w-32} 38V44 M{w/2} 38V45 M30 55V69 M{w-32} 55V69 M{w/2} 61V69'),labels=[(18,35,'PACK 1'),(w-41,35,'PACK 2')])
    html+=push(12,17,'RAM AIR','OFF')+knob(44,16,'PACK FLOW',0,'LO NORM HI')
    html+=knob(86,16,'COCKPIT',-10,'COLD HOT')+knob(136,16,'CABIN',-10,'COLD HOT')+push(w-22,17,'HOT AIR','OFF')
    html+=push(25,44,'PACK 1','OFF')+push(w-37,44,'PACK 2','OFF')
    html+=knob(w/2-8,45,'X BLEED',0,'SHUT AUTO OPEN')
    html+=push(25,69,'ENG 1 BLEED','OFF')+push(w/2-5,69,'APU BLEED','ON','cyan')+push(w-37,69,'ENG 2 BLEED','OFF')
    if model=='a380':
        html+=push(59,69,'ENG 2','OFF')+push(w-70,69,'ENG 3','OFF')
    return html


def lower_section(w,h,model):
    html=text(12,3,'ANTI ICE',size=3.5)+text(w*.57,3,'CABIN PRESS',size=3.5)
    for x,label in [(13,'WING'),(38,'ENG 1'),(63,'ENG 2')]:html+=push(x,18,label,'ON','cyan')
    html+=push(89,18,'PROBE HEAT','ON','cyan')+knob(w-57,17,'LDG ELEV',0,'AUTO')+guard(w-17,15,'DITCHING')
    html+=text(11,43,'EXT LT',size=3.5)+text(109,43,'APU',size=3.5)+text(152,43,'INT LT',size=3.5)
    for x,label in [(14,'STROBE'),(38,'BEACON'),(63,'WING'),(85,'NAV')]:html+=toggle(x,58,label)
    for x,label in [(14,'LAND L'),(38,'LAND R'),(63,'NOSE'),(85,'RWY')]:html+=toggle(x,82,label)
    html+=push(108,55,'MASTER SW','ON')+push(108,79,'START','AVAIL','greenlit')
    html+=knob(135,54,'OVHD INTEG',-25,'DIM BRT')+knob(170,54,'DOME',-20,'DIM BRT')
    for x,label in [(143,'SEAT BELTS'),(169,'NO SMOKING'),(198,'EMER EXIT')]:html+=toggle(x,82,label)
    return html


def a350():
    # Source crop: x=60..492, y=18..760. Central occupied area begins at y≈294.
    w,h=432,742;c=104;cw=226;r=332
    parts=[plate('Upper left blank',0,0,102,99,blank=True),plate('Upper center blank',c,0,cw,99,'<i class="speaker" style="left:13px;top:65px;width:22px;height:22px"></i>',blank=True),plate('Cockpit door control',r,0,100,99,text(24,74,'CKPT DOOR CTL',size=3)+circle(64,87),blank=True)]
    parts += [plate('Left reset bank',0,100,102,111,reset_bank(102,111,4)),plate('Right reset bank',r,100,100,111,reset_bank(100,111,4))]
    maint=text(177,3,'GND COOLG',size=3)+push(13,35,'OXYGEN','FAULT')+push(34,35,'NSS','OFF')+push(58,35,'ELEC','OFF')+knob(85,31,'BAT',0,'OFF ON')+display(112,32,'28.0')+push(150,10,'CARGO','OFF')+push(170,10,'GND','OFF')+knob(195,7,'',0,'OFF ON')
    maint+=''.join(push(x,68,label,'OFF') for x,label in [(12,'ENG'),(54,'APU'),(93,'FUEL')])+push(197,38,'TOWING','ON')
    parts += [plate('Maintenance and ground servicing',c,100,cw,99,maint),plate('Center lamp and blank',c,200,cw,93,'<div class="lamp" style="left:96px;top:34px"></div>',blank=True)]
    pwr=''.join(circle(10+i*13,18,label) for i,label in enumerate(['A','B','C','D','E','F']))+text(16,4,'CKPT EQPT POWER SUPPLY',size=3)
    parts += [plate('Left equipment power supply',0,212,102,34,pwr),plate('Right equipment power supply',r,212,100,34,pwr)]
    cabin=text(11,5,'CABIN',size=3.5)+push(56,35,'FWD','OFF')+push(76,35,'EMER','OFF')+push(14,56,'ENTERTAIN','OFF')+push(39,56,'SATCOM','OFF')+push(68,56,'LAV','OFF')
    parts += [plate('Cabin controls with blank upper area',0,247,102,78,cabin),plate('ADIRS',0,326,102,106,side_adirs(102,106,'a350'))]
    parts += [plate('Left flight controls',0,433,102,41,side_flt(102,41,['PRIM 1','SEC 1','SEC 3'])),plate('Emergency electrical power',0,475,102,58,text(27,4,'EMER ELEC PWR',size=3)+guard(16,26,'RAT')+guard(70,26,'EMER GEN'))]
    parts += [plate('Audio and evacuation',0,534,102,67,text(33,4,'ACMS',size=3)+knob(44,14,'',0,'',True)+push(10,41,'COMMS','OFF')+guard(71,41,'EVAC')),plate('Calls',0,602,102,55,side_calls(102,55)),plate('Left wiper',0,658,102,84,side_wiper(102,84))]
    parts += [plate('CVR recorder and blank upper area',r,247,100,70,text(23,40,'CVR',size=3)+knob(44,47,'',0,'',True)+circle(80,48,'TEST'))]
    rmid=text(9,5,'GND CTL',size=3)+push(11,23,'COM','OFF')+push(29,23,'DATA','OFF')+push(11,52,'GND PWR','OFF')+push(30,52,'SERV','OFF')
    parts += [plate('Ground and data controls',r,318,100,88,rmid),plate('Right flight controls',r,407,100,47,side_flt(100,47,['PRIM 2','PRIM 3','SEC 2'])),plate('Cargo air conditioning',r,455,100,78,side_cargo(100,78)),plate('Cargo smoke',r,534,100,54,side_smoke(100,54)),plate('Ventilation',r,589,100,68,text(26,5,'VENTILATION',size=3)+push(12,23,'EXTRACT','OFF')+push(46,23,'CAB FANS','OFF')+push(12,49,'BULK','OFF')),plate('Right wiper',r,658,100,84,side_wiper(100,84))]
    parts += [plate('Engine and APU fire',c,294,cw,67,fire_section(cw,67,2,True),title='FIRE'),plate('Hydraulics',c,362,cw,43,hydraulics_350(cw,43),title='HYD'),plate('Fuel',c,406,cw,80,fuel_350(cw,80),title='FUEL'),plate('Electrical',c,487,cw,78,electrical_350(cw,78),title='ELEC'),plate('Air conditioning',c,566,cw,84,air_section(cw,84,'a350'),title='AIR'),plate('Anti ice lights and APU',c,651,cw,91,lower_section(cw,91,'a350'))]
    return w,h,parts,'Reference geometry follows the supplied full A350 panel image. The upper blank plates and offset servicing controls are intentional.'


def a380():
    # Supplied image is cropped at the top. Preserve that crop instead of inventing an upper bay.
    w,h=432,650;c=103;cw=227;r=332
    parts=[plate('Left reset bank',0,0,101,140,reset_bank(101,140,6)),plate('Right reset bank',r,0,100,145,reset_bank(100,145,6))]
    top=push(10,28,'ENG FADEC','OFF')+push(28,28,'','OFF')+push(46,28,'','OFF')+push(64,28,'','OFF')+push(108,28,'ELEC','OFF')+push(145,28,'NSS','FAULT','amber')+push(181,28,'AIR COND','OFF')
    top+=knob(168,1,'BAT',0,'OFF ON')
    parts += [plate('Maintenance upper crop',c,0,cw,62,top),plate('Center lamp blank',c,63,cw,90,'<i class="speaker" style="left:13px;top:10px;width:22px;height:22px"></i><div class="lamp" style="left:91px;top:50px"></div>',blank=True)]
    parts += [plate('Engine fire',c,154,cw,70,fire_section(cw,70,4,lit=True),title='FIRE'),plate('Hydraulics',c,225,cw,54,hydraulics_380(cw,54),title='HYD'),plate('Fuel',c,280,cw,121,fuel_380(cw,121),title='FUEL'),plate('Electrical',c,402,cw,96,electrical_380(cw,96),title='ELEC'),plate('Air conditioning',c,499,cw,83,air_section(cw,83,'a380'),title='AIR')]
    lower=text(11,2,'ANTI ICE',size=3)+text(114,2,'ENG START',size=3)+text(177,2,'CABIN PRESS',size=3)
    for x,label in [(13,'WING'),(35,'1'),(56,'2'),(76,'3'),(96,'4')]:lower+=push(x,11,label,'ON','cyan')
    lower+=knob(123,9,'',0,'NORM IGN START')+knob(184,9,'LDG ELEV',0,'AUTO')+guard(211,11,'DITCHING')
    for x,label in [(14,'STROBE'),(38,'BEACON'),(62,'WING'),(85,'NAV'),(139,'SEAT BELTS'),(163,'NO SMOKE'),(200,'EMER LT')]:lower+=toggle(x,41,label)
    for x,label in [(14,'LAND L'),(38,'LAND R'),(62,'NOSE'),(85,'RWY')]:lower+=toggle(x,55,label)
    lower+=push(110,35,'APU','ON')+push(110,51,'START','AVAIL','greenlit')
    parts += [plate('Anti ice start lighting',c,583,cw,67,lower)]
    parts += [plate('ELT and oxygen',0,141,101,35,text(11,4,'ELT',size=3)+circle(14,17)+guard(66,15,'PASS OXY')),plate('APU fire',0,177,101,54,control('fire test',14,15,'APU')+push(68,26,'AGENT','SQUIB','amber'))]
    parts += [plate('ADIRS',0,232,101,93,side_adirs(101,93,'a380')),plate('Flight controls left',0,326,101,40,side_flt(101,40,['PRIM 1','SEC 1','PRIM 3'])),plate('Fuel jettison',0,367,101,46,text(23,3,'FUEL JETTISON',size=3)+guard(12,21,'ARM')+guard(41,21,'L NOZZLE')+guard(70,21,'R NOZZLE')),plate('Emergency electrical power',0,414,101,49,text(23,3,'EMER ELEC PWR',size=3)+guard(20,25,'MAN ON')+guard(67,25,'GEN')),plate('Oxygen',0,464,101,50,side_oxygen(101,50)),plate('Calls',0,515,101,52,side_calls(101,52)),plate('Left wiper',0,568,101,78,side_wiper(101,78))]
    parts += [plate('Recorder with blank region',r,146,100,63,text(14,32,'CVR',size=3)+knob(18,43,'',0,'',True)+circle(72,44,'ERASE')),plate('Audio management',r,210,100,132,audio_panel(100,132,True)),plate('Flight controls right',r,343,100,44,side_flt(100,44,['PRIM 2','SEC 2','SEC 3'])),plate('Cargo air conditioning',r,388,100,81,side_cargo(100,81)),plate('Cargo smoke',r,470,100,55,side_smoke(100,55)),plate('Ventilation',r,526,100,46,text(25,3,'VENTILATION',size=3)+push(10,20,'EXTRACT','OFF')+push(35,20,'CAB FANS','OFF')+push(61,20,'BULK','OFF')),plate('Engine manual start',r,573,100,31,text(18,2,'ENGINE MAN START',size=3)+''.join(push(x,14,str(n),'ON') for x,n in [(10,1),(28,2),(46,3),(64,4)])),plate('Right wiper',r,605,100,41,side_wiper(100,41))]
    return w,h,parts,'The study preserves the top crop of the supplied A380 photograph. Compact center groups and the gap between left and right fuel controls are intentional.'


def a330():
    # Rectified forward panel study; do not add the unseen A350-style upper reset bays.
    w,h=432,524;c=91;cw=244;r=337
    parts=[plate('Visible upper center blank',c,0,cw,44,'<i class="speaker" style="left:61px;top:4px;width:33px;height:33px"></i>',blank=True),plate('Engine fire',c,45,cw,69,fire_section(cw,69,2),title='FIRE'),plate('Hydraulics',c,115,cw,68,hydraulics_330(cw,68),title='HYD'),plate('Fuel',c,184,cw,96,fuel_330(cw,96),title='FUEL'),plate('Electrical',c,281,cw,96,electrical_330(cw,96),title='ELEC'),plate('Air conditioning',c,378,cw,84,air_section(cw,84,'a330'),title='AIR')]
    # The photograph has a shallow lower strip, not another full-height system stack.
    lower=''
    for x,label in [(11,'STROBE'),(30,'BEACON'),(50,'WING'),(71,'NAV'),(137,'SEAT BELTS'),(161,'NO SMOKE'),(204,'EMER LT')]:lower+=toggle(x,12,label)
    lower+=push(99,9,'APU','ON','greenlit')+push(115,9,'START','AVAIL','greenlit')+knob(179,7,'DOME',0,'DIM BRT')
    pressure=push(13,12,'WING','ON')+push(35,12,'ENG 1','ON')+push(57,12,'ENG 2','ON')+push(87,12,'PROBE HEAT','ON')+knob(133,9,'CABIN PRESS',0,'AUTO MAN',True)+knob(178,9,'LDG ELEV',0,'AUTO')+guard(225,10,'DITCHING')
    parts += [plate('Anti ice and cabin pressure',c,463,cw,34,pressure),plate('Lighting and APU strip',c,498,cw,26,lower)]
    parts += [plate('Left upper crop',0,0,89,108,knob(40,61,'ADIRS',0,'OFF NAV ATT'),blank=True),plate('APU fire',0,109,89,57,control('fire',16,15,'APU')+push(65,29,'AGENT','SQUIB')),plate('Flight controls left',0,167,89,43,side_flt(89,43,['PRIM 1','SEC 1','SEC 3'])),plate('Fuel jettison',0,211,89,42,text(19,4,'FUEL JETTISON',size=3)+guard(10,22,'ARM')+guard(35,22,'L NOZZLE')+guard(60,22,'R NOZZLE')),plate('Evacuation',0,254,89,36,text(26,3,'EVAC',size=3)+guard(15,12,'COMMAND')+circle(50,18,'HORN SHUT OFF')),plate('GPWS',0,291,89,39,text(27,4,'GPWS',size=3)+''.join(push(x,21,l,'OFF') for x,l in [(8,'TERR'),(26,'SYS'),(44,'G/S'),(62,'FLAP')])),plate('Emergency electrical power',0,331,89,42,text(16,3,'EMER ELEC PWR',size=3)+guard(14,16,'MAN ON')+push(45,22,'GEN TEST','OFF')),plate('Oxygen',0,374,89,42,side_oxygen(89,42)),plate('Calls',0,417,89,42,side_calls(89,42)),plate('Left wiper',0,460,89,32,knob(20,9,'WIPER',-20,'OFF SLOW FAST')+circle(65,10,'RAIN RPLNT',True))]
    parts += [plate('Recorder upper crop',r,0,95,52,circle(22,20,'TEST')+circle(59,20,'ERASE'),blank=True),plate('Audio control',r,53,95,142,audio_panel(95,142)),plate('Flight controls right',r,196,95,47,side_flt(95,47,['PRIM 2','SEC 2','PRIM 3'])),plate('Cargo air conditioning',r,244,95,90,side_cargo(95,90)),plate('Cargo smoke',r,335,95,56,side_smoke(95,56)),plate('Ventilation',r,392,95,40,text(24,4,'VENTILATION',size=3)+push(12,22,'EXTRACT','OFF')+push(52,22,'CAB FANS','OFF')),plate('Engine manual start',r,433,95,29,text(17,2,'ENG MAN START',size=3)+push(21,13,'1','ON')+push(52,13,'2','ON')),plate('Right wiper',r,463,95,29,knob(20,8,'WIPER',-20,'OFF SLOW FAST')+circle(65,10,'RAIN RPLNT',True))]
    return w,h,parts,'Rectified study of the visible forward A330 panel. The reference is an oblique partial photograph; unseen upper bays are deliberately omitted.'


def build(model, layout):
    w,h,parts,note=layout()
    h += 4  # Lower frame lip: no switch or its shadow should terminate at the clip edge.
    scale=2
    html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{model.upper()} overhead static visual study</title>
<style>{CSS}</style></head><body>
<main class="study"><header>{model.upper()} / OVERHEAD PANEL · STATIC REFERENCE STUDY</header>
<div class="stage" style="width:{w*scale}px;height:{h*scale}px"><div class="panel {model}" style="width:{w}px;height:{h}px;transform:scale({scale})" role="img" aria-label="{model.upper()} overhead panel reconstruction">
{''.join(parts)}
</div></div><p class="review-note">{escape(note)}</p></main></body></html>
'''
    (ROOT/'previews'/f'{model}-overhead-static.html').write_text(html)


if __name__=='__main__':
    for model, layout in [('a330',a330),('a350',a350),('a380',a380)]:
        build(model,layout)
