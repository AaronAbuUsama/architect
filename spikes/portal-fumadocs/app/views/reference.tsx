// The reference tables. Each takes an optional `thing` so a thing's page shows the same table, narrowed to it.
import { access, errors, events, moves, operations, refusedBy, roles, M, typeText, type Operation } from "../blueprint/model.ts";
import { DataTable } from "./data-table.tsx";
import { A, Code, EvalStrip, StateChip, Sub, to, TypeCell } from "./status.tsx";
import { ENVS, proofOf } from "../blueprint/evidence.ts";

const byThing = <R extends { thing: string | null }>(rows: R[], thing?: string) => (thing ? rows.filter((r) => r.thing === thing) : rows);
const thingFilter = { key: "thing", label: "Thing", of: (r: { thing: string | null }) => r.thing ?? "built in" };

export const OperationsTable = ({ thing }: { thing?: string }) => (
  <DataTable label="Operations" rows={byThing(operations, thing)} rowKey={(o) => o.name} search={(o) => `${o.name} ${o.description}`}
    filters={[...(thing ? [] : [thingFilter]), { key: "kind", label: "Kind", of: (o) => o.kind }]}
    columns={[
      { key: "op", label: "Operation", rowHeader: true, sort: (o) => o.name, cell: (o) => <><A href={to.op(o.name)}>{o.name}</A><Sub>{o.description}</Sub></> },
      { key: "kind", label: "Kind", sort: (o) => o.kind, cell: (o) => o.kind },
      { key: "move", label: "Move", cell: (o) => (o.move ? <>{o.move.key}<Sub>{o.move.from.join(", ") || "(creates)"} → {o.move.to.join(", ")}</Sub></> : <Sub>none</Sub>) },
      { key: "budget", label: "p95 budget", align: "end", sort: (o) => o.budget?.p95Ms ?? 0, cell: (o) => (o.budget ? `${o.budget.p95Ms} ms` : "") },
      ...ENVS.map((e) => ({ key: e, label: e, cell: (o: Operation) => <div className="flex flex-col items-start gap-1"><StateChip p={proofOf(o.name, e)} /><EvalStrip op={o.name} env={e} /></div> })),
    ]} />
);

export const EventsTable = ({ thing }: { thing?: string }) => (
  <DataTable label="Events" rows={byThing(events, thing)} rowKey={(e) => e.name} search={(e) => `${e.name} ${Object.keys(e.fields).join(" ")}`}
    filters={thing ? [] : [thingFilter]}
    columns={[
      { key: "name", label: "Event", rowHeader: true, sort: (e) => e.name, cell: (e) => <A href={to.event(e.thing, e.name)}>{e.name}</A> },
      ...(thing ? [] : [{ key: "thing", label: "Thing", sort: (e: (typeof events)[number]) => e.thing, cell: (e: (typeof events)[number]) => <A href={to.thing(e.thing)}>{e.thing}</A> }]),
      { key: "fields", label: "Carries", cell: (e) => <div className="flex flex-col gap-0.5">{Object.entries(e.fields).map(([f, d]) => <span key={f}><Code>{f}</Code> <TypeCell f={d} /></span>)}</div> },
      { key: "by", label: "Emitted by", cell: (e) => e.emittedBy.map((o) => <div key={o.name}><A href={to.op(o.name)}>{o.name}</A><Sub>move {o.move!.key}</Sub></div>) },
    ]} />
);

export const MovesTable = ({ thing }: { thing?: string }) => (
  <DataTable label="Moves" rows={byThing(moves, thing)} rowKey={(m) => `${m.thing}.${m.key}`} search={(m) => `${m.thing} ${m.key} ${m.emits}`}
    filters={thing ? [] : [thingFilter]}
    columns={[
      ...(thing ? [] : [{ key: "thing", label: "Thing", sort: (m: (typeof moves)[number]) => m.thing, cell: (m: (typeof moves)[number]) => <A href={to.thing(m.thing)}>{m.thing}</A> }]),
      { key: "move", label: "Move", rowHeader: true, sort: (m) => m.key, cell: (m) => <b>{m.key}</b> },
      { key: "from", label: "From", cell: (m) => m.from.join(", ") || <Sub>(creates)</Sub> },
      { key: "to", label: "To", cell: (m) => m.to.join(", ") },
      { key: "emits", label: "Emits", cell: (m) => <A href={to.event(m.thing, m.emits)}>{m.emits}</A> },
      { key: "op", label: "Operation", cell: (m) => (m.op ? <A href={to.op(m.op.name)}>{m.op.name}</A> : "") },
    ]} />
);

export const ErrorsTable = ({ thing, op }: { thing?: string; op?: string }) => (
  <DataTable label={op ? "Refusals" : "Errors"} rows={op ? M.operations[op]!.refusals.map((r) => errors[r]!) : byThing(Object.values(errors), thing)} rowKey={(e) => e.name} search={(e) => `${e.name} ${e.code}`}
    sort={{ column: "code", direction: "ascending" }} filters={[...(thing ? [] : [thingFilter]), { key: "kind", label: "Kind", of: (e) => e.kind }]}
    columns={[
      { key: "code", label: "Code", sort: (e) => e.code, cell: (e) => <Code>{e.code}</Code> },
      { key: "name", label: "Error", rowHeader: true, sort: (e) => e.name, cell: (e) => <span id={e.name} className="font-medium">{e.name}</span> },
      { key: "exit", label: "Exit", align: "end", sort: (e) => e.exit ?? 0, cell: (e) => e.exit ?? "" },
      { key: "kind", label: "Kind", sort: (e) => e.kind, cell: (e) => e.kind },
      { key: "carries", label: "Carries", cell: (e) => Object.keys(e.fields).map((f) => <Code key={f}>{f}</Code>) },
      { key: "by", label: "Refused by, and when", cell: (e) => refusedBy(e.name).filter((o) => !op || o === op).map((o) => <div key={o}><A href={to.op(o)}>{o}</A>{e.when[o] && <Sub>{e.when[o]}</Sub>}</div>) },
    ]} />
);

export const ValuesTable = () => {
  const rows = Object.entries(M.values).map(([name, v]) => ({ name, v, users: [
    ...Object.values(M.things).flatMap((t) => Object.entries(t.fields).filter(([, d]) => d.named === name).map(([f]) => ({ label: `${t.name}.${f}`, href: to.thing(t.name) }))),
    ...operations.flatMap((o) => Object.entries({ ...o.payload, ...o.answer }).filter(([, d]) => d.named === name).map(([f]) => ({ label: `${o.name} · ${f}`, href: to.op(o.name) }))),
  ] }));
  return (
    <DataTable label="Values" rows={rows} rowKey={(r) => r.name} search={(r) => r.name} filters={[{ key: "type", label: "Type", of: (r) => r.v.type }]}
      columns={[
        { key: "name", label: "Value", rowHeader: true, sort: (r) => r.name, cell: (r) => <span id={r.name} className="font-medium">{r.name}</span> },
        { key: "type", label: "Shape", sort: (r) => r.v.type, cell: (r) => <Code>{typeText(r.v)}</Code> },
        { key: "users", label: "Used by", sort: (r) => r.users.length, cell: (r) => (r.users.length ? <div className="flex flex-col">{r.users.map((u) => <A key={u.label} href={u.href}>{u.label}</A>)}</div> : <Sub>nothing yet</Sub>) },
      ]} />
  );
};

/** Who may call what: every operation against every role. A cell says how the role reaches it. */
export const AccessMatrix = ({ thing }: { thing?: string }) => {
  const ops = byThing(operations, thing);
  const cols = roles.filter((r) => ops.some((o) => access(o, r)));
  return (
    <DataTable label="Who may call" rows={ops} rowKey={(o) => o.name} search={(o) => o.name} filters={thing ? [] : [thingFilter]}
      columns={[
        { key: "op", label: "Operation", rowHeader: true, sort: (o) => o.name, cell: (o) => <A href={to.op(o.name)}>{o.name}</A> },
        ...cols.map((r) => ({ key: r, label: r, align: "center" as const, cell: (o: Operation) => { const a = access(o, r);
          return !a ? <span className="text-fd-muted-foreground">·</span> : <span title={a.path ? `as the ${r} of ${a.path}` : r}>✔{a.path && <Sub>of {a.path}</Sub>}</span>; } })),
      ]} />
  );
};
