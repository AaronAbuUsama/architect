// Operation, environment and work pages: where declarations meet evidence.

function pageOperation(name) {
  const o = M.operations[name]; if (!o) return `<h1>No operation ${esc(name)}</h1>`;
  const t = M.things[o.thing]; const isRead = o.kind === "read"; const h = handlerFor(o);
  const refusals = refusalsOf(o);
  const js = journeysFor(name);
  const move = o.move ? `<p>Move <a href="${L.machine(o.thing)}"><code>${esc(o.move.key)}</code></a>: from <b>${esc(o.move.from.join(" or ") || "nothing (creates)")}</b> to <b>${esc(o.move.to.join(" or "))}</b>, emitting ${link(L.event(o.thing, o.move.emits), o.move.emits)}.</p>${machineSvg(o.thing, o.move.key)}`
    : `<p class="muted">${isRead ? "A read changes nothing: no move, no events, no handler." : "No machine move: this operation changes records without a state."}</p>`;
  const evidence = scopedEnvs().map((e) => `<div id="evidence-${e}">${staleExplainer(name, e)}</div>`).join("");
  const steps = Object.entries(o.steps);
  return `<div class="row">${o.kind === "read" ? plain("read", "k-read") : plain("operation", "k-op")}<a href="${L.thing(o.thing)}">${esc(o.thing)}</a>
    ${plain("runs: " + o.runs)}${plain("test: " + o.test)}</div>
  <h1><code style="font-size:22px">${esc(name)}</code></h1><p class="lede">${esc(o.description)}</p>
  <div class="split"><div class="grid">
    ${card("Who may call", `<div class="pill-list">${o.allowed.map(roleText).join(" ")}</div><p class="small muted">Anyone else is refused <code>NotAllowed</code> before the handler runs. Role rules are predicates in source; their text is not projected.</p>`, "HeroUI Chip")}
    ${card("Payload and answer", `<div data-tabs><div class="tabs"><button class="on" data-tab="p">Payload</button><button data-tab="a">Answer</button></div>
      <div data-pane="p">${fieldsTable(o.payload)}</div><div data-pane="a" hidden>${fieldsTable(o.answer)}</div></div>`, "Fumadocs TypeTable in HeroUI Tabs")}
    ${card("What it changes", move, "Architect · MachineDiagram (focused)")}
    ${card("Refusals", `${table(["Refusal", "Code", "Exit", "Carries", "Where it comes from"], refusals.map((r) => [`<a href="${L.error(r.name)}"><code>${esc(r.name)}</code></a>`, `<code>${esc(r.code)}</code>`, r.exit, Object.keys(r.fields).map((f) => `<code>${esc(f)}</code>`).join(", ") || "—", esc(r.origin)]))}
      <p class="small muted">A refusal is an expected answer, not a failure. A defect (an undeclared error or a crash) is a separate state in traces and evals.</p>`, "HeroUI Table")}
    ${card(`Evidence ${scopedEnvs().length === 1 ? "in " + esc(S.env) : "per environment"}`, `<div class="row" style="margin-bottom:8px">${scopedEnvs().map((e, i) => `${link(L.env(e), e)} ${evidenceRow(name)[i]}`).join(" ")}</div>${evidence}
      <details><summary class="small">Evals (nine per operation)</summary><p class="small muted">answer shape, declared errors, machine path, events, who may call, steps, performance, coverage, explainability. Per-eval results are unavailable: the logbook stores one aggregate verdict per operation.</p></details>`, "Architect · EvidencePanel + StalenessExplainer")}
    ${card("Journeys that call it (source)", js.length ? `<ol class="steps">${js.map(({ j, steps }) => `<li class="hot"><b>${link(L.journey(j.name), j.name)}</b> <span class="small muted">from ${j.starts ? link(L.world(j.starts), j.starts) : "no world"}</span>
      ${steps.map((s) => `<div class="small">step ${s.i + 1}, ${esc(s.actor)}: “${esc(s.title)}” ${s.asserts.map((a) => plain(a.kind + (a.event ? " " + a.event : a.error ? " " + refusalName(a.error) : a.state ? " " + a.state : ""), a.kind === "refuses" ? "k-ref" : "")).join(" ")}</div>`).join("")}</li>`).join("")}</ol>` : `<div class="callout none">No journey calls this operation. Its evals have nothing to observe.</div>`, "Architect · JourneyStepThrough (Fumadocs Steps shape)")}
  </div><div class="grid">
    ${card("Contract", `<table><tbody>
      <tr><td class="muted">Idempotent</td><td>${o.idempotent ? `by ${esc(o.idempotent)}` : "no"}</td></tr>
      <tr><td class="muted">Budget p95</td><td>${o.budget ? `${o.budget.p95Ms} ms <span class="small muted">target; measured p95 unavailable</span>` : "none"}</td></tr>
      <tr><td class="muted">Steps</td><td>${steps.length ? steps.map(([, s]) => `<code>${esc(s.name)}</code> <span class="muted small">${esc(s.type)}</span>`).join("<br>") : "none"}</td></tr>
      <tr><td class="muted">Handler</td><td>${isRead ? "none (reads have no handler)" : h ? `<code>${esc(h)}</code>` : `<span class="chip s-stale">not written</span>`}</td></tr></tbody></table>`, "HeroUI Table")}
    ${card("Call it", `<div data-tabs><div class="tabs"><button class="on" data-tab="cli">CLI</button><button data-tab="http">HTTP</button><button data-tab="sdk">SDK</button><button data-tab="mcp">MCP</button></div>
      <div data-pane="cli"><pre>acme ${esc(o.thing)} ${esc(o.verb)} ${Object.keys(o.payload).map((k) => `--${k} &lt;${k}&gt;`).join(" ")}</pre></div>
      <div data-pane="http" hidden><pre>POST /${esc(o.thing)}/${esc(o.verb)}</pre></div><div data-pane="sdk" hidden><pre>Sdk.${esc(o.thing)}.${esc(o.verb)}(payload)</pre></div>
      <div data-pane="mcp" hidden><p class="small muted">MCP tool output is L2.08, not generated at this revision.</p></div></div><p class="small muted">From the generated docs page.</p>`, "Fumadocs CodeBlock in Tabs")}
    ${card("Traces", `<div class="callout none small">Unavailable: no trace source. With O1 this shows the trace tree: span <code>${esc(name)}</code>${steps.map(([, s]) => ` → <code>${esc(s.name)}</code>`).join("")}, refusals marked separately from defects.</div>`, "Architect · TraceTree (later)")}
    ${card("Review details", `<details><summary class="small">Source and hash</summary><p class="small mono">${esc(o.file)}<br>hash ${esc(o.hash)}<br>thing hash ${esc(t.hash)}</p></details><details><summary class="small">Generated docs</summary><pre>${esc(ACME.docs[`${o.thing}/${o.verb}.md`] || "")}</pre></details>`, "HeroUI Accordion")}
  </div></div>`;
}

function pageEnvironment(name) {
  const e = M.environments[name]; if (!e) return `<h1>No environment ${esc(name)}</h1>`;
  const was = S.env; S.env = name; const states = countStates(OPS); const rows = OPS.map((o) => [opLink(o.name), evidenceRow(o.name)[0], esc(proof(o.name, name).reason)]); S.env = was;
  const deploy = Object.entries(e.deploy || {}).map(([k, d]) => [k, d.how, d.domain ? `<code>${esc(d.domain)}</code>` : "—"]);
  const publish = Object.entries(e.publish || {}).flatMap(([k, ps]) => ps.map((p) => [k, p.how, esc(p.tag ?? p.tap ?? p.on ?? "latest")]));
  return `<div class="row">${plain("environment")}${e.promotesFrom ? plain("promotes from " + e.promotesFrom) : ""}<span class="muted small mono">${esc(e.file)} · hash ${esc(e.hash)}</span></div>
  <h1>${esc(name)}</h1><p class="lede">Runs ${esc(e.runs)}. Callers are known by ${esc(e.identity)}.${e.lifetimeMs ? ` Worlds expire after ${e.lifetimeMs / 3600000} hours.` : ""}</p>
  <div class="split"><div class="grid">
    ${card("Proof in " + esc(name), `${illusNote()}<div class="row" style="margin-bottom:8px">${Object.entries(states).map(([s, n]) => `${chip(STATE_LABEL[s] + " " + n, "s-" + (s === "recorded-pass" ? "pass" : s))}`).join(" ")}</div>${table(["Operation", "State", "Why"], rows)}`, "HeroUI Pro · DataGrid")}
    ${card("Promotion", e.promotesFrom || name === "staging" ? `<p class="small">Promoting to ${esc(name)} needs a clean tree, an unchanged bundle sha256, and a pass on <code>refs/heads/main</code> for every operation in <b>${esc(e.promotesFrom || "test")}</b>.</p>` : `<p class="small muted">Nothing promotes into ${esc(name)}.</p>`, "Fumadocs Callout")}
  </div><div class="grid">
    ${card("Declared", `<table><tbody><tr><td class="muted">Cloud</td><td>${e.cloud ? `${esc(e.cloud.provider)}, ${esc(e.cloud.database)}` : "none"}</td></tr><tr><td class="muted">Database</td><td>${esc(e.database || "cloud")}</td></tr>
      <tr><td class="muted">Secrets</td><td>${Object.keys(e.secrets).length ? Object.entries(e.secrets).map(([k, v]) => `<code>${esc(k)}</code> ${esc(v)}`).join("<br>") : "none declared"} <span class="small muted">names only, never values</span></td></tr>
      <tr><td class="muted">Telemetry</td><td>${e.telemetry ? e.telemetry.map((s) => esc(s.sink)).join(", ") : "none declared"}</td></tr></tbody></table>`, "HeroUI Table")}
    ${card("Deploys", deploy.length ? table(["Output", "How", "Domain"], deploy) : `<p class="small muted">Deploys nothing.</p>`, "HeroUI Table")}
    ${card("Publishes", publish.length ? table(["Output", "How", "Channel"], publish) : `<p class="small muted">Publishes nothing.</p>`, "HeroUI Table")}
    ${card("Observed", `<div class="callout none small">Declared, not observed. Whether this is deployed, its running revision and bundle are unavailable until the cloud pass reports them.</div>`, "Architect · DeploymentStatus (later)")}
  </div></div>`;
}

// The board: every operation placed by the first unmet step of the build loop. Lanes are things, because milestones are not declared yet.
const STAGES = [["specify", "Specify", "has blanks"], ["implement", "Implement", "no handler yet"], ["cover", "Cover", "no journey calls it"], ["prove", "Prove", "not a recorded pass"], ["watch", "Promote · watch", "recorded pass"]];
function stageOf(o) {
  if (M.blanks?.[o.name]) return ["specify", "blank"];
  if (o.kind !== "read" && !handlerFor(o)) return ["implement", "no handler"];
  if (!journeysFor(o.name).length) return ["cover", "no journey"];
  const worst = scopedEnvs().map((e) => proof(o.name, e)).find((p) => p.state !== "recorded-pass");
  return worst ? ["prove", worst.state] : ["watch", "recorded pass"];
}
function pageWork() {
  const lanes = THINGS.filter((t) => OPS.some((o) => o.thing === t.name));
  const cardOf = (o, why) => `<div class="tcard"><b>${opLink(o.name)}</b><span class="row" style="margin:4px 0">${chip(why, "s-" + ({ "recorded pass": "pass", failed: "failed", stale: "stale" }[why] || "unproven"))}</span>
    <span class="muted small">context: ${Object.keys(o.payload).length} payload · ${o.refusals.length} refusals · ${journeysFor(o.name).length} journeys${o.move ? " · move " + esc(o.move.key) : ""}</span></div>`;
  const body = lanes.map((t) => `<div class="lane">${link(L.thing(t.name), t.name)}<small>${OPS.filter((o) => o.thing === t.name).length} ops</small></div>` +
    STAGES.map(([k]) => `<div class="slot">${OPS.filter((o) => o.thing === t.name && stageOf(o)[0] === k).map((o) => cardOf(o, stageOf(o)[1])).join("")}</div>`).join("")).join("");
  const counts = STAGES.map(([k, label]) => `${label} ${OPS.filter((o) => stageOf(o)[0] === k).length}`).join(" · ");
  return `<h1>Board</h1><p class="lede">Every operation sits in the first step of the build loop it has not met yet, in ${S.env === "all" ? "every environment" : esc(S.env)}. Derived from declarations, handlers, journeys and evidence; nobody moves cards by hand. ${counts}.</p>
  ${illusNote()}<div class="callout info small">Lanes are things because no milestone is declared in acme. When plan declarations exist (Codex's P1), lanes become milestones and cards become tasks linked to these operations.</div>
  ${card("", `<div class="scroll"><div class="board"><div></div>${STAGES.map(([, l, d]) => `<div class="col-h">${l}<br><span style="font-weight:400">${d}</span></div>`).join("")}${body}</div></div>`, "HeroUI Pro · Kanban (read-only)")}`;
}
