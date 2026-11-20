// /portal/things/<name>: what the thing is, its fields, its machine, who holds a role on it, and the operations on it.
import type { ThingWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { Docs, FieldRows, Page, Table } from "./parts.tsx";

export const ThingPage = ({ data: { blueprint }, thing }: { readonly data: PortalData; readonly thing: ThingWire }) => {
  const ops = Object.values(blueprint.model.operations).filter((o) => o.thing === thing.name);
  return (
    <Page status={200}>
      <h1>{thing.name}</h1>
      <p>{thing.description}</p>
      <p>{`Lives in ${thing.lives === "actor" ? "its own Durable Object" : "the database"}.`}</p>
      <h2>Fields</h2>
      <FieldRows fields={thing.fields} />
      {thing.machine ? (
        <>
          <h2>Machine</h2>
          <p>{`States: ${thing.machine.states.join(", ")}.`}</p>
          <Table head={["Move", "From", "To", "Emits"]} rows={Object.entries(thing.machine.moves).map(([k, m]) => [k, m.from.join(", ") || "(creates)", m.to.join(", "), m.emits])} />
        </>
      ) : null}
      {thing.roles.length > 0 ? <><h2>Roles</h2><ul>{thing.roles.map((r) => <li key={r}>{r}</li>)}</ul></> : null}
      <h2>Operations</h2>
      <ul>{ops.map((o) => <li key={o.name}><a href={`/portal/operations/${encodeURIComponent(o.name)}`}>{o.name}</a>{`: ${o.description}`}</li>)}</ul>
      <Docs text={blueprint.docs[`${thing.name}/index.md`]} />
    </Page>
  );
};
