// Each page type's body. Fumadocs gives the frame (title, TOC, breadcrumbs); these give the content, from the blueprint.
import { Callout } from "fumadocs-ui/components/callout";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import type { ReactNode } from "react";
import { CANDIDATE } from "../blueprint/evidence.ts";
import { BP, M, opsOf, things, typeText, type Fields } from "../blueprint/model.ts";
import type { PageKind } from "../blueprint/paths.ts";
import { MachineDiagram, MoveStrip } from "./machine.tsx";
import { OperationProof, ProofMatrix } from "./proof.tsx";
import { StatTiles } from "./proof-overview.tsx";
import { AttentionList } from "./attention.tsx";
import { AccessMatrix, ErrorsTable, EventsTable, MovesTable, OperationsTable, ValuesTable } from "./reference.tsx";
import { A, Code, Illustration, Sub, to, TypeCell } from "./status.tsx";

export type Section = { id: string; title: string; body: ReactNode; fold?: boolean };
const fieldsType = (fields: Fields) => Object.fromEntries(Object.entries(fields).map(([n, f]) => [n, { type: <TypeCell f={f} />, required: !f.optional, typeDescription: typeText(f.value) }]));
const Fields = ({ fields, empty }: { fields: Fields; empty: string }) => (Object.keys(fields).length ? <TypeTable type={fieldsType(fields)} /> : <p className="text-fd-muted-foreground">{empty}</p>);
const evidenceNote = <Callout title="Proof here is an illustration">The states are made up to show each one; names and hashes are acme's. Per-eval results (the nine squares) do not reach the portal yet: today the logbook keeps one verdict per operation.</Callout>;

export function sections(p: PageKind): Section[] {
  switch (p.kind) {
    case "home": return [
      { id: "proof", title: "Proof", body: <>{evidenceNote}<StatTiles /><ProofMatrix /></> },
    ];
    case "proof": return [
      { id: "matrix", title: "Every operation", body: <>{evidenceNote}<StatTiles /><p>Each environment shows the verdict and its nine evals as squares; hover a square for the eval and its note.</p><ProofMatrix /></> },
      { id: "candidate", title: "What it is judged against", body: <p>The candidate is <Code>{CANDIDATE}</Code>, the newest revision proved in test. A verdict from an older revision still counts when the contract it rests on has not changed; it says so.</p> },
    ];
    case "thing": { const t = M.things[p.thing]!; return [
      { id: "operations", title: "Operations", body: <OperationsTable thing={t.name} /> },
      { id: "fields", title: "Fields", body: <Fields fields={t.fields} empty="No fields." /> },
      ...(t.machine ? [{ id: "machine", title: "Machine", body: <MachineDiagram thing={t.name} /> }] : []),
      ...(Object.keys(t.events ?? {}).length ? [{ id: "events", title: "Events", body: <EventsTable thing={t.name} />, fold: true }] : []),
      { id: "errors", title: "Errors", body: <ErrorsTable thing={t.name} />, fold: true },
      { id: "access", title: "Who may call", body: <AccessMatrix thing={t.name} />, fold: true },
    ]; }
    case "operation": { const o = M.operations[p.operation]!; const cli = /```sh\n(.*)\n```/.exec(BP.docs[`${o.thing}/${o.verb}.md`] ?? "")?.[1] ?? "";
      const sdkThing = o.thing.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()); const body = JSON.stringify(Object.fromEntries(Object.keys(o.payload).map((k) => [k, `<${k}>`])), null, 2);
      return [
        { id: "proof", title: "Proof", body: <>{evidenceNote}<OperationProof op={o.name} /></> },
        { id: "call", title: "How to call", body: <Tabs items={["CLI", "HTTP", "SDK"]}>
          <Tab value="CLI"><pre className="overflow-x-auto"><code>{cli}</code></pre></Tab>
          <Tab value="HTTP"><pre className="overflow-x-auto"><code>{`POST /${o.thing}/${o.verb}\ncontent-type: application/json${o.idempotent ? "\nidempotency-key: <key>" : ""}\n\n${body}`}</code></pre></Tab>
          <Tab value="SDK"><pre className="overflow-x-auto"><code>{`const answer = yield* Sdk.${sdkThing}.${o.identifier}(${body})`}</code></pre></Tab></Tabs> },
        { id: "payload", title: "Payload", body: <Fields fields={o.payload} empty="No payload." /> },
        { id: "answer", title: "Answer", body: <Fields fields={o.answer} empty="No answer." /> },
        ...(o.move ? [{ id: "move", title: "Move", body: <><p>{o.move.from.length ? <>From <b>{o.move.from.join(" or ")}</b></> : "Creates it"}, to <b>{o.move.to.join(" or ")}</b>, emitting <A href={to.event(o.thing, o.move.emits)}>{o.move.emits}</A>.</p><MachineDiagram thing={o.thing} hot={o.move.key} /></> }] : []),
        { id: "refusals", title: "Refusals", body: <ErrorsTable op={o.name} /> },
        { id: "access", title: "Who may call", body: <AccessMatrix thing={o.thing} />, fold: true },
      ]; }
    case "machine": return [{ id: "machine", title: "Machine", body: <><MachineDiagram thing={p.thing} /><MovesTable thing={p.thing} /></> }];
    case "event": { const fields = M.things[p.thing]!.events![p.event]!; const by = opsOf(p.thing).filter((o) => o.move?.emits === p.event); return [
      { id: "emitted", title: "When it happens", body: by.map((o) => <MoveStrip key={o.name} op={o.name} />) },
      { id: "fields", title: "Carries", body: <Fields fields={fields} empty="Nothing." /> },
      { id: "machine", title: `In the ${p.thing} machine`, body: <MachineDiagram thing={p.thing} hot={by[0]?.move?.key} />, fold: true },
    ]; }
    case "reference": return [{ id: p.table, title: "", body: { machines: <><MovesTable />{things.filter((t) => t.machine).map((t) => <div key={t.name}><h3 id={t.name}>{t.name}</h3><MachineDiagram thing={t.name} /></div>)}</>,
      events: <EventsTable />, errors: <ErrorsTable />, values: <ValuesTable />, roles: <AccessMatrix /> }[p.table] }];
    case "environment": { const e = M.environments[p.environment]!; const proved = e.name !== "local"; return [
      { id: "about", title: "About", body: <EnvironmentAbout name={e.name} /> },
      ...(proved ? [{ id: "proof", title: "Proof", body: <>{evidenceNote}<ProofMatrix label={`Operations in ${e.name}`} /></> }] : []),
    ]; }
    case "attention": return [{ id: "items", title: "", body: <>{evidenceNote}<AttentionList /></> }];
    case "journeys": return [{ id: "journeys", title: "", body: <Callout type="info" title="Not available yet">{String(BP.extensions.journeys?.reason)}. These pages appear when the compiler projects journeys and worlds (F2.2); nothing here is invented.</Callout> }];
  }
}

const EnvironmentAbout = ({ name }: { name: string }) => { const e = M.environments[name]!; return (
  <div className="not-prose grid grid-cols-[10rem_1fr] gap-x-6 gap-y-2 text-sm">
    <span className="text-fd-muted-foreground">Runs</span><span>{e.runs}</span>
    <span className="text-fd-muted-foreground">Identity</span><span>{e.identity}</span>
    <span className="text-fd-muted-foreground">Where</span><span>{e.cloud ? `${e.cloud.provider}, ${e.cloud.database}` : e.database}</span>
    {e.promotesFrom && <><span className="text-fd-muted-foreground">Promoted from</span><A href={to.env(e.promotesFrom)}>{e.promotesFrom}</A></>}
    {Object.entries(e.deploy).map(([k, d]) => <><span key={k} className="text-fd-muted-foreground">Serves {k}</span><span><Code>{d.domain}</Code> <Sub>{d.how}</Sub></span></>)}
    {Object.entries(e.publish).map(([k, ps]) => <><span key={k} className="text-fd-muted-foreground">Publishes the {k}</span><span>{ps.map((x) => x.how + (x.tag ? ` (${x.tag})` : x.tap ? ` (${x.tap})` : "")).join(", ")}</span></>)}
    <span className="text-fd-muted-foreground">Declared in</span><span><Code>{e.file}</Code></span>
  </div>
); };
export { Illustration };
