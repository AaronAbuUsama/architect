// Proof and its evals as one thing: a verdict is the nine evals' sum. The matrix shows every verdict with its nine squares;
// an operation's table shows the verdict row, then the nine evals, then where the verdict came from and what changed.
import { ENVS, EVALS, proofOf, CANDIDATE, type ProofState } from "../blueprint/evidence.ts";
import { operations, type Operation } from "../blueprint/model.ts";
import { DataTable } from "./data-table.tsx";
import { A, Code, EvalChip, EvalStrip, Live, StateChip, Sub, to } from "./status.tsx";

const RANK: Record<ProofState, number> = { failed: 0, stale: 1, unproven: 2, unavailable: 3, "recorded-pass": 4 };
const worst = (op: string) => ENVS.map((e) => proofOf(op, e)).sort((a, b) => RANK[a.state] - RANK[b.state])[0]!;

export function ProofMatrix({ ops = operations, label = "Operations" }: { ops?: Operation[]; label?: string }) {
  return (
    <DataTable label={label} rows={ops} rowKey={(o) => o.name} search={(o) => `${o.name} ${o.thing} ${worst(o.name).reason ?? ""}`}
      sort={{ column: "needs", direction: "ascending" }}
      filters={[{ key: "thing", label: "Thing", of: (o) => o.thing }, { key: "worst", label: "Worst state", of: (o) => worst(o.name).state },
        ...ENVS.map((e) => ({ key: e, label: `In ${e}`, of: (o: Operation) => proofOf(o.name, e).state })), { key: "kind", label: "Kind", of: (o) => o.kind }]}
      columns={[
        { key: "op", label: "Operation", rowHeader: true, sort: (o) => o.name, cell: (o) => <><A href={to.op(o.name)}>{o.name}</A><Sub>{o.thing} · {o.kind}</Sub></> },
        ...ENVS.map((e) => ({ key: e, label: e, sort: (o: Operation) => RANK[proofOf(o.name, e).state],
          cell: (o: Operation) => <div className="flex flex-col items-start gap-1"><StateChip p={proofOf(o.name, e)} /><EvalStrip op={o.name} env={e} /></div> })),
        { key: "needs", label: "Needs", sort: (o) => RANK[worst(o.name).state], cell: (o) => { const w = worst(o.name);
          return w.state === "recorded-pass" ? <span className="text-fd-muted-foreground">nothing</span> : <Live><span className="text-sm">{w.environment}: {w.reason}</span></Live>; } },
      ]} />
  );
}

type Row = { key: string; label: string; what: string };
export function OperationProof({ op }: { op: string }) {
  const rows: Row[] = [{ key: "verdict", label: "Verdict", what: "Only a recorded pass is a tick." }, ...EVALS.map(([key, label, what]) => ({ key, label, what }))];
  return (
    <DataTable label="Proof" rows={rows} rowKey={(r) => r.key} search={(r) => `${r.label} ${r.what}`}
      columns={[
        { key: "check", label: "Check", rowHeader: true, cell: (r) => r.key === "verdict" ? <b>Verdict</b> : <><span className="font-medium">{r.label}</span><Sub>{r.what}</Sub></> },
        ...ENVS.map((e) => ({ key: e, label: e, cell: (r: Row) => r.key === "verdict" ? <StateChip p={proofOf(op, e)} /> : <EvalChip op={op} env={e} k={r.key} /> })),
      ]}
      footer={
        <div className="grid w-full gap-x-6 gap-y-1 p-3 text-sm" style={{ gridTemplateColumns: `minmax(10rem, 1fr) repeat(${ENVS.length}, minmax(0, 1fr))` }}>
          <span className="font-medium" title="The commit whose prove run produced this verdict. It can be older than the candidate when the contract has not changed since.">Verdict from revision</span>
          {ENVS.map((e) => { const p = proofOf(op, e); return <Live key={e}>{p.evidence ? <><Code>{p.evidence.revision}</Code><Sub>{p.candidateNotRerun ? `contract unchanged; ${CANDIDATE} not rerun here` : p.evidence.revision === CANDIDATE ? "the candidate" : `logbook seq ${p.evidence.seq}`}</Sub></> : <Sub>none</Sub>}</Live>; })}
          <span className="font-medium">What changed</span>
          {ENVS.map((e) => { const p = proofOf(op, e); return <Live key={e}>{p.changed.length ? p.changed.map((c) => <div key={c.key}><Code>{c.key}</Code><Sub>{c.was} → {c.now ?? "gone"}</Sub><Sub>clear it: architect prove --env {e}</Sub></div>) : <Sub>{p.state === "recorded-pass" ? "nothing" : p.reason}</Sub>}</Live>; })}
        </div>
      } />
  );
}
