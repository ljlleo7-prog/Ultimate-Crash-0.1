"""Build the 747 static overhead study from one explicit coordinate model.

Controls and diagram routes share the same geometry.  A route endpoint names a
control and a physical edge, so moving the control also moves the endpoint.
"""
from dataclasses import dataclass
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "previews/747-overhead-static.html"

SIZES = {
    "push": (17, 19), "rotary": (19, 19), "toggle": (11, 16),
    "round": (10, 10), "fire": (31, 45), "apu-fire": (40, 18), "guard": (17, 22),
}


@dataclass(frozen=True)
class Hardware:
    kind: str
    x: float
    y: float
    w: float
    h: float


class Plate:
    def __init__(self, name, x, y, w, h, title=""):
        self.name, self.x, self.y, self.w, self.h = name, x, y, w, h
        self.title = name if title is None else title
        self.items, self.controls, self.routes = [], {}, []

    def text(self, x, y, value, cls="", w=None):
        width = f"width:{w}px;" if w else ""
        self.items.append(f'<span class="txt {cls}" style="left:{x}px;top:{y}px;{width}">{escape(value)}</span>')

    def control(self, ident, kind, x, y, label="", legend="", angle=0, cls=""):
        w, h = SIZES[kind]
        if ident in self.controls:
            raise ValueError(f"duplicate control {ident}")
        if x < 0 or y < 0 or x + w > self.w or y + h > self.h:
            raise ValueError(f"{self.name}/{ident} outside plate")
        self.controls[ident] = Hardware(kind, x, y, w, h)
        inside = f'<span class="cap">{escape(label)}</span>' if label else ""
        if kind == "push":
            inside += f'<i>{escape(legend or "OFF")}</i>'
        elif kind == "fire":
            inside += f'<b>{escape(legend)}</b><em>DISCH<br>A↔B</em>'
        elif kind == "apu-fire":
            inside += '<b>APU</b><em>PULL · TURN</em>'
        elif kind == "guard":
            inside += '<i></i><em>ARM · DISCH</em>'
        self.items.append(
            f'<span id="{ident}" data-control-id="{ident}" data-hardware="{kind}" '
            f'class="ctl {kind} {cls}" aria-label="{escape(label or ident)}" '
            f'style="left:{x}px;top:{y}px;--angle:{angle}deg">{inside}</span>'
        )
        return ident

    def port(self, ident, side):
        c = self.controls[ident]
        ports = {
            "top": (c.x + c.w / 2, c.y), "bottom": (c.x + c.w / 2, c.y + c.h),
            "left": (c.x, c.y + c.h / 2), "right": (c.x + c.w, c.y + c.h / 2),
            "center": (c.x + c.w / 2, c.y + c.h / 2),
        }
        return ports[side]

    def wire(self, start, end, via=(), cls="white"):
        a, b = self.port(*start), self.port(*end)
        points = (a,) + tuple(via) + (b,)
        coords = " ".join(f"{x:g},{y:g}" for x, y in points)
        self.routes.append(
            f'<polyline class="{cls}" data-from="{start[0]}:{start[1]}" '
            f'data-to="{end[0]}:{end[1]}" points="{coords}"/>'
        )

    def bus(self, points, cls="white"):
        coords = " ".join(f"{x:g},{y:g}" for x, y in points)
        self.routes.append(f'<polyline class="{cls}" points="{coords}"/>')

    def stub(self, start, points, cls="white"):
        """Draw a branch whose first point is locked to a control port."""
        a = self.port(*start)
        coords = " ".join(f"{x:g},{y:g}" for x, y in (a,) + tuple(points))
        self.routes.append(
            f'<polyline class="{cls}" data-from="{start[0]}:{start[1]}" points="{coords}"/>'
        )

    def render(self):
        svg = ""
        if self.routes:
            svg = (f'<svg class="routes" style="width:{self.w}px;height:{self.h}px" '
                   f'viewBox="0 0 {self.w} {self.h}" preserveAspectRatio="none" aria-hidden="true">'
                   f'{"".join(self.routes)}</svg>')
        screws = ''.join(f'<i class="screw {p}"></i>' for p in ("tl", "tr", "bl", "br"))
        return (f'<section data-plate="{escape(self.name)}" aria-label="{escape(self.name)}" '
                f'style="left:{self.x}px;top:{self.y}px;width:{self.w}px;height:{self.h}px">'
                f'{screws}<h2>{escape(self.title)}</h2>{svg}{"".join(self.items)}</section>')


def push_row(p, prefix, xs, y, labels, legend="OFF"):
    for n, (x, label) in enumerate(zip(xs, labels), 1):
        p.control(f"{prefix}{n}", "push", x, y, label, legend)


plates = []

# Left column. The large empty upper bay is deliberate and matches the source.
p = Plate("EMERGENCY / SIGNS", 0, 0, 158, 75, "")
p.control("emer_lights", "toggle", 111, 51, "EMER LIGHTS", angle=0)
p.text(108, 39, "OFF   ARMED   ON", "micro", 44)
plates.append(p)

p = Plate("ELECTRONIC ENGINE CONTROL", 0, 76, 158, 44, "ELEC ENG CONTROL")
push_row(p, "eec", [45, 70, 95, 120], 17, ["1", "2", "3", "4"], "NORM\nALTN")
plates.append(p)

p = Plate("INERTIAL REFERENCE", 0, 121, 158, 35, "IRS")
for i, (x, lab) in enumerate([(19, "L"), (67, "C"), (116, "R")], 1):
    p.control(f"irs{i}", "rotary", x, 12, lab, angle=-38 if i == 2 else 35)
    p.text(x - 5, 7, "OFF  ALIGN  NAV  ATT", "arc", 30)
plates.append(p)

p = Plate("ELECTRICAL", 0, 157, 158, 152, "ELEC")
p.control("standby", "rotary", 17, 24, "STANDBY POWER", angle=-25)
p.control("utility_l", "push", 59, 20, "UTILITY L", "ON\nOFF")
p.control("utility_r", "push", 88, 20, "UTILITY R", "ON\nOFF")
p.control("apu_sel", "rotary", 124, 24, "APU", angle=28)
push_row(p, "source", [16, 47, 78, 109, 140], 54,
         ["EXT PWR 1", "APU GEN 1", "BATTERY", "APU GEN 2", "EXT PWR 2"], "ON")
push_row(p, "bustie", [16, 47, 109, 140], 84,
         ["BUS TIE 1", "BUS TIE 2", "BUS TIE 3", "BUS TIE 4"], "AUTO\nISLN")
push_row(p, "gencont", [16, 47, 78, 109, 140], 112,
         ["GEN CONT 1", "GEN CONT 2", "BUS TIE", "GEN CONT 3", "GEN CONT 4"], "ON\nOFF")
push_row(p, "drive", [19, 53, 87, 121], 132, ["DRIVE 1", "DRIVE 2", "DRIVE 3", "DRIVE 4"], "DRIVE")
# Electrical single-line: every vertical end is computed from a switch port.
for ident in ["source1", "source2", "source4", "source5"]:
    x, _ = p.port(ident, "bottom"); p.stub((ident, "bottom"), ((x, 81),), "white")
for ident in ["bustie1", "bustie2", "bustie3", "bustie4"]:
    x, _ = p.port(ident, "top"); p.stub((ident, "top"), ((x, 81),), "white")
p.bus([(24.5, 81), (148.5, 81)], "white")
plates.append(p)

p = Plate("HYDRAULICS", 0, 310, 158, 96, "HYD")
for i, x in enumerate([17, 53, 89, 125], 1):
    p.control(f"dem{i}", "rotary", x, 39, f"DEMAND {i}", angle=-26)
    p.control(f"engpump{i}", "push", x + 1, 70, f"ENGINE {i}", "ON\nPRESS")
    p.control(f"hydfault{i}", "push", x + 1, 12, "", "SYS\nFAULT", cls="amber")
plates.append(p)

p = Plate("LEFT LIGHTING", 0, 407, 158, 37, "")
for i, (x, lab) in enumerate([(19, "STORM"), (53, "CKT BKR"), (88, "GLARESHIELD"), (125, "DOME")], 1):
    p.control(f"llight{i}", "toggle", x, 13, lab, angle=-18 if i == 1 else 0)
plates.append(p)

# Center column.
p = Plate("AUDIO / SERVICE", 160, 0, 205, 75, "")
p.control("fire_test", "round", 18, 44, "FIRE/OVHT TEST")
p.control("cargo_test", "round", 18, 61, "CARGO")
p.control("capt_audio", "rotary", 93, 17, "CAPT AUDIO SYSTEM", angle=0)
p.control("obs_audio", "rotary", 93, 47, "OBS AUDIO SYSTEM", angle=0)
p.control("serv_int", "round", 124, 46, "INTERPHONE SERV")
p.control("cargo_cabin", "round", 144, 46, "CARGO/CABIN")
p.control("fuel_xfer_main", "push", 174, 39, "FUEL XFER MAIN 1 & 4", "ON")
plates.append(p)

p = Plate("ENGINE / APU FIRE PROTECTION", 160, 76, 205, 122, "")
for i, x in enumerate([21, 68, 115, 162], 1):
    p.control(f"fire{i}", "fire", x, 18, f"ENG {i}", str(i))
    p.control(f"bottle{i}a", "push", x, 67, f"BTL {i} A", "DISCH")
    p.control(f"bottle{i}b", "push", x + 17, 67, f"BTL {i} B", "DISCH")
p.control("apu_fire", "apu-fire", 55, 97, "APU", "APU")
p.control("cargo_fwd", "guard", 123, 94, "FWD")
p.control("cargo_aft", "guard", 146, 94, "AFT")
p.control("cargo_disch", "guard", 177, 94, "CARGO DISCH")
plates.append(p)

p = Plate("ENGINE START / FUEL JETTISON", 160, 199, 205, 60, "")
for i, x in enumerate([13, 51, 89, 127], 1):
    p.control(f"start{i}", "rotary", x, 18, f"START {i}", angle=-20)
p.control("ignition", "rotary", 51, 37, "IGNITION", angle=-25)
p.control("cont_ign", "push", 88, 39, "CONT IGN", "ON")
p.control("autostart", "push", 121, 39, "AUTOSTART", "ON")
p.control("l_nozzle", "push", 155, 39, "L NOZZLE", "VALVE")
p.control("r_nozzle", "push", 182, 39, "R NOZZLE", "VALVE")
p.control("jettison", "rotary", 173, 16, "JETTISON", angle=0)
plates.append(p)

p = Plate("FUEL", 160, 260, 205, 83, "FUEL")
for i, x in enumerate([18, 63, 127, 172], 1):
    p.control(f"xfeed{i}", "push", x, 22, f"X FEED {i}", "ON\nVALVE")
for ident, x, label in [("main1", 7, "MAIN 1"), ("ovrd1", 31, "OVRD 2"),
                        ("main2", 55, "MAIN 2"), ("ctr_l", 84, "CTR L"),
                        ("ctr_r", 107, "CTR R"), ("main3", 133, "MAIN 3"),
                        ("ovrd4", 157, "OVRD 3"), ("main4", 181, "MAIN 4")]:
    p.control(ident, "push", x, 57, label, "ON\nPRESS")
# Four vertical feed lines terminate at exact switch centers. Lower pump branches
# meet them through separate junctions, leaving the photographed center gap.
for n in range(1, 5):
    top = f"xfeed{n}"; tx, ty = p.port(top, "bottom")
    p.stub((top, "bottom"), ((tx, 52),), "white")
for top, lower in [("xfeed1", "main1"), ("xfeed1", "ovrd1"), ("xfeed2", "main2"),
                   ("xfeed2", "ctr_l"), ("xfeed3", "ctr_r"), ("xfeed3", "main3"),
                   ("xfeed4", "ovrd4"), ("xfeed4", "main4")]:
    tx, _ = p.port(top, "bottom"); bx, by = p.port(lower, "top")
    p.stub((lower, "top"), ((bx, 52), (tx, 52)), "white")
p.wire(("xfeed1", "right"), ("xfeed2", "left"), cls="white")
p.wire(("xfeed3", "right"), ("xfeed4", "left"), cls="white")
plates.append(p)

p = Plate("ANTI-ICE / RAIN / WINDOW HEAT", 160, 344, 205, 59, "")
for i, (x, lab) in enumerate([(9, "NACELLE 1"), (48, "NACELLE 2"), (108, "NACELLE 3"), (147, "NACELLE 4")], 1):
    p.control(f"nacelle{i}", "toggle", x, 18, lab, angle=0)
p.control("wing_ai", "toggle", 40, 39, "WING ANTI-ICE", angle=0)
p.control("l_wiper", "rotary", 77, 32, "L WIPER", angle=-20)
p.control("washer", "toggle", 110, 36, "WASHER", angle=0)
p.control("r_wiper", "rotary", 181, 32, "R WIPER", angle=-20)
p.control("win_l", "push", 130, 37, "WINDOW L", "ON")
p.control("win_r", "push", 154, 37, "WINDOW R", "ON")
plates.append(p)

p = Plate("LANDING LIGHTS", 160, 404, 205, 40, "")
for i, (x, lab) in enumerate([(18, "AISLE/STAND"), (50, "OUTBD"), (73, "LANDING"),
                              (99, "INBD"), (129, "RWY OFF"), (154, "TURNOFF"), (180, "TAXI")], 1):
    p.control(f"clight{i}", "toggle", x, 17, lab, angle=0)
plates.append(p)

# Right column, including its intentionally empty upper bay.
p = Plate("RIGHT BLANK BAY", 367, 0, 159, 75, "")
plates.append(p)

p = Plate("MAIN DECK SIGNALLING", 367, 76, 159, 31, "MAIN DECK SIGNALLING")
p.control("main_deck", "push", 71, 11, "MAIN DECK", "ON")
plates.append(p)

p = Plate("OXYGEN / YAW DAMPER / RECORDER", 367, 108, 159, 47, "")
p.control("supp_oxy", "guard", 27, 19, "SUPPN OXY RESET")
p.control("yaw_upper", "push", 67, 19, "YAW DAMPER UPPER", "ON")
p.control("yaw_lower", "push", 95, 19, "LOWER", "ON")
p.control("voice_rec", "round", 132, 21, "VOICE RECORDER")
plates.append(p)

p = Plate("CABIN PRESSURIZATION", 367, 156, 159, 58, "CABIN ALTITUDE CONTROL")
p.control("ldg_alt", "rotary", 18, 23, "LDG ALT", angle=-42)
p.control("outflow_l", "rotary", 55, 23, "OUTFLOW L", angle=-28)
p.control("outflow_r", "rotary", 91, 23, "OUTFLOW R", angle=-28)
p.control("cab_auto", "rotary", 130, 23, "AUTO SELECT", angle=0)
p.text(17, 47, "CAB 0 FT", "display", 35)
p.text(111, 47, "ΔP 0.0", "display", 35)
plates.append(p)

p = Plate("AIR CONDITIONING", 367, 215, 159, 94, "AIR CONDITIONING")
p.control("flt_deck_fan", "push", 13, 22, "FLT DECK FAN", "ON")
p.control("flt_temp", "rotary", 52, 20, "FLT DECK TEMP", angle=0)
p.control("fwd_temp", "rotary", 91, 20, "FWD CABIN", angle=0)
p.control("aft_temp", "rotary", 129, 20, "AFT CABIN", angle=0)
p.control("zone_rst", "push", 13, 52, "ZONE RST", "SYS\nFAULT", cls="amber")
p.control("trim_air", "push", 52, 52, "TRIM AIR", "ON")
p.control("lower_fwd", "rotary", 91, 50, "LOWER FWD", angle=0)
p.control("lower_aft", "rotary", 129, 50, "LOWER AFT", angle=0)
p.control("equip_cool", "rotary", 13, 73, "EQUIP COOLING", angle=0)
p.control("hi_flow", "push", 52, 74, "HI FLOW", "ON")
p.control("pack_rst", "push", 91, 74, "PACK RST", "SYS\nFAULT", cls="amber")
p.control("cargo_ht", "push", 129, 74, "AFT CARGO HT", "ON\nTEMP")
plates.append(p)

p = Plate("PACKS / BLEED AIR", 367, 310, 159, 94, "PACKS / BLEED AIR")
for i, x in enumerate([18, 71, 124], 1):
    p.control(f"pack{i}", "rotary", x, 20, f"PACK {i}", angle=-25)
p.control("isln_l", "push", 43, 43, "L ISLN", "VALVE")
p.control("apu_bleed", "push", 71, 64, "APU", "VALVE")
p.control("isln_r", "push", 98, 43, "R ISLN", "VALVE")
for i, x in enumerate([11, 42, 99, 130], 1):
    p.control(f"bleed{i}", "push", x, 73, f"ENG {i}", "ON")
# Manifold endpoints come from switch edges; pack branches meet knob centers.
p.wire(("isln_l", "right"), ("isln_r", "left"), via=((79.5, 52.5),), cls="white")
for ident in ["pack1", "pack2", "pack3"]:
    x, _ = p.port(ident, "bottom"); p.stub((ident, "bottom"), ((x, 52.5),), "white")
for ident in ["bleed1", "bleed2", "apu_bleed", "bleed3", "bleed4"]:
    x, _ = p.port(ident, "top"); p.stub((ident, "top"), ((x, 60), (79.5, 60), (79.5, 52.5)), "white")
plates.append(p)

p = Plate("EXTERIOR LIGHTING", 367, 405, 159, 39, "")
for i, (x, lab) in enumerate([(12, "BEACON"), (38, "NAV"), (64, "STROBE"),
                              (89, "WING"), (115, "LOGO"), (141, "IND LTS")], 1):
    p.control(f"rlight{i}", "toggle", x, 14, lab, angle=0)
plates.append(p)


CSS = r"""
*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;background:radial-gradient(ellipse at 50% 15%,#354047,#151c20 72%);font-family:Arial,sans-serif;color:#f4ecd8}
.study{width:max-content;margin:26px auto 42px}.study>p{font-size:10px;letter-spacing:2.5px;color:#b2bec4;margin:0 0 16px}
.stage{position:relative;width:1052px;height:888px;filter:drop-shadow(0 18px 25px #0008)}
.panel{position:absolute;left:0;top:0;width:526px;height:444px;transform:scale(2);transform-origin:0 0;background:#b99161;border:4px ridge #57584f;box-shadow:inset 0 0 0 1px #d6bb8e;color:#fff8e6;overflow:hidden}
section{position:absolute;background:linear-gradient(108deg,#c49e6d,#bb9363 70%,#b28656);border:.7px solid #6f604c;box-shadow:inset 0 .7px 1px #e2c598aa,.7px 1px 1px #544631;overflow:visible}
section h2{position:absolute;z-index:3;left:4px;right:4px;top:3px;margin:0;text-align:center;font-size:4.1px;line-height:1;letter-spacing:.35px;font-weight:normal}
.screw{position:absolute;z-index:5;width:6px;height:6px;border-radius:50%;border:.45px solid #69593f;background:linear-gradient(135deg,#7e694a 0 40%,#dfc89d 42% 51%,#68563d 53% 63%,#bda075 65%);box-shadow:0 0 0 .3px #5e513f}.screw.tl{left:1px;top:1px}.screw.tr{right:1px;top:1px}.screw.bl{left:1px;bottom:1px}.screw.br{right:1px;bottom:1px}
.txt{position:absolute;z-index:3;text-align:center;white-space:pre-line;font-size:3.4px;line-height:1.08}.txt.micro{font-size:2.8px}.txt.arc{font-size:2.5px;letter-spacing:.1px}.txt.display{font:4.2px 'Courier New',monospace;color:#eaf1d1;background:#273322;border:.5px solid #e6dec4;padding:1px}
.ctl{position:absolute;display:block;z-index:3}.ctl .cap{position:absolute;bottom:calc(100% + 1.5px);left:50%;transform:translateX(-50%);font:3px/1 Arial,sans-serif;white-space:pre;text-align:center;color:#fff7e2}.push{width:17px;height:19px;border:.8px solid #eee1c2;background:linear-gradient(110deg,#24302b,#0d1614);box-shadow:0 0 0 .8px #816d50,1px 1.5px 1px #665238}.push:before{content:'';position:absolute;inset:2px;border:.35px solid #60624e}.push i{position:absolute;left:2px;right:2px;top:4px;bottom:3px;display:flex;align-items:center;justify-content:center;text-align:center;font:2.7px/1.05 Arial,sans-serif;color:#d9c45c;font-style:normal;white-space:pre-line}.push.amber i{color:#e2c34e}
.rotary{width:19px;height:19px;border-radius:50%;border:.6px solid #9a8e75;background:repeating-conic-gradient(#ded8c0 0 9deg,#aaa995 10deg 12deg);box-shadow:1px 1.4px 1.4px #735e43}.rotary:after{content:'';position:absolute;left:7px;top:0;width:5px;height:18px;border:.4px solid #9a9c89;border-radius:2px;background:linear-gradient(90deg,#93998b,#f0efda,#a1a596);transform:rotate(var(--angle));box-shadow:.5px .8px .7px #77735f}
.toggle{width:11px;height:16px;border-radius:50%;background:radial-gradient(#172020 35%,#d5d8c6 38% 48%,#65695e 52% 59%,#dddcc8 62%);border:.4px solid #847861}.toggle:after{content:'';position:absolute;width:3.7px;height:15px;left:3.2px;top:-3px;border:.35px solid #898f83;border-radius:2px;background:linear-gradient(90deg,#7c837b,#f1f2e2,#89938a);transform:rotate(var(--angle));transform-origin:50% 80%;box-shadow:.5px 1px 1px #5e5542}
.round{width:10px;height:10px;border-radius:50%;background:radial-gradient(#121b19 38%,#bfc4b6 42% 49%,#3b4640 53% 62%,#d3d3bf 65%);border:.4px solid #796c55}
.fire{width:31px;height:45px;border:1.2px solid #474a3f;border-radius:2px;background:linear-gradient(90deg,#131a17,#30392e,#121a16);box-shadow:1px 1.5px 1px #70583d;color:#eb3c33;text-align:center}.fire b{display:block;font:14px/42px Arial}.fire em{position:absolute;top:-10px;left:0;right:0;color:#fff7e2;font:2.8px/1 Arial;font-style:normal}.fire .cap{display:none}
.apu-fire{width:40px;height:18px;border:1.2px solid #474a3f;border-radius:2px;background:linear-gradient(#111916,#30392e,#121a16);box-shadow:1px 1.5px 1px #70583d;color:#eb3c33;text-align:center}.apu-fire b{display:block;font:8px/16px Arial}.apu-fire em{position:absolute;left:0;right:0;top:calc(100% + 1px);font:2.3px Arial;font-style:normal;color:#fff7e2}
.guard{width:17px;height:22px;background:#242d28;border:.7px solid #6e5c45;box-shadow:1px 1px 1px #685139}.guard:before{content:'';position:absolute;left:2px;right:2px;top:-2px;height:19px;border:1px solid #9c2820;background:linear-gradient(90deg,#7e1f18aa,#da4030aa,#7a1a14aa);transform:perspective(15px) rotateX(-12deg);transform-origin:bottom}.guard i{position:absolute;left:7px;bottom:1px;width:3px;height:12px;background:linear-gradient(90deg,#777e74,#e6e8d5,#818b80)}.guard em{position:absolute;top:calc(100% + 1px);left:50%;transform:translateX(-50%);font:2.3px Arial;font-style:normal;white-space:nowrap}.guard .cap{bottom:calc(100% + 3px)}
.routes{position:absolute;left:0;top:0;z-index:1;overflow:visible}.routes polyline{fill:none;stroke:#f4edda;stroke-width:1.2;stroke-linecap:square;stroke-linejoin:miter}.routes .yellow{stroke:#ddcd55}
.note{width:900px;color:#9eafb8;font-size:11px;line-height:1.45;margin:16px 0 0}
"""

html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>747 overhead — static study</title><style>{CSS}</style></head>
<body><main class="study"><p>747 / OVERHEAD PANEL · STATIC VISUAL STUDY</p>
<div class="stage"><div class="panel" aria-label="Boeing 747-400 overhead panel">{''.join(p.render() for p in plates)}</div></div>
<p class="note">Explicit-coordinate visual study. Blank bays follow the supplied panel image. Electrical, fuel and pneumatic routes use the same control geometry as the hardware, so their endpoints stay attached when a control moves.</p>
</main></body></html>"""

OUT.write_text(html, encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)} ({len(plates)} plates, {sum(len(p.controls) for p in plates)} controls)")
