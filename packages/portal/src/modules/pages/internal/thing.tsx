// A thing's page (design/portal.md, "A thing's page"): it opens on the lifecycle, then its fields and operations with the window's
// counts, its events, errors and roles, and its generated doc. No populations: never how many are in each state.
import { Chip, Grid, Widget } from "@orthograph/portal-ui";
import type { ReactElement, ReactNode } from "react";
import type { OperationWire, ThingWire } from "#modules/wire/types.js";
import type { PageData } from "../types.ts";
import { FieldTable } from "./fields.tsx";
import { Frame } from "./frame.tsx";
import { Lifecycle } from "./lifecycle.tsx";
import { link } from "./links.ts";
import { none, operationsOf, statOf } from "./stats.ts";

const Block = ({ title, description, children }: { readonly title: string; readonly description?: string; readonly children: ReactNode }): ReactElement => (
  <Widget>
    <Widget.Header><div className="head-text"><Widget.Title>{title}</Widget.Title>{description !== undefined && <Widget.Description>{description}</Widget.Description>}</div></Widget.Header>
    <Widget.Content>{children}</Widget.Content>
  </Widget>
);

/** Each move's most common declared refusal in the window, written under the arrow it guards. The door's `NotAllowed` stops before any move. */
const guardsOf = (data: PageData, ops: ReadonlyArray<OperationWire>): Readonly<Record<string, string>> =>
  Object.fromEntries(ops.flatMap((o) => {
    if (o.move === null || data.view === undefined) return [];
    const top = o.errors.map((name) => [name, data.view?.refusals[name] ?? 0] as const).filter(([name, n]) => n > 0 && name !== "NotAllowed").sort((a, b) => b[1] - a[1])[0];
    return top === undefined ? [] : [[o.move.key, `${top[0]} ×${top[1]}`] as const];
  }));

const who = (op: OperationWire): string => op.allowed.map((a) => (a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "anyone signed in" : `${a.kind} ${a.role ?? ""}`.trim())).join(", or ");

export const ThingPage = ({ data, thing }: { readonly data: PageData; readonly thing: ThingWire }): ReactElement => {
  const { blueprint, view } = data;
  const names = operationsOf(blueprint, thing.name);
  const ops = names.flatMap((n) => { const o = blueprint.model.operations[n]; return o === undefined ? [] : [o]; });
  const doc = blueprint.docs[`${thing.name}/index.md`];
  const events = [...new Set(ops.flatMap((o) => (o.move === null ? [] : [o.move.emits])))];
  const errors = [...new Set(ops.flatMap((o) => o.errors))];
  type Row = (typeof ops)[number];
  return (
    <Frame data={data} title={thing.name} here={{ id: `thing:${thing.name}`, thing: thing.name }} crumbs={[blueprint.project, "Things", thing.name]} scope={{ id: `thing:${thing.name}`, operations: names, stat: statOf(view, names) }}>
      <div className="page">
        <header className="page-title">
          <div className="title-row"><h1>{thing.name}</h1></div>
          <p>{thing.description}</p>
          <div className="props"><Chip size="sm" variant="soft">lives in {thing.lives === "actor" ? "its own Durable Object" : "the database"}</Chip></div>
        </header>
        <Block title="Lifecycle" description="Moves answered in the window sit on each arrow, and the most common refusal under the arrow it guards. Never how many are in each state: that is stored data.">
          <Lifecycle thing={thing} view={view} guards={guardsOf(data, ops)} />
        </Block>
        <Block title="Fields"><FieldTable fields={thing.fields} label={`${thing.name} fields`} /></Block>
        <Block title="Operations" description="Each with who may call it and its calls in the window; a dark row saw no call.">
          <Grid
            aria-label={`${thing.name} operations`}
            data={ops}
            getRowId={(o: Row) => o.name}
            columns={[
              {
                id: "operation", header: "Operation", isRowHeader: true, minWidth: 150,
                cell: (o: Row) => {
                  const s = view?.byOperation[o.name] ?? none;
                  const journeys = view?.journeysOf[o.name] ?? [];
                  return <span data-portal="operation-row" data-operation={o.name} data-lit={String(s.calls > 0)} data-calls={String(s.calls)} data-journeys={journeys.join(",")}><a className="mono" href={link.operation(o.name)}>{o.verb}</a>{o.kind === "read" && <span className="muted small"> read</span>}</span>;
                },
              },
              { id: "who", header: "Who may call", cell: (o: Row) => <span className="small">{who(o)}</span> },
              { id: "description", header: "Description", minWidth: 220, cell: (o: Row) => <span className="small muted">{o.description}</span> },
              ...(view === undefined ? [] : [
                { id: "calls", header: "Calls", width: 80, align: "end" as const, cell: (o: Row) => <span className="mono">{view.byOperation[o.name]?.calls ?? 0}</span> },
                { id: "refused", header: "Refused", width: 90, align: "end" as const, cell: (o: Row) => <span className="mono">{view.byOperation[o.name]?.refused ?? 0}</span> },
                { id: "defects", header: "Defects", width: 90, align: "end" as const, cell: (o: Row) => <span className="mono">{view.byOperation[o.name]?.defects ?? 0}</span> },
                { id: "journeys", header: "Journeys", cell: (o: Row) => <span className="small">{(view.journeysOf[o.name] ?? []).join(", ")}</span> },
              ]),
            ]}
          />
        </Block>
        <div className="two">
          <Block title="Events" description="What a move records">
            {events.length === 0 ? <p className="muted small">No events declared.</p> : <ul className="plain">{events.map((e) => <li key={e}><a href={`${link.reference("events")}#${e}`} className="mono">{e}</a></li>)}</ul>}
          </Block>
          <Block title="Errors" description="Declared refusals of this thing's operations">
            {errors.length === 0 ? <p className="muted small">None declared.</p> : <ul className="plain">{errors.map((e) => <li key={e}><a href={`${link.reference("refusals")}#${e}`} className="mono">{e}</a></li>)}</ul>}
          </Block>
        </div>
        {thing.roles.length > 0 && <Block title="Roles"><ul className="plain">{thing.roles.map((r) => <li key={r} className="mono">{r}</li>)}</ul></Block>}
        {doc !== undefined && <Block title="Docs"><pre className="doc">{doc}</pre></Block>}
      </div>
    </Frame>
  );
};
