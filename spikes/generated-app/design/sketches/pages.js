// The page kinds, each a function of the model and telemetry. The written prose in them is sample text, marked as such.
const sumRefused = (name) => Object.values(A.ops[name]?.refused ?? {}).reduce((a, b) => a + b, 0);
const kpis = (name) => {
  const o = A.ops[name];
  return `<div class="grid4"><div class="kpi"><div class="l">calls</div><div class="v">${o.calls}</div><div class="s">${o.replayed} replayed by request key</div></div>
    <div class="kpi"><div class="l">answered</div><div class="v" style="color:var(--ok)">${o.answered}</div><div class="s">${Math.round((o.answered / o.calls) * 100)}%</div></div>
    <div class="kpi"><div class="l">refused</div><div class="v" style="color:var(--warn)">${sumRefused(name)}</div><div class="s">${Object.entries(o.refused).map(([k, v]) => `${v} ${k.replace("Allowance", "")}`).join(" · ")}</div></div>
    <div class="kpi"><div class="l">p95 against budget</div><div class="v">${o.p95} ms</div><div class="s">budget ${o.budget} ms · ${o.defects} defects</div></div></div>`;
};

const actionCode = (op) => {
  const errs = op.refusals.map((r) => `"${r}"`).join(", ");
  const z = (f) => (f.value.type === "id" ? `z.string().startsWith("${f.value.prefix}_")` : f.value.type === "uint" ? `z.string().regex(/^\\d+$/)` : `z.string().max(${f.value.max})`);
  const obj = (fs) => `z.object({ ${Object.entries(fs).map(([k, f]) => `${k}: ${z(f)}`).join(", ")} })`;
  return `<pre class="mono" style="margin:0;white-space:pre-wrap;font-size:11.8px;line-height:1.55">${esc(`// Generated from ${op.file}. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/acme.ts";

export const errors = defineActionErrors(${errs});

export default defineAction({
  description: "${op.description}",
  schema: ${obj(op.payload)},
  outputSchema: ${obj(op.answer)},
  errors,
  readOnly: ${op.kind === "read"},
  retrySafe: ${op.idempotent === "request"},   // idempotent: ${JSON.stringify(op.idempotent)}
  needsApproval: false,                          // no .notVia(Via.agent) yet (M2.01)
  run: (args, ctx) => acme.call("${op.name}", args, ctx),  // the SDK, as ctx's caller
});`)}</pre>`;
};

const operationPage = (name) => {
  const op = M.operations[name];
  const src = `${op.file}:${lineOf[name] ?? ""} · ${op.hash.slice(0, 8)}`;
  const ex = A.samples.exceeded;
  return `<div class="doc">
    <div class="muted" style="font-size:12px">operation · generated from the blueprint</div>
    <h1>${name}</h1>
    <div class="chips"><span class="chip a">${op.kind}</span><span class="chip">thing: ${op.thing}</span><span class="chip">move: ${op.move?.key ?? "none"}</span><span class="chip">idempotent per ${op.idempotent ?? "—"}</span><span class="chip">budget p95 ${op.budget.p95Ms} ms</span><span class="chip">who: ${op.allowed.map((a) => a.role).join(", ")}</span></div>
    <p class="lede">${op.description}</p>
    ${prose({ by: "Aaron (sample prose)", when: "18 Nov", about: `allowance.spend@${op.hash.slice(0, 8)}`, html: "<p style='margin:0'>Olga's team spends from this all day. A refusal here is normal, not a fault: the amount was more than was left, or the month is over. Only a red span means something broke.</p>" })}
    ${live("Calls", kpis(name) + `<div style="margin-top:10px">${callsChart(name)}</div>`)}
    <div class="grid2">${derived("Payload", `spend.ts:10`, fieldsTable(op.payload))}${derived("Answer", `spend.ts:11`, fieldsTable(op.answer))}</div>
    ${derived("What it changes", `blueprint/things/allowance/machine.ts · ${M.things.allowance.hash.slice(0, 8)}`, machineSvg(op.thing, { lit: op.move?.key, counts: moveCounts() }) + `<div class="caption">spend moves an active allowance to active or exhausted and emits <code>AllowanceSpent</code>. Counts are live, from the events seen.</div>`)}
    ${derived("Refusals", `${op.file}:13-14 · derived: errors + machine + role`, `<table><tr><th>refusal</th><th>from</th><th>code</th><th class="num">exit</th><th>carries</th><th class="num">seen (live)</th></tr>${refusalRows(op)}</table>`)}
    ${prose({ by: "agent (sample prose)", when: "12 Nov", about: "allowance.spend@1c09e2f4", agent: true, stale: "spend changed after this was written: <code>errors</code> gained <code>AllowanceExceeded</code>.", html: "<p style='margin:0'>Spend can only fail if the allowance isn't active. Nothing checks the amount yet.</p>" })}
    ${live("Recent calls", recentTable(name))}
    ${live(`Trace ${ex.call.trace.slice(0, 12)}… · ${who(ex.call.person)} · ${ex.call.refusal}`, waterfall(ex, "allowance.spend") + attrsOf(ex, "allowance.spend"), `${clock(ex.call.at)} · ${ex.spans.length} spans · ${ex.call.ms} ms`)}
    ${derived("Ways in", "generated/{api,sdk,cli,mcp,app}", `<table><tr><td class="muted">HTTP</td><td><code>POST /allowance/spend</code></td></tr><tr><td class="muted">SDK</td><td><code>acme.allowance.spend({ allowance, amount, memo })</code></td></tr><tr><td class="muted">CLI</td><td><code>acme allowance spend --allowance … --amount … --memo …</code></td></tr><tr><td class="muted">MCP</td><td><code>allowance.spend</code></td></tr><tr><td class="muted">This app</td><td><code>generated/app/actions/allowance-spend.ts</code> · the chat, the button, HTTP, MCP, A2A and the CLI</td></tr></table>`)}
    ${derived("The action this app runs", `generated/app/actions/allowance-spend.ts`, actionCode(op))}
    </div>`;
};

const machinePage = (thing) => {
  const m = M.things[thing].machine;
  const counts = moveCounts();
  const reached = (s) => Object.entries(m.moves).filter(([, v]) => v.to.includes(s)).map(([k]) => k).join(", ");
  const left = (s) => Object.entries(m.moves).filter(([, v]) => v.from.includes(s)).map(([k]) => k).join(", ") || '<span class="muted">terminal</span>';
  return `<div class="doc"><div class="muted" style="font-size:12px">machine · generated from the blueprint</div><h1>${thing} machine</h1>
    <div class="chips">${m.states.map((s) => `<span class="chip">${s}</span>`).join("")}<span class="chip">${Object.keys(m.moves).length} moves</span><span class="chip warn">refuses with ${m.notFrom.error} · ${m.notFrom.code}</span></div>
    ${derived("States and moves", `blueprint/things/${thing}/machine.ts · ${M.things[thing].hash.slice(0, 8)}`, machineSvg(thing, { counts }) + `<div class="caption">Numbers are moves seen in the last ${A.source.minutes} minutes on local, counted from their events.</div>`)}
    ${derived("Moves", `blueprint/things/${thing}/machine.ts`, `<table><tr><th>move</th><th>from</th><th>to</th><th>emits</th><th>operation</th><th class="num">seen (live)</th></tr>${Object.entries(m.moves).map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v.from.join(", ") || '<span class="muted">nothing (creates)</span>'}</td><td>${v.to.join(", ")}</td><td><code>${v.emits}</code></td><td><a>${thing}.${k}</a></td><td class="num">${v.to.map((t) => counts[`${k}:${t}`] ?? 0).join(" + ")}</td></tr>`).join("")}</table>`)}
    ${derived("States", `blueprint/things/${thing}/machine.ts`, `<table><tr><th>state</th><th>reached by</th><th>left by</th></tr>${m.states.map((s) => `<tr><td><b>${s}</b></td><td>${reached(s)}</td><td>${left(s)}</td></tr>`).join("")}</table>`)}
    ${live("Refused by the machine", `<p style="margin:0"><b>${A.ops["allowance.spend"].refused.AllowanceNotActive}</b> spend calls were refused <code>${m.notFrom.error}</code> (${m.notFrom.code}, exit ${m.notFrom.exit}): the allowance was exhausted or revoked. Each is a span tagged <code>refusal</code>, ended OK.</p>`)}
    ${live("Where allowances are now", `<p style="margin:0" class="muted">Not in telemetry. A count by state needs a read over the store (<code>allowance</code> in D1), which the app would call as a read action. <span class="chip warn">gap · pass 2 decides</span></p>`)}
    ${prose({ by: "Aaron (sample prose)", when: "18 Nov", about: `allowance.machine@${M.things[thing].hash.slice(0, 8)}`, html: "<p style='margin:0'>Exhausted isn't the end: next month's grant starts a new allowance. Revoked is the end.</p>" })}
    <div class="caption">Found while drawing this: <code>allowance.revoke</code>'s span carries <code>event.name</code> but not <code>move.name</code>; the move is written on its step span, because the handler calls <code>move("revoked")</code> inside <code>steps.update(…)</code>.</div></div>`;
};

const envPage = () => {
  const E = M.environments;
  const card = (n, status) => {
    const e = E[n];
    const where = Object.entries(e.deploy).map(([k, v]) => `${k}: ${v.domain}`).join("<br>") || (n === "local" ? "127.0.0.1:8787 (forman dev)" : "a world per pull request");
    return `<div class="env${status.up ? " up" : ""}"><h3>${status.up ? '<span class="pill" style="padding:0 6px"><span class="g"></span>up</span>' : '<span class="chip">' + status.label + "</span>"} ${n}</h3>
      <div class="muted" style="font-size:12.5px">${e.runs}</div><dl><dt>where</dt><dd class="mono" style="font-size:11.5px">${where}</dd><dt>database</dt><dd>${e.cloud ? `${e.cloud.provider} ${e.cloud.database}` : e.database}</dd>
      <dt>identity</dt><dd>${e.identity}</dd><dt>telemetry</dt><dd>${(e.telemetry ?? []).map((t) => t.sink).join(", ") || '<span class="muted">not declared</span>'}</dd><dt>lifetime</dt><dd>${e.lifetimeMs ? `${e.lifetimeMs / 3600000} h` : "lasts"}</dd>
      <dt>promotes from</dt><dd>${e.promotesFrom ?? "—"}</dd><dt>running</dt><dd>${status.running}</dd><dt>source</dt><dd class="mono" style="font-size:11px">${e.file}</dd></dl></div>`;
  };
  return `<div class="doc wide"><div class="muted" style="font-size:12px">environments · generated from the blueprint, status read live</div><h1>Environments</h1>
    <p class="lede">Four are declared. One is running, on this machine. Staging and production are declared but not deployed, and the page says so rather than guessing.</p>
    <div class="flow"><span class="chip ok">local</span><span class="chip">test · a world per pull request</span><span style="margin-left:12px" class="chip">staging</span>→ promotes to →<span class="chip">production</span><span class="muted">(production.promotesFrom)</span></div>
    <div class="grid2">${card("local", { up: true, running: `working tree · ${A.source.traces} traces in ${A.source.minutes} min` })}${card("test", { label: "none alive", running: "read from <code>forman worlds</code> in the app; not read for this sketch" })}${card("staging", { label: "not deployed", running: "no deploy recorded in the logbook" })}${card("production", { label: "not deployed", running: "no release recorded" })}</div>
    ${live("What local is doing", `<div class="grid3"><div class="kpi"><div class="l">calls</div><div class="v">${A.source.traces}</div><div class="s">${Object.keys(A.ops).filter((k) => A.ops[k].calls).length} of ${Object.keys(A.ops).length} operations called</div></div><div class="kpi"><div class="l">refused</div><div class="v" style="color:var(--warn)">${Object.keys(A.ops).reduce((s, k) => s + sumRefused(k), 0)}</div><div class="s">all on spend</div></div><div class="kpi"><div class="l">defects</div><div class="v">0</div><div class="s">nothing red</div></div></div>`)}
    ${derived("Proof per environment", "logbook · not wired", `<p class="muted" style="margin:0">Each operation × environment cell (recorded pass, failed, stale, unproven) comes from the logbook, as F2 drew it. The logbook isn't wired into this sketch, so the cells say <span class="chip">unavailable</span>, never green.</p>`)}</div>`;
};

const livePage = () => {
  const names = Object.keys(A.ops).sort((a, b) => A.ops[b].calls - A.ops[a].calls);
  const all = A.series["allowance.spend"].map((_, i) => Object.values(A.series).reduce((s, b) => [s[0] + b[i][0], s[1] + b[i][1], s[2] + b[i][2]], [0, 0, 0]));
  A.series.__all = all;
  const evs = A.recent.filter((c) => c.event).slice(-5).reverse();
  return `<div class="doc wide"><div class="muted" style="font-size:12px">live · the system as it runs</div><h1>Live</h1>
    <p class="lede">What is flowing through acme on <b>local</b>, now: events, refusals, defects, and every operation against its budget.</p>
    ${live("Calls, all operations", callsChart("__all", 110))}
    <div class="grid2" style="grid-template-columns:1fr 1.15fr">${live("Events", `<table><tr><th>event</th><th>from move</th><th class="num">seen</th></tr>${Object.entries(A.events).map(([e, n]) => `<tr><td><code>${e}</code></td><td class="muted">${A.moves.find((m) => M.operations[m.op]?.move?.emits === e)?.op ?? "organization.create"}</td><td class="num">${n}</td></tr>`).join("")}</table><h3>Latest</h3>${evs.map((c) => `<div class="mono" style="font-size:11.5px;padding:2px 0"><span class="muted">${clock(c.at)}</span> <b>${c.event}</b> ${Object.entries({ ...c.payload, ...c.answer }).filter(([k]) => k !== "memo").map(([k, v]) => `${k}=${esc(v)}`).join(" ")}</div>`).join("")}`)}
    ${live("Refusals and defects", `<table><tr><th>refusal</th><th>operation</th><th>seen on</th><th class="num">count</th></tr>${Object.entries(A.ops["allowance.spend"].refused).map(([r, n]) => `<tr><td><code>${r}</code></td><td>allowance.spend</td><td class="muted">${r === "NotAllowed" ? "HTTP 403" : "op span"}</td><td class="num">${n}</td></tr>`).join("")}<tr><td><b style="color:var(--bad)">defects</b></td><td class="muted">any</td><td class="muted">red span</td><td class="num">0</td></tr></table><p class="caption">NotAllowed is decided before the operation's span opens, so it is counted from the HTTP span, and nobody is named. O2's <code>forman.calls</code> metric (M1.20) will count it for every way in.</p>`)}</div>
    ${live("Each operation against its budget", names.filter((n) => A.ops[n].calls).map(budgetBar).join("") + `<p class="caption">${names.filter((n) => !A.ops[n].calls).length} operations had no calls in this window: ${names.filter((n) => !A.ops[n].calls).join(", ")}.</p>`)}</div>`;
};

const thingPage = (t) => {
  const th = M.things[t];
  return `<div class="doc"><div class="muted" style="font-size:12px">thing · generated from the blueprint</div><h1>${t}</h1>
    <div class="chips"><span class="chip">lives in ${th.lives}</span><span class="chip">code ${th.code}</span><span class="chip">role: ${th.roles.join(", ")}</span><span class="chip mono">${th.hash.slice(0, 8)}</span></div><p class="lede">${th.description}</p>
    ${derived("Fields", `blueprint/things/${t}/thing.ts`, fieldsTable(th.fields))}
    ${derived("Operations", `blueprint/things/${t}/verbs/*`, `<table><tr><th>operation</th><th>who</th><th>move</th><th class="num">calls</th><th class="num">refused</th><th class="num">p95 / budget</th></tr>${opsOf(t).map((o) => `<tr><td><a>${o.verb}</a> <span class="muted">${o.kind === "read" ? "read" : ""}</span></td><td class="muted">${o.allowed.map((a) => a.role).join(", ")}</td><td>${o.move ? `${o.move.from.join("|") || "∅"} → ${o.move.to.join("|")}` : ""}</td><td class="num">${A.ops[o.name].calls}</td><td class="num">${sumRefused(o.name)}</td><td class="num">${A.ops[o.name].p95 ?? "—"} / ${o.budget.p95Ms} ms</td></tr>`).join("")}</table>`)}
    <div class="grid2">${derived("Events", `blueprint/things/${t}/events.ts`, `<table>${Object.entries(th.events).map(([e, f]) => `<tr><td><code>${e}</code></td><td class="muted">${Object.keys(f).join(", ")}</td><td class="num">${A.events[e] ?? 0}</td></tr>`).join("")}</table>`)}
    ${derived("Errors", `blueprint/things/${t}/errors.ts`, `<table>${Object.entries(th.errors).map(([e, v]) => `<tr><td><code>${e}</code></td><td class="mono">${v.code}</td><td class="muted">${Object.keys(v.fields).join(", ")}</td></tr>`).join("")}<tr><td><code>${th.machine.notFrom.error}</code></td><td class="mono">${th.machine.notFrom.code}</td><td class="muted">machine</td></tr></table>`)}</div>
    ${derived("Machine", `blueprint/things/${t}/machine.ts`, machineSvg(t, { counts: moveCounts() }))}</div>`;
};

const notePage = () => `<div class="doc"><div class="muted" style="font-size:12px">page · written by Aaron · 18 Nov</div><h1>How allowances should feel</h1>
  <p>This is a page a person wrote. It is not generated, and nothing overwrites it. It can pull in any block, so it stays true when the code changes.</p>
  <p>A member should never be surprised. When spend says no, they should be told what is left. That is what <code>AllowanceExceeded</code> carries:</p>
  ${derived("Model · allowance.spend · refusals", `<Model operation="allowance.spend" show="errors" />`, `<table><tr><th>refusal</th><th>from</th><th>code</th><th class="num">exit</th><th>carries</th><th class="num">seen</th></tr>${refusalRows(M.operations["allowance.spend"])}</table>`)}
  <p>How often does it happen? Right now:</p>
  ${live("Live · allowance.spend · calls", kpis("allowance.spend"), `&lt;Live operation="allowance.spend" show="calls" /&gt;`)}
  ${prose({ by: "agent · suggestion", when: "18 Nov", about: "this page", agent: true, html: `<p style="margin:0">Suggest adding: 92 NotAllowed refusals in this window came from someone who isn't a grantee. If that is a person trying to spend from someone else's allowance, it may deserve its own message. <span class="btn p">Accept</span><span class="btn">Dismiss</span></p>` })}
  <p class="muted">Open questions: should a month's reset be a time move (L5), or a fresh grant as today?</p></div>`;
