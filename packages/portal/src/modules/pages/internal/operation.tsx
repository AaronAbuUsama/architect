// An operation's page: the contract in plain words, the proof behind each tick, the generated doc. Its tabs (spine, metrics, proof as a
// matrix, docs) are held for portal.md's update; this is the contract and the proof as the logbook records them.
import { Widget } from "@orthograph/portal-ui";
import type { ReactElement, ReactNode } from "react";
import type { PortalSnapshot } from "#modules/snapshot/types.js";
import type { OperationWire } from "#modules/wire/types.js";
import type { PageData } from "../types.ts";
import { Doc } from "./doc.tsx";
import { FieldTable } from "./fields.tsx";
import { Frame } from "./frame.tsx";
import { link } from "./links.ts";
import { Banner, noteOf, ProofCell, proofOf } from "./proof.tsx";
import { statOf } from "./stats.ts";

const who = (op: OperationWire): string =>
  op.allowed.map((a) => (a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "anyone signed in" : `${a.kind} ${a.role ?? ""}${a.path === undefined ? "" : ` of its ${a.path}`}`.trim())).join(", or ");

const Block = ({ title, children }: { readonly title: string; readonly children: ReactNode }): ReactElement => (
  <Widget><Widget.Header><Widget.Title>{title}</Widget.Title></Widget.Header><Widget.Content>{children}</Widget.Content></Widget>
);

export const OperationPage = ({ data, snapshot, op }: { readonly data: PageData; readonly snapshot: PortalSnapshot; readonly op: OperationWire }): ReactElement => {
  const { blueprint, view } = data;
  const proofs = snapshot.environments.flatMap((e) => { const p = proofOf(snapshot, op.name, e); return p === undefined ? [] : [p]; });
  const depends = Object.entries(blueprint.dependsOnByOperation[op.name] ?? {});
  const doc = blueprint.docs[`${op.thing}/${op.verb}.md`];
  return (
    <Frame data={data} title={op.name} here={{ id: `operation:${op.name}`, thing: op.thing }} crumbs={[blueprint.project, op.thing, op.verb]} scope={{ id: `operation:${op.name}`, operations: [op.name], stat: statOf(view, [op.name]) }}>
      <div className="page">
        <header className="page-title"><h1>{op.name}</h1><p>{op.description}</p></header>
        <Banner snapshot={snapshot} />
        <Block title="Proof">
          <table className="tbl">
            <thead><tr><th>Environment</th><th>Evidence</th><th>Notes</th></tr></thead>
            <tbody>{proofs.map((p) => (
              <tr key={p.environment}>
                <td><ProofCell proof={p} /></td>
                <td className="small">{p.evidence.state === "available" ? `revision ${p.evidence.value.revision}, ${p.evidence.value.verdict}, ${p.evidence.value.ref}, ${p.evidence.value.repository}, seq ${p.evidence.value.seq}, execution ${p.execution}` : p.evidence.reason}</td>
                <td className="small muted">{noteOf(p, snapshot.candidate.revision)}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="small muted">A tick means: contract unchanged; candidate not rerun. It is the recorded verdict of the evidence revision above, not a fresh run of the candidate {snapshot.candidate.revision ?? ""}. Whether a journey ran in that environment is not recorded.</p>
        </Block>
        <Block title="Contract">
          <p>{op.kind === "read" ? "A read: answered from the records, with no handler." : "An operation."} Who may call: {who(op)}.{op.idempotent !== null ? " Idempotent by request." : ""}{op.budget !== null ? ` Budget: p95 ${op.budget.p95Ms}ms.` : ""}</p>
          <h3>Payload</h3><FieldTable fields={op.payload} label={`${op.name} payload`} />
          <h3>Answer</h3><FieldTable fields={op.answer} label={`${op.name} answer`} />
          {op.move !== null && <p>Move <code>{op.move.key}</code>: from {op.move.from.join(" or ") || "nothing (it creates)"} to {op.move.to.join(" or ")}, emitting {op.move.emits}.</p>}
          <h3>Refusals</h3><ul>{op.refusals.map((r) => <li key={r}>{r}</li>)}</ul>
          {Object.keys(op.steps).length > 0 && <><h3>Steps</h3><ul>{Object.values(op.steps).map((s) => <li key={s.name}>{s.name} ({s.type})</li>)}</ul></>}
        </Block>
        <Block title="Its proof rests on">
          <table className="tbl"><thead><tr><th>Declaration</th><th>Hash</th></tr></thead><tbody>{depends.map(([key, hash]) => <tr key={key}><td className="mono">{key}</td><td className="mono">{hash}</td></tr>)}</tbody></table>
          <p><a href={link.thing(op.thing)}>{op.thing}</a></p>
        </Block>
        {doc !== undefined && <Block title="Docs"><Doc text={doc} /></Block>}
      </div>
    </Frame>
  );
};
