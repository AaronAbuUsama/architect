#!/usr/bin/env python3
"""Builds every sketch in ../ from the real model plus sample telemetry. Run: python3 build.py"""
from pathlib import Path
from lib import *
from parts import *
import pages_other

OUT = Path(__file__).resolve().parents[1]

def trace_card(tid, title, chip, tr, selected=None, label_w=250, hint=""):
    total, spans = tr
    return (f'<div class="card" id="t-{tid}" style="margin-bottom:10px"><div class="ch"><span>{title} <span class="dim" style="text-transform:none;letter-spacing:0">· {tid}</span> {chip}</span>'
            f'<span class="sub">{hint or "click a span: operation, handler line, attributes"}</span></div>'
            f'<div class="cb" style="padding-top:4px">{waterfall(spans, total, label_w, selected=selected)}</div></div>')

def card(title, inner, sub="", pad=False, mb=10, id_=""):
    return (f'<div class="card" {"id="+chr(34)+id_+chr(34) if id_ else ""} style="margin-bottom:{mb}px"><div class="ch"><span>{title}</span><span class="sub">{sub}</span></div>'
            f'{"<div class=cb>"+inner+"</div>" if pad else inner}</div>')

def p95_card(w=560):
    leg = '<div class="legend"><span><i style="background:#3fb97a"></i>p95 within budget</span><span><i style="background:#ef5b5b"></i>p95 over the 150 ms budget</span></div>'
    return card("p95 against the declared budget", f'<div class="cb">{p95_chart(w, 130)}{leg}</div>', "half-hour buckets · from forman.call.duration")

# ============================================================ A: docs page with a live rail
def a_operation():
    left = "".join([
        card("Ways in", ways_in()),
        card("Payload", fields_table(SP["payload"]), "3 fields · visibility today: all public (default)"),
        card("Answer", fields_table(SP["answer"])),
        card("The machine move", move_card(), "allowance · 3 states"),
        card("Event it emits", event_card()),
        card("Refusals", refusals_table(True), "every way this call can end without answering"),
        card("Steps", steps_card(), "each step is a child span"),
        card("Journeys that prove it", journeys_card()),
        source_card(),
    ])
    right = "".join([
        '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"><span class="dim">calls:</span>'
        '<a class="chip g" href="#t-4a1f9c02">answered 4a1f9c02</a><a class="chip a" href="#t-b70e1d44">refused b70e1d44</a><a class="chip r" href="#t-f61c2a08">defect f61c2a08</a>'
        '<a class="chip" href="#t-0000notallowed">NotAllowed (metric)</a><span class="dim" style="margin-left:auto">?trace=4a1f9c02&amp;span=allowance.spend.load</span></div>',
        trace_card("4a1f9c02", "answered", '<span class="chip g">ok · 32 ms</span>', trace_ok(), selected="allowance.spend.load"),
        inspector(),
        '<div style="height:10px"></div>',
        trace_card("b70e1d44", "refused", '<span class="chip a">AllowanceExceeded · ends OK</span>', trace_exceeded(), hint="the child that is missing shows where it stopped"),
        trace_card("f61c2a08", "defect", '<span class="chip r">defect · status error</span>', trace_defect(), hint="only a defect is red"),
        trace_card("0000notallowed", "NotAllowed", '<span class="chip">no operation span</span>', trace_notallowed(), hint="14 in 24 h, counted from forman.calls"),
        p95_card(),
        card("Recent calls", calls_table(CALLS[:7], "#", show_memo=True, compact=True), "last 15 minutes", mb=10),
        card("Refusals by tag, with the log that decided each", refusal_log_card(), "24 h"),
        card("Logs correlated to these traces", logs_card(), "click a trace id to jump to its waterfall"),
    ])
    body = ('<div class="crumb"><a href="matrix.html">operations</a> / <a href="#">allowance</a> / <b>spend</b></div>' + op_header() + kpi_strip()
            + '<div style="display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:12px;margin-top:12px"><div>' + left + '</div><div>' + right + '</div></div>'
            + footer('Option A · docs page with a live rail · /operations/allowance.spend'))
    return page("A · allowance.spend", body, "/operations/allowance.spend?env=production&window=24h", "matrix")

# ============================================================ B: operation as a service card with tabs
def b_card(active):
    calls, ref, d, p = totals("allowance.spend")
    tabs = [("Docs", "b-operation-docs.html", ""), ("Calls", "#", "1,218"), ("Traces", "b-operation.html", "1,217"), ("Logs", "#", ""), ("Refusals", "#", "52")]
    t = "".join(f'<a class="{"on" if n == active else ""}" href="{h}">{n}<span class="n">{c}</span></a>' for n, h, c in tabs)
    head = ('<div class="card" style="margin-bottom:12px"><div style="display:grid;grid-template-columns:1.05fr 1fr;border-bottom:1px solid var(--line)">'
            '<div style="padding:12px 14px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill-op">allowance.spend</span><span class="chip b">operation</span><span class="chip">thing: allowance</span></div>'
            '<div style="color:#b9c2d0;margin:6px 0 8px">Spend from what is left of this month\'s allowance.</div>'
            '<div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip b">allowance.grantee</span><span class="chip">active → active | exhausted</span><a class="chip v" href="event.html">AllowanceSpent</a>'
            '<a class="chip a" href="error.html#exceeded">AllowanceExceeded</a><span class="chip">budget p95 150 ms</span><span class="chip">idempotent per request</span></div>'
            '<div class="kpi" style="margin:12px -14px -12px;border-top:1px solid var(--line)">'
            f'<div><div class="l">calls</div><div class="v">{calls:,}</div></div><div><div class="l">refused</div><div class="v at">{ref}</div></div>'
            f'<div><div class="l">defects</div><div class="v rt">{d}</div></div><div><div class="l">p95 / budget</div><div class="v gt">{p}<span class="dim" style="font-size:12px"> / 150</span></div></div></div></div>'
            f'<div style="padding:8px 12px;border-left:1px solid var(--line)"><div class="legend" style="justify-content:space-between"><span>p95 vs 150 ms budget · 24 h</span><span><i style="background:#3fb97a"></i>within <i style="background:#ef5b5b;margin-left:8px"></i>over</span></div>{p95_chart(560, 128)}</div></div>'
            f'<div class="tabs" style="padding:0 8px">{t}</div></div>')
    return head

def b_operation():
    rows = "".join(
        f'<tr class="{"sel" if tr == "4a1f9c02" else ""}"><td class="dim">{tm}</td><td><a class="tid" href="#">{tr}</a></td><td>{outcome_chip(oc)}</td><td class="r">{dur_cell(du)}</td></tr>'
        for tm, tr, pe, oc, du, am, rem, memo in CALLS)
    lst = ('<div class="card"><div class="ch"><span>traces</span><span class="sub">filters: <span class="chip">outcome: any</span> <span class="chip">≥ 100 ms</span> <span class="chip">refusal: any</span></span></div>'
           f'<table class="t"><thead><tr><th>time</th><th>trace</th><th>outcome</th><th class="r">duration</th></tr></thead><tbody>{rows}</tbody></table>'
           '<div class="cb dim">+ 14 NotAllowed in 24 h are counted by <code>forman.calls</code>, not listed: they have no trace of this operation.</div></div>')
    total, spans = trace_ok()
    wf = (f'<div class="card"><div class="ch"><span>4a1f9c02 · answered <span class="chip g">32 ms</span></span><span class="sub">POST /allowance/spend · principal per_emtx…utro</span></div>'
          f'<div class="cb" style="padding-top:4px">{waterfall(spans, total, 230, selected="allowance.spend.load")}</div></div>')
    ref_total, ref_spans = trace_exceeded()
    wf2 = (f'<div class="card" style="margin-top:10px"><div class="ch"><span>b70e1d44 · refused <span class="chip a">AllowanceExceeded</span></span><span class="sub">ends OK, tagged</span></div>'
           f'<div class="cb" style="padding-top:4px">{waterfall(ref_spans, ref_total, 230)}</div></div>')
    docs_peek = ('<div class="card" style="margin-top:10px"><div class="ch"><span>docs for the selected span</span><a href="b-operation-docs.html">open Docs tab</a></div><div class="cb">'
                 '<dl class="kv" style="margin:0"><dt>span</dt><dd>allowance.spend.load · database step</dd><dt>handler</dt><dd><a href="#">examples/acme/src/allowance/spend.ts:13</a></dd>'
                 '<dt>attributes</dt><dd class="dim">payload.allowance · payload.amount · payload.memo <span class="tag-o2">traced today</span> · answer.remaining · principal.person · move.name · move.to</dd></dl></div></div>')
    body = ('<div class="crumb"><a href="matrix.html">operations</a> / allowance / <b>spend</b></div>' + b_card("Traces")
            + f'<div style="display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:12px"><div>{lst}</div><div>{wf}{wf2}{docs_peek}</div></div>'
            + footer("Option B · service card with tabs · /operations/allowance.spend?tab=traces"))
    return page("B · allowance.spend · Traces", body, "/operations/allowance.spend?tab=traces&trace=4a1f9c02", "matrix", extra_css="tr.sel td{background:#6aa6ff12}")

def b_docs():
    c1 = "".join([card("Ways in", ways_in()), card("Payload", fields_table(SP["payload"])), card("Answer", fields_table(SP["answer"])), card("The machine move", move_card()), card("Event it emits", event_card())])
    c2 = "".join([card("Refusals", refusals_table(True)), card("Steps", steps_card()), card("Journeys that prove it", journeys_card()), source_card()])
    body = ('<div class="crumb"><a href="matrix.html">operations</a> / allowance / <b>spend</b></div>' + b_card("Docs")
            + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div>{c1}</div><div>{c2}</div></div>'
            + footer("Option B · Docs tab · /operations/allowance.spend?tab=docs"))
    return page("B · allowance.spend · Docs", body, "/operations/allowance.spend?tab=docs", "matrix")

# ============================================================ C: trace-first; docs in a side sheet
def c_operation():
    facets = ('<aside class="side" style="width:220px"><h4>Scope</h4><a class="on" href="#">production</a>'
              '<h4>Operation</h4>' + "".join(f'<a class="{"on" if o == "allowance.spend" else ""}" href="#">{o}<span class="n">{totals(o)[0]:,}</span></a>' for o in ["allowance.spend", "allowance.grant", "allowance.revoke", "allowance.get", "session.sign-in", "person.sign-up"])
              + '<a href="matrix.html">all 15 …</a><h4>Outcome</h4><a href="#">answered<span class="n">1,165</span></a><a class="on" href="#">refused<span class="n a">52</span></a><a href="#">defect<span class="n r">1</span></a>'
              '<h4>Refusal</h4><a href="#">AllowanceExceeded<span class="n a">31</span></a><a href="#">AllowanceNotActive<span class="n a">7</span></a><a href="#">NotAllowed<span class="n a">14*</span></a>'
              '<h4>Duration</h4><a href="#">&gt; budget (150 ms)<span class="n r">6</span></a></aside>')
    rows = "".join(
        f'<tr class="{"sel" if tr == "b70e1d44" else ""}"><td class="dim">{tm}</td><td>allowance.spend</td><td><a class="tid" href="#">{tr}</a></td><td>{outcome_chip(oc)}</td><td>{dur_cell(du)}</td></tr>'
        for tm, tr, pe, oc, du, am, rem, memo in CALLS[:8])
    total, spans = trace_exceeded()
    center = ('<div class="crumb">traces / <b>operation = allowance.spend</b> <span class="chip a">outcome = refused</span> <span class="dim">· 24 h</span></div>'
              '<div class="card" style="margin-bottom:10px"><div class="ch"><span>calls per half-hour · refused in amber</span><span class="sub">metric forman.calls</span></div><div class="cb">'
              + spark("allowance.spend", 150, 650, 56) + '</div></div>'
              '<div class="card" style="margin-bottom:10px"><div class="ch"><span>traces</span><span class="sub">NotAllowed has no trace: * counted from the metric</span></div>'
              f'<table class="t"><thead><tr><th>time</th><th>operation</th><th>trace</th><th>outcome</th><th>duration</th></tr></thead><tbody>{rows}</tbody></table></div>'
              '<div class="card"><div class="ch"><span>b70e1d44 · refused <span class="chip a">AllowanceExceeded</span></span><span class="sub">click a span: the sheet scrolls to its handler line</span></div>'
              f'<div class="cb" style="padding-top:4px">{waterfall(spans, total, 240, selected="allowance.spend")}</div></div>')
    sheet = ('<aside class="sheet" style="width:520px;overflow:hidden;min-width:0"><div class="ch" style="padding:10px 14px"><span>docs · allowance.spend</span><span class="sub"><a href="b-operation-docs.html">open full page</a> · esc</span></div>'
             '<div style="padding:12px 14px"><div style="color:#b9c2d0;margin-bottom:8px">Spend from what is left of this month\'s allowance.</div>'
             '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><span class="chip b">allowance.grantee</span><span class="chip">active → active | exhausted</span><a class="chip v" href="event.html">AllowanceSpent</a><span class="chip">p95 150 ms</span></div>'
             + card("Payload and answer", fields_table({**SP["payload"], **{"answer.remaining": SP["answer"]["remaining"]}}), mb=10)
             + card("Refusals", refusals_table(False), mb=10) + source_card() + '</div></aside>')
    body = ('<div class="app" style="grid-template-columns:220px 1fr 520px">' + topbar("/traces?operation=allowance.spend&outcome=refused&trace=b70e1d44&sheet=allowance.spend", "production",
            '<div class="seg"><span class="on">Traces</span><span>Matrix</span><span>Logs</span><span>Catalog</span></div>')
            + '<div style="display:contents">' + facets + '<main class="main" style="padding-bottom:20px;min-width:0">' + center + footer("Option C · trace-first · /traces") + '</main>' + sheet + '</div></div>')
    css = CSS + "tr.sel td{background:#6aa6ff12}.app>.top{grid-column:1/4}.side{height:calc(100vh - 38px)}"
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>C · traces</title><style>{css}</style></head><body>{body}</body></html>')

if __name__ == "__main__":
    out = {"a-operation.html": a_operation(), "b-operation.html": b_operation(), "b-operation-docs.html": b_docs(), "c-operation.html": c_operation()}
    out.update(pages_other.build())
    for n, h in out.items():
        (OUT / n).write_text(h)
        print("wrote", n, len(h) // 1024, "KB")
