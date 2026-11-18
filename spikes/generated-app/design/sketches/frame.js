// The frame (sidebar, top bar, drawer) and the live rail's pieces. Every number is from window.ACME.
const fmt = (n) => n.toLocaleString("en-GB");
const refusedOf = (name) => Object.values(A.ops[name]?.refused ?? {}).reduce((a, b) => a + b, 0);
/** One dot per operation: red on a defect, amber over budget or refusing more than a third, grey when idle. */
const health = (name) => {
  const o = A.ops[name];
  if (!o?.calls) return "idle";
  if (o.defects) return "bad";
  if (o.p95 > o.budget || refusedOf(name) / o.calls > 0.33) return "warn";
  return "ok";
};
const thingHealth = (t) => (opsOf(t).some((o) => health(o.name) === "bad") ? "bad" : opsOf(t).some((o) => health(o.name) === "warn") ? "warn" : opsOf(t).some((o) => health(o.name) === "ok") ? "ok" : "idle");

const node = (label, { on, sub, end = "", dot } = {}) =>
  `<div class="node${on ? " on" : ""}${sub ? " sub" : ""}">${label}<span class="end">${end}${dot ? `<span class="dotk ${dot}"></span>` : ""}</span></div>`;

const sidebar = (on) => `<div class="brand"><span class="dot">a</span>acme</div>
  ${node("Home", { on: on === "home" })}
  <div class="group">System</div>
  ${Object.keys(M.things).map((t) => node(t, { on: on === t, dot: thingHealth(t) }) + (t === "allowance" || on === t
    ? opsOf(t).map((o) => node(o.verb, { sub: true, on: on === o.name, end: A.ops[o.name]?.calls ? fmt(A.ops[o.name].calls) : "" })).join("") : "")).join("")}
  <div class="group">Notes</div>
  ${node("How allowances should feel", { on: on === "note" })}${node("Plan: spend from an API key")}${node("Why did spend refuse ada?", { end: "chat" })}
  <div class="group">Running</div>
  ${node("Environments", { on: on === "envs", dot: "ok" })}`;

const topbar = (crumbs) => `<div class="top"><span>${crumbs}</span><span class="sp"></span>
  <span class="btn ghost"><span class="dotk"></span>local · last ${A.source.minutes} min ▾</span>
  <span class="btn ghost" style="color:var(--ink3)">Search <span class="kbd">⌘K</span></span>
  <span class="btn">Ask <span class="kbd">⌘I</span></span></div>`;

const frame = (on, crumbs, body, drawer = "") =>
  `<div class="app"><nav class="side">${sidebar(on)}</nav><main class="main">${topbar(crumbs)}${body}</main>${drawer}</div>`;

const drawer = (title, body, foot = "") =>
  `<aside class="drawer"><div class="dh">${title}<span class="x">esc ✕</span></div><div class="dbody">${body}</div>${foot ? `<div class="df">${foot}</div>` : ""}</aside>`;

/** The status sentence: what a person would say after looking at the rail. */
const statusOf = (names) => {
  const calls = names.reduce((s, n) => s + (A.ops[n]?.calls ?? 0), 0);
  if (!calls) return `<span class="dotk idle"></span>No calls in the last ${A.source.minutes} min`;
  const refused = names.reduce((s, n) => s + refusedOf(n), 0);
  const defects = names.reduce((s, n) => s + (A.ops[n]?.defects ?? 0), 0);
  const over = names.filter((n) => A.ops[n]?.calls && A.ops[n].p95 > A.ops[n].budget);
  const one = names.length === 1 ? A.ops[names[0]] : null;
  const dot = defects ? "bad" : over.length ? "warn" : "ok";
  return `<span class="dotk ${dot}"></span><span>${fmt(calls)} calls in ${A.source.minutes} min · ${one ? `p95 ${one.p95} ms of ${one.budget}` : over.length ? `${over.length} over budget` : "all within budget"} · ${fmt(refused)} refused, ${defects ? `<b style="color:var(--bad)">${defects} defects</b>` : "no defects"}</span>`;
};

/** Calls per minute as a stacked sparkline: green answered, amber refused, red defect. */
const spark = (series, w = 320, h = 54) => {
  const max = Math.max(1, ...series.map((b) => b[0] + b[1] + b[2]));
  const bw = w / series.length;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${series.map((b, i) => {
    const y = (v) => (v / max) * (h - 2);
    const a = y(b[0]), r = y(b[1]), d = y(b[2]);
    return `<rect x="${i * bw + 1}" y="${h - a}" width="${bw - 2}" height="${a}" rx="1.5" fill="#17c964" opacity=".75"/><rect x="${i * bw + 1}" y="${h - a - r}" width="${bw - 2}" height="${r}" rx="1.5" fill="#f5a524"/><rect x="${i * bw + 1}" y="${h - a - r - d}" width="${bw - 2}" height="${d}" fill="#f31260"/>`;
  }).join("")}</svg><div class="muted" style="font-size:11px;display:flex;justify-content:space-between"><span>${clock(A.source.from).slice(0, 5)}</span><span>per minute</span><span>now</span></div>`;
};
const sumSeries = (names) => A.series[names[0]].map((_, i) => names.reduce((s, n) => { const b = A.series[n]?.[i] ?? [0, 0, 0]; return [s[0] + b[0], s[1] + b[1], s[2] + b[2]]; }, [0, 0, 0]));

const outcomeChip = (c) => (c.outcome === "answered" ? `<span class="chip ok">${c.replayed ? "replayed" : "answered"}</span>` : c.outcome === "defect" ? '<span class="chip bad">defect</span>' : `<span class="chip warn">${c.refusal}</span>`);
const callRow = (c, { sel, isNew, as } = {}) =>
  `<div class="c${sel ? " sel" : ""}${isNew ? " new" : ""}"><span class="t">${clock(c.at)}</span><span>${as ? `<b>${as}</b> <span class="muted">· you</span>` : c.person ? who(c.person) : '<span class="muted">nobody named</span>'}${names1(c)}</span>${outcomeChip(c)}<span class="num muted" style="font-size:12px">${c.ms} ms</span></div>`;
const names1 = (c) => (c.showOp ? ` <span class="muted">· ${c.op.split(".")[1]}</span>` : "");

/** The live rail for a set of operations: status, sparkline, outcomes, budget, last calls. */
const rail = (names, { calls, extra = "" } = {}) => {
  const one = names.length === 1 ? A.ops[names[0]] : null;
  const answered = names.reduce((s, n) => s + (A.ops[n]?.answered ?? 0), 0);
  const refused = {};
  for (const n of names) for (const [k, v] of Object.entries(A.ops[n]?.refused ?? {})) refused[k] = (refused[k] ?? 0) + v;
  const defects = names.reduce((s, n) => s + (A.ops[n]?.defects ?? 0), 0);
  const rows = calls ?? A.recent.filter((c) => names.includes(c.op)).slice(-7).reverse().map((c) => callRow({ ...c, showOp: names.length > 1 }));
  return `<aside class="rail"><div class="hd"><span class="dotk"></span>Live · local · last ${A.source.minutes} min<span style="margin-left:auto" class="muted">${fmt(A.source.traces)} traces</span></div>
    <div style="margin-top:12px">${spark(sumSeries(names))}</div>
    <h4>Outcomes</h4><div class="counts">
      <span class="k"><span class="dotk"></span>answered</span><span class="num">${fmt(answered)}</span>
      ${Object.entries(refused).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="k"><span class="dotk warn"></span>${k}</span><span class="num">${fmt(v)}</span>`).join("")}
      <span class="k"><span class="dotk bad"></span>defects</span><span class="num">${defects}</span></div>
    ${one ? `<h4>p95 against its budget</h4><div class="meter"><i style="width:${Math.max(2, (one.p95 / one.budget) * 100)}%"></i></div><div class="muted" style="font-size:12px">${one.p95} ms of ${one.budget} ms · p50 ${one.p50} ms · ${one.replayed} replays answered from the request key</div>` : ""}
    ${extra}
    <h4>Last calls <span style="float:right">click one for its trace</span></h4><div class="calls">${rows.join("")}</div></aside>`;
};
