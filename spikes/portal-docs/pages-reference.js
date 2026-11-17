// Reference pages (errors, values, roles), environments, the not-yet-available journeys, and the raw generated docs.
Object.assign(PAGES, {
  things() {
    return { title: "Things", crumbs: [[L.home, BP.project]], toc: [], html: `<h1>Things</h1><p class="lead">What ${esc(BP.project)} keeps, each with its own operations.</p>
      <div class="cards">${Object.values(M.things).map((t) => `<a class="card" href="${L.thing(t.name)}"><b>${esc(t.name)} <span class="muted small">${esc(t.code)}</span></b><span>${esc(t.description)}</span></a>`).join("")}</div>` };
  },
  errors() {
    const rows = Object.values(ERRORS).sort((x, y) => x.code.localeCompare(y.code));
    return { title: "Errors", crumbs: [[L.home, BP.project], ["#/reference/errors", "Reference"]], toc: rows.map((e) => [e.name, e.code]), html: `
      <h1>Errors</h1><p class="lead">Every refusal, its stable code and its exit. Codes never move once shipped.</p>
      ${rows.map((e) => `<h3 id="${e.name}">${esc(e.name)} <code>${esc(e.code)}</code></h3>
        <p>${e.builtIn ? "Built in." : e.machine ? `The machine of ${a(L.thing(e.thing), e.thing)}: a move from the wrong state.` : `Declared by ${a(L.thing(e.thing), e.thing)}.`}${e.exit != null ? ` Exit ${e.exit}.` : ""}
        ${Object.keys(e.fields || {}).length ? ` Carries ${Object.keys(e.fields).map((f) => `<code>${esc(f)}</code>`).join(", ")}.` : ""}</p>
        <p class="small">Refused by ${usersOf(e.name).map((o) => a(L.op(o), o)).join(", ") || "nothing yet"}.</p>`).join("")}` };
  },
  values() {
    return { title: "Values", crumbs: [[L.home, BP.project], ["#/reference/values", "Reference"]], toc: Object.keys(M.values).map((v) => [v, v]), html: `
      <h1>Values</h1><p class="lead">Named shapes that fields share.</p>
      ${Object.entries(M.values).map(([n, v]) => { const users = [];
        for (const t of Object.values(M.things)) for (const [f, d] of Object.entries(t.fields)) if (d.named === n) users.push(a(L.thing(t.name), `${t.name}.${f}`));
        for (const o of Object.values(M.operations)) for (const [f, d] of Object.entries({ ...o.payload, ...o.answer })) if (d.named === n) users.push(a(L.op(o.name), `${o.name} ${f}`));
        return `<h3 id="${n}">${esc(n)}</h3><p><code>${typeText(v)}</code></p><p class="small">Used by ${users.join(", ") || "nothing yet"}.</p>`; }).join("")}` };
  },
  roles() {
    const rows = Object.values(M.things).flatMap((t) => t.roles.map((r) => [t.name, r]));
    return { title: "Roles", crumbs: [[L.home, BP.project], ["#/reference/roles", "Reference"]], toc: [], html: `<h1>Roles</h1><p class="lead">Who may call what.</p>
      <table><thead><tr><th>Role</th><th>May call</th></tr></thead><tbody>${rows.map(([t, r]) => `<tr><td>${a(L.thing(t) + "#roles", `${t}.${r}`)}</td><td>${Object.values(M.operations).filter((o) => o.allowed.some((x) => x.role === `${t}.${r}`)).map((o) => a(L.op(o.name), o.name)).join(", ")}</td></tr>`).join("")}
      <tr><td>anyone signed in</td><td>${Object.values(M.operations).filter((o) => o.allowed.some((x) => x.kind === "signed-in")).map((o) => a(L.op(o.name), o.name)).join(", ")}</td></tr>
      <tr><td>anyone</td><td>${Object.values(M.operations).filter((o) => o.allowed.some((x) => x.kind === "anyone")).map((o) => a(L.op(o.name), o.name)).join(", ")}</td></tr></tbody></table>` };
  },
  env(name) {
    const e = M.environments[name]; if (!e) return null; const proved = ENVS.includes(name);
    const deploy = Object.entries(e.deploy || {}); const publish = Object.entries(e.publish || {});
    return { title: name, crumbs: [[L.home, BP.project], ["#/environments/staging", "Environments"]], toc: [["about", "About"], ...(proved ? [["proof", "Proof"]] : [])], html: `
      <h1>${esc(name)}</h1><p class="lead">Runs ${esc(e.runs)}.</p>
      <div class="badges"><span class="badge">identity: ${esc(e.identity)}</span>${e.cloud ? `<span class="badge">${esc(e.cloud.provider)} · ${esc(e.cloud.database)}</span>` : `<span class="badge">${esc(e.database)}</span>`}${e.promotesFrom ? `<span class="badge">promoted from ${a(L.env(e.promotesFrom), e.promotesFrom)}</span>` : ""}${e.lifetimeMs ? `<span class="badge">lives ${e.lifetimeMs / 3600000} h</span>` : ""}</div>
      ${sec("about", "About", `${deploy.length ? `<table><thead><tr><th>Serves</th><th>As</th><th>At</th></tr></thead><tbody>${deploy.map(([k, d]) => `<tr><td>${esc(k)}</td><td>${esc(d.how)}</td><td><code>${esc(d.domain)}</code></td></tr>`).join("")}</tbody></table>` : `<p class="muted">Nothing deployed under its own domain.</p>`}
        ${publish.length ? `<p>Publishes ${publish.map(([k, ps]) => `the ${esc(k)} to ${ps.map((p) => esc(p.how + (p.tag ? ` (${p.tag})` : p.tap ? ` (${p.tap})` : ""))).join(", ")}`).join("; ")}.</p>` : ""}`)}
      ${proved ? sec("proof", "Proof", dataTable({ id: `env-${name}`, title: "Operations", rows: Object.values(M.operations), sort: { key: "state", dir: "asc" }, search: (o) => `${o.name} ${proofOf(o.name, name).reason ?? ""}`,
        filters: [{ key: "state", label: "State", of: (o) => proofOf(o.name, name).state }, { key: "thing", label: "Thing", of: (o) => o.thing }],
        columns: [{ key: "op", label: "Operation", render: (o) => a(L.op(o.name), o.name), sort: (o) => o.name }, { key: "state", label: "State", render: (o) => cell(proofOf(o.name, name)), sort: (o) => RANK[proofOf(o.name, name).state] },
          { key: "at", label: "Proved at", render: (o) => { const p = proofOf(o.name, name); return slot(p.evidence.state === "available" ? `<code>${esc(p.evidence.value.revision)}</code>` : `<span class="muted">none</span>`); }, sort: false },
          { key: "why", label: "Why", render: (o) => { const p = proofOf(o.name, name); return slot(`<span class="small">${p.state === "stale" ? p.changedDependencies.map((c) => esc(c.key)).join(", ") + " changed" : p.state === "recorded-pass" ? "" : esc(p.reason)}</span>`); }, sort: false }] })) : `<p class="muted">Not proved: ${esc(name)} is where you run it yourself.</p>`}
      <p class="src">Declared in <code>${esc(e.file)}</code> · hash <code>${esc(e.hash)}</code></p>` };
  },
  journeys() {
    const x = BP.extensions.journeys;
    return { title: "Journeys", crumbs: [[L.home, BP.project]], toc: [], html: `<h1>Journeys</h1><p class="lead">The stories that prove the operations, step by step.</p>
      <div class="callout none"><b>Not available yet.</b> ${esc(x.reason)}. These pages appear when the compiler projects journeys and worlds (F2.2); nothing here is invented.</div>` };
  },
  doc(path) {
    const md = BP.docs[`${path}.md`]; if (md === undefined) return null; const base = path.split("/")[0];
    return { title: path, crumbs: [[L.home, BP.project], ["#/things/" + base, base], ["", "Generated Markdown"]], toc: [], html: `
      <div class="callout none small">This is <code>generated/docs/${esc(path)}.md</code> as the generator writes it. The site renders it at build time; the page above it is built from the same blueprint.</div>${markdown(md, base)}` };
  },
});
