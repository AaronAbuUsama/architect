// The operation page's other four tabs. Each is one panel; none of them is a list of spans (a trace has its own page).
import type { OperationWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { Calls } from "./calls.tsx";
import { journeysCalling } from "./model.ts";
import { NotYet } from "./not-yet.tsx";
import { Cell, Docs, Table, noteOf } from "./parts.tsx";

export const MetricsTab = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => (
  <>
    <h2>Metrics</h2>
    <Calls data={data} op={op} />
  </>
);

export const ProofTab = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => {
  const { blueprint, snapshot: s } = data;
  const mine = s.environments.map((e) => s.proofs.find((p) => p.operation === op.name && p.environment === e)).filter((p) => p !== undefined);
  const proof = mine.map((p) => [
    <span data-portal="proof-cell" data-environment={p.environment} data-state={p.state}><Cell proof={p} /></span>,
    p.evidence.state === "available"
      ? `revision ${p.evidence.value.revision}, ${p.evidence.value.verdict}, ${p.evidence.value.ref}, ${p.evidence.value.repository}, seq ${p.evidence.value.seq}, execution ${p.execution}`
      : p.evidence.reason,
    noteOf(p, s.candidate.revision),
  ]);
  const journeys = journeysCalling(blueprint, op.name);
  const depends = Object.entries(blueprint.dependsOnByOperation[op.name] ?? {});
  return (
    <>
      <h2>Proof</h2>
      <Table head={["Environment", "Evidence", "Notes"]} rows={proof} />
      <p className="meta">{`A tick means: contract unchanged; candidate not rerun. It is the recorded verdict of the evidence revision, not a fresh run of the candidate ${s.candidate.revision ?? ""}. Whether a journey ran in that environment is not recorded.`}</p>
      <h3>Each eval</h3>
      {mine.map((p) => <p key={p.environment} data-portal="eval-verdicts" data-environment={p.environment} data-state="not yet">{`${p.environment}: `}<NotYet hole="per-eval" what="the logbook stores one aggregate verdict, not one per eval" /></p>)}
      <h3>Journeys that prove it</h3>
      {journeys.length === 0 ? <p>No declared journey calls this operation.</p> : <ul>{journeys.map((j) => <li key={j.name}>{j.name}</li>)}</ul>}
      <h3>Its proof rests on</h3>
      <Table head={["Declaration", "Hash"]} rows={depends} />
    </>
  );
};

export const DocsTab = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => (
  <Docs text={data.blueprint.docs[`${op.thing}/${op.verb}.md`]} />
);

export const NotesTab = ({ op }: { readonly op: OperationWire }) => (
  <>
    <h2>Notes</h2>
    <p>{`Notes on ${op.name} are not drawn yet: `}<NotYet hole="notes" what="the wire carries no notes" /></p>
  </>
);
