// One function per page type. Each returns { title, crumbs, toc, html }. Section ids feed the right-hand TOC.
const sec = (id, title, body) => `<h2 id="${id}">${esc(title)}</h2>${body}`;
const crumbs = (...parts) => parts;
const opCard = (o) => `<a class="card" href="${L.op(o.name)}"><b>${esc(o.name)}</b><span>${esc(o.description)}</span><div class="chips">${chips(o.name)}</div></a>`;

const PAGES = {
  home() {
    const ops = Object.values(M.operations); const stale = SNAP.proofs.filter((p) => p.state !== "recorded-pass" && scoped().includes(p.environment));
    return { title: BP.project, crumbs: [], toc: [["start", "Start here"], ["things", "Things"], ["attention", "Needs attention"], ["proof", "Proof"]], html: `
      <h1>${esc(BP.project)}</h1><p class="lead">Everything ${esc(BP.project)} declares, what each part does, and what is proved where.</p>
      <div class="badges"><span class="badge">${Object.keys(M.things).length} things</span><span class="badge">${ops.length} operations</span>
        <span class="badge">${Object.keys(ERRORS).length} errors</span><span class="badge">${Object.keys(M.values).length} values</span><span class="badge">${ENVS.length} environments proved</span></div>
      ${sec("start", "Start here", `<p>Every page is generated from the blueprint. Each thing is a page with its fields, machine, operations and events;
        each operation is a page with its payload, answer, who may call it, how to call it, and its proof in every environment.</p>`)}
      ${sec("things", "Things", `<div class="cards">${Object.values(M.things).map((t) => `<a class="card" href="${L.thing(t.name)}"><b>${esc(t.name)} <span class="muted small">${esc(t.code)}</span></b><span>${esc(t.description)}</span></a>`).join("")}</div>`)}
      ${sec("attention", "Needs attention", slot(stale.length ? `<ul>${stale.map((p) => `<li>${chip(p)} ${a(L.op(p.operation) + "#proof", p.operation)}: ${esc(p.reason)}</li>`).join("")}</ul>` : "<p>Nothing: every operation has a recorded pass.</p>", false))}
      ${sec("proof", "Proof", PAGES.matrix())}` };
  },
  matrix() {
    return slot(`<table class="matrix"><thead><tr><th>Operation</th>${scoped().map((e) => `<th>${a(L.env(e), e)}</th>`).join("")}</tr></thead><tbody>${Object.keys(M.operations).map((op) =>
      `<tr><td>${a(L.op(op), op)}</td>${scoped().map((e) => `<td>${chip(proofOf(op, e))}</td>`).join("")}</tr>`).join("")}</tbody></table>`, false);
  },
  proof() {
    return { title: "Proof", crumbs: crumbs([L.home, BP.project]), toc: [["matrix", "Matrix"], ["candidate", "What it is judged against"]], html: `
      <h1>Proof</h1><p class="lead">Every operation in every environment. Only a recorded pass is a tick.</p>
      ${sec("matrix", "Matrix", PAGES.matrix())}
      ${sec("candidate", "What it is judged against", slot(`<p>The candidate is <code>${esc(SNAP.candidate.revision)}</code> (from the ${esc(SNAP.candidate.source)}), the newest revision proved in test. This environment runs <code>${esc(SNAP.bundleRevision)}</code>. Read ${SNAP.consistency === "checked" ? "consistently" : "inconsistently"}.</p>`, false))}` };
  },
  thing(name) {
    const t = M.things[name]; if (!t) return null; const ops = opsOf(name); const doc = `${name}/index.md`;
    const errs = Object.values(ERRORS).filter((e) => e.thing === name);
    return { title: name, crumbs: crumbs([L.home, BP.project], ["#/things", "Things"]), toc: [["fields", "Fields"], ...(t.machine ? [["machine", "Machine"]] : []), ["operations", "Operations"], ...(Object.keys(t.events || {}).length ? [["events", "Events"]] : []), ["errors", "Errors"], ["roles", "Roles"]], html: `
      <h1>${esc(name)}</h1><p class="lead">${esc(t.description)}</p>
      <div class="badges"><span class="badge">code ${esc(t.code)}</span><span class="badge">lives in the ${esc(t.lives)}</span>${t.machine ? `<span class="badge">${t.machine.states.length} states</span>` : ""}<span class="badge">${ops.length} operations</span></div>
      ${sec("fields", "Fields", typeTable(t.fields))}
      ${t.machine ? sec("machine", "Machine", machineSvg(name)) : ""}
      ${sec("operations", "Operations", `<div class="cards">${ops.map(opCard).join("")}</div>`)}
      ${Object.keys(t.events || {}).length ? sec("events", "Events", `<div class="cards">${Object.entries(t.events).map(([e, f]) => `<a class="card" href="${L.event(name, e)}"><b>${esc(e)}</b><span>${Object.keys(f).join(", ")}</span></a>`).join("")}</div>`) : ""}
      ${sec("errors", "Errors", errs.length ? `<table><thead><tr><th>Error</th><th>Code</th><th>Exit</th><th>Refused by</th></tr></thead><tbody>${errs.map((e) => `<tr><td>${a(`${L.errors}/${e.name}`, e.name)}</td><td><code>${esc(e.code)}</code></td><td>${e.exit}</td><td>${usersOf(e.name).map((o) => a(L.op(o), o)).join(", ")}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">None of its own.</p>`)}
      ${sec("roles", "Roles", t.roles.length ? `<ul>${t.roles.map((r) => `<li><b>${esc(r)}</b>: may call ${Object.values(M.operations).filter((o) => o.allowed.some((x) => x.role === `${name}.${r}`)).map((o) => a(L.op(o.name), o.name)).join(", ")}</li>`).join("")}</ul>` : `<p class="muted">None.</p>`)}
      <p class="src">Declared in <code>blueprint/things/${esc(name)}/</code> · hash <code>${esc(t.hash)}</code> · ${a(L.doc(doc), "generated Markdown")}</p>` };
  },
  op(name) {
    const o = M.operations[name]; if (!o) return null; const [, verb] = name.split(".");
    const doc = BP.docs[`${o.thing}/${verb}.md`] ?? ""; const cli = /```sh\n(.*)\n```/.exec(doc)?.[1] ?? "";
    const tab = (id, label, body, on) => `<button data-tab="${id}" class="${on ? "on" : ""}">${label}</button>`;
    return { title: name, crumbs: crumbs([L.home, BP.project], [L.thing(o.thing), o.thing]), toc: [["proof", "Proof"], ["evals", "Evals"], ["traces", "Recent traces"], ["call", "How to call"], ["payload", "Payload"], ["answer", "Answer"], ["who", "Who may call"], ...(o.move ? [["move", "Move"]] : []), ["refusals", "Refusals"], ["steps", "Steps"]], html: `
      <h1>${esc(name)}</h1><p class="lead">${esc(o.description)}</p>
      <div class="badges">${chips(name)}<span class="badge">${o.kind}</span>${o.idempotent ? `<span class="badge">idempotent by request</span>` : ""}${o.budget ? `<span class="badge">p95 ≤ ${o.budget.p95Ms} ms</span>` : ""}<span class="badge">runs on ${esc(o.runs)}</span><span class="badge">test: ${esc(o.test)}</span></div>
      ${sec("proof", "Proof", opProof(name))}
      ${sec("evals", "Evals", `<p class="small muted">The nine checks prove runs for every operation in every environment, judged from the call's own spans, logs and stored state. ${illus} Today the logbook keeps one verdict per operation, so these per-eval results are not available yet.</p>${opEvals(name)}`)}
      ${sec("traces", "Recent traces", traceTable(`traces-${name}`, TRACES.filter((t) => t.op === name), "Traces") + `<p class="small">${a(L.traces, "All traces")} ${illus}</p>`)}
      ${sec("call", "How to call", `<div class="tabs"><nav>${tab("cli", "CLI", 0, 1)}${tab("http", "HTTP", 0)}${tab("sdk", "SDK", 0)}</nav>
        <pre data-panel="cli"><code>${esc(cli)}</code></pre><pre data-panel="http" hidden><code>POST /${esc(o.thing)}/${esc(verb)}\ncontent-type: application/json${o.idempotent ? "\nidempotency-key: <key>" : ""}\n\n${esc(JSON.stringify(Object.fromEntries(Object.keys(o.payload).map((k) => [k, `<${k}>`])), null, 2))}</code></pre>
        <pre data-panel="sdk" hidden><code>const answer = yield* Sdk.${esc(o.thing.replace(/-(\w)/g, (_, c) => c.toUpperCase()))}.${esc(o.identifier)}(${esc(JSON.stringify(Object.fromEntries(Object.keys(o.payload).map((k) => [k, "…"]))))})</code></pre></div>`)}
      ${sec("payload", "Payload", typeTable(o.payload, "No payload."))}
      ${sec("answer", "Answer", typeTable(o.answer, "No answer."))}
      ${sec("who", "Who may call", `<p>${whoMay(o.allowed)}. Anyone else is refused ${a(`${L.errors}/NotAllowed`, "NotAllowed")} before the handler runs.</p>`)}
      ${o.move ? sec("move", "Move", `<p>${o.move.from.length ? `From <b>${o.move.from.join("</b> or <b>")}</b>` : "Creates it"}, to <b>${o.move.to.join("</b> or <b>")}</b>, emitting ${a(L.event(o.thing, o.move.emits), o.move.emits)}.</p>${machineSvg(o.thing, o.move.key)}`) : ""}
      ${sec("refusals", "Refusals", o.refusals.length ? `<table><thead><tr><th>Refusal</th><th>Code</th><th>Exit</th><th>When</th></tr></thead><tbody>${o.refusals.map((r) => { const e = ERRORS[r]; return `<tr><td>${a(`${L.errors}/${r}`, r)}</td><td><code>${esc(e.code)}</code></td><td>${e.exit ?? ""}</td><td class="small">${esc(e.when?.[`${o.thing}/${verb}.md`] ?? "")}</td></tr>`; }).join("")}</tbody></table>` : `<p class="muted">It never refuses.</p>`)}
      ${sec("steps", "Steps", Object.keys(o.steps).length ? `<ul>${Object.values(o.steps).map((s) => `<li><code>${esc(s.name)}</code> <span class="muted">(${esc(s.type)})</span></li>`).join("")}</ul>` : `<p class="muted">No steps declared.</p>`)}
      <p class="src">Declared in <code>${esc(o.file)}</code> · hash <code>${esc(o.hash)}</code> · ${a(L.doc(`${o.thing}/${verb}.md`), "generated Markdown")}</p>` };
  },
  event(thing, name) {
    const fields = M.things[thing]?.events?.[name]; if (!fields) return null;
    const by = opsOf(thing).filter((o) => o.move?.emits === name);
    return { title: name, crumbs: crumbs([L.home, BP.project], [L.thing(thing), thing], [L.thing(thing) + "#events", "Events"]), toc: [["fields", "Fields"], ["emitted", "Emitted by"]], html: `
      <h1>${esc(name)}</h1><p class="lead">An event of ${a(L.thing(thing), thing)}.</p>
      ${sec("fields", "Fields", typeTable(fields))}
      ${sec("emitted", "Emitted by", by.map((o) => `<p>${a(L.op(o.name), o.name)}, on the move <b>${esc(o.move.key)}</b>.</p>${machineSvg(thing, o.move.key)}`).join(""))}` };
  },
};
