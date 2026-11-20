// /portal/things/<name>: what the thing is, its fields, its machine with each arrow's count, its events, who holds a role on it, and the
// operations on it with what the window counted of each.
import type { ThingWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { Lifecycle } from "./lifecycle.tsx";
import { isLit, journeysRunning, tallyOf } from "./live.ts";
import { eventsOf } from "./model.ts";
import { Docs, FieldRows, Page } from "./parts.tsx";

export const ThingPage = ({ data, thing }: { readonly data: PortalData; readonly thing: ThingWire }) => {
  const { blueprint } = data;
  const ops = Object.values(blueprint.model.operations).filter((o) => o.thing === thing.name);
  const events = eventsOf(thing);
  return (
    <Page status={200} data={data} scope={`thing:${thing.name}`} operations={ops.map((o) => o.name)}>
      <h1>{thing.name}</h1>
      <p>{thing.description}</p>
      <p>{`Lives in ${thing.lives === "actor" ? "its own Durable Object" : "the database"}.`}</p>
      <h2>Fields</h2>
      <FieldRows fields={thing.fields} />
      {thing.machine ? <><h2>Machine</h2><Lifecycle data={data} thing={thing} counted /></> : null}
      {events.length > 0 ? (
        <>
          <h2>Events</h2>
          <ul>{events.map(([name, fields]) => <li key={name}>{`${name}: ${Object.entries(fields).map(([f, v]) => `${f} (${v.named ?? String(v.value["type"] ?? "?")})`).join(", ")}`}</li>)}</ul>
        </>
      ) : null}
      {thing.roles.length > 0 ? <><h2>Roles</h2><ul>{thing.roles.map((r) => <li key={r}>{r}</li>)}</ul></> : null}
      <h2>Operations</h2>
      <ul>
        {ops.map((o) => {
          const t = tallyOf(data, o.name);
          const journeys = journeysRunning(data, o.name);
          return (
            <li key={o.name}>
              <span data-portal="operation-row" data-operation={o.name} data-lit={String(isLit(data, o.name))} data-calls={t.calls} data-journeys={journeys.join(",")}>
                <a href={`/portal/operations/${encodeURIComponent(o.name)}`}>{o.name}</a>{`: ${o.description}`}
              </span>
            </li>
          );
        })}
      </ul>
      <Docs text={blueprint.docs[`${thing.name}/index.md`]} />
    </Page>
  );
};
