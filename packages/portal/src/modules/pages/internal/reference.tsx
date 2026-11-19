// The reference pages: one table each, rows anchored by name, each with its live numbers from the window. Refusal codes, door
// rejections per value and the values index wait for M1.42's wire (codes, values and role rules are not on it yet).
import { Grid, Move } from "@orthograph/portal-ui";
import type { ReactElement } from "react";
import type { PageData, ReferenceKind } from "../types.ts";
import { Frame } from "./frame.tsx";
import { link } from "./links.ts";
import { statOfAll } from "./stats.ts";

interface Row { readonly id: string; readonly cells: ReadonlyArray<ReactElement | string> }
interface Table { readonly title: string; readonly note: string; readonly head: ReadonlyArray<string>; readonly rows: ReadonlyArray<Row> }

const mono = (text: string, anchor?: string): ReactElement => <span className="mono" id={anchor}>{text}</span>;

const tableOf = (data: PageData, kind: ReferenceKind): Table => {
  const { blueprint, view } = data;
  const ops = Object.values(blueprint.model.operations);
  const live = (n: number | undefined): string => (view === undefined ? "" : String(n ?? 0));
  if (kind === "access") {
    return {
      title: "Access", note: "Who may call each operation, as the model declares it.", head: ["Operation", "Who may call", ...(view === undefined ? [] : ["Calls", "Refused"])],
      rows: ops.map((o) => ({ id: o.name, cells: [<a key="o" className="mono" href={link.operation(o.name)}>{o.name}</a>, o.allowed.map((a) => (a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "anyone signed in" : `${a.kind} ${a.role ?? ""}`.trim())).join(", or "), ...(view === undefined ? [] : [live(view.byOperation[o.name]?.calls), live(view.byOperation[o.name]?.refused)])] })),
    };
  }
  if (kind === "events") {
    const events = ops.flatMap((o) => (o.move === null ? [] : [{ event: o.move.emits, op: o.name }]));
    return {
      title: "Events", note: "What each move records, and how many committed in the window (from the commit span's event name).", head: ["Event", "Emitted by", ...(view === undefined ? [] : ["Committed"])],
      rows: events.map((e) => ({ id: e.event, cells: [mono(e.event, e.event), <a key="o" className="mono" href={link.operation(e.op)}>{e.op}</a>, ...(view === undefined ? [] : [live(view.events[e.event])])] })),
    };
  }
  if (kind === "machines") {
    const moves = Object.values(blueprint.model.things).flatMap((t) => Object.entries(t.machine?.moves ?? {}).map(([key, m]) => ({ thing: t.name, key, m })));
    return {
      title: "Machines", note: "Every move of every machine, with the answered moves counted in the window.", head: ["Thing", "Move", "Path", "Emits", ...(view === undefined ? [] : ["Answered"])],
      rows: moves.map(({ thing, key, m }) => ({ id: `${thing}.${key}`, cells: [<a key="t" href={link.thing(thing)}>{thing}</a>, mono(key, `${thing}.${key}`), <Move key="m" from={m.from} to={m.to} />, m.emits, ...(view === undefined ? [] : [live(view.moves[`${thing}.${key}`])])] })),
    };
  }
  const names = [...new Set(ops.flatMap((o) => o.errors))];
  return {
    title: "Refusals", note: "Every declared refusal, the operations that can say it, and how often it was said in the window. Codes arrive with M1.42.", head: ["Refusal", "Declared by", ...(view === undefined ? [] : ["Said"])],
    rows: names.map((name) => ({ id: name, cells: [mono(name, name), ops.filter((o) => o.errors.includes(name)).map((o) => o.name).join(", "), ...(view === undefined ? [] : [live(view.refusals[name])])] })),
  };
};

export const ReferencePage = ({ data, kind }: { readonly data: PageData; readonly kind: ReferenceKind }): ReactElement => {
  const table = tableOf(data, kind);
  return (
    <Frame data={data} title={table.title} here={{ id: `reference:${kind}` }} crumbs={[data.blueprint.project, "Reference", table.title]} scope={{ id: "all", operations: "all", stat: statOfAll(data.view) }}>
      <div className="page">
        <header className="page-title"><h1>{table.title}</h1><p>{table.note}</p></header>
        <Grid
          aria-label={table.title}
          data={table.rows}
          getRowId={(r: Row) => r.id}
          columns={table.head.map((header, i) => ({ id: `c${i}`, header, ...(i === 0 ? { isRowHeader: true } : {}), cell: (r: Row) => r.cells[i] ?? "" }))}
        />
      </div>
    </Frame>
  );
};
