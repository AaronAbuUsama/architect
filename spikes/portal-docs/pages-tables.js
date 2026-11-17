// The table-shaped pages: the proof matrix, an operation's proof, evals and traces, events, errors, values, roles.
const SHORT = { "recorded-pass": "✔ pass", stale: "stale", failed: "✘ failed", unproven: "unproven", unavailable: "unavailable" };
const RANK = { failed: 0, stale: 1, unproven: 2, unavailable: 3, "recorded-pass": 4 };
const cell = (p) => slot(`<span class="chip s-${p.state}" title="${esc(p.reason ?? "recorded pass")}">${SHORT[p.state]}</span>`);
const EV = { pass: ["recorded-pass", "✔"], review: ["stale", "review"], fail: ["failed", "✘ fail"], "n/a": ["unavailable", "n/a"], none: ["unproven", "–"] };
const evChip = ([, r, why]) => `<span class="chip s-${EV[r][0]}" title="${esc(why)}">${EV[r][1]}</span>`;
const illus = `<span class="illus">illustration</span>`;
const worstOf = (op) => ENVS.map((e) => proofOf(op, e)).sort((x, y) => RANK[x.state] - RANK[y.state])[0];
const envCols = ENVS.map((e) => ({ key: e, label: e, align: "c", render: (r) => cell(proofOf(r.op, e)), sort: (r) => RANK[proofOf(r.op, e).state] }));

const proofMatrix = (id, rows, title) => dataTable({
  id, title, rows: rows.map((o) => ({ op: o.name, thing: o.thing, kind: o.kind })), sort: { key: "worst", dir: "asc" },
  search: (r) => `${r.op} ${r.thing} ${worstOf(r.op).reason ?? ""}`,
  filters: [{ key: "thing", label: "Thing", of: (r) => r.thing }, { key: "worst", label: "Worst state", of: (r) => worstOf(r.op).state },
    ...ENVS.map((e) => ({ key: `in-${e}`, label: `In ${e}`, of: (r) => proofOf(r.op, e).state })), { key: "kind", label: "Kind", of: (r) => r.kind }],
  columns: [{ key: "op", label: "Operation", render: (r) => `${a(L.op(r.op), r.op)}<div class="sub">${esc(r.thing)} · ${r.kind}</div>`, sort: (r) => r.op },
    ...envCols, { key: "worst", label: "Needs", render: (r) => { const w = worstOf(r.op); return w.state === "recorded-pass" ? `<span class="muted">nothing</span>` : slot(`<span class="small">${esc(w.environment)}: ${esc(w.reason)}</span>`); }, sort: (r) => RANK[worstOf(r.op).state] }],
});

Object.assign(PAGES, {
  matrix: () => proofMatrix("matrix-home", Object.values(M.operations), "Operations"),
  proof() {
    return { title: "Proof", crumbs: [[L.home, BP.project]], toc: [["matrix", "Matrix"], ["candidate", "What it is judged against"]], html: `
      <h1>Proof</h1><p class="lead">Every operation in every environment. Only a recorded pass is a tick. Filter by thing, state or environment; hide environments under Columns.</p>
      ${sec("matrix", "Matrix", proofMatrix("matrix", Object.values(M.operations), "Operations"))}
      ${sec("candidate", "What it is judged against", slot(`<p>The candidate is <code>${esc(SNAP.candidate.revision)}</code> (from the ${esc(SNAP.candidate.source)}), the newest revision proved in test. This environment runs <code>${esc(SNAP.bundleRevision)}</code>.</p>`, false))}` };
  },
  events() {
    const rows = Object.values(M.things).flatMap((t) => Object.entries(t.events || {}).map(([name, fields]) => ({ name, thing: t.name, fields, by: opsOf(t.name).filter((o) => o.move?.emits === name) })));
    return { title: "Events", crumbs: [[L.home, BP.project], [L.events, "Reference"]], toc: [], html: `<h1>Events</h1><p class="lead">What happened, journalled by the move that made it happen. Each one is also a span in the trace of the call that emitted it.</p>
      ${dataTable({ id: "events", title: "Events", rows, search: (r) => `${r.name} ${r.thing} ${Object.keys(r.fields).join(" ")}`, filters: [{ key: "thing", label: "Thing", of: (r) => r.thing }],
        columns: [{ key: "name", label: "Event", render: (r) => a(L.event(r.thing, r.name), r.name), sort: (r) => r.name }, { key: "thing", label: "Thing", render: (r) => a(L.thing(r.thing), r.thing), sort: (r) => r.thing },
          { key: "fields", label: "Fields", render: (r) => Object.entries(r.fields).map(([f, d]) => `<code>${esc(f)}</code> <span class="muted small">${typeText(d.value)}</span>`).join("<br>"), sort: false },
          { key: "by", label: "Emitted by", render: (r) => r.by.map((o) => `${a(L.op(o.name), o.name)} <span class="muted small">move ${esc(o.move.key)}</span>`).join("<br>"), sort: false }] })}` };
  },
  errors() {
    const rows = Object.values(ERRORS);
    return { title: "Errors", crumbs: [[L.home, BP.project], [L.errors, "Reference"]], toc: [], html: `<h1>Errors</h1><p class="lead">Every refusal, its stable code and its exit. Codes never move once shipped.</p>
      ${dataTable({ id: "errors", title: "Errors", rows, sort: { key: "code", dir: "asc" }, search: (r) => `${r.name} ${r.code} ${r.thing ?? ""}`,
        filters: [{ key: "owner", label: "Owner", of: (r) => r.thing ?? "built in" }, { key: "kind", label: "Kind", of: (r) => (r.builtIn ? "built in" : r.machine ? "wrong state" : "declared") }],
        columns: [{ key: "code", label: "Code", render: (r) => `<code id="${r.name}">${esc(r.code)}</code>`, sort: (r) => r.code }, { key: "name", label: "Error", render: (r) => `<b>${esc(r.name)}</b>`, sort: (r) => r.name },
          { key: "exit", label: "Exit", align: "c", render: (r) => esc(r.exit ?? ""), sort: (r) => r.exit ?? 0 }, { key: "owner", label: "Owner", render: (r) => (r.thing ? a(L.thing(r.thing), r.thing) : "built in"), sort: (r) => r.thing ?? "" },
          { key: "carries", label: "Carries", render: (r) => Object.keys(r.fields || {}).map((f) => `<code>${esc(f)}</code>`).join(" "), sort: false },
          { key: "by", label: "Refused by", render: (r) => usersOf(r.name).map((o) => a(L.op(o), o)).join("<br>"), sort: (r) => usersOf(r.name).length }] })}` };
  },
  values() {
    const rows = Object.entries(M.values).map(([name, v]) => ({ name, v, users: [...Object.values(M.things).flatMap((t) => Object.entries(t.fields).filter(([, d]) => d.named === name).map(([f]) => a(L.thing(t.name), `${t.name}.${f}`))),
      ...Object.values(M.operations).flatMap((o) => Object.entries({ ...o.payload, ...o.answer }).filter(([, d]) => d.named === name).map(([f]) => a(L.op(o.name), `${o.name} ${f}`)))] }));
    return { title: "Values", crumbs: [[L.home, BP.project], [L.values, "Reference"]], toc: [], html: `<h1>Values</h1><p class="lead">Named shapes that fields share.</p>
      ${dataTable({ id: "values", title: "Values", rows, search: (r) => r.name, filters: [{ key: "type", label: "Type", of: (r) => r.v.type }],
        columns: [{ key: "name", label: "Value", render: (r) => `<b id="${r.name}">${esc(r.name)}</b>`, sort: (r) => r.name }, { key: "type", label: "Type", render: (r) => `<code>${typeText(r.v)}</code>`, sort: (r) => r.v.type },
          { key: "users", label: "Used by", render: (r) => r.users.join(", ") || `<span class="muted">nothing yet</span>`, sort: (r) => r.users.length }] })}` };
  },
  roles() {
    const may = (pred) => Object.values(M.operations).filter((o) => o.allowed.some(pred)).map((o) => o.name);
    const rows = [...Object.values(M.things).flatMap((t) => t.roles.map((r) => ({ role: `${t.name}.${r}`, thing: t.name, ops: may((x) => x.role === `${t.name}.${r}`) }))),
      { role: "anyone signed in", thing: "built in", ops: may((x) => x.kind === "signed-in") }, { role: "anyone", thing: "built in", ops: may((x) => x.kind === "anyone") }];
    return { title: "Roles", crumbs: [[L.home, BP.project], [L.roles, "Reference"]], toc: [], html: `<h1>Roles</h1><p class="lead">Who may call what. Anyone else is refused NotAllowed before the handler runs.</p>
      ${dataTable({ id: "roles", title: "Roles", rows, search: (r) => `${r.role} ${r.ops.join(" ")}`, filters: [{ key: "thing", label: "Thing", of: (r) => r.thing }],
        columns: [{ key: "role", label: "Role", render: (r) => `<b>${esc(r.role)}</b>`, sort: (r) => r.role }, { key: "ops", label: "May call", render: (r) => r.ops.map((o) => a(L.op(o), o)).join(", "), sort: (r) => r.ops.length }] })}` };
  },
});

// An operation's proof: one row per environment, with what it was proved at, what changed, and how to clear it.
const opProof = (op) => dataTable({
  id: `proof-${op}`, title: "Environments", rows: ENVS.map((e) => proofOf(op, e)), search: (p) => `${p.environment} ${p.state} ${p.reason ?? ""}`,
  filters: [{ key: "state", label: "State", of: (p) => p.state }],
  columns: [{ key: "env", label: "Environment", render: (p) => a(L.env(p.environment), p.environment), sort: (p) => p.environment },
    { key: "state", label: "State", render: (p) => cell(p), sort: (p) => RANK[p.state] },
    { key: "at", label: "Proved at", render: (p) => slot(p.evidence.state === "available" ? `<code>${esc(p.evidence.value.revision)}</code><div class="sub">seq ${p.evidence.value.seq} · ${esc(p.evidence.value.workflow)} on ${esc(p.evidence.value.event)}</div>` : `<span class="muted">${esc(p.evidence.reason)}</span>`), sort: (p) => p.evidence.value?.seq ?? 0 },
    { key: "why", label: "Why", render: (p) => slot(p.state === "stale" ? p.changedDependencies.map((c) => `<code>${esc(c.key)}</code><div class="sub">${esc(c.was)} → ${esc(c.now ?? "gone")}</div>`).join("")
      : p.state === "recorded-pass" ? `<span class="small muted">${p.candidateNotRerun ? `contract unchanged; candidate ${esc(SNAP.candidate.revision)} not rerun` : "proved at the candidate"}</span>` : `<span class="small">${esc(p.reason)}</span>`), sort: false },
    { key: "do", label: "To clear", render: (p) => (p.state === "recorded-pass" ? "" : `<code>architect prove --env ${esc(p.environment)}</code>`), sort: false }],
});
const opEvals = (op) => dataTable({
  id: `evals-${op}`, title: "Evals", rows: EVALS.map(([key, label, what]) => ({ key, label, what })), search: (r) => `${r.label} ${r.what}`,
  filters: ENVS.map((e) => ({ key: e, label: `In ${e}`, of: (r) => evalResult(op, e).find(([k]) => k === r.key)[1] })),
  columns: [{ key: "label", label: "Eval", render: (r) => `<b>${esc(r.label)}</b><div class="sub">${esc(r.what)}</div>`, sort: (r) => r.label },
    ...ENVS.map((e) => ({ key: e, label: e, align: "c", render: (r) => slot(evChip(evalResult(op, e).find(([k]) => k === r.key))), sort: (r) => evalResult(op, e).find(([k]) => k === r.key)[1] }))],
});
