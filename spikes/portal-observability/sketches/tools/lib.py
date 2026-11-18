"""Shared pieces for the portal-observability sketches.

Model data is read from examples/acme/generated/model/model.json (real).
Telemetry is made up here, deterministically, in the shape of a real trace (sample).
"""
import json, random, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MODEL = json.loads((ROOT / "examples/acme/generated/model/model.json").read_text())
OPS = MODEL["operations"]
THINGS = MODEL["things"]

def esc(s): return html.escape(str(s), quote=True)

# journeys that import each operation (read from examples/acme/journeys/*.ts imports)
JOURNEYS = {
    "allowance.spend": ["spend-within-allowance", "spend-twice-with-one-request", "revoke-then-spend"],
    "allowance.grant": ["grant-an-allowance"],
    "allowance.revoke": ["revoke-then-spend", "outsider-cannot-revoke"],
    "allowance.get": ["read-an-allowance", "spend-twice-with-one-request"],
    "api-key.create": ["an-owner-makes-an-api-key"],
    "invitation.accept": ["an-invitation-is-used-once", "invite-and-accept"],
    "invitation.revoke": ["an-invitation-is-used-once", "invite-and-accept"],
    "invitation.send": ["invite-and-accept"],
    "membership.get": ["invite-and-accept"],
    "organization.create": ["an-owner-makes-an-api-key", "invite-and-accept"],
    "organization.get": ["an-owner-makes-an-api-key", "invite-and-accept"],
    "person.sign-up": ["sign-up-and-sign-in"],
    "session.show": ["invite-and-accept", "sign-up-and-sign-in"],
    "session.sign-in": ["sign-up-and-sign-in"],
    "system.health": ["health-is-up"],
}

def type_of(f):
    v = f["value"]; t = v["type"]
    if t == "id": return f'id({v["prefix"]})'
    if t == "uint": return f'uint{v["bits"]}'
    if t == "text": return f'text(max {v["max"]})'
    return t

def role_label(a):
    k = a["kind"]
    if k == "role": return a["role"]
    if k == "role-of": return f'{a["role"]} of {a["path"]}'
    return {"anyone": "anyone", "signed-in": "signed in"}[k]

# ---------------------------------------------------------------- sample telemetry
def rng(name): return random.Random(name)

BASE = {  # calls/24h, refusal share, defect share, p95 baseline as share of budget
    "allowance.spend": (1218, .043, .0008, .74), "allowance.grant": (86, .047, 0, .55),
    "allowance.revoke": (31, .097, 0, .61), "allowance.get": (4310, .002, 0, .46),
    "api-key.create": (22, .0, 0, .70), "invitation.accept": (64, .078, 0, .58),
    "invitation.revoke": (9, .11, 0, .50), "invitation.send": (71, .0, 0, .66),
    "membership.get": (902, .0, 0, .40), "organization.create": (18, .0, 0, .83),
    "organization.get": (1650, .001, 0, .44), "person.sign-up": (47, .064, 0, .93),
    "session.show": (3120, .004, 0, .52), "session.sign-in": (388, .13, 0, 1.12),
    "system.health": (8640, 0, 0, .50),
}

def series(op, n=24):
    calls, ref, dfc, p = BASE[op]; r = rng(op)
    out = []
    for i in range(n):
        shape = 0.55 + 0.9 * max(0, __import__("math").sin((i - 5) / 24 * 3.14159 * 1.6)) + r.random() * .25
        c = max(1, int(calls / n * shape * 1.0))
        rf = int(c * ref * (0.6 + r.random() * .9))
        if op == "allowance.spend" and i in (17, 18): rf = int(c * .11)
        p95 = p * (0.88 + r.random() * .24)
        out.append((c, rf, p95))
    return out

def spark(op, budget, w=150, h=28):
    s = series(op); mx = max(c for c, _, _ in s); bw = w / len(s)
    bars = []
    for i, (c, rf, _) in enumerate(s):
        ch = max(1, c / mx * (h - 2)); rh = rf / mx * (h - 2)
        x = i * bw
        bars.append(f'<rect x="{x:.1f}" y="{h-ch:.1f}" width="{bw-1.2:.1f}" height="{ch:.1f}" fill="#33415c"/>')
        if rf: bars.append(f'<rect x="{x:.1f}" y="{h-rh:.1f}" width="{bw-1.2:.1f}" height="{max(rh,1):.1f}" fill="#e5a23c"/>')
    return f'<svg class="spark" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{"".join(bars)}</svg>'

def totals(op):
    calls, ref, dfc, p = BASE[op]; b = OPS[op]["budget"]["p95Ms"]
    return calls, int(calls * ref), int(round(calls * dfc)), round(b * p)

def p95_points(n=48):
    r = rng("p95-spend"); pts = []
    for i in range(n):
        v = 108 + 14 * __import__("math").sin(i / 5) + r.random() * 12
        if 30 <= i <= 33: v = [151, 168, 177, 158][i - 30]
        pts.append(v)
    return pts

def p95_chart(w=520, h=120, budget=150, ymax=200, pts=None):
    pts = pts or p95_points(); n = len(pts); L, R, T, B = 34, 6, 8, 16
    iw, ih = w - L - R, h - T - B
    X = lambda i: L + i * iw / (n - 1); Y = lambda v: T + ih - v / ymax * ih
    o = [f'<svg class="chart" width="{w}" height="{h}" viewBox="0 0 {w} {h}">']
    for g in (0, 50, 100, 150, 200):
        o.append(f'<line x1="{L}" x2="{w-R}" y1="{Y(g):.1f}" y2="{Y(g):.1f}" stroke="#1d222b"/><text x="{L-5}" y="{Y(g)+3:.1f}" text-anchor="end" class="ax">{g}</text>')
    # red zone above the budget
    o.append(f'<rect x="{L}" y="{T}" width="{iw}" height="{Y(budget)-T:.1f}" fill="#ef5b5b" opacity=".06"/>')
    o.append(f'<line x1="{L}" x2="{w-R}" y1="{Y(budget):.1f}" y2="{Y(budget):.1f}" stroke="#ef5b5b" stroke-width="1.2" stroke-dasharray="5 3"/>')
    o.append(f'<text x="{w-R-2}" y="{Y(budget)-4:.1f}" text-anchor="end" class="ax" fill="#ef5b5b">budget 150 ms</text>')
    seg = []
    for i in range(n - 1):
        a, b2 = pts[i], pts[i + 1]; over = max(a, b2) > budget
        o.append(f'<line x1="{X(i):.1f}" y1="{Y(a):.1f}" x2="{X(i+1):.1f}" y2="{Y(b2):.1f}" stroke="{"#ef5b5b" if over else "#3fb97a"}" stroke-width="1.8"/>')
    for hh, lab in ((0, "-24h"), (6, "-18h"), (12, "-12h"), (18, "-6h"), (24, "now")):
        x = L + hh / 24 * iw
        o.append(f'<text x="{x:.1f}" y="{h-3}" text-anchor="{"end" if hh == 24 else "middle" if hh else "start"}" class="ax">{lab}</text>')
    o.append('</svg>')
    return "".join(o)

# ---------------------------------------------------------------- waterfall
# a span: (depth, name, start_ms, dur_ms, kind, note)   kind: root db op step refuse defect proj
def waterfall(spans, total, label_w=250, ticks=None, selected=None, dur_w=70):
    ticks = ticks or [0, total * .25, total * .5, total * .75, total]
    t = "".join(f'<span style="left:{x/total*100:.1f}%">{x:.0f}</span>' for x in ticks)
    o = [f'<div class="wf" style="--lab:{label_w}px;--dur:{dur_w}px"><div class="wf-head"><div></div><div class="wf-ticks">{t}</div><div class="r">ms</div></div>']
    for d, name, st, du, kind, note in spans:
        sel = " sel" if name == selected else ""
        left = st / total * 100; wd = max(du / total * 100, 0.5)
        mark = ""
        if kind == "refuse": mark = '<i class="mk a">refused</i>'
        if kind == "defect": mark = '<i class="mk r">defect</i>'
        if kind == "proj": mark = '<i class="mk d">once O2 lands</i>'
        durtxt = f'{du:g}' if kind != "proj" else "~"
        o.append(
            f'<div class="wf-row k-{kind}{sel}"><div class="wf-lab" style="padding-left:{d*14}px"><span class="tw">{"▾" if d < 2 and kind in ("root","op") else "·" if d else ""}</span>'
            f'<span class="nm">{esc(name)}</span></div>'
            f'<div class="wf-track"><div class="bar" style="left:{left:.2f}%;width:{wd:.2f}%"></div>{mark_at(mark, left, wd)}</div>'
            f'<div class="r wf-d">{durtxt}</div></div>')
        if note:
            o.append(f'<div class="wf-note k-{kind}" style="padding-left:{label_w + 10}px">{note}</div>')
    o.append('</div>')
    return "".join(o)

def mark_at(mark, left, wd):
    if not mark: return ""
    if left + wd > 70: return mark.replace("<i ", f'<i style="right:{100-left+1:.1f}%" ')
    return mark.replace("<i ", f'<i style="left:{left+wd+1:.1f}%" ')

def trace_ok():
    return 32, [
        (0, "POST /allowance/spend", 0, 32, "root", ""),
        (1, "sqlite", 1, 2, "db", ""),
        (1, "allowance.spend", 4, 25, "op", ""),
        (2, "allowance.spend.load", 5, 8, "step", ""),
        (3, "sqlite", 6, 5, "db", ""),
        (2, "allowance.spend.record", 14, 13, "step", ""),
        (3, "sqlite", 16, 9, "db", ""),
        (2, "allowance.spend.commit", 26, 3, "proj", "inside <b>allowance.spend</b> today; becomes its own span in O2 gap 1, with <b>commit.outcome</b>"),
    ]

def trace_exceeded():
    return 18, [
        (0, "POST /allowance/spend", 0, 18, "root", ""),
        (1, "sqlite", 1, 2, "db", ""),
        (1, "allowance.spend", 4, 12, "refuse", '<b>refusal</b>=AllowanceExceeded &nbsp; <b>refusal.log</b>="the amount is more than is left" &nbsp; amount=400 remaining=380'),
        (2, "allowance.spend.load", 5, 8, "step", ""),
        (3, "sqlite", 6, 6, "db", ""),
    ]

def trace_defect():
    return 46, [
        (0, "POST /allowance/spend", 0, 46, "root", ""),
        (1, "allowance.spend", 4, 40, "defect", '<b>defect</b>="allowance alw_9f2k was checked and then not found" &nbsp; status=<b>error</b>'),
        (2, "allowance.spend.load", 5, 35, "step", ""),
        (3, "sqlite", 6, 33, "db", ""),
    ]

def trace_notallowed():
    return 6, [
        (0, "POST /allowance/spend", 0, 6, "root", "response 403 &nbsp; <b>no allowance.spend span</b>: the role check refused before the operation opened"),
        (1, "sqlite", 1, 2, "db", ""),
    ]

# ---------------------------------------------------------------- calls (sample)
# (time, trace, person, outcome, dur, amount, remaining, memo)
CALLS = [
    ("14:02:11", "4a1f9c02", "per_emtx…utro", "ok", 32, "120", "380", "train"),
    ("14:01:58", "b70e1d44", "per_bx20…lmc8", "refused:AllowanceExceeded", 18, "400", "380", "hotel"),
    ("14:01:40", "e3390a7b", "per_emtx…utro", "ok", 29, "380", "0", "hotel"),
    ("14:01:22", "c18d5be0", "per_emtx…utro", "refused:AllowanceNotActive", 14, "1", "—", "coffee"),
    ("14:00:51", "9a02f6c3", "per_k2m9…q4zp", "replayed", 11, "100", "400", "coffee"),
    ("14:00:07", "5d4b8e91", "per_bx20…lmc8", "slow", 172, "35", "212", "cab"),
    ("13:59:30", "f61c2a08", "per_k2m9…q4zp", "defect", 46, "20", "—", "lunch"),
    ("13:58:44", "2e7a90d5", "per_emtx…utro", "ok", 27, "60", "320", "ink"),
    ("13:58:02", "7c3f1b66", "per_bx20…lmc8", "ok", 31, "15", "197", "tram"),
    ("13:57:19", "0b95e4af", "per_emtx…utro", "refused:AllowanceExceeded", 17, "900", "320", "desk"),
]

def outcome_chip(o):
    if o == "ok": return '<span class="chip g">answered</span>'
    if o == "replayed": return '<span class="chip g">answered · replayed</span>'
    if o == "slow": return '<span class="chip g">answered</span> <span class="chip r">attempt 2</span>'
    if o == "defect": return '<span class="chip r">defect</span>'
    if o.startswith("refused:"): return f'<span class="chip a">refused · {o[8:]}</span>'
    return esc(o)

def dur_cell(ms, budget=150):
    cls = "r" if ms > budget else "g"
    w = min(ms / budget * 100, 100)
    return f'<span class="durbar"><i class="{cls}" style="width:{w:.0f}%"></i></span><span class="{cls}t">{ms} ms</span>'

def calls_table(rows=None, link="a-operation.html", show_memo=True, compact=False):
    rows = rows or CALLS
    h = ['<table class="t calls"><thead><tr><th>time</th><th>trace</th>' + ('' if compact else '<th>principal.person</th>') + '<th>outcome</th><th class="r">amount</th>' + ('' if compact else '<th class="r">remaining</th>')
         + ('<th>memo*</th>' if show_memo else '') + '<th>vs budget</th></tr></thead><tbody>']
    for tm, tr, pe, oc, du, am, rem, memo in rows:
        h.append(f'<tr class="o-{oc.split(":")[0]}"><td class="dim">{tm}</td><td><a class="tid" href="{link}#t-{tr}">{tr}</a></td>' + ('' if compact else f'<td class="dim">{pe}</td>') + f'<td>{outcome_chip(oc)}</td>'
                 f'<td class="r">{am}</td>' + ('' if compact else f'<td class="r">{rem}</td>') + (f'<td class="dim">{memo}</td>' if show_memo else '') + f'<td>{dur_cell(du)}</td></tr>')
    h.append('</tbody></table>')
    return "".join(h)

# ---------------------------------------------------------------- page chrome
CSS = r"""
:root{--bg:#0a0c10;--p1:#0f1217;--p2:#141820;--p3:#1a1f29;--line:#222833;--line2:#2c3340;--tx:#d5dae3;--dim:#7c8696;--dim2:#566071;
--g:#3fb97a;--a:#e5a23c;--r:#ef5b5b;--b:#6aa6ff;--v:#a78bfa;
--mono:ui-monospace,"JetBrains Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--tx);font:12px/1.45 var(--mono);-webkit-font-smoothing:antialiased}
a{color:var(--b);text-decoration:none}a:hover{text-decoration:underline}
.dim{color:var(--dim)}.r{text-align:right}.g{color:var(--g)}.gt{color:var(--g)}.rt{color:var(--r)}.at{color:var(--a)}.b{font-weight:600}
h1,h2,h3{margin:0;font-weight:600}
.app{display:grid;grid-template-columns:208px 1fr;grid-template-rows:38px 1fr;min-height:100vh}
.top{grid-column:1/3;display:flex;align-items:center;gap:14px;padding:0 14px;background:var(--p1);border-bottom:1px solid var(--line)}
.logo{font-weight:700;letter-spacing:.02em}.logo b{color:var(--g)}
.url{flex:1;max-width:560px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:3px 10px;color:var(--dim)}
.url b{color:var(--tx);font-weight:500}
.seg{display:flex;border:1px solid var(--line2);border-radius:6px;overflow:hidden}.seg span{padding:2px 9px;color:var(--dim)}.seg span.on{background:var(--p3);color:var(--tx)}
.live{display:flex;align-items:center;gap:6px;color:var(--dim);margin-left:auto}.live i{width:7px;height:7px;border-radius:50%;background:var(--g);box-shadow:0 0 0 3px #3fb97a22}
.side{background:var(--p1);border-right:1px solid var(--line);padding:10px 8px;overflow:auto}
.side h4{margin:12px 8px 4px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim2);font-weight:600}
.side a{display:flex;justify-content:space-between;align-items:center;color:var(--dim);padding:3px 8px;border-radius:5px}
.side a:hover{background:var(--p2);text-decoration:none;color:var(--tx)}.side a.on{background:var(--p3);color:var(--tx)}
.side a.sub{padding-left:22px}.side .n{font-size:10.5px;color:var(--dim2)}.side .n.a{color:var(--a)}.side .n.r{color:var(--r)}
.main{padding:14px 18px 40px;min-width:0}
.crumb{color:var(--dim);margin-bottom:8px}.crumb a{color:var(--dim)}
.card{background:var(--p1);border:1px solid var(--line);border-radius:8px}
.card>h3,.ch{padding:8px 12px;border-bottom:1px solid var(--line);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);display:flex;justify-content:space-between;align-items:center;font-weight:600}
.ch .sub,.sub{color:var(--dim2);text-transform:none;letter-spacing:0;font-weight:400}
.cb{padding:10px 12px}
.chip{display:inline-block;padding:0 7px;border-radius:10px;font-size:11px;line-height:17px;border:1px solid var(--line2);color:var(--dim);white-space:nowrap}
.chip.g{color:var(--g);border-color:#3fb97a55;background:#3fb97a14}.chip.a{color:var(--a);border-color:#e5a23c66;background:#e5a23c14}
.chip.r{color:var(--r);border-color:#ef5b5b66;background:#ef5b5b14}.chip.b{color:var(--b);border-color:#6aa6ff55;background:#6aa6ff12}.chip.v{color:var(--v);border-color:#a78bfa55;background:#a78bfa12}
.tag-o2{font-size:10px;color:var(--a);border:1px dashed #e5a23c88;border-radius:4px;padding:0 4px;margin-left:4px}
table.t{width:100%;border-collapse:collapse}table.t th{text-align:left;font-weight:500;color:var(--dim2);font-size:11px;padding:5px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
table.t th.r{text-align:right}table.t td{padding:4px 8px;border-bottom:1px solid #1a1f27;vertical-align:middle;white-space:nowrap}
table.t tr:hover td{background:#ffffff05}table.t td.r{text-align:right}
table.t.wrap td{white-space:normal}table.t.wrap td .chip{white-space:normal}
.tid{color:var(--b)}.durbar{display:inline-block;width:56px;height:6px;background:var(--p3);border-radius:3px;margin-right:6px;vertical-align:middle;overflow:hidden}
.durbar i{display:block;height:100%}.durbar i.g{background:var(--g)}.durbar i.r{background:var(--r)}
tr.o-defect td{background:#ef5b5b0b}
.kv{display:grid;grid-template-columns:120px minmax(0,1fr);gap:5px 12px}.kv dt{color:var(--dim2)}.kv dd{margin:0;min-width:0;overflow-wrap:anywhere}
.kpi{display:flex;gap:0}.kpi>div{flex:1;padding:8px 12px;border-right:1px solid var(--line)}.kpi>div:last-child{border:0}
.kpi .l{color:var(--dim2);font-size:11px}.kpi .v{font-size:20px;font-weight:600;margin-top:1px}.kpi .s{color:var(--dim);font-size:11px}
code,.code{background:var(--p3);border-radius:4px;padding:0 5px;color:#c8d0dc}
.state{display:inline-block;border:1px solid var(--line2);border-radius:5px;padding:0 7px;background:var(--p2)}
.arrow{color:var(--dim2)}
/* waterfall */
.wf{font-size:12px}.wf-head,.wf-row{display:grid;grid-template-columns:var(--lab) 1fr var(--dur);align-items:center}
.wf-head{color:var(--dim2);font-size:10.5px;padding:2px 0 3px;border-bottom:1px solid var(--line)}
.wf-ticks{position:relative;height:12px}.wf-ticks span{position:absolute;transform:translateX(-50%)}.wf-ticks span:first-child{transform:none}.wf-ticks span:last-child{transform:translateX(-100%)}
.wf-row{height:25px;border-bottom:1px solid #161a21;position:relative}.wf-row:hover{background:#ffffff06}
.wf-row.sel{background:#6aa6ff12;outline:1px solid #6aa6ff55}
.wf-lab{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wf-lab .tw{display:inline-block;width:12px;color:var(--dim2)}
.wf-track{position:relative;height:100%;background:repeating-linear-gradient(90deg,#ffffff07 0 1px,transparent 1px 25%)}
.wf-track .bar{position:absolute;top:6px;height:13px;border-radius:3px;background:#4c7fd6}
.wf-d{padding-right:6px;color:var(--dim)}
.k-root .bar{background:#3a4454}.k-db .bar{background:#4a5568;top:8px;height:9px}.k-db .nm{color:var(--dim)}
.k-op .bar{background:#5b8def}.k-step .bar{background:#4a73c2}
.k-refuse .bar{background:var(--a)}.k-refuse .nm{color:var(--a)}
.k-defect .bar{background:var(--r)}.k-defect .nm{color:var(--r)}
.k-proj .bar{background:transparent;border:1.5px dashed #8a95a8}.k-proj .nm{color:var(--dim);font-style:italic}
.mk{position:absolute;top:6px;font-style:normal;font-size:10.5px;color:var(--dim)}.mk.a{color:var(--a)}.mk.r{color:var(--r)}.mk.d{color:var(--dim2)}
.wf-note{font-size:11px;color:var(--dim);padding:3px 0 5px;border-bottom:1px solid #161a21}.wf-note b{color:#b6bfce;font-weight:500}
.wf-note.k-refuse{color:#c9a15a;background:#e5a23c0a}.wf-note.k-defect{color:#e58a8a;background:#ef5b5b0a}
/* code */
.src{font-size:12px;background:var(--p1);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.src .ln{display:grid;grid-template-columns:30px minmax(0,1fr) auto;border-bottom:1px solid #12161c;min-height:20px}
.src .ln>span:first-child{color:var(--dim2);text-align:right;padding-right:8px}.src pre{margin:0;white-space:pre;font:inherit;overflow:hidden}
.src .gut{white-space:nowrap;display:flex;gap:5px;align-items:center;justify-content:flex-end;padding-right:8px}
.src .hot{background:#6aa6ff0e}.src .hot.am{background:#e5a23c0e}
.kw{color:#c792ea}.st{color:#a6d189}.cm{color:var(--dim2)}.fn{color:#82aaff}
.foot{color:var(--dim2);font-size:11px;margin-top:18px;padding-top:8px;border-top:1px dashed var(--line);display:flex;justify-content:space-between}
.foot b{color:var(--a);font-weight:500}
svg.chart .ax{font:10px var(--mono);fill:#566071}svg.spark{display:block}
.legend{display:flex;gap:12px;color:var(--dim);font-size:11px}.legend i{display:inline-block;width:10px;height:3px;margin-right:4px;vertical-align:middle;border-radius:2px}
.sticky{position:sticky;top:14px}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line)}.tabs a{padding:7px 14px;color:var(--dim);border-bottom:2px solid transparent;margin-bottom:-1px}
.tabs a.on{color:var(--tx);border-color:var(--b)}.tabs a .n{margin-left:5px;color:var(--dim2);font-size:11px}.tabs a:hover{text-decoration:none;color:var(--tx)}
.note{background:#e5a23c0c;border:1px solid #e5a23c44;border-radius:6px;padding:6px 10px;color:#d3b072;font-size:11.5px}
.note b{color:var(--a);font-weight:600}.note.b2{background:#6aa6ff0c;border-color:#6aa6ff44;color:#9ab9e6}.note.b2 b{color:var(--b)}
.grid2{display:grid;gap:12px}
.pill-op{font-size:15px;font-weight:600}
.btn{border:1px solid var(--line2);border-radius:6px;padding:2px 9px;color:var(--tx);background:var(--p2);display:inline-block}
.sheet{background:var(--p1);border-left:1px solid var(--line2);box-shadow:-20px 0 40px #00000066}
"""

NAV = [
    ("Overview", "index.html", ""), ("Things", None, ""),
]

def sidebar(active="", base=""):
    def a(label, href, key, n="", cls="", sub=False):
        on = " on" if active == key else ""
        s = " sub" if sub else ""
        return f'<a class="{on.strip()}{s}" href="{href}">{label}<span class="n {cls}">{n}</span></a>'
    th = "".join(a(t, "#", "thing-" + t, "", "", True) if t != "allowance" else a("allowance", "#", "thing-allowance", "4 ops", "", True) for t in ["allowance", "api-key", "invitation", "membership", "organization", "person", "session", "system"])
    return ('<nav class="side"><h4>Catalog</h4>'
            + a("Overview", "#", "overview") + a("Things", "#", "things", "8") + th
            + '<h4>Reference</h4>'
            + a("Operations", "matrix.html", "matrix", "15", "") + a("Events", "event.html", "events", "7")
            + a("Errors", "error.html", "errors", "9 refusals", "a") + a("Roles", "#", "roles") + a("Values", "#", "values", "6")
            + '<h4>Proof</h4>' + a("Journeys", "#", "journeys", "11") + a("Environments", "#", "envs", "4") + a("Releases", "#", "rel")
            + '<h4>Work</h4>' + a("Board", "#", "board") + a("Docs", "#", "docs") + '</nav>')

def topbar(url, env="production", right=""):
    seg = "".join(f'<span class="{"on" if e == env else ""}">{e}</span>' for e in ("local", "staging", "production"))
    return (f'<header class="top"><div class="logo">forman<b>·</b>portal</div><div class="seg">{seg}</div>'
            f'<div class="url">portal.acme.local<b>{esc(url)}</b></div>{right}<div class="live"><i></i>live · last 24 h · refreshed 4 s ago</div></header>')

def footer(extra=""):
    return ('<div class="foot"><span><b>telemetry: sample, shaped like a real trace.</b> Model data (names, fields, roles, moves, errors, codes, budgets, journeys, handler lines) is real, from '
            '<code>examples/acme/generated/model/model.json</code>.</span><span>' + extra + '</span></div>')

def page(title, body, url, active, env="production", topright="", cols="208px 1fr", extra_css=""):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1440">'
            f'<title>{esc(title)}</title><style>{CSS}{extra_css}</style></head><body><div class="app" style="grid-template-columns:{cols}">'
            f'{topbar(url, env, topright)}{sidebar(active)}<main class="main">{body}</main></div></body></html>')
