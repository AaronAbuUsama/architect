// Traces: the list, one trace as a span waterfall, and an operation's recent traces. All ILLUSTRATION until a trace source lands.
const OUTCOME = (t) => (t.outcome === "ok" ? `<span class="chip s-recorded-pass">answered</span>` : `<span class="chip s-failed">refused ${esc(t.outcome)}</span>`);
const budgetOf = (t) => M.operations[t.op].budget?.p95Ms;
const durCell = (t) => `${t.total} ms${budgetOf(t) ? `<div class="sub">budget ${budgetOf(t)} ms</div>` : ""}`;
const traceTable = (id, rows, title) => dataTable({
  id, title, rows, sort: { key: "at", dir: "desc" }, search: (t) => `${t.id} ${t.op} ${t.env} ${t.caller} ${t.outcome}`,
  filters: [{ key: "op", label: "Operation", of: (t) => t.op }, { key: "env", label: "Environment", of: (t) => t.env }, { key: "outcome", label: "Outcome", of: (t) => (t.outcome === "ok" ? "answered" : t.outcome) }],
  columns: [{ key: "id", label: "Trace", render: (t) => `<a href="${L.trace(t.id)}"><code>${esc(t.id)}</code></a>`, sort: (t) => t.id },
    { key: "op", label: "Operation", render: (t) => a(L.op(t.op), t.op), sort: (t) => t.op }, { key: "env", label: "Env", render: (t) => esc(t.env), sort: (t) => t.env },
    { key: "caller", label: "Caller", render: (t) => esc(t.caller), sort: (t) => t.caller }, { key: "outcome", label: "Outcome", render: OUTCOME, sort: (t) => t.outcome },
    { key: "dur", label: "Duration", align: "r", render: durCell, sort: (t) => t.total }, { key: "spans", label: "Spans", align: "c", render: (t) => t.spans.length, sort: (t) => t.spans.length, hide: true },
    { key: "at", label: "When", render: (t) => `<span class="small">${esc(t.at)}</span>`, sort: (t) => t.at }],
});
const KIND = { root: "operation", auth: "who may call", step: "step", event: "event", refusal: "refusal" };
function waterfall(t) {
  const evalName = (k) => EVALS.find(([x]) => x === k)[1];
  return `<div class="wf">${t.spans.map((s, i) => `<details class="wf-row k-${s.kind}"${i === 0 || s.kind === "refusal" ? " open" : ""}>
    <summary><span class="wf-name" style="padding-left:${s.kind === "root" ? 0 : 18}px">${esc(s.name)} <span class="muted small">${KIND[s.kind]}</span></span>
      <span class="wf-track"><span class="wf-bar" style="left:${(s.start / t.total) * 100}%;width:${Math.max((s.dur / t.total) * 100, 1.2)}%"></span></span><span class="wf-ms">${s.dur} ms</span></summary>
    <div class="wf-detail"><div>${Object.entries(s.attrs).map(([k, v]) => `<code>${esc(k)}=${esc(v)}</code>`).join(" ")}</div>
      ${s.log ? `<div class="wf-log"><span class="muted">log</span> ${esc(s.log)}</div>` : ""}
      <div class="small">Evidence for: ${(EVIDENCE_FOR[s.kind] ?? []).map((k) => `<span class="badge">${esc(evalName(k))}</span>`).join(" ")}</div></div></details>`).join("")}
    <div class="wf-axis"><span>0 ms</span><span>${Math.round(t.total / 2)} ms</span><span>${t.total} ms</span></div></div>`;
}
Object.assign(PAGES, {
  traces() {
    return { title: "Traces", crumbs: [[L.home, BP.project]], toc: [], html: `<h1>Traces ${illus}</h1><p class="lead">Every call, as the spans it made: who was allowed, each step, the event it emitted or the refusal and why.</p>
      <div class="callout none small"><b>Not wired yet.</b> The portal's traces route answers 404 until a trace source is connected (O1). The rows below are made up; their span names, steps, events and codes are acme's real ones.</div>
      ${traceTable("traces", TRACES, "Recent traces")}` };
  },
  trace(id) {
    const t = traceById(id); if (!t) return null; const o = M.operations[t.op];
    return { title: id, crumbs: [[L.home, BP.project], [L.traces, "Traces"]], toc: [["spans", "Spans"], ["evals", "What it proves"]], html: `
      <h1><code>${esc(id)}</code> ${illus}</h1><p class="lead">${a(L.op(t.op), t.op)} by <b>${esc(t.caller)}</b> in ${a(L.env(t.env), t.env)}, ${esc(t.at)}.</p>
      <div class="badges">${OUTCOME(t)}<span class="badge">${t.total} ms${o.budget ? ` of ${o.budget.p95Ms} ms budget` : ""}</span><span class="badge">${t.spans.length} spans</span></div>
      ${sec("spans", "Spans", waterfall(t))}
      ${sec("evals", "What it proves", `<p>The evals read this trace, not what the server says about itself. Open a span to see which eval it is evidence for. ${a(L.op(t.op) + "#evals", `All of ${t.op}'s evals`)}.</p>`)}` };
  },
});
