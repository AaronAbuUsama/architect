"""Page sections shared by the options (docs half and live half of allowance.spend)."""
from lib import *

SP = OPS["allowance.spend"]
AL = THINGS["allowance"]

def vis_chip(name, dec):
    if name == "memo": return '<span class="chip">public</span> <span class="tag-o2">free text: untraced after O2</span>'
    return '<span class="chip">public</span>'

def fields_table(fields, dec="payload"):
    h = ['<table class="t wrap"><thead><tr><th>field</th><th>type</th><th>value</th><th>visibility</th></tr></thead><tbody>']
    for k, f in fields.items():
        ref = f'<a href="#">{f["ref"]}</a>' if "ref" in f else (f'<a href="#">{f["named"]}</a>' if "named" in f else "")
        h.append(f'<tr><td class="b">{k}</td><td class="dim">{type_of(f)}</td><td>{ref}</td><td>{vis_chip(k, dec)}</td></tr>')
    h.append('</tbody></table>')
    return "".join(h)

def machine_strip():
    states = AL["machine"]["states"]
    o = ['<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">']
    for s in states: o.append(f'<span class="state" style="{"border-color:#5b8def;color:#9ab9e6" if s in ("active","exhausted") else ""}">{s}</span>')
    o.append('</div>')
    return "".join(o)

def move_card():
    return ('<div class="cb"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
            '<code>spend</code><span class="state">active</span><span class="arrow">──▶</span>'
            '<span class="state">active</span><span class="dim">or</span><span class="state">exhausted</span>'
            '<span class="arrow">· emits</span><a class="chip v" href="event.html">AllowanceSpent</a></div>'
            '<div class="dim" style="margin-top:7px">Not from <span class="state">exhausted</span> or <span class="state">revoked</span>: the machine refuses with '
            '<a href="error.html#notactive">AllowanceNotActive</a> <code>AL-900</code> exit 40, carrying <code>state</code>. '
            'Sibling moves of the same thing: <code>grant</code> ∅→active, <code>revoke</code> active|exhausted→revoked.</div>'
            '<div style="margin-top:8px;display:flex;gap:10px;align-items:center"><span class="dim">in the last 24 h</span>'
            '<span class="chip g">1,165 moved</span><span class="chip">1,164 stayed active</span><span class="chip">1 ended exhausted</span>'
            '<span class="dim">(sample)</span></div></div>')

def event_card():
    ev = AL["events"]["AllowanceSpent"]
    rows = "".join(f'<tr><td class="b">{k}</td><td class="dim">{type_of(f)}</td><td>{"memo is kept in the journal" if k=="memo" else ""}</td></tr>' for k, f in ev.items())
    return (f'<div class="cb" style="padding-bottom:4px"><a class="chip v" href="event.html">AllowanceSpent</a> '
            f'<span class="dim">emitted by <b>allowance.spend</b> only · 4 public fields</span></div>'
            f'<table class="t"><tbody>{rows}</tbody></table>')

def refusals_table(live=True):
    rows = [
        ("AllowanceExceeded", "AL-001", "41", "declared in errors.ts", "remaining", "31", "error.html#exceeded", "the amount is more than is left"),
        ("AllowanceNotActive", "AL-900", "40", "machine: not from exhausted or revoked", "state", "7", "error.html#notactive", "—"),
        ("NotAllowed", "AR-001", "3", "caller is not the grantee; handler never runs", "—", "14", "error.html#notallowed", "—"),
    ]
    h = ['<table class="t wrap"><thead><tr><th>refusal</th><th>code</th><th class="r">exit</th><th>carries</th><th>when</th>'
         + ('<th class="r">24 h</th>' if live else '') + '</tr></thead><tbody>']
    for n, c, e, w, car, cnt, href, lg in rows:
        how = '<span class="chip">metric only · no span</span>' if n == "NotAllowed" else '<span class="chip a">span tag · ends OK</span>'
        h.append(f'<tr><td><a href="{href}" class="at">{n}</a></td><td class="dim">{c}</td><td class="r">{e}</td><td class="dim">{car}</td><td class="dim">{w}</td>'
                 + (f'<td class="r at">{cnt}{"*" if n=="NotAllowed" else ""}</td>' if live else '') + '</tr>')
    h.append('</tbody></table>')
    return "".join(h)

def ways_in():
    return ('<table class="t"><tbody>'
            '<tr><td class="dim">HTTP</td><td><code>POST /allowance/spend</code> <span class="dim">· header <code>idempotency-key</code></span></td></tr>'
            '<tr><td class="dim">SDK</td><td><code>Sdk.allowance.spend(payload)</code></td></tr>'
            '<tr><td class="dim">CLI</td><td><code>acme allowance spend --allowance … --amount … --memo …</code></td></tr>'
            '<tr><td class="dim">MCP</td><td>tool <code>allowance.spend</code></td></tr>'
            '<tr><td class="dim">who may</td><td><span class="chip b">allowance.grantee</span> <span class="dim">the member the allowance was granted to</span></td></tr>'
            '</tbody></table>')

def steps_card():
    return ('<table class="t"><tbody>'
            '<tr><td class="b">allowance.spend.load</td><td><span class="chip">database</span></td><td class="dim">spend.ts:13</td><td class="r">p50 7 ms</td></tr>'
            '<tr><td class="b">allowance.spend.record</td><td><span class="chip">database</span></td><td class="dim">spend.ts:22</td><td class="r">p50 11 ms</td></tr>'
            '<tr><td class="dim" style="font-style:italic">allowance.spend.commit</td><td><span class="chip">commit</span></td><td class="dim">once O2 lands</td><td class="r dim">—</td></tr>'
            '</tbody></table>')

def journeys_card():
    js = [("spend-within-allowance.ts", "spend within an allowance", "4 steps · asserts the 3 spans, the event, refusal AllowanceExceeded"),
          ("spend-twice-with-one-request.ts", "spend twice with one request", "3 steps · same key twice is one call, no record span"),
          ("revoke-then-spend.ts", "revoke then spend", "asserts AL-900 after revoke, and NotAllowed for a stranger")]
    rows = "".join(f'<tr><td><a href="#">{f}</a></td><td class="dim">{t}</td><td class="dim">{d}</td><td class="r"><span class="chip g">pass</span></td></tr>' for f, t, d in js)
    return f'<table class="t wrap"><tbody>{rows}</tbody></table><div class="cb dim" style="padding-top:2px">examples/acme/journeys/ · verdicts: sample</div>'

SRC = [
    (9, '<span class="kw">const</span> <span class="fn">spend</span>: Handler = ({ allowance, amount }, { steps, move }) =>', "", ""),
    (13, '    <span class="kw">const</span> found = <span class="kw">yield*</span> steps.<span class="fn">load</span>(records.find(Allowance, allowance));', "hot", '<a class="chip b" href="#t-4a1f9c02">load · p50 7 ms</a>'),
    (14, '    <span class="kw">if</span> (!found) <span class="kw">return yield*</span> Effect.die(<span class="kw">new</span> Error(`allowance ${allowance} was checked…`));', "", '<span class="chip r">defect · 1</span>'),
    (18, '    <span class="kw">if</span> (amount &gt; remaining) {', "hot am", '<span class="chip a">31 refused</span>'),
    (19, '      <span class="kw">yield*</span> Effect.<span class="fn">logInfo</span>(<span class="st">"the amount is more than is left"</span>)…', "hot am", '<span class="chip a">refusal.log</span>'),
    (20, '      <span class="kw">return yield*</span> <span class="kw">new</span> AllowanceExceeded({ remaining });', "hot am", '<a class="chip a" href="error.html#exceeded">AL-001 · exit 41</a>'),
    (22, '    <span class="kw">yield*</span> steps.<span class="fn">record</span>(records.update(Allowance, allowance, { spent: spent + amount }));', "hot", '<a class="chip b" href="#t-4a1f9c02">record · p50 11 ms</a>'),
    (23, '    <span class="kw">yield*</span> <span class="fn">move</span>(amount === remaining ? <span class="st">"exhausted"</span> : <span class="st">"active"</span>);', "", '<a class="chip v" href="event.html">AllowanceSpent</a>'),
]

def source_card():
    rows = "".join(f'<div class="ln {cls}"><span>{n}</span><pre>{code}</pre><div class="gut">{g}</div></div>' for n, code, cls, g in SRC)
    return (f'<div class="src" id="src"><div class="ch"><span>examples/acme/src/allowance/spend.ts</span><span class="sub">gutter = live numbers from the spans this line opens (sample)</span></div>{rows}</div>')

def inspector(sel="allowance.spend.load"):
    return ('<div class="card" style="margin-top:10px"><div class="ch"><span>span · <b style="color:var(--tx)">allowance.spend.load</b></span><span class="sub">8 ms · step.kind=database</span></div>'
            '<div class="cb" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 18px">'
            '<dl class="kv" style="grid-template-columns:78px minmax(0,1fr);margin:0"><dt>operation</dt><dd><a href="#">allowance.spend</a></dd><dt>step</dt><dd>load · database <span class="dim">(declared)</span></dd>'
            '<dt>handler</dt><dd><a href="#src">examples/acme/src/allowance/spend.ts:13</a></dd><dt>declared in</dt><dd class="dim">blueprint/things/allowance/verbs/spend.ts</dd></dl>'
            '<dl class="kv" style="grid-template-columns:118px minmax(0,1fr);margin:0"><dt>operation</dt><dd>allowance.spend</dd><dt>principal.person</dt><dd>per_emtx…utro</dd>'
            '<dt>payload.allowance</dt><dd>alw_7qk2…</dd><dt>payload.amount</dt><dd>120</dd><dt>payload.memo</dt><dd>"train" <span class="tag-o2">traced today</span></dd>'
            '<dt>answer.remaining</dt><dd>380</dd><dt>move.name / to</dt><dd>spend / active</dd></dl></div></div>')

def logs_card(link=True):
    L = [("14:02:11.486", "info", "4a1f9c02", "Sent HTTP response", ""),
         ("14:01:58.071", "info", "b70e1d44", "the amount is more than is left", "amount=400 remaining=380"),
         ("14:00:07.912", "warn", "5d4b8e91", "commit retry after conflict", "attempt=2"),
         ("13:59:30.250", "error", "f61c2a08", "allowance alw_9f2k was checked and then not found", "defect")]
    rows = ""
    for t, lv, tr, msg, ann in L:
        c = {"info": "dim", "warn": "at", "error": "rt"}[lv]
        rows += f'<tr><td class="dim">{t}</td><td class="{c}">{lv}</td><td><a class="tid" href="#t-{tr}">{tr}</a></td><td>{msg}</td><td class="dim">{ann}</td></tr>'
    return f'<table class="t wrap"><tbody>{rows}</tbody></table>'

def refusal_log_card():
    rows = [("AllowanceExceeded", "31", '"the amount is more than is left"', "b70e1d44", "span tag + refusal.log"),
            ("AllowanceNotActive", "7", "(none: generated by the machine)", "c18d5be0", "span tag"),
            ("NotAllowed", "14", "(none)", "—", "counted from the metric, <b>no trace</b>")]
    h = '<table class="t wrap"><thead><tr><th>refusal</th><th class="r">24 h</th><th>refusal.log that decided it</th><th>example</th><th>seen as</th></tr></thead><tbody>'
    for n, c, lg, ex, how in rows:
        h += (f'<tr><td><span class="chip a">{n}</span></td><td class="r at">{c}</td><td class="{"at" if lg.startswith(chr(34)) else "dim"}">{lg}</td>'
              f'<td>{"<a class=tid href=#t-"+ex+">"+ex+"</a>" if ex != "—" else "—"}</td><td class="dim">{how}</td></tr>')
    return h + '</tbody></table>'

def kpi_strip(op="allowance.spend", compact=False):
    calls, ref, d, p = totals(op); b = OPS[op]["budget"]["p95Ms"]
    return (f'<div class="card kpi"><div><div class="l">calls · 24 h</div><div class="v">{calls:,}</div><div class="s">{spark(op, b, 130, 22)}</div></div>'
            f'<div><div class="l">refused (ends OK)</div><div class="v at">{ref}</div><div class="s">{ref/calls*100:.1f}% · 14 from metric only</div></div>'
            f'<div><div class="l">defects</div><div class="v rt">{d}</div><div class="s">f61c2a08 · 13:59</div></div>'
            f'<div><div class="l">replayed (same request)</div><div class="v">9</div><div class="s">idempotent per request</div></div>'
            f'<div><div class="l">p95 now / budget</div><div class="v gt">{p} <span class="dim" style="font-size:12px">/ {b} ms</span></div><div class="s"><span class="durbar" style="width:110px"><i class="g" style="width:{p/b*100:.0f}%"></i></span></div></div>'
            f'<div><div class="l">p95 peak 24 h</div><div class="v rt">177 <span class="dim" style="font-size:12px">ms</span></div><div class="s">over budget 4 half-hours</div></div></div>')

def op_header(extra=""):
    return ('<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">'
            '<span class="pill-op">allowance.spend</span><span class="chip b">operation</span><a class="chip" href="matrix.html">thing: allowance</a>'
            '<span class="chip">idempotent per request</span><span class="chip">budget p95 150 ms</span><span class="chip">runs: server</span>'
            f'{extra}<span class="dim" style="margin-left:auto">hash aee8ecae8dc5fc81</span></div>'
            '<div style="color:#b9c2d0;margin:-2px 0 12px">Spend from what is left of this month\'s allowance.</div>')
