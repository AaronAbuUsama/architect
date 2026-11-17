// Building blocks every page uses: links, types, Markdown, the evidence slots and the machine diagram.
// Static parts read only BP (the blueprint). Evidence reads only SNAP, and always inside a .slot.
const M = BP.model;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const L = {
  home: "#/", proof: "#/proof", errors: "#/reference/errors", values: "#/reference/values", roles: "#/reference/roles",
  journeys: "#/journeys", thing: (t) => `#/things/${t}`, op: (o) => `#/operations/${o}`, env: (e) => `#/environments/${e}`,
  event: (t, e) => `#/things/${t}/events/${e}`, doc: (p) => `#/docs/${p.replace(/\.md$/, "")}`,
};
const a = (href, text) => `<a href="${href}">${esc(text)}</a>`;
const thingOf = (op) => M.operations[op].thing;
const opsOf = (thing) => Object.values(M.operations).filter((o) => o.thing === thing);

// Errors: every refusal anywhere, with its code, exit, owner and the "when" the generated docs give.
const ERRORS = (() => {
  const out = {};
  for (const t of Object.values(M.things)) {
    for (const [n, e] of Object.entries(t.errors || {})) out[n] = { name: n, code: e.code, exit: e.exit, thing: t.name, fields: e.fields };
    if (t.machine) { const nf = t.machine.notFrom; out[nf.error] = { name: nf.error, code: nf.code, exit: nf.exit, thing: t.name, fields: {}, machine: true }; }
  }
  for (const [n, code] of Object.entries(M.refusals)) out[n] ??= { name: n, code, exit: null, thing: null, fields: {}, builtIn: true };
  for (const [path, md] of Object.entries(BP.docs)) {
    const at = md.indexOf("## Refusals"); if (at < 0) continue;
    for (const line of md.slice(at).split("\n").slice(4)) {
      const c = line.split("|").map((s) => s.trim()); if (c.length < 6) break;
      const e = out[c[1]]; if (!e) continue; e.exit ??= Number(c[2]); (e.when ??= {})[path] = c[4];
    }
  }
  return out;
})();
const usersOf = (error) => Object.values(M.operations).filter((o) => o.refusals.includes(error)).map((o) => o.name);

// Types as a reader wants them: the value's shape, its name, and where a reference points.
const typeText = (v) => v.type === "uint" ? `uint${v.bits}` : v.type === "int" ? `int${v.bits}` : v.type === "text" ? `text ≤ ${v.max}`
  : v.type === "id" ? `id <span class="muted">${esc(v.prefix)}_…</span>` : esc(v.type);
const typeCell = (f) => {
  const t = typeText(f.value);
  if (f.ref) { const [th] = f.ref.split("."); return `${a(L.thing(th), f.ref)} <span class="muted small">(${t})</span>`; }
  if (f.named) return `${a(`${L.values}/${f.named}`, f.named)} <span class="muted small">(${t})</span>`;
  return t;
};
const typeTable = (fields, empty = "Nothing.") => {
  const rows = Object.entries(fields || {});
  if (!rows.length) return `<p class="muted">${empty}</p>`;
  return `<table class="tt"><thead><tr><th>Field</th><th>Type</th><th></th></tr></thead><tbody>${rows.map(([n, f]) =>
    `<tr><td>${esc(n)}</td><td>${typeCell(f)}</td><td class="muted small">${f.optional ? "optional" : "required"}</td></tr>`).join("")}</tbody></table>`;
};
const whoMay = (allowed) => allowed.map((x) => x.kind === "anyone" ? "anyone" : x.kind === "signed-in" ? "anyone signed in"
  : x.kind === "role" ? `the ${a(`${L.thing(x.role.split(".")[0])}#roles`, x.role.split(".")[1])} of the ${esc(x.role.split(".")[0])}`
  : `the ${a(`${L.thing(x.role.split(".")[0])}#roles`, x.role.split(".")[1])} of <code>${esc(x.path)}</code>`).join(", or ");

// A small Markdown reader for the generated docs (the real site renders them at build time, never per request).
const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
  .replace(/\[([^\]]+)\]\(([^)]+)\.md\)/g, (_, t, p) => `<a href="#/docs/__BASE__/${p}">${t}</a>`);
const markdown = (md, base) => {
  const out = []; const lines = md.replace(/<!--.*?-->\n?/g, "").split("\n"); let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("```")) { const code = []; i++; while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]); i++; out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`); continue; }
    if (l.startsWith("|")) { const rows = []; while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++].split("|").slice(1, -1).map((c) => c.trim()));
      out.push(`<table><thead><tr>${rows[0].map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(2).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`); continue; }
    if (l.startsWith("- ")) { const items = []; while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2)); out.push(`<ul>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>`); continue; }
    const h = /^(#{1,3}) (.*)$/.exec(l); if (h) { out.push(`<h${h[1].length + (h[1].length === 1 ? 0 : 0)}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (l.trim()) out.push(`<p>${inline(l)}</p>`); i++;
  }
  return out.join("\n").replaceAll("__BASE__", base);
};

// Evidence. Every piece is a slot: the static file has the slot empty; the Worker fills it from the snapshot.
const ENVS = SNAP.environments;
const proofOf = (op, env) => SNAP.proofs.find((p) => p.operation === op && p.environment === env);
const WORD = { "recorded-pass": "✔", stale: "stale", failed: "✘ failed", unproven: "unproven", unavailable: "unavailable" };
const chip = (p) => `<span class="chip s-${p.state}" title="${esc(p.reason ?? "recorded pass")}">${esc(p.environment)} ${WORD[p.state]}</span>`;
const slot = (html, inlineSpan = true) => inlineSpan ? `<span class="slot">${html}</span>` : `<div class="slot">${html}</div>`;
const chips = (op) => slot(scoped().map((e) => chip(proofOf(op, e))).join(""));
const scoped = () => (window.SCOPE && window.SCOPE !== "all" ? [window.SCOPE] : ENVS);
const worst = (op) => ["failed", "stale", "unproven", "unavailable"].find((s) => scoped().some((e) => proofOf(op, e).state === s)) ?? "recorded-pass";

const explainer = (op, env) => {
  const p = proofOf(op, env); const ev = p.evidence.state === "available" ? p.evidence.value : null;
  const prov = ev ? `<p class="small muted">Evidence: revision <code>${esc(ev.revision)}</code>, ${esc(ev.ref)}, ${esc(ev.workflow)} on ${esc(ev.event)}, logbook seq ${ev.seq}.</p>` : "";
  if (p.state === "stale") return `<div class="callout warn"><b>${esc(env)}: stale.</b> The pass was recorded against a contract that has since changed.
    <table><thead><tr><th>What changed</th><th>Hash when proved</th><th>Hash now</th></tr></thead><tbody>${p.changedDependencies.map((c) =>
      `<tr><td><code>${esc(c.key)}</code></td><td><code>${esc(c.was)}</code></td><td><code>${esc(c.now ?? "gone")}</code></td></tr>`).join("")}</tbody></table>
    Everything else it rests on is unchanged: ${Object.keys(BP.dependsOnByOperation[op]).filter((k) => !p.changedDependencies.some((c) => c.key === k)).map((k) => `<code>${esc(k)}</code>`).join(", ")}.
    To clear it: <code>architect prove --env ${esc(env)}</code>.${prov}</div>`;
  if (p.state === "failed") return `<div class="callout bad"><b>${esc(env)}: failed.</b> ${esc(p.reason)}. Which eval failed is not known yet: the logbook keeps one verdict per operation.${prov}</div>`;
  if (p.state === "unproven" || p.state === "unavailable") return `<div class="callout none"><b>${esc(env)}: ${p.state}.</b> ${esc(p.reason)}.</div>`;
  return `<p class="small muted">${chip(p)} ${p.candidateNotRerun ? `Contract unchanged since revision <code>${esc(ev.revision)}</code>; candidate <code>${esc(SNAP.candidate.revision)}</code> not rerun here.` : `Proved at the candidate <code>${esc(ev.revision)}</code>.`} Logbook seq ${ev.seq}.</p>`;
};

// The machine: states in a row, each move an arc labelled with its event; `hot` picks one move out.
function machineSvg(thing, hot) {
  const m = M.things[thing].machine; if (!m) return "";
  const creates = Object.values(m.moves).some((v) => v.from.length === 0);
  const nodes = [...(creates ? ["(new)"] : []), ...m.states]; const W = 165, X0 = 66, Y = 165, x = (n) => X0 + nodes.indexOf(n) * W;
  let edges = "", labels = "";
  for (const [key, mv] of Object.entries(m.moves)) {
    const h = key === hot ? " hot" : "";
    for (const f of mv.from.length ? mv.from : ["(new)"]) for (const t of mv.to) {
      const x1 = x(f), x2 = x(t); let d, lx, ly;
      if (f === t) { d = `M${x1 - 14},${Y + 20} C${x1 - 44},${Y + 86} ${x1 + 44},${Y + 86} ${x1 + 14},${Y + 20}`; lx = x1; ly = Y + 84; }
      else { const fwd = x2 > x1, hh = 30 + Math.abs(x2 - x1) / 3.5, yc = fwd ? Y - 20 - hh : Y + 20 + hh;
        d = `M${x1 + (fwd ? 10 : -10)},${fwd ? Y - 20 : Y + 20} Q${(x1 + x2) / 2},${yc} ${x2 + (fwd ? -10 : 10)},${fwd ? Y - 20 : Y + 20}`; lx = (x1 + x2) / 2; ly = fwd ? yc + 16 : yc - 6; }
      edges += `<path class="edge${h}" d="${d}" marker-end="url(#ar${h ? "h" : ""})"/>`;
      labels += `<text x="${lx}" y="${ly}" text-anchor="middle"><tspan font-weight="700">${esc(key)}</tspan><tspan class="lbl" x="${lx}" dy="13">${esc(mv.emits)}</tspan></text>`;
    }
  }
  const boxes = nodes.map((n) => `<rect class="node" x="${x(n) - 50}" y="${Y - 20}" width="100" height="40" rx="${n === "(new)" ? 20 : 10}"${n === "(new)" ? ' stroke-dasharray="4 3"' : ""}/><text x="${x(n)}" y="${Y + 4}" text-anchor="middle" font-weight="600">${esc(n)}</text>`).join("");
  const width = X0 + (nodes.length - 1) * W + 66;
  return `<div class="diagram"><svg viewBox="0 0 ${width} 280" width="100%" role="img" aria-label="State machine of ${esc(thing)}"><defs>
    <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" style="fill:var(--muted)"/></marker>
    <marker id="arh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" style="fill:var(--accent)"/></marker></defs>
    ${edges}${boxes}${labels}</svg><p class="small muted" style="margin:4px 6px">From any other state the move is refused: ${a(`${L.errors}/${m.notFrom.error}`, m.notFrom.error)} (exit ${m.notFrom.exit}, ${esc(m.notFrom.code)}).</p></div>`;
}
