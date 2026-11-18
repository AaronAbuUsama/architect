// The screens. Written prose in them is sample text and says so; everything else is acme's model and one local run.
const header = ({ kicker, title, lede, status, acts = "" }) =>
  `<div class="ph"><div class="acts">${acts}</div><div class="kicker">${kicker}</div><h1>${title}</h1><p class="lede">${lede}</p><div class="status">${status}</div></div>`;
const written = (by, html, { agent, stale } = {}) =>
  `<div class="prose${stale ? " stale" : ""}"><div class="by">${agent ? '<span class="ag">✦ agent</span>' : "✎"} ${by}</div>${html}${stale ? `<div class="stalebar">⚠ ${stale}<span class="sp" style="flex:1"></span><span class="btn">Show the change</span><span class="btn">Still true</span><span class="btn">Edit</span></div>` : ""}</div>`;
const from = (src) => `<div class="foot">from ${src}</div>`;
const fields = (fs) => `<table><tr><th>field</th><th>type</th><th>means</th></tr>${Object.entries(fs).map(([k, f]) => `<tr><td><code>${k}</code></td><td class="muted">${typeOf(f)}</td><td>${f.ref ? `→ <code>${f.ref}</code>` : f.named ?? ""}</td></tr>`).join("")}</table>`;

/** Sample notes people left on refusals: the written column of the joined table. */
const refusalNotes = {
  "allowance.spend:AllowanceExceeded": "Carries <code>remaining</code>, so the client can offer the smaller amount.",
  "allowance.spend:NotAllowed": "The owner who granted it can't spend it. Only the member can.",
  "allowance.spend:AllowanceNotActive": "Spent out this month, or revoked. Not a fault.",
};
/** The one place the three kinds meet in a row: the rule (generated), a note (written), how often (live). Across
 * several operations only the refusals that fired are listed; the rest fold into one line. */
const refusalsTable = (ops) => {
  const rows = [], quiet = [];
  for (const op of ops) for (const r of op.refusals) {
    const th = M.things[op.thing], e = th.errors[r];
    const why = e ? `declared in errors.ts` : r === "NotAllowed" ? `not ${op.allowed.map((a) => a.role).join(" or ")}` : `machine: not from ${op.move?.from.join(", ")}`;
    const code = e ? e.code : r === "NotAllowed" ? "AR-001" : th.machine.notFrom.code;
    const seen = A.ops[op.name]?.refused?.[r] ?? 0;
    if (ops.length > 1 && !seen) { quiet.push(`${r} <span class="muted">· ${op.verb}</span>`); continue; }
    rows.push(`<tr><td><code>${r}</code>${ops.length > 1 ? ` <span class="muted">· ${op.verb}</span>` : ""}<div class="muted" style="font-size:12px">${why} · ${code}</div></td><td class="note">${refusalNotes[`${op.name}:${r}`] ?? '<span class="muted">—</span>'}</td><td class="num live">${seen ? `<b>${fmt(seen)}</b>` : '<span class="muted">0</span>'}</td></tr>`);
  }
  return `<table><tr><th style="width:38%">refusal</th><th>note</th><th class="num live">● last ${A.source.minutes} min</th></tr>${rows.join("")}</table>${quiet.length ? `<p class="muted" style="font-size:13px;margin:8px 10px">Declared, not seen in this window: ${quiet.join(", ")}.</p>` : ""}`;
};

const operationPage = (name, { calls } = {}) => {
  const op = M.operations[name];
  const read = `<div class="read">
    ${written("Aaron · 18 Nov · sample", "<p>Olga's team spends from this all day: coffee, taxis, the odd hotel. A spend that would go over is refused with what is left, so the client can offer the smaller amount. Only the member it was granted to can spend; the owner who granted it cannot.</p>")}
    <h2>Who may call</h2><p style="margin:0"><code>allowance.grantee</code>, the member the allowance was granted to. Over HTTP <code>POST /allowance/spend</code>, the SDK, the CLI and MCP.</p>
    <h2>Takes and gives</h2><div class="grid2"><div>${fields(op.payload)}</div><div>${fields(op.answer)}</div></div>
    <h2>What it changes</h2><p style="margin:0">Moves an allowance from <b>active</b> to <b>active</b> or <b>exhausted</b>, and records <code>AllowanceSpent</code>. Steps: <code>load</code> then <code>record</code>, both in the database. <a>The machine →</a></p>
    <h2>When it says no</h2>${refusalsTable([op])}
    ${from(`${op.file} · ${op.hash.slice(0, 8)} · drawn from the model on every view`)}</div>`;
  return header({ kicker: `<a>allowance</a> › operation`, title: "spend", lede: op.description, status: statusOf([name]),
    acts: '<span class="btn">spend.ts ↗</span><span class="btn p">Try it</span>' }) + `<div class="cols">${read}${rail([name], { calls })}</div>`;
};

const thingPage = (t) => {
  const th = M.things[t], ops = opsOf(t);
  const opRows = ops.map((o) => { const s = A.ops[o.name]; return `<tr><td><a><b>${o.verb}</b></a> <span class="muted">${o.kind === "read" ? "read" : ""}</span><div class="muted" style="font-size:12px">${o.description}</div></td><td><code>${o.allowed.map((a) => a.role ?? a.kind).join(", ")}</code></td><td class="live"><span class="dotk ${health(o.name)}"></span> ${s?.calls ? `${fmt(s.calls)} · p95 ${s.p95} of ${s.budget}` : '<span class="muted">no calls</span>'}</td></tr>`; }).join("");
  const read = `<div class="read">
    ${written("Aaron · 18 Nov · sample", "<p>An organisation gives a member a monthly allowance. The member spends from it; the owner can revoke it. Next month's grant starts a new one.</p>")}
    <h2>Operations</h2><table><tr><th>verb</th><th>who may call</th><th class="live">● now</th></tr>${opRows}</table>
    <h2>Lifecycle</h2><div class="machine">${machineSvg(t, { counts: moveCounts() })}</div><div class="muted" style="font-size:12px">Numbers on the arrows are moves seen in the last ${A.source.minutes} min.</div>
    ${written("agent · 12 Nov", "<p>Spend can only fail when the allowance isn't active, or when the caller isn't its grantee.</p>", { agent: true, stale: "spend changed since: <code>errors</code> gained <code>AllowanceExceeded</code>." })}
    <h2>When it says no</h2>${refusalsTable(ops.filter((o) => o.refusals.length))}
    <h2>Events</h2><table><tr><th>event</th><th>carries</th><th class="num live">● seen</th></tr>${Object.entries(th.events).map(([e, f]) => `<tr><td><code>${e}</code></td><td class="muted">${Object.keys(f).join(", ")}</td><td class="num live">${fmt(A.events[e] ?? 0)}</td></tr>`).join("")}</table>
    <h2>Fields</h2>${fields(th.fields)}
    ${from(`blueprint/things/${t}/ · ${th.hash.slice(0, 8)}`)}</div>`;
  return header({ kicker: "thing", title: t, lede: th.description, status: statusOf(ops.map((o) => o.name)) }) + `<div class="cols">${read}${rail(ops.map((o) => o.name))}</div>`;
};

const homePage = () => {
  const all = Object.keys(A.ops);
  const called = all.filter((n) => A.ops[n].calls).sort((a, b) => A.ops[b].calls - A.ops[a].calls);
  const idle = all.filter((n) => !A.ops[n].calls);
  const na = A.ops["allowance.spend"].refused.NotAllowed;
  const read = `<div class="read">
    <h2>Worth a look</h2>
    <div class="callout">Nothing is broken: no defects, every operation within its budget.</div>
    <div class="callout warn"><b>${na} calls to spend were refused <code>NotAllowed</code>.</b> Someone is calling who may not: spend is open only to the grantee. The traces don't say who (the check runs before the operation's span). <a>See them →</a></div>
    ${written("agent · 12 Nov · on allowance", "<p>A note went stale: spend gained <code>AllowanceExceeded</code> after it was written.</p>", { agent: true })}
    <h2>Operations</h2><table><tr><th>operation</th><th class="num">calls</th><th class="num">refused</th><th style="width:30%">p95 against budget</th></tr>${called.map((n) => { const o = A.ops[n]; return `<tr><td><span class="dotk ${health(n)}"></span> <a>${n}</a></td><td class="num">${fmt(o.calls)}</td><td class="num">${refusedOf(n) ? fmt(refusedOf(n)) : '<span class="muted">0</span>'}</td><td><div class="meter"><i style="width:${Math.max(2, (o.p95 / o.budget) * 100)}%"></i></div><span class="muted" style="font-size:12px">${o.p95} of ${o.budget} ms</span></td></tr>`; }).join("")}</table>
    <p class="muted" style="font-size:13px">${idle.length} not called in this window: ${idle.map((n) => `<a>${n}</a>`).join(", ")}.</p></div>`;
  const events = `<h4>Events</h4><div class="counts">${Object.entries(A.events).map(([e, n]) => `<span class="k"><code>${e}</code></span><span class="num">${fmt(n)}</span>`).join("")}</div>`;
  return header({ kicker: "home", title: "acme", lede: `${Object.keys(M.things).length} things and ${all.length} operations. Running on local; staging and production are declared, not deployed.`, status: statusOf(all) })
    + `<div class="cols">${read}${rail(called, { extra: events })}</div>`;
};

const notePage = () => {
  const sp = A.ops["allowance.spend"];
  return header({ kicker: "note · Aaron · 18 Nov · sample", title: "How allowances should feel", lede: "A page a person wrote. Nothing overwrites it; the blocks in it are drawn fresh each time.", status: '<span class="chip">✎ written</span><span class="chip">2 blocks by reference</span>' })
    + `<div class="read" style="max-width:760px;margin-left:0"><div class="prose"><p>A member should never be surprised. When spend says no, it should say what is left. That is what <code>AllowanceExceeded</code> carries:</p></div>
    ${refusalsTable([M.operations["allowance.spend"]])}${from("&lt;Refusals of=\"allowance.spend\" /&gt;")}
    <div class="prose"><p>How often does it happen right now?</p></div>
    <div class="card"><div class="hd" style="font-size:12.5px;color:var(--ink2);display:flex;gap:8px;align-items:center"><span class="dotk"></span>Live · allowance.spend · local · last ${A.source.minutes} min</div><div style="margin:8px 0">${statusOf(["allowance.spend"])}</div>${spark(A.series["allowance.spend"], 640, 46)}</div>${from("&lt;Live of=\"allowance.spend\" show=\"status\" /&gt;")}
    <div class="prose"><p>Open question: should a month's reset be a time move, or a fresh grant as today?</p></div>
    ${written("agent · suggestion", `<p>${sp.refused.NotAllowed} NotAllowed refusals on spend in this window. If people are trying to spend from someone else's allowance, the client could hide the button for anyone who isn't the grantee.</p>`, { agent: true })}</div>`;
};

const envPage = () => {
  const E = M.environments;
  const card = (n, up, running) => { const e = E[n]; return `<div class="card"><div style="display:flex;align-items:center;gap:8px"><b>${n}</b>${up ? '<span class="chip ok">● running</span>' : `<span class="chip">${running}</span>`}</div><div class="muted" style="font-size:13px">${e.runs}</div><dl><dt>database</dt><dd>${e.cloud ? `${e.cloud.provider} ${e.cloud.database}` : e.database}</dd><dt>identity</dt><dd>${e.identity}</dd><dt>promotes from</dt><dd>${e.promotesFrom ?? "—"}</dd><dt>declared in</dt><dd><code>${e.file}</code></dd></dl></div>`; };
  return header({ kicker: "running", title: "Environments", lede: "Four declared. One running, on this machine.", status: statusOf(Object.keys(A.ops)) })
    + `<div class="read" style="max-width:1000px"><h2>&nbsp;</h2><div class="grid2">${card("local", true)}${card("test", false, "none alive")}${card("staging", false, "declared, not deployed")}${card("production", false, "declared, not deployed")}</div></div>`;
};

/** Drawers. */
const traceDrawer = () => {
  const s = A.samples.notAllowed;
  return drawer(`<b>Trace</b> <code>${s.call.trace.slice(0, 8)}</code> <span class="chip warn">NotAllowed</span>`, `
    <div class="callout a"><b>You made this call, as ada</b>, from Try it at ${clock(s.call.at)}. The app chose the trace id and kept who it called as, so it knows; the trace alone doesn't.</div>
    <div class="callout warn"><b>Why it was refused.</b> spend is open to <code>allowance.grantee</code>. ada is <code>organization.owner</code> of this allowance's organisation, not its grantee. The role check refused it before spend's span opened. <a>Who may call →</a></div>
    <h4 style="font-size:12px;color:var(--ink3);font-weight:500">${s.spans.length} spans · ${s.call.ms} ms</h4>${waterfall(s)}
    <h4 style="font-size:12px;color:var(--ink3);font-weight:500;margin-top:16px">Attributes</h4><div class="mono" style="font-size:11.5px;line-height:1.7">${s.spans.flatMap((x) => Object.entries(x.attrs).map(([k, v]) => `<div><span class="muted">${k}</span> ${esc(String(v)).slice(0, 52)}</div>`)).join("")}</div>`,
    '<span class="btn">Ask about this trace <span class="kbd">⌘I</span></span>');
};
const tryDrawer = () => drawer("<b>Try spend</b>", `
    <div class="field"><label>Acting as</label><div class="seg"><span>ada</span><span class="on">olga</span><span>bob</span></div><div class="muted" style="font-size:12px;margin-top:4px">Cast from the local world. olga is this allowance's grantee.</div></div>
    <div class="field"><label>allowance <span class="muted">id alw_</span></label><div class="input mono">alw_33d50szuxwjoqqoo</div></div>
    <div class="field"><label>amount <span class="muted">uint128</span></label><div class="input">504</div></div>
    <div class="field"><label>memo <span class="muted">text ≤200</span></label><div class="input">hotel</div></div>
    <div class="callout warn"><b>Refused AllowanceExceeded</b> · AL-001 · 422<br>"the amount is more than is left" · remaining <b>380</b><br><a>trace 7d49f315 →</a></div>`,
  '<span class="btn p">Run as olga</span> <span class="muted" style="font-size:12px;margin-left:8px">POST /allowance/spend · request key app-5f1c…</span>');
const chatDrawer = () => drawer('<b>Ask</b> <span class="chip a">sees: spend · local · 24 min · trace 208c464f</span>', `
    <div class="msg u">why did spend refuse ada?</div>
    <div class="tool">screen() → spend, trace 208c464f open</div><div class="tool">describe("allowance.spend") → allowed: allowance.grantee</div><div class="tool">trace("208c464f") → app called as ada · Try it</div>
    <div class="msg">Because ada isn't the grantee. spend is open only to <code>allowance.grantee</code>, the member the allowance was granted to. ada owns the organisation: she can grant and revoke, not spend.<br><br>The trace on your screen (<code>208c464f</code>) shows it: refused <code>NotAllowed</code> before spend's span opened. The trace doesn't name ada; the app does, because it made the call as her.</div>
    <div class="msg u">how often does that happen?</div>
    <div class="msg">${A.ops["allowance.spend"].refused.NotAllowed} times in the last ${A.source.minutes} minutes. Only the one above was made by this app, so only that one has a name.</div>`,
  '<div class="input" style="color:var(--ink3)">Ask about this page, a trace, or the system…</div><div style="margin-top:8px"><span class="btn">Keep as note</span></div>');
