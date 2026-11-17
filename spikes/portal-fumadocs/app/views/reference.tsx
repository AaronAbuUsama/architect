// The reference tables. Each takes an optional `thing` so a thing's page shows the same table, narrowed to it.
import { Link } from "react-router";
import { access, errors, events, moves, operations, refusedBy, roles, M, typeText, valueUsers, type Operation } from "../blueprint/model.ts";
import { SpeedBar } from "./proof-overview.tsx";
import { DataTable } from "./data-table.tsx";
import { A, Code, EvalStrip, StateChip, Sub, to, TypeCell } from "./status.tsx";
import { ENVS, proofOf } from "../blueprint/evidence.ts";

const byThing = <R extends { thing: string | null }>(rows: R[], thing?: string) => (thing ? rows.filter((r) => r.thing === thing) : rows);
const thingFilter = { key: "thing", label: "Thing", of: (r: { thing: string | null }) => r.thing ?? "built in" };

export const OperationsTable = ({ thing }: { thing?: string }) => (
  <DataTable label="Operations" rows={byThing(operations, thing)} rowKey={(o) => o.name} search={(o) => `${o.name} ${o.description}`} rowHref={(o) => to.op(o.name)}
    filters={[...(thing ? [] : [thingFilter]), { key: "kind", label: "Kind", of: (o) => o.kind }]}
    columns={[
      { key: "op", label: "Operation", rowHeader: true, sort: (o) => o.name, cell: (o) => <><A href={to.op(o.name)}>{o.name}</A><Sub>{o.description}</Sub></> },
      { key: "move", label: "Move", cell: (o) => (o.move ? <span className="whitespace-nowrap text-sm">{o.move.from.join(", ") || "new"} → {o.move.to.join(", ")}</span> : <Sub>{o.kind === "read" ? "read" : "none"}</Sub>) },
      { key: "budget", label: "Speed", cell: (o) => <SpeedBar op={o.name} /> },
      ...ENVS.map((e) => ({ key: e, label: e[0]!.toUpperCase() + e.slice(1), cell: (o: Operation) => <div className="flex flex-col items-start gap-1"><StateChip p={proofOf(o.name, e)} /><EvalStrip op={o.name} env={e} /></div> })),
    ]} />
);

/** Field names as quiet chips: the shape at a glance; types live on the event or error's own page. */
const Carries = ({ fields }: { fields: Record<string, unknown> }) => Object.keys(fields).length
  ? <div className="flex flex-wrap gap-1">{Object.keys(fields).map((f) => <span key={f} className="rounded-md bg-fd-muted px-1.5 py-0.5 font-mono text-xs">{f}</span>)}</div>
  : <Sub>nothing</Sub>;

export const EventsTable = ({ thing }: { thing?: string }) => (
  <DataTable label="Events" rows={byThing(events, thing)} rowKey={(e) => e.name} search={(e) => `${e.name} ${Object.keys(e.fields).join(" ")}`} rowHref={(e) => to.event(e.thing, e.name)}
    filters={thing ? [] : [thingFilter]}
    columns={[
      { key: "name", label: "Event", rowHeader: true, sort: (e) => e.name, cell: (e) => <><A href={to.event(e.thing, e.name)}>{e.name}</A>{!thing && <Sub>{e.thing}</Sub>}</> },
      { key: "when", label: "When", cell: (e) => <div className="flex flex-col gap-0.5">{e.emittedBy.map((o) => <span key={o.name} className="text-sm"><A href={to.op(o.name)}>{o.name}</A> <span className="text-fd-muted-foreground">{o.move!.from.join(", ") || "new"} → {o.move!.to.join(", ")}</span></span>)}</div> },
      { key: "fields", label: "Carries", cell: (e) => <Carries fields={e.fields} /> },
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
    rowHref={(e) => to.error(e.name)} sort={{ column: "code", direction: "ascending" }} filters={[...(thing ? [] : [thingFilter]), { key: "kind", label: "Kind", of: (e) => e.kind }]}
    columns={[
      { key: "name", label: "Error", rowHeader: true, sort: (e) => e.name, cell: (e) => <><A href={to.error(e.name)}>{e.name}</A><Sub>{e.kind}{e.exit !== null ? ` · exit ${e.exit}` : ""}</Sub></> },
      { key: "code", label: "Code", sort: (e) => e.code, cell: (e) => <span className="font-mono text-sm">{e.code}</span> },
      { key: "when", label: op ? "When" : "When (first operation)", cell: (e) => { const o = op ?? refusedBy(e.name)[0]; const w = o ? e.when[o] : undefined;
        return w ? <span className="text-sm">{w}{!op && refusedBy(e.name).length > 1 && <Sub>and {refusedBy(e.name).length - 1} more operations</Sub>}</span> : <Sub>{o ? "not described" : "refused by nothing yet"}</Sub>; } },
      { key: "carries", label: "Carries", cell: (e) => <Carries fields={e.fields} /> },
    ]} />
);

export const ValuesTable = () => {
  const rows = Object.entries(M.values).map(([name, v]) => ({ name, v, users: valueUsers(name) }));
  return (
    <DataTable label="Values" rows={rows} rowKey={(r) => r.name} search={(r) => r.name} rowHref={(r) => to.value(r.name)} filters={[{ key: "type", label: "Type", of: (r) => r.v.type }]}
      columns={[
        { key: "name", label: "Value", rowHeader: true, sort: (r) => r.name, cell: (r) => <A href={to.value(r.name)}>{r.name}</A> },
        { key: "type", label: "Shape", sort: (r) => r.v.type, cell: (r) => <span className="font-mono text-sm">{typeText(r.v)}</span> },
        { key: "users", label: "Used in", align: "end", sort: (r) => r.users.length, cell: (r) => <span className="tabular-nums">{r.users.length || "–"}</span> },
      ]} />
  );
};

/** Who may call what: every operation against every role. A cell says how the role reaches it. */
export const AccessMatrix = ({ thing }: { thing?: string }) => {
  const ops = byThing(operations, thing);
  const cols = roles.filter((r) => ops.some((o) => access(o, r)));
  return (
    <DataTable label="Who may call" rows={ops} rowKey={(o) => o.name} search={(o) => o.name} filters={thing ? [] : [thingFilter]}
      rowHref={(o) => to.op(o.name)} columns={[
        { key: "op", label: "Operation", rowHeader: true, sort: (o) => o.name, cell: (o) => <A href={to.op(o.name)}>{o.name}</A> },
        ...cols.map((r) => ({ key: r, label: r, head: <Link to={to.role(r)} className="hover:underline">{r}</Link>, align: "center" as const, cell: (o: Operation) => { const a = access(o, r);
          return !a ? <span className="text-fd-muted-foreground">·</span> : <span title={a.path ? `as the ${r} of ${a.path}` : r}>✔{a.path && <Sub>of {a.path}</Sub>}</span>; } })),
      ]} />
  );
};
