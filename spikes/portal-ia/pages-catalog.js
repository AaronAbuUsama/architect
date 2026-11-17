// Catalog pages: home, thing, machine, event, and the plain reference indexes.

function pageHome() {
  const c = countStates(OPS); const denom = OPS.length * scopedEnvs().length;
  const blanks = M.blanks ? Object.keys(M.blanks).length : 0;
  const thingCards = THINGS.map((t) => `<a class="card" href="${L.thing(t.name)}" style="display:block;color:inherit;text-decoration:none">
      <div class="row"><b>${esc(t.name)}</b>${t.machine ? plain(t.machine.states.length + " states") : ""}</div>
      <p class="small muted" style="margin:4px 0 8px">${esc(t.description || "No description declared.")}</p>
      <div class="pill-list small">${plain(OPS.filter((o) => o.thing === t.name).length + " operations")}${plain(Object.keys(t.events || {}).length + " events")}${plain(Object.keys(t.fields).length + " fields")}</div></a>`).join("");
  return `<h1>acme</h1>
  <p class="lede">The blueprint declares ${THINGS.length} things, ${OPS.length} operations and reads, ${Object.keys(M.values).length} named values and
  ${ENVS.length} environments. Start from what acme is for: an organisation's owner grants a member an <a href="${L.thing("allowance")}">allowance</a>, and the member <a href="${L.op("allowance.spend")}">spends</a> from it.</p>
  <div class="grid g4" style="margin-bottom:16px">
    ${card("", `<div class="stat"><b>${THINGS.length}</b><span>things</span></div>`, "HeroUI Pro · KPI stat")}
    ${card("", `<div class="stat"><b>${OPS.length}</b><span>operations and reads</span></div>`)}
    ${card("", `<div class="stat"><b>${blanks}</b><span>blanks (declared, incomplete)</span></div>`)}
    ${card("", `<div class="stat"><b>${S.scenario === "none" ? "—" : (c["recorded-pass"] || 0) + " / " + denom}</b><span>${S.scenario === "none" ? "proof unavailable: no logbook" : "recorded passes, out of every operation × environment"}</span></div>`)}
  </div>
  <div class="split">
    <div class="grid">
      ${card("What acme is made of", `<div class="grid g2">${thingCards}</div>`, "HeroUI Card grid")}
      ${card("Proof, every operation in every environment", `${illusNote()}${matrix(OPS)}<p class="small muted">Denominator is all ${denom} cells. Unproven and unavailable cells are counted, never hidden.</p>`, "Architect · ProofMatrix on HeroUI Table")}
    </div>
    <div class="grid">
      ${card("Needs attention", attention(), "HeroUI Listbox")}
      ${card("The two loops", `<ol class="small" style="padding-left:18px;margin:0"><li><b>Design:</b> ideate, spike, specify. Blanks and open decisions show here. <span class="muted">Not projected yet.</span></li><li><b>Build:</b> implement, check, prove, promote, watch. <a href="${L.board()}">See the board.</a></li></ol>`, "Fumadocs Steps")}
      ${card("Journeys", `<p class="small">${SRC.journeys.length} journeys from ${SRC.worlds.length} starting worlds exercise these operations. <a href="#/journeys">Open journeys</a>.</p><p class="small muted">Read from source; the model has no journey projection yet.</p>`)}
    </div>
  </div>`;
}

function attention() {
  if (S.scenario === "none") return `<p class="small muted">Nothing can be ranked without evidence. Connect a logbook, or choose the illustration.</p>`;
  const rows = []; for (const o of OPS) for (const e of scopedEnvs()) { const p = proof(o.name, e); if (["failed", "stale"].includes(p.state)) rows.push([o.name, e, p]); }
  return rows.map(([o, e, p]) => `<p class="small" style="margin:0 0 8px">${proofChip(p)} <a href="${L.op(o)}#evidence-${e}"><code>${esc(o)}</code> in ${esc(e)}</a><br><span class="muted">${esc(p.reason)}</span></p>`).join("") || `<p class="small muted">Nothing failed or stale.</p>`;
}

function pageThing(name) {
  const t = M.things[name]; if (!t) return `<h1>No thing called ${esc(name)}</h1>`;
  const ops = OPS.filter((o) => o.thing === name);
  const roles = (t.roles || []).map((r) => { const full = `${name}.${r}`; const users = OPS.filter((o) => o.allowed.some((a) => a.role === full)); return [`<code id="${esc(full)}">${esc(full)}</code>`, users.map((o) => opLink(o.name)).join(", ") || "—", `<span class="muted small">rule is a predicate; not projected</span>`]; });
  const errors = Object.entries(t.errors || {}).map(([e, d]) => [`<code>${esc(e)}</code>`, `<code>${esc(d.code)}</code>`, d.exit, Object.keys(d.fields).map((f) => `<code>${esc(f)}</code>`).join(", ") || "—", OPS.filter((o) => o.errors.includes(e)).map((o) => opLink(o.name)).join(", ") || `<span class="muted">no operation declares it</span>`]);
  if (t.machine?.notFrom) errors.push([`<code>${esc(t.machine.notFrom.error)}</code> ${plain("generated")}`, `<code>${esc(t.machine.notFrom.code)}</code>`, t.machine.notFrom.exit, "<code>state</code>", "every move from a wrong state"]);
  return `<div class="row">${plain("thing")}${plain("lives: " + t.lives)}<span class="muted small mono">${esc(t.identifier)} · ${esc(t.code)} · hash ${esc(t.hash)}</span></div>
  <h1>${esc(name)}</h1><p class="lede">${esc(t.description || "No description declared.")}</p>
  <div class="split"><div class="grid">
    ${card("Fields", fieldsTable(t.fields), "Fumadocs TypeTable")}
    ${card(`Machine <a class="small" href="${L.machine(name)}">open</a>`, machineSvg(name), "Architect · MachineDiagram")}
    ${card("Neighbourhood", neighbourhoodSvg(name), "Architect · NeighbourhoodMap")}
    ${card("Operations and reads", table(["Operation", "Kind", "Move", "Who may call", ...scopedEnvs()], ops.map((o) => [opLink(o.name), o.kind === "read" ? plain("read", "k-read") : plain("operation", "k-op"), o.move ? `<code>${esc(o.move.key)}</code>` : "—", o.allowed.map(roleText).join(", "), ...evidenceRow(o.name)])) + illusNote(), "HeroUI Pro · DataGrid")}
    ${card("Events", Object.keys(t.events || {}).length ? table(["Event", "Fields", "Emitted by"], eventsOf(name).map((e) => [link(L.event(name, e.name), e.name), Object.keys(e.fields).map((f) => `<code>${esc(f)}</code>`).join(", "), e.moves.map((m) => `move <code>${esc(m.key)}</code>`).join(", ")])) : `<p class="muted">No events.</p>`, "HeroUI Table")}
    ${card("Errors and refusals", errors.length ? table(["Error", "Code", "Exit", "Carries", "Declared by"], errors) : `<p class="muted">No errors declared on this thing.</p>`, "HeroUI Table")}
  </div><div class="grid">
    ${card("Roles", roles.length ? table(["Role", "Lets call", "Rule"], roles) : `<p class="small muted">No roles on this thing.</p>`, "HeroUI Table")}
    ${card("Read about it", `<p class="small">Generated docs page: <a href="#/docs"><code>docs/${esc(name)}/index.md</code></a></p><details><summary class="small">Review details</summary><p class="small mono">file blueprint/things/${esc(name)}/thing.ts<br>hash ${esc(t.hash)}</p></details>`, "Fumadocs Card + Accordion")}
  </div></div>`;
}

function pageMachine(name) {
  const t = M.things[name]; const m = t?.machine;
  if (!m) return `<h1>${esc(name)} has no machine</h1><p class="muted">Its operations change records without states. <a href="${L.thing(name)}">Back to ${esc(name)}</a>.</p>`;
  const rows = Object.entries(m.moves).map(([k, mv]) => { const op = OPS.find((o) => o.thing === name && o.move?.key === k);
    return [`<code>${esc(k)}</code>`, mv.from.length ? mv.from.join(", ") : "(creates)", mv.to.join(" or "), mv.emits ? link(L.event(name, mv.emits), mv.emits) : "—", op ? opLink(op.name) : `<span class="muted">no operation</span>`,
      SRC.journeys.filter((j) => j.steps.some((s) => s.asserts.some((a) => a.kind === "is-in" && a.thing === name))).length]; });
  const reach = m.states.map((s) => [`<code>${esc(s)}</code>`, Object.entries(m.moves).filter(([, mv]) => mv.to.includes(s)).map(([k]) => k).join(", ") || "—", Object.entries(m.moves).filter(([, mv]) => mv.from.includes(s)).map(([k]) => k).join(", ") || `<span class="muted">terminal</span>`,
    SRC.journeys.filter((j) => j.steps.some((st) => st.asserts.some((a) => a.kind === "is-in" && a.thing === name && a.state === s))).map((j) => link(L.journey(j.name), j.name)).join(", ") || `<span class="muted">no journey asserts it</span>`]);
  return `<div class="row">${plain("machine")}<a href="${L.thing(name)}">${esc(name)}</a></div><h1>${esc(name)} machine</h1>
  <p class="lede">${m.states.length} states and ${Object.keys(m.moves).length} moves. A move from any state not in its <i>from</i> list is refused ${esc(m.notFrom.error)}, which the machine generates.</p>
  <div class="grid">${card("Diagram", machineSvg(name), "Architect · MachineDiagram (SVG; Mermaid stateDiagram in docs)")}
  ${card("Moves", table(["Move", "From", "To", "Emits", "Operation", "Journeys asserting a state"], rows), "HeroUI Table")}
  ${card("States", table(["State", "Reached by", "Left by", "Asserted by journeys (source)"], reach), "HeroUI Table")}
  ${card("Coverage", `<p class="small muted">Gate 5 wants "moves n/n" coverage. Move coverage per environment is not projected: the logbook holds one verdict per operation.</p>`, "Architect · Coverage (later)")}</div>`;
}

function pageEvent(thing, name) {
  const e = eventsOf(thing).find((x) => x.name === name); if (!e) return `<h1>No event ${esc(name)}</h1>`;
  const asserted = e.journeys.map((j) => [link(L.journey(j.name), j.name), j.steps.filter((s) => s.asserts.some((a) => a.event === name)).map((s) => esc(s.title)).join("; ")]);
  return `<div class="row">${plain("event")}<a href="${L.thing(thing)}">${esc(thing)}</a></div><h1>${esc(name)}</h1>
  <p class="lede">Emitted when ${e.moves.map((m) => `move <code>${esc(m.key)}</code> goes from ${m.from.length ? esc(m.from.join(" or ")) : "nothing (creates)"} to ${esc(m.to.join(" or "))}`).join("; ")}.</p>
  <div class="split"><div class="grid">
    ${card("Payload", fieldsTable(e.fields), "Fumadocs TypeTable")}
    ${card("Emitted by", table(["Move", "Operation", "Machine"], e.moves.map((m) => [`<code>${esc(m.key)}</code>`, e.ops.map(opLink).join(", "), link(L.machine(thing), thing + " machine")])), "HeroUI Table")}
    ${card("Journeys that expect it (source)", asserted.length ? table(["Journey", "Steps"], asserted) : `<p class="muted">No journey asserts this event.</p>`, "HeroUI Table")}
  </div><div class="grid">
    ${card("Who listens", `<p class="small muted">Not declared. The blueprint has no subscriber declaration in layer 2; when kits or time add consumers, they list here.</p>`, "Architect · Consumers (later)")}
    ${card("Seen in traces", `<div class="callout none small">Unavailable: no trace source connected. With O1's TraceSource this lists recent emissions per environment.</div>`, "HeroUI Pro · Timeline (later)")}
  </div></div>`;
}

function pageIndex(kind) {
  const views = {
    operations: () => ["Operations and reads", matrix(OPS)],
    events: () => ["Events", table(["Event", "Thing", "Emitted by move"], THINGS.flatMap((t) => eventsOf(t.name).map((e) => [link(L.event(t.name, e.name), e.name), link(L.thing(t.name), t.name), e.moves.map((m) => m.key).join(", ")])))],
    errors: () => ["Errors and refusals", table(["Refusal", "Code", "Raised by"], Object.entries(M.refusals).map(([r, c]) => [`<code id="${r}">${r}</code>`, `<code>${c}</code>`, OPS.filter((o) => o.refusals.includes(r)).map((o) => opLink(o.name)).join(", ")]))],
    roles: () => ["Roles", table(["Role", "Lets call"], THINGS.flatMap((t) => (t.roles || []).map((r) => `${t.name}.${r}`)).map((r) => [`<code id="${r}">${r}</code>`, OPS.filter((o) => o.allowed.some((a) => a.role === r)).map((o) => opLink(o.name)).join(", ")]))],
    values: () => ["Values", table(["Value", "Type"], Object.entries(M.values).map(([v, d]) => [`<code id="${v}">${v}</code>`, valueText({ value: d })]))],
    journeys: () => ["Journeys (read from source)", table(["Journey", "Starts", "Cast", "Calls"], SRC.journeys.map((j) => [`<b id="${slug(j.name)}">${esc(j.name)}</b><br><span class="small muted mono">${esc(j.file)}</span>`, j.starts ? link(L.world(j.starts), j.starts) : "—", Object.entries(j.cast).map(([w, r]) => `${esc(w)} <span class="muted small">${esc(r)}</span>`).join(", "), [...new Set(j.steps.map((s) => s.calls))].map(opLink).join(", ")]))],
    worlds: () => ["Starting worlds (read from source)", table(["World", "From", "Made by", "Gives", "Description"], SRC.worlds.map((w) => [`<b id="${w.name}">${w.name}</b>`, w.from || "—", w.makes.map(opLink).join(", "), w.gives.join(", "), esc(w.description)]))],
    releases: () => ["Releases", `<div class="callout none">Unavailable. The logbook keeps only the latest release (<code>GET /releases/latest</code>) and acme has none recorded. History needs a release-list read.</div>`],
    docs: () => ["Docs", `<p class="small muted">Fumadocs renders the ${Object.keys(ACME.docs).length} generated Markdown pages beside the app. Showing allowance/spend.md as generated:</p><pre>${esc(ACME.docs["allowance/spend.md"])}</pre>`],
  };
  const [title, body] = views[kind]();
  return `<h1>${title}</h1>${["operations"].includes(kind) ? illusNote() : ""}${card("", body, kind === "docs" ? "Fumadocs DocsPage" : "HeroUI Pro · DataGrid")}`;
}
