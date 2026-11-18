// Each page type's body. Fumadocs gives the frame (title, TOC, breadcrumbs); these give the content, from the blueprint.
import { Alert } from "@heroui/react";
import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import type { ReactNode } from "react";
import { CANDIDATE } from "../blueprint/evidence.ts";
import { BP, errors, M, opsOf, things, refusedBy, roleOps, typeText, valueUsers, type Fields } from "../blueprint/model.ts";
import { HowToCall } from "./call.tsx";
import type { PageKind } from "../blueprint/paths.ts";
import { MachineDiagram, MoveStrip } from "./machine.tsx";
import { OperationProof, ProofMatrix } from "./proof.tsx";
import { StatTiles } from "./proof-overview.tsx";
import { AttentionList } from "./attention.tsx";
import { AccessMatrix, ErrorsTable, EventsTable, MovesTable, OperationsTable, ValuesTable } from "./reference.tsx";
import { SimpleTable as DataTableLite, FieldsTable } from "./simple-table.tsx";
import { A, Code, Illustration, Sub, to } from "./status.tsx";
import { tasksAbout, WorkOnIt } from "../work/links.tsx";

export type Section = { id: string; title: string; body: ReactNode; fold?: boolean };
const Fields = ({ fields, empty }: { fields: Fields; empty: string }) => (Object.keys(fields).length ? <FieldsTable fields={fields} /> : <p className="text-muted">{empty}</p>);
const Note = ({ title, status = "accent", children }: { title: string; status?: "accent" | "warning"; children: ReactNode }) => (
  <Alert status={status} className="my-4"><Alert.Indicator /><Alert.Content><Alert.Title>{title}</Alert.Title><Alert.Description>{children}</Alert.Description></Alert.Content></Alert>);
const evidenceNote = <Note title="Proof here is an illustration">The states are made up to show each one; names and hashes are acme's. Per-eval results (the nine squares) do not reach the portal yet: today the logbook keeps one verdict per operation.</Note>;

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
      ...(tasksAbout(t.name).length ? [{ id: "work", title: "Work on it", body: <WorkOnIt subject={t.name} />, fold: true }] : []),
      { id: "fields", title: "Fields", body: <Fields fields={t.fields} empty="No fields." /> },
      ...(t.machine ? [{ id: "machine", title: "Machine", body: <MachineDiagram thing={t.name} /> }] : []),
      ...(Object.keys(t.events ?? {}).length ? [{ id: "events", title: "Events", body: <EventsTable thing={t.name} />, fold: true }] : []),
      { id: "errors", title: "Errors", body: <ErrorsTable thing={t.name} />, fold: true },
      { id: "access", title: "Who may call", body: <AccessMatrix thing={t.name} />, fold: true },
    ]; }
    case "operation": { const o = M.operations[p.operation]!;
      return [
        { id: "proof", title: "Proof", body: <>{evidenceNote}<OperationProof op={o.name} /></> },
        ...(tasksAbout(o.name).length ? [{ id: "work", title: "Work on it", body: <WorkOnIt subject={o.name} /> }] : []),
        { id: "call", title: "How to call", body: <HowToCall op={o.name} /> },
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
    case "reference": return [{ id: p.table, title: "", body: { machines: <><MovesTable />{things.filter((t) => t.machine).map((t) => <div key={t.name}><h3 id={t.name} className="mt-6 text-lg font-semibold">{t.name}</h3><MachineDiagram thing={t.name} /></div>)}</>,
      events: <EventsTable />, errors: <ErrorsTable />, values: <ValuesTable />, roles: <AccessMatrix /> }[p.table] }];
    case "environment": { const e = M.environments[p.environment]!; const proved = e.name !== "local"; return [
      { id: "about", title: "About", body: <EnvironmentAbout name={e.name} /> },
      ...(proved ? [{ id: "proof", title: "Proof", body: <>{evidenceNote}<ProofMatrix label={`Operations in ${e.name}`} /></> }] : []),
    ]; }
    case "error": { const e = errors[p.error]!; const by = refusedBy(e.name); return [
      { id: "facts", title: "", body: <Facts items={[["Code", <Code>{e.code}</Code>], ["Exit", e.exit ?? "–"], ["Kind", e.kind], ["Of", e.thing ? <A href={to.thing(e.thing)}>{e.thing}</A> : "every project"]]} /> },
      { id: "when", title: "When", body: by.length ? <DataTableLite rows={by.map((o) => [<A href={to.op(o)}>{o}</A>, e.when[o] ?? <Sub>not described</Sub>])} head={["Operation", "Refuses when"]} /> : <p>No operation refuses with it yet.</p> },
      { id: "carries", title: "Carries", body: <Fields fields={e.fields} empty="Nothing beyond its name and code." /> },
    ]; }
    case "role": { const ops = roleOps(p.role); const declared = !["anyone", "signed-in"].includes(p.role); return [
      { id: "allows", title: "Lets you call", body: <DataTableLite head={["Operation", "How"]} rows={ops.map(({ op, via }) => [<A href={to.op(op.name)}>{op.name}</A>, via ? `as the ${p.role.split(".")[1]} of the ${via}` : declared ? `as the ${p.role.split(".")[1]} of this ${op.thing}` : "directly"])} /> },
      ...(declared ? [{ id: "holds", title: "Who holds it", body: <Note status="warning" title="Not in the blueprint yet">The blueprint names this role on <A href={to.thing(p.role.split(".")[0]!)}>{p.role.split(".")[0]}</A> but not how someone comes to hold it (which field or fact). The compiler would need to project that for this page to say it.</Note> }] : []),
    ]; }
    case "value": { const v = M.values[p.value]!; const users = valueUsers(p.value); return [
      { id: "facts", title: "", body: <Facts items={[["Shape", <Code>{typeText(v)}</Code>], ["Used in", users.length]]} /> },
      { id: "used", title: "Used in", body: users.length ? <DataTableLite head={["Where", "Field"]} rows={users.map((u) => [<A href={u.href}>{u.where}</A>, <Code>{u.field}</Code>])} /> : <p>Nothing uses it yet.</p> },
    ]; }
    case "attention": return [{ id: "items", title: "", body: <>{evidenceNote}<AttentionList /></> }];
    case "journeys": return [{ id: "journeys", title: "", body: <Note title="Not available yet">{String(BP.extensions.journeys?.reason)}. These pages appear when the compiler projects journeys and worlds (F2.2); nothing here is invented.</Note> }];
  }
}

const EnvironmentAbout = ({ name }: { name: string }) => { const e = M.environments[name]!; return <>
  <Facts items={[["Runs", e.runs], ["Identity", e.identity], ["Database", e.cloud ? `${e.cloud.provider} ${e.cloud.database}` : e.database ?? "–"], ["Promoted from", e.promotesFrom ? <A href={to.env(e.promotesFrom)}>{e.promotesFrom}</A> : "nothing"]]} />
  {(Object.keys(e.deploy).length > 0 || Object.keys(e.publish).length > 0) && <DataTableLite head={["What", "Where", "How"]} rows={[
    ...Object.entries(e.deploy).map(([k, d]) => [k, <Code>{d.domain}</Code>, d.how]),
    ...Object.entries(e.publish).flatMap(([k, ps]) => ps.map((x) => [`${k} package`, x.tag ? <Code>{x.tag}</Code> : x.tap ?? "", x.how])),
  ]} />}
  <Sub>Declared in <Code>{e.file}</Code></Sub>
</>; };

/** A few facts as a grid of item cards. */
const Facts = ({ items }: { items: Array<[string, ReactNode]> }) => (
  <ItemCardGroup layout="grid" columns={2} variant="secondary" className="my-4">
    {items.map(([k, v]) => <ItemCard key={k}><ItemCard.Content><ItemCard.Description>{k}</ItemCard.Description><ItemCard.Title>{v}</ItemCard.Title></ItemCard.Content></ItemCard>)}
  </ItemCardGroup>
);
export { Illustration };
