"""Matrix, event, error and index pages (the recommended option's style: A)."""
from lib import *
from parts import *

def card(title, inner, sub="", pad=False, mb=10, id_=""):
    return (f'<div class="card" {"id="+chr(34)+id_+chr(34) if id_ else ""} style="margin-bottom:{mb}px"><div class="ch"><span>{title}</span><span class="sub">{sub}</span></div>'
            f'{"<div class=cb>"+inner+"</div>" if pad else inner}</div>')

def p95_cell(op):
    b = OPS[op]["budget"]["p95Ms"]; p = totals(op)[3]; over = p > b
    cls = "r" if over else "g"
    return (f'<span class="durbar" style="width:44px"><i class="{cls}" style="width:{min(p/b*100,100):.0f}%"></i></span>'
            f'<span class="{cls}t">{p}</span><span class="dim"> / {b}</span>' + (' <span class="chip r">over</span>' if over else ""))

def move_text(o):
    mv = o.get("move")
    if not mv: return '<span class="dim">no move' + (" · read" if o["kind"] == "read" else "") + "</span>"
    f = " | ".join(mv["from"]) or "∅"; t = " | ".join(mv["to"])
    return f'<span class="dim">{f}</span> <span class="arrow">→</span> {t} <span class="chip v">{mv["emits"]}</span>'

def matrix():
    rows = []; byth = {}
    for k, o in OPS.items(): byth.setdefault(o["thing"], []).append((k, o))
    tc = tr = td = 0
    for th, lst in byth.items():
        rows.append(f'<tr class="grp"><td colspan="8"><b>{th}</b> <span class="dim">· {THINGS[th]["description"]}</span></td></tr>')
        for k, o in lst:
            c, r, d, p = totals(k); tc += c; tr += r; td += d
            js = JOURNEYS[k]
            name = f'<a href="{"a-operation.html" if k == "allowance.spend" else "#"}" class="b">{k}</a>' + (' <span class="chip">read</span>' if o["kind"] == "read" else "")
            roles = "<br>".join(f'<span class="dim">{role_label(a)}</span>' for a in o["allowed"])
            stale = k == "allowance.revoke"
            proof = (f'<span class="chip g">{len(js)} pass</span>' if not stale else f'<span class="chip g">{len(js)} pass</span> <span class="chip v">stale</span>')
            refc = f'<span class="at">{r}</span> <span class="dim">{r/c*100:.1f}%</span>' if r else '<span class="dim">0</span>'
            defc = f'<span class="chip r">{d}</span>' if d else '<span class="dim">0</span>'
            rows.append(f'<tr><td>{name}</td><td>{roles}</td><td>{move_text(o)}</td><td>{proof}</td>'
                        f'<td>{spark(k, 0, 84, 24)}</td><td class="r">{c:,}</td><td class="r">{refc}</td><td class="r">{defc}</td><td>{p95_cell(k)}</td></tr>')
    css = "tr.grp td{background:#12161d;padding:6px 8px;border-top:1px solid var(--line2)}table.t td{vertical-align:middle}"
    tiles = (f'<div class="card kpi" style="margin-bottom:12px"><div><div class="l">operations</div><div class="v">15</div><div class="s">12 operations · 3 reads · 8 things</div></div>'
             f'<div><div class="l">calls · 24 h</div><div class="v">{tc:,}</div><div class="s">from forman.calls (every call, with or without a span)</div></div>'
             f'<div><div class="l">refused</div><div class="v at">{tr}</div><div class="s">tagged, end OK</div></div>'
             f'<div><div class="l">defects</div><div class="v rt">{td}</div><div class="s">only these are red</div></div>'
             f'<div><div class="l">over budget</div><div class="v rt">1</div><div class="s">session.sign-in p95 448 / 400 ms</div></div>'
             f'<div><div class="l">no journey</div><div class="v">0</div><div class="s">every operation is imported by one</div></div></div>')
    filt = ('<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center"><span class="chip">thing: all</span><span class="chip">role: any</span><span class="chip">outcome: any</span>'
            '<span class="chip r">over budget</span><span class="chip">has defects</span><span class="dim" style="margin-left:auto">sparkline: calls per hour, refused in amber · bar: p95 now against the declared budget</span></div>')
    tbl = ('<div class="card"><table class="t wrap"><thead><tr><th>operation</th><th>who may call</th><th>state move</th><th>proof</th><th>24 h</th><th class="r">calls</th><th class="r">refused</th><th class="r">defects</th><th>p95 / budget (ms)</th></tr></thead><tbody>'
           + "".join(rows) + '</tbody></table></div>')
    body = ('<div class="crumb">acme / <b>operations</b></div><div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px"><span class="pill-op">Operations</span><span class="dim">every operation, grouped by thing: docs facts and live numbers in one row</span></div>'
            + tiles + filt + tbl
            + '<div class="note b2" style="margin-top:10px"><b>NotAllowed is counted, not traced.</b> A refused caller leaves no operation span, so its calls and refusals here come from the <code>forman.calls</code> metric (O2 gap 3), which the matrix reads, not from traces. Until O2 lands, NotAllowed rows would read 0.</div>'
            + footer("Matrix · /operations · click an operation for its docs and traces together"))
    return page("Operations", body, "/operations?env=production&window=24h", "matrix", extra_css=css)

def event():
    ev = AL["events"]["AllowanceSpent"]
    ftable = ('<table class="t"><thead><tr><th>field</th><th>type</th><th>value</th><th>in the journal</th><th>traced</th></tr></thead><tbody>'
              + "".join(f'<tr><td class="b">{k}</td><td class="dim">{type_of(f)}</td><td><a href="#">{f.get("ref") or f.get("named")}</a></td><td class="gt">kept</td>'
                        f'<td>{"<span class=chip>until O2</span>" if k=="memo" else "<span class=dim>public</span>"}</td></tr>' for k, f in ev.items()) + '</tbody></table>')
    occ = [("14:02:11", "4a1f9c02", "alw_7qk2…", "120", "train", "380", "active"), ("14:01:40", "e3390a7b", "alw_7qk2…", "380", "hotel", "0", "exhausted"),
           ("14:00:51", "9a02f6c3", "alw_c91x…", "100", "coffee", "400", "active"), ("13:58:44", "2e7a90d5", "alw_c91x…", "60", "ink", "320", "active"),
           ("13:58:02", "7c3f1b66", "alw_m4dd…", "15", "tram", "197", "active")]
    rows = "".join(f'<tr><td class="dim">{t}</td><td><a class="tid" href="a-operation.html#t-4a1f9c02">{tr}</a></td><td>{al}</td><td class="r">{am}</td><td class="dim">{me}</td><td class="r">{rem}</td><td><span class="state">{st}</span></td></tr>' for t, tr, al, am, me, rem, st in occ)
    left = "".join([
        card("Fields", ftable, "4 fields · declared in blueprint/things/allowance/events.ts"),
        card("Emitted by", '<table class="t"><tbody><tr><td><a href="a-operation.html" class="b">allowance.spend</a></td><td><code>spend</code> <span class="state">active</span> → <span class="state">active</span> | <span class="state">exhausted</span></td><td class="r"><span class="chip g">1,165 in 24 h</span></td></tr></tbody></table>'
             '<div class="cb dim">The only emitter. Sibling events of the same thing: AllowanceGranted (allowance.grant), AllowanceRevoked (allowance.revoke).</div>', "1 operation"),
        card("Proved by", '<table class="t wrap"><tbody><tr><td><a href="#">spend-within-allowance.ts</a></td><td class="dim">emits(AllowanceSpent, …) at steps 1 and 3; noEvents() at the refused steps</td></tr>'
             '<tr><td><a href="#">spend-twice-with-one-request.ts</a></td><td class="dim">emits once; the replayed request: noEvents()</td></tr></tbody></table>'),
    ])
    right = "".join([
        card("Occurrences per half-hour", f'<div class="cb">{spark("allowance.spend", 150, 560, 70).replace("#e5a23c", "#6aa6ff")}<div class="dim" style="margin-top:6px">refused and replayed calls emit nothing, so this is the answered calls: 1,165 (sample)</div></div>'),
        card("Recent occurrences", f'<table class="t"><thead><tr><th>time</th><th>trace</th><th>allowance</th><th class="r">amount</th><th>memo</th><th class="r">remaining</th><th>state after</th></tr></thead><tbody>{rows}</tbody></table>', "click a trace to open the call on the operation page"),
        card("One occurrence · 4a1f9c02", '<div class="cb"><pre style="margin:0;font:inherit;color:#b9c2d0">{ <span class="st">"event"</span>: <span class="st">"AllowanceSpent"</span>, <span class="st">"allowance"</span>: <span class="st">"alw_7qk2…"</span>, <span class="st">"amount"</span>: 120,\n  <span class="st">"memo"</span>: <span class="st">"train"</span>, <span class="st">"remaining"</span>: 380 }</pre>'
             '<div class="dim" style="margin-top:6px">span <code>allowance.spend</code> carries <code>move.name=spend</code> <code>move.to=active</code> <code>event.name=AllowanceSpent</code>. The event keeps <code>memo</code> after O2; the trace will not.</div></div>'),
    ])
    body = ('<div class="crumb"><a href="matrix.html">reference</a> / events / <b>AllowanceSpent</b></div>'
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="pill-op">AllowanceSpent</span><span class="chip v">event</span><a class="chip" href="#">thing: allowance</a><span class="chip g">1,165 in 24 h</span></div>'
            '<div style="color:#b9c2d0;margin-bottom:12px">Written to the journal when <a href="a-operation.html">allowance.spend</a> moves an allowance. Carries what was spent and what is left.</div>'
            f'<div style="display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:12px"><div>{left}</div><div>{right}</div></div>'
            + footer("Event page · /things/allowance/events/AllowanceSpent"))
    return page("AllowanceSpent", body, "/things/allowance/events/AllowanceSpent", "events")

def refbars(w=560, h=70):
    s = series("allowance.spend"); mx = max(rf for _, rf, _ in s) or 1; bw = w / len(s)
    return f'<svg class="spark" width="{w}" height="{h}">' + "".join(f'<rect x="{i*bw:.1f}" y="{h-max(1,rf/mx*(h-2)):.1f}" width="{bw-1.5:.1f}" height="{max(1,rf/mx*(h-2)):.1f}" fill="#e5a23c"/>' for i, (c, rf, _) in enumerate(s)) + '</svg>'

def error():
    from build import trace_card
    er = AL["errors"]["AllowanceExceeded"]
    ref = [("14:01:58", "b70e1d44", "per_bx20…lmc8", "400", "380"), ("13:57:19", "0b95e4af", "per_emtx…utro", "900", "320"),
           ("13:41:07", "a8c1e2d9", "per_k2m9…q4zp", "250", "198"), ("13:12:33", "3d70b4f8", "per_bx20…lmc8", "90", "12"), ("12:58:50", "d92e6a15", "per_emtx…utro", "60", "35")]
    rows = "".join(f'<tr><td class="dim">{t}</td><td><a class="tid" href="a-operation.html#t-b70e1d44">{tr}</a></td><td class="r">{a}</td><td class="r">{r}</td><td class="at" style="font-size:11px">"the amount is more than is left"</td></tr>' for t, tr, p, a, r in ref)
    left = "".join([
        card("What it is", f'<dl class="kv" style="margin:0"><dt>code</dt><dd><code>AL-001</code></dd><dt>exit</dt><dd><code>41</code> <span class="dim">(the CLI exits with it)</span></dd><dt>declared in</dt><dd class="dim">blueprint/things/allowance/errors.ts</dd>'
             f'<dt>thing</dt><dd><a href="#">allowance</a></dd><dt>kind</dt><dd><span class="chip a">refusal</span> <span class="dim">ends the span OK, tagged <code>refusal</code>, never red</span></dd></dl>', pad=True),
        card("Fields it carries", '<table class="t"><thead><tr><th>field</th><th>type</th><th>value</th><th>visibility</th></tr></thead><tbody><tr><td class="b">remaining</td><td class="dim">uint128</td><td><a href="#">Amount</a></td><td><span class="chip">public</span></td></tr></tbody></table>'),
        card("Which operations can refuse with it", '<table class="t"><tbody><tr><td><a href="a-operation.html" class="b">allowance.spend</a></td><td class="dim">declared in its <code>errors</code></td><td class="r"><span class="chip a">31 in 24 h · 2.5% of calls</span></td></tr></tbody></table>'
             '<div class="cb dim">Siblings on the same operation: <a href="#" class="at" id="notactive">AllowanceNotActive</a> AL-900 exit 40 (7), <a href="#" class="at" id="notallowed">NotAllowed</a> AR-001 exit 3 (14, metric only).</div>'),
        card("Proved by", '<table class="t wrap"><tbody><tr><td><a href="#">spend-within-allowance.ts</a></td><td class="dim">step 2: <code>refuses(AllowanceExceeded, { remaining: 380n })</code>, <code>noEvents()</code>, record span absent</td></tr></tbody></table>'),
        card("What the caller sees", '<div class="cb"><pre style="margin:0;font:inherit;color:#b9c2d0"><span class="dim">$</span> acme allowance spend --allowance alw_7qk2… --amount 400 --memo hotel\n<span class="at">AllowanceExceeded</span> (AL-001): remaining=380\n<span class="dim">exit 41</span></pre></div>'),
    ])
    right = "".join([
        card("Refusals per half-hour", f'<div class="cb">{refbars()}<div class="dim" style="margin-top:6px">a burst at -6h: 4 people hit the limit within one hour (sample)</div></div>'),
        card("Recent refusals, with the deciding log", f'<table class="t wrap"><thead><tr><th>time</th><th>trace</th><th class="r">asked</th><th class="r">remaining</th><th>refusal.log</th></tr></thead><tbody>{rows}</tbody></table>', "every row has a trace"),
        trace_card("b70e1d44", "refused", '<span class="chip a">AllowanceExceeded</span>', trace_exceeded(), hint="same waterfall as on the operation page"),
    ])
    body = ('<div class="crumb"><a href="matrix.html">reference</a> / errors / <b>AllowanceExceeded</b></div>'
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px" id="exceeded"><span class="pill-op at">AllowanceExceeded</span><span class="chip a">refusal</span><span class="chip">AL-001</span><span class="chip">exit 41</span><span class="chip a">31 in 24 h</span></div>'
            '<div style="color:#b9c2d0;margin-bottom:12px">The amount asked is more than is left this month. The caller may try a smaller amount; <code>remaining</code> says how much.</div>'
            f'<div style="display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:12px"><div>{left}</div><div>{right}</div></div>'
            + footer("Error page · /things/allowance/errors/AllowanceExceeded"))
    return page("AllowanceExceeded", body, "/things/allowance/errors/AllowanceExceeded", "errors")

def index():
    items = [
        ("A", "Docs page with a live rail", "Docs on the left, live on the right, one scroll. The operation page is the card.", "a-operation.html", "Recommended"),
        ("B", "Service card with tabs", "Docs · Calls · Traces · Logs · Refusals, one tab at a time, like SigNoz.", "b-operation.html", ""),
        ("B", "Same card, Docs tab", "What the first tab shows.", "b-operation-docs.html", ""),
        ("C", "Trace-first, docs in a side sheet", "The explorer is home. Docs open beside a call.", "c-operation.html", ""),
        ("·", "Operations matrix", "Home of every option. Docs facts and live numbers in one row.", "matrix.html", "Shared"),
        ("·", "Event page: AllowanceSpent", "", "event.html", "Shared"),
        ("·", "Error page: AllowanceExceeded", "", "error.html", "Shared"),
    ]
    rows = "".join(f'<tr><td class="b">{o}</td><td><a href="{h}" class="b">{t}</a> <span class="dim">{h}</span></td><td class="dim">{d}</td><td>{"<span class=chip g>"+tag+"</span>" if tag=="Recommended" else ("<span class=chip>"+tag+"</span>" if tag else "")}</td></tr>' for o, t, d, h, tag in items)
    body = ('<div class="crumb">spikes / portal-observability / sketches</div><div class="pill-op" style="margin-bottom:6px">Portal: docs and live observability on the same page</div>'
            '<div style="color:#b9c2d0;margin-bottom:14px;max-width:760px">Three ways to put each operation\'s docs and its live traces on one page. All numbers about the blueprint are real; the traffic is made up, in the shape of a real trace. Read <a href="README.md">README.md</a> for the options graded.</div>'
            f'<div class="card"><table class="t"><thead><tr><th>option</th><th>page</th><th>what it is</th><th></th></tr></thead><tbody>{rows}</tbody></table></div>' + footer("index"))
    return page("Portal sketches", body, "/", "")

def build():
    return {"matrix.html": matrix(), "event.html": event(), "error.html": error(), "index.html": index()}
