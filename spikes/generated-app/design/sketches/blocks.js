// The four kinds of block a generated page is made of. Each takes the model (and, for live blocks, the telemetry) and
// returns HTML. In the real app these are React components; here they are string functions over window.ACME.
const A = window.ACME;
const M = A.model;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clock = (ms) => new Date(ms).toISOString().slice(11, 19);
const ago = (ms) => { const s = Math.round((A.source.to - ms) / 1000); return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`; };
const who = (id) => (id ? A.cast[id] ?? id : "unknown");
const typeOf = (f) => { const v = f.value; return v.type === "id" ? `id ‹${v.prefix}›` : v.type === "uint" ? `uint${v.bits}` : v.type === "text" ? `text ≤${v.max}` : v.type; };
const opsOf = (thing) => Object.values(M.operations).filter((o) => o.thing === thing);
const lineOf = { "allowance.spend": "8-18", "allowance.grant": "8-17", "allowance.revoke": "8-16", "allowance.get": "6-14" };

/** A derived block: rendered from the model, locked, and it names its source and hash. */
const derived = (title, src, body, extra = "") =>
  `<div class="blk"><div class="hd"><span class="lock">🔒</span><span class="t">${title}</span>${extra}<span class="src">${esc(src)}</span></div><div class="bd">${body}</div></div>`;
/** A live block: rendered from telemetry for the environment in scope, with its window. */
const live = (title, body, note = `local · last ${A.source.minutes} min · ${A.source.traces} traces`) =>
  `<div class="blk live"><div class="hd"><span class="t">${title}</span><span class="src">${note}</span></div><div class="bd">${body}</div></div>`;
/** Written prose: a person's or an agent's words, anchored to the hash of what it is about. */
const prose = ({ by, when, about, stale, agent, html }) =>
  `<div class="prose${stale ? " stale" : ""}${agent ? " agent" : ""}"><div class="by">${esc(by)} · ${esc(when)} · about <code>${esc(about)}</code></div>${html}${
    stale ? `<div class="stalebar">⚠ ${stale} <span class="btn">Show the change</span><span class="btn p">Still true</span></div>` : ""}</div>`;

const fieldsTable = (fields) =>
  `<table><tr><th>field</th><th>type</th><th>named</th><th>refers to</th><th>traced</th></tr>${Object.entries(fields)
    .map(([k, f]) => `<tr><td><code>${k}</code></td><td class="muted">${typeOf(f)}</td><td>${f.named ? `<a>${f.named}</a>` : ""}</td><td>${f.ref ? `<code>${f.ref}</code>` : ""}</td><td class="muted">${
      f.value.type === "text" ? '<span class="chip warn">free text · O2</span>' : "yes"}</td></tr>`).join("")}</table>`;

const refusalRows = (op) => {
  const thing = M.things[op.thing];
  return op.refusals.map((r) => {
    const e = thing.errors[r];
    const kind = e ? "declared" : r === "NotAllowed" ? "role" : "machine";
    const code = e ? e.code : r === "NotAllowed" ? "AR-001" : thing.machine.notFrom.code;
    const exit = e ? e.exit : r === "NotAllowed" ? 3 : thing.machine.notFrom.exit;
    const carries = e ? Object.keys(e.fields).join(", ") : r === "NotAllowed" ? "" : "state";
    const seen = (A.ops[op.name]?.refused ?? {})[r] ?? 0;
    return `<tr><td><code>${r}</code></td><td class="muted">${kind}</td><td class="mono">${code}</td><td class="num">${exit}</td><td>${carries}</td><td class="num">${seen ? `<b>${seen}</b>` : "0"}</td></tr>`;
  }).join("");
};

/** The machine, drawn from the model; live counts on each move when given. */
const machineSvg = (thing, { lit, counts = {} } = {}) => {
  const m = M.things[thing].machine;
  const pos = { active: [250, 70], exhausted: [520, 70], revoked: [385, 200] };
  m.states.forEach((s, i) => (pos[s] ??= [120 + i * 200, 70]));
  const box = (s) => { const [x, y] = pos[s]; return `<rect x="${x - 55}" y="${y - 18}" width="110" height="36" rx="18" fill="#fff" stroke="#c7cdd8"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13">${s}</text>`; };
  const edge = (from, to, label, on, n) => {
    const [x1, y1] = from ? pos[from] : [70, 70];
    const [x2, y2] = pos[to];
    const c = on ? "#4f46e5" : "#9aa3b2";
    const w = on ? 2.4 : 1.4;
    const t = n === undefined ? "" : ` · ${n}`;
    if (from === to) return `<path d="M${x1 - 22} ${y1 - 18} C ${x1 - 40} ${y1 - 70}, ${x1 + 40} ${y1 - 70}, ${x1 + 22} ${y1 - 18}" fill="none" stroke="${c}" stroke-width="${w}" marker-end="url(#ar${on ? 1 : 0})"/><text x="${x1}" y="${y1 - 62}" text-anchor="middle" font-size="12" fill="${c}">${label}${t}</text>`;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const sx = x1 + ux * (from ? 58 : 8), sy = y1 + uy * (from ? 20 : 8), ex = x2 - ux * 58, ey = y2 - uy * 20;
    return `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${c}" stroke-width="${w}" marker-end="url(#ar${on ? 1 : 0})"/><text x="${(sx + ex) / 2 + (dy ? 8 : 0)}" y="${(sy + ey) / 2 - 6}" text-anchor="middle" font-size="12" fill="${c}">${label}${t}</text>`;
  };
  let edges = "";
  for (const [key, mv] of Object.entries(m.moves)) {
    const froms = mv.from.length ? mv.from : [null];
    froms.forEach((f, i) => mv.to.forEach((t) => (edges += edge(f, t, key, key === lit, i === 0 ? counts[`${key}:${t}`] : undefined))));
  }
  return `<svg viewBox="0 0 640 250" width="100%" height="230"><defs>${[0, 1].map((i) => `<marker id="ar${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${i ? "#4f46e5" : "#9aa3b2"}"/></marker>`).join("")}</defs>
    <circle cx="70" cy="70" r="7" fill="#18181b"/>${edges}${m.states.map(box).join("")}</svg>`;
};

const moveCounts = () => Object.fromEntries(A.moves.map((m) => [`${m.op.split(".")[1]}:${m.to}`, m.n]));

/** Calls per minute, stacked answered / refused / defect, with the p95 budget as a note. */
const callsChart = (op, h = 120) => {
  const s = A.series[op] ?? [];
  const max = Math.max(1, ...s.map((b) => b[0] + b[1] + b[2]));
  const W = 820, bw = W / s.length;
  const bars = s.map((b, i) => {
    const hA = (b[0] / max) * (h - 20), hR = (b[1] / max) * (h - 20), hD = (b[2] / max) * (h - 20);
    return `<rect x="${i * bw + 2}" y="${h - hA}" width="${bw - 4}" height="${hA}" fill="#86efac"/><rect x="${i * bw + 2}" y="${h - hA - hR}" width="${bw - 4}" height="${hR}" fill="#fbbf24"/><rect x="${i * bw + 2}" y="${h - hA - hR - hD}" width="${bw - 4}" height="${hD}" fill="#ef4444"/>`;
  }).join("");
  const ticks = [0, 6, 12, 18, 23].map((m) => `<text x="${m * bw + bw / 2}" y="${h + 14}" font-size="10.5" fill="#8a8a93" text-anchor="middle">${clock(A.source.from + m * 60000).slice(0, 5)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${h + 18}" width="100%" height="${h + 18}">${bars}${ticks}</svg>
    <div class="legend"><span><i style="background:#86efac"></i>answered</span><span><i style="background:#fbbf24"></i>refused (ends OK)</span><span><i style="background:#ef4444"></i>defect</span><span style="margin-left:auto">max ${max}/min</span></div>`;
};

/** The waterfall of one trace, from its real spans. */
const waterfall = (sample, sel) => {
  const ss = sample.spans;
  const t0 = Math.min(...ss.map((s) => s.start)), t1 = Math.max(...ss.map((s) => s.end), t0 + 1);
  const depth = {}; const byId = Object.fromEntries(ss.map((s) => [s.id, s]));
  const d = (s) => (depth[s.id] ??= s.parent && byId[s.parent] ? d(byId[s.parent]) + 1 : 0);
  const order = [];
  const walk = (p) => ss.filter((s) => (s.parent && byId[s.parent] ? s.parent : null) === p).forEach((s) => { order.push(s); walk(s.id); });
  walk(null);
  const cls = (s) => (s.name === "POST" ? "http" : s.name === "sqlite" || s.name === "BATCH" ? "db" : s.attrs.refusal ? "refused" : s.attrs.operation ? "op" : "");
  const label = (s) => s.name === "sqlite" ? `sqlite <span class="muted">${esc((s.attrs["db.query.text"] ?? "").slice(0, 26))}…</span>` : s.name === "POST" ? `POST ${s.attrs["http.route"]} <span class="muted">${s.attrs["http.response.status_code"]}</span>` : s.name;
  return `<div class="wf">${order.map((s) => `<div class="row${s.name === sel ? " sel" : ""}"><div class="nm" style="padding-left:${d(s) * 14}px">${label(s)}</div><div class="track"><div class="sp ${cls(s)}" style="left:${((s.start - t0) / (t1 - t0)) * 100}%;width:${Math.max(0.6, ((s.end - s.start) / (t1 - t0)) * 100)}%"></div></div><div class="num muted">${s.end - s.start} ms</div></div>`).join("")}</div>`;
};
const attrsOf = (sample, name) => {
  const s = sample.spans.find((x) => x.name === name);
  return `<div class="attrs">${Object.entries(s.attrs).map(([k, v]) => `<div><b>${k}</b> = ${esc(v)}${k === "principal.person" ? ` <span class="muted">(${who(v)})</span>` : ""}</div>`).join("")}</div>`;
};

const recentTable = (op, n = 9) =>
  `<table><tr><th>when</th><th>who</th><th>outcome</th><th class="num">http</th><th class="num">ms</th><th>payload (traced fields)</th></tr>${A.recent
    .filter((c) => c.op === op).slice(-n).reverse()
    .map((c) => `<tr><td class="muted">${clock(c.at)}</td><td>${who(c.person)}</td><td>${c.outcome === "answered" ? `<span class="chip ok">${c.replayed ? "replayed" : "answered"}</span>` : `<span class="chip warn">${c.refusal}</span>`}</td><td class="num">${c.http ?? ""}</td><td class="num">${c.ms}</td><td class="mono muted">${Object.entries(c.payload).map(([k, v]) => `${k}=${esc(v)}`).join(" ") || (c.seenOn ? `<i>${c.seenOn}</i>` : "")}</td></tr>`).join("")}</table>`;

const budgetBar = (name) => {
  const o = A.ops[name];
  const pct = Math.min(100, (o.p95 / o.budget) * 100);
  return `<div style="display:grid;grid-template-columns:150px 1fr 120px;gap:10px;align-items:center;padding:4px 0"><code>${name}</code><div class="bar"><i style="width:${Math.max(pct, 1.5)}%;background:${pct > 100 ? "var(--bad)" : pct > 70 ? "var(--warn)" : "var(--ok)"}"></i></div><span class="num muted">p95 ${o.p95} ms / ${o.budget}</span></div>`;
};
