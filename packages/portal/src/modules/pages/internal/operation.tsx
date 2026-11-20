// /portal/operations/<name>: the contract in plain words, the proof behind each tick, the generated doc.
import type { OperationWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { Banner, Cell, Docs, FieldRows, Page, Table, noteOf, who } from "./parts.tsx";

export const OperationPage = ({ data: { blueprint, snapshot: s }, op }: { readonly data: PortalData; readonly op: OperationWire }) => {
  const mine = s.environments.map((e) => s.proofs.find((p) => p.operation === op.name && p.environment === e)).filter((p) => p !== undefined);
  const proof = mine.map((p) => [
    <Cell key={p.environment} proof={p} />,
    p.evidence.state === "available"
      ? `revision ${p.evidence.value.revision}, ${p.evidence.value.verdict}, ${p.evidence.value.ref}, ${p.evidence.value.repository}, seq ${p.evidence.value.seq}, execution ${p.execution}`
      : p.evidence.reason,
    noteOf(p, s.candidate.revision),
  ]);
  const depends = Object.entries(blueprint.dependsOnByOperation[op.name] ?? {}).map(([key, hash]) => [key, hash]);
  const steps = Object.values(op.steps);
  return (
    <Page status={200}>
      <h1>{op.name}</h1>
      <p>{op.description}</p>
      <Banner snapshot={s} />
      <h2>Proof</h2>
      <Table head={["Environment", "Evidence", "Notes"]} rows={proof} />
      <p className="meta">{`A tick means: contract unchanged; candidate not rerun. It is the recorded verdict of the evidence revision above, not a fresh run of the candidate ${s.candidate.revision ?? ""}. Whether a journey ran in that environment is not recorded.`}</p>
      <h2>Contract</h2>
      <p>{`${op.kind === "read" ? "A read: answered from the records, with no handler." : "An operation."} Who may call: ${who(op)}.${op.idempotent ? " Idempotent by request." : ""}${op.budget ? ` Budget: p95 ${op.budget.p95Ms}ms.` : ""}`}</p>
      <h3>Payload</h3>
      <FieldRows fields={op.payload} />
      <h3>Answer</h3>
      <FieldRows fields={op.answer} />
      {op.move ? <p>{`Move ${op.move.key}: from ${op.move.from.join(" or ") || "nothing (it creates)"} to ${op.move.to.join(" or ")}, emitting ${op.move.emits}.`}</p> : null}
      <h3>Refusals</h3>
      <ul>{op.refusals.map((r) => <li key={r}>{r}</li>)}</ul>
      {steps.length > 0 ? <><h3>Steps</h3><ul>{steps.map((st) => <li key={st.name}>{`${st.name} (${st.type})`}</li>)}</ul></> : null}
      <h3>Its proof rests on</h3>
      <Table head={["Declaration", "Hash"]} rows={depends} />
      <p><a href={`/portal/things/${encodeURIComponent(op.thing)}`}>{op.thing}</a></p>
      <Docs text={blueprint.docs[`${op.thing}/${op.verb}.md`]} />
    </Page>
  );
};
