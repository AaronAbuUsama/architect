// Helpers shared by the sketches: names, times, the machine diagram and the waterfall, all drawn from window.ACME.
const A = window.ACME;
const M = A.model;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clock = (ms) => new Date(ms).toISOString().slice(11, 19);
const ago = (ms) => { const s = Math.round((A.source.to - ms) / 1000); return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`; };
const who = (id) => (id ? A.cast[id] ?? id : "unknown");
const typeOf = (f) => { const v = f.value; return v.type === "id" ? `id ‹${v.prefix}›` : v.type === "uint" ? `uint${v.bits}` : v.type === "text" ? `text ≤${v.max}` : v.type; };
const opsOf = (thing) => Object.values(M.operations).filter((o) => o.thing === thing);
const lineOf = { "allowance.spend": "8-18", "allowance.grant": "8-17", "allowance.revoke": "8-16", "allowance.get": "6-14" };
/** The machine, drawn from the model; live counts on each move when given. */
const machineSvg = (thing, { lit, counts = {} } = {}) => {
  const m = M.things[thing].machine;
  const pos = { active: [250, 70], exhausted: [520, 70], revoked: [385, 200] };
  m.states.forEach((s, i) => (pos[s] ??= [120 + i * 200, 70]));
  const box = (s) => { const [x, y] = pos[s]; return `<rect x="${x - 55}" y="${y - 18}" width="110" height="36" rx="18" fill="#fff" stroke="#d4d4d8"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13">${s}</text>`; };
  const edge = (from, to, label, on, n) => {
    const [x1, y1] = from ? pos[from] : [70, 70];
    const [x2, y2] = pos[to];
    const c = on ? "#006fee" : "#9aa3b2";
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
  return `<svg viewBox="0 0 640 250" width="100%" height="230"><defs>${[0, 1].map((i) => `<marker id="ar${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${i ? "#006fee" : "#9aa3b2"}"/></marker>`).join("")}</defs>
    <circle cx="70" cy="70" r="7" fill="#18181b"/>${edges}${m.states.map(box).join("")}</svg>`;
};

const moveCounts = () => Object.fromEntries(A.moves.map((m) => [`${m.op.split(".")[1]}:${m.to}`, m.n]));
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
