// Machines: every move of every machine in one table, then each machine's diagram.
Object.assign(PAGES, {
  machines() {
    const things = Object.values(M.things).filter((t) => t.machine);
    const rows = things.flatMap((t) => Object.entries(t.machine.moves).map(([key, mv]) => ({ thing: t.name, key, ...mv, op: opsOf(t.name).find((o) => o.move?.key === key) })));
    return { title: "Machines", crumbs: [[L.home, BP.project], [L.machines, "Reference"]], toc: [["moves", "Every move"], ...things.map((t) => [`m-${t.name}`, t.name])], html: `
      <h1>Machines</h1><p class="lead">The states a thing can be in, and the moves between them. A move from any other state is refused with the thing's wrong-state error.</p>
      <div class="badges">${things.map((t) => `<span class="badge">${esc(t.name)}: ${t.machine.states.length} states, ${Object.keys(t.machine.moves).length} moves</span>`).join("")}</div>
      ${sec("moves", "Every move", dataTable({ id: "moves", title: "Moves", rows, search: (r) => `${r.thing} ${r.key} ${r.emits} ${r.from.join(" ")} ${r.to.join(" ")}`,
        filters: [{ key: "thing", label: "Thing", of: (r) => r.thing }, { key: "creates", label: "Creates", of: (r) => (r.from.length ? "moves" : "creates") }],
        columns: [{ key: "thing", label: "Thing", render: (r) => a(L.thing(r.thing) + "#machine", r.thing), sort: (r) => r.thing },
          { key: "key", label: "Move", render: (r) => `<b>${esc(r.key)}</b>`, sort: (r) => r.key },
          { key: "from", label: "From", render: (r) => (r.from.length ? r.from.map(esc).join(", ") : `<span class="muted">(creates)</span>`), sort: false },
          { key: "to", label: "To", render: (r) => r.to.map(esc).join(", "), sort: false },
          { key: "emits", label: "Emits", render: (r) => a(L.event(r.thing, r.emits), r.emits), sort: (r) => r.emits },
          { key: "op", label: "Operation", render: (r) => (r.op ? `${a(L.op(r.op.name), r.op.name)} ${chips(r.op.name)}` : ""), sort: (r) => r.op?.name ?? "" },
          { key: "wrong", label: "Wrong state", render: (r) => { const nf = M.things[r.thing].machine.notFrom; return `<code>${esc(nf.code)}</code> <span class="small">${esc(nf.error)}</span>`; }, sort: false, hide: true }] }))}
      ${things.map((t) => sec(`m-${t.name}`, t.name, machineSvg(t.name))).join("")}` };
  },
});
