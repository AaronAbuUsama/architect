// Architect-owned views no library gives: the machine diagram, the neighbourhood map, the matrix, the staleness explainer.

// Machine diagram: states in a row, every move drawn from each source to each outcome, labelled with its event.
function machineSvg(thing, hotMove) {
  const m = M.things[thing].machine; if (!m) return `<p class="muted">This thing has no machine. Its operations change records without states.</p>`;
  const creates = Object.values(m.moves).some((v) => v.from.length === 0);
  const nodes = [...(creates ? ["(new)"] : []), ...m.states];
  const W = 170, X0 = 70, Y = 120, x = (n) => X0 + nodes.indexOf(n) * W;
  let edges = "", labels = "", k = 0;
  for (const [key, mv] of Object.entries(m.moves)) {
    const hot = key === hotMove ? " hot" : "";
    for (const f of mv.from.length ? mv.from : ["(new)"]) for (const t of mv.to) {
      const x1 = x(f), x2 = x(t); k++;
      let d, lx, ly;
      if (f === t) { d = `M${x1 - 14},${Y + 22} C${x1 - 40},${Y + 85} ${x1 + 40},${Y + 85} ${x1 + 14},${Y + 22}`; lx = x1; ly = Y + 82; }
      else { const up = x2 > x1, h = 40 + Math.abs(x2 - x1) / 7; const yc = up ? Y - 22 - h : Y + 22 + h;
        d = `M${x1 + (up ? 10 : -10)},${up ? Y - 20 : Y + 20} Q${(x1 + x2) / 2},${yc} ${x2 + (up ? -10 : 10)},${up ? Y - 20 : Y + 20}`; lx = (x1 + x2) / 2; ly = up ? yc + 18 : yc - 8; }
      edges += `<path class="edge${hot}" d="${d}" marker-end="url(#arrow${hot ? "h" : ""})"/>`;
      labels += `<text x="${lx}" y="${ly}" text-anchor="middle"><tspan font-weight="700">${esc(key)}</tspan><tspan class="lbl" x="${lx}" dy="13">${esc(mv.emits || "")}</tspan></text>`;
    }
  }
  const boxes = nodes.map((n) => `<g><rect class="node${n === "(new)" ? "" : ""}" x="${x(n) - 52}" y="${Y - 20}" width="104" height="40" rx="${n === "(new)" ? 20 : 10}" ${n === "(new)" ? 'stroke-dasharray="4 3"' : ""}/><text x="${x(n)}" y="${Y + 4}" text-anchor="middle" font-weight="600">${esc(n)}</text></g>`).join("");
  const width = X0 + (nodes.length - 1) * W + 70;
  return `<svg viewBox="0 0 ${width} 250" width="100%" role="img" aria-label="State machine of ${esc(thing)}">
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="currentColor" style="color:var(--muted)"/></marker>
    <marker id="arrowh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" style="fill:var(--accent)"/></marker></defs>
    ${edges}${boxes}${labels}
    <text class="lbl" x="${X0 - 50}" y="244">From any other state: refused ${esc(m.notFrom?.error)} (exit ${esc(m.notFrom?.exit)}, ${esc(m.notFrom?.code)}), carrying the state.</text></svg>`;
}

// Neighbourhood map: one declaration in the middle, its real edges (edges.json + model joins) around it.
function neighbourhoodSvg(thing) {
  const t = M.things[thing];
  const refs = ACME.edges.filter((e) => e.kind === "refers" && e.from.startsWith(thing + ".")).map((e) => e.to.split(".")[0]);
  const refBy = ACME.edges.filter((e) => e.kind === "refers" && e.to.startsWith(thing + ".")).map((e) => e.from.split(".")[0]);
  const ops = OPS.filter((o) => o.thing === thing).map((o) => o.name);
  const roleUsers = ACME.edges.filter((e) => e.kind === "allowed-by" && e.to.startsWith(thing + ".") && thingOf(e.from) !== thing).map((e) => e.from);
  const groups = [["refers to", [...new Set(refs)], (n) => L.thing(n)], ["referred to by", [...new Set(refBy)], (n) => L.thing(n)],
    ["operations", ops, (n) => L.op(n)], ["events", Object.keys(t.events || {}), (n) => L.event(thing, n)],
    ["its roles let call", [...new Set(roleUsers)], (n) => L.op(n)]].filter((g) => g[1].length);
  const cx = 360, cy = 170, R = 135; let out = "";
  groups.forEach(([label, items, href], gi) => {
    const a0 = (gi / groups.length) * 2 * Math.PI - Math.PI / 2;
    items.forEach((n, i) => {
      const a = a0 + (i - (items.length - 1) / 2) * 0.28; const nx = cx + Math.cos(a) * R * 1.55, ny = cy + Math.sin(a) * R;
      out += `<line class="edge" x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}"/><a href="${href(n)}"><rect class="node" x="${nx - 62}" y="${ny - 12}" width="124" height="24" rx="12"/><text x="${nx}" y="${ny + 4}" text-anchor="middle" font-size="11">${esc(n)}</text></a>`;
    });
    const la = a0; out += `<text class="lbl" x="${cx + Math.cos(la) * 70}" y="${cy + Math.sin(la) * 52}" text-anchor="middle">${esc(label)}</text>`;
  });
  return `<svg viewBox="0 0 720 340" width="100%" role="img" aria-label="Neighbourhood of ${esc(thing)}">${out}<rect class="node hot" x="${cx - 60}" y="${cy - 16}" width="120" height="32" rx="10"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-weight="700">${esc(thing)}</text></svg>`;
}

// Environment × operation matrix: the honest proof denominator.
function matrix(ops) {
  const envs = scopedEnvs();
  return table(["Operation", ...envs.map((e) => link(L.env(e), e))], ops.map((o) => [`${opLink(o.name)} ${o.kind === "read" ? plain("read", "k-read") : ""}`, ...evidenceRow(o.name)]));
}

// Staleness explainer: the exact changed dependency keys and both hashes, never a guess.
function staleExplainer(opName, env) {
  const p = proof(opName, env); const op = M.operations[opName];
  if (p.state === "unavailable") return `<div class="callout none"><b>${esc(env)}: unavailable.</b> ${esc(p.reason)} Unavailable is never shown as unproven or green.</div>`;
  if (p.state === "stale") return `<div class="callout"><b>${esc(env)}: stale</b> <span class="chip plain k-illus">Illustration</span><br>
    The recorded pass was made against a contract that has since changed: ${esc(p.reason)}.
    ${table(["Dependency key (Compare.dependsOn)", "Hash when proved", "Hash now"], p.changed.map((c) => [`<code>operation:${esc(c.key)}</code>`, `<code>${esc(c.was)}</code>`, `<code>${esc(c.now)}</code>`]))}
    <p class="small muted">Unchanged keys: <code>thing:${esc(op.thing)}</code>${[...new Set(op.allowed.filter((a) => a.role).map((a) => a.role.split(".")[0]))].filter((t) => t !== op.thing).map((t) => `, <code>thing:${esc(t)}</code>`).join("")}. Next: rerun prove in ${esc(env)}; the promote gate needs a pass for every operation at the revision.</p></div>`;
  if (p.state === "failed") return `<div class="callout" style="border-color:var(--bad);background:var(--bad-soft)"><b>${esc(env)}: failed</b> <span class="chip plain k-illus">Illustration</span><br>${esc(p.reason)}. Which eval failed is unavailable: the logbook stores one aggregate verdict per operation.</div>`;
  if (p.state === "unproven") return `<div class="callout none"><b>${esc(env)}: unproven</b> <span class="chip plain k-illus">Illustration</span> ${esc(p.reason)}.</div>`;
  return `<div class="callout info"><b>${esc(env)}: recorded pass</b> <span class="chip plain k-illus">Illustration</span> Contract unchanged since the recorded pass. Candidate not rerun; execution origin unavailable.</div>`;
}
