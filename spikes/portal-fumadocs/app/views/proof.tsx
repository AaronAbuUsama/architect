// Proof and its evals as one thing: a verdict is the nine evals' sum. The matrix gives each operation one compact row —
// per environment, the verdict and its nine squares — and an operation's page gives each environment one small panel.
import { Link } from "react-router";
import { CANDIDATE, ENVS, EVALS, evalOf, p95Of, proofOf, type ProofState } from "../blueprint/evidence.ts";
import { operations, type Operation } from "../blueprint/model.ts";
import { DataTable } from "./data-table.tsx";
import { attention } from "./attention.tsx";
import { SpeedBar, worstOf } from "./proof-overview.tsx";
import { A, Code, EvalStrip, Live, StateChip, Sub, to } from "./status.tsx";

const items = (op: string) => attention().filter((i) => i.op === op);
const RANK: Record<ProofState, number> = { failed: 0, stale: 1, unproven: 2, unavailable: 3, "recorded-pass": 4 };
/** Who may call, in a few words: the role names, or the audience. */
const whoShort = (o: Operation) => o.allowed.map((a) => a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "signed in" : a.path ? `${a.role!.split(".")[1]} of ${a.path.split(".").at(-1)}` : a.role!.split(".")[1]).join(", ");
/** Why it is not all green, in one line: the first failing eval's note, else the verdict's own reason. */
const why = (op: string, env: string) => { const p = proofOf(op, env); const bad = EVALS.map(([k]) => evalOf(op, env, k)).find((r) => r.result === "fail" || r.result === "review");
  return p.state === "stale" ? `${p.changed.map((c) => c.key.split(":")[0]).join(", ")} changed since its pass` : bad?.note ?? p.reason; };

export function ProofMatrix({ ops = operations, label = "Operations" }: { ops?: Operation[]; label?: string }) {
  return (
    <DataTable label={label} rows={ops} rowKey={(o) => o.name} search={(o) => `${o.name} ${o.thing} ${o.description}`} rowHref={(o) => to.op(o.name)}
      sort={{ column: "status", direction: "ascending" }}
      filters={[{ key: "thing", label: "Thing", of: (o) => o.thing }, { key: "worst", label: "Worst state", of: (o) => worstOf(o.name).state },
        ...ENVS.map((e) => ({ key: e, label: `In ${e}`, of: (o: Operation) => proofOf(o.name, e).state })), { key: "kind", label: "Kind", of: (o) => o.kind }]}
      columns={[
        { key: "op", label: "Operation", rowHeader: true, sort: (o) => o.name, cell: (o) => <><A href={to.op(o.name)}>{o.name}</A><Sub>{o.description}</Sub></> },
        { key: "thing", label: "Thing", sort: (o) => o.thing, hidden: true, cell: (o) => <A href={to.thing(o.thing)}>{o.thing}</A> },
        { key: "who", label: "Who may call", sort: (o) => whoShort(o), cell: (o) => <span className="text-sm">{whoShort(o)}</span> },
        ...ENVS.map((e) => ({ key: e, label: e[0]!.toUpperCase() + e.slice(1), sort: (o: Operation) => RANK[proofOf(o.name, e).state], cell: (o: Operation) => (
          <div className="flex flex-col items-start gap-1"><StateChip p={proofOf(o.name, e)} /><EvalStrip op={o.name} env={e} /></div>) })),
        { key: "speed", label: "Speed", sort: (o) => Math.max(0, ...ENVS.map((e) => p95Of(o.name, e) ?? 0)) / (o.budget?.p95Ms ?? 1), cell: (o) => <SpeedBar op={o.name} /> },
        { key: "status", label: "Needs attention", sort: (o) => -items(o.name).length * 10 + RANK[worstOf(o.name).state], cell: (o) => { const its = items(o.name);
          return its.length ? <Live><Link to={`/proof/attention#${its[0]!.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-fd-border px-3 py-1 text-sm hover:bg-fd-accent">
            <span className={`size-2 rounded-full ${its.some((i) => i.kind === "failed") ? "bg-red-500" : "bg-amber-500"}`} />{its.length === 1 ? its[0]!.kind : `${its.length} items`}<span aria-hidden>→</span></Link></Live> : <Sub>nothing</Sub>; } },
        { key: "kind", label: "Kind", sort: (o) => o.kind, hidden: true, cell: (o) => <span className="text-sm">{o.kind}</span> },
      ]} />
  );
}

/** An operation's proof: one panel per environment with the verdict, the nine evals, its speed, and where the verdict came from. */
export function OperationProof({ op }: { op: string }) {
  return (
    <div className="not-prose my-4 grid gap-3 md:grid-cols-3">
      {ENVS.map((e) => { const p = proofOf(op, e), w = p.state === "recorded-pass" && !EVALS.some(([k]) => evalOf(op, e, k).result === "review") ? null : why(op, e); return (
        <section key={e} className="flex flex-col gap-3 rounded-2xl border border-fd-border bg-fd-card p-4">
          <div className="flex items-center justify-between"><A href={to.env(e)}>{e}</A><StateChip p={p} /></div>
          <div><Sub>Nine evals</Sub><div className="mt-1"><EvalStrip op={op} env={e} /></div></div>
          {w && <Live><Link to={`/proof/attention#${attention().find((i) => i.op === op && (i.env === e || i.kind === "review"))?.id ?? ""}`} className="text-sm hover:underline">{w} →</Link></Live>}
          <div className="grid grid-cols-2 gap-2 border-t border-fd-border pt-3 text-sm">
            <div><Sub>Speed (p95)</Sub><div className="mt-1"><SpeedBar op={op} env={e} wide /></div></div>
            <div><Sub>From revision</Sub><Live>{p.evidence ? <Code>{p.evidence.revision}</Code> : "none"}</Live></div>
          </div>
          <Live><Sub>{p.changed.length ? p.changed.map((c) => `${c.key}: ${c.was.slice(0, 8)} → ${c.now?.slice(0, 8) ?? "gone"}`).join("; ")
            : p.candidateNotRerun ? `contract unchanged; ${CANDIDATE} not rerun here` : p.evidence?.revision === CANDIDATE ? "the candidate" : ""}</Sub></Live>
        </section>); })}
    </div>
  );
}
