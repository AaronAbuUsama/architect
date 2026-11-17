// Proof and its evals as one thing: a verdict is the nine evals' sum. The matrix gives each operation one compact row —
// per environment, the verdict and its nine squares — and an operation's page gives each environment one small panel.
import { Button, Tooltip } from "@heroui/react";
import { Link } from "react-router";
import { CANDIDATE, ENVS, EVALS, evalOf, p95Of, proofOf, type ProofState } from "../blueprint/evidence.ts";
import { M, operations, type Operation } from "../blueprint/model.ts";
import { DataTable } from "./data-table.tsx";
import { worstOf } from "./proof-overview.tsx";
import { A, Code, EvalStrip, Live, StateChip, Sub, to } from "./status.tsx";

const RANK: Record<ProofState, number> = { failed: 0, stale: 1, unproven: 2, unavailable: 3, "recorded-pass": 4 };
/** Who may call, in a few words: the role names, or the audience. */
const whoShort = (o: Operation) => o.allowed.map((a) => a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "signed in" : a.path ? `${a.role!.split(".")[1]} of ${a.path.split(".").at(-1)}` : a.role!.split(".")[1]).join(", ");
const commandFor = (op: string) => { const w = worstOf(op); return `architect prove --env ${w.state === "recorded-pass" ? "test" : w.environment}`; };
/** Why it is not all green, in one line: the first failing eval's note, else the verdict's own reason. */
const why = (op: string, env: string) => { const p = proofOf(op, env); const bad = EVALS.map(([k]) => evalOf(op, env, k)).find((r) => r.result === "fail" || r.result === "review");
  return p.state === "stale" ? `${p.changed.map((c) => c.key.split(":")[0]).join(", ")} changed since its pass` : bad?.note ?? p.reason; };

export function ProofMatrix({ ops = operations, label = "Operations" }: { ops?: Operation[]; label?: string }) {
  return (
    <DataTable label={label} rows={ops} rowKey={(o) => o.name} search={(o) => `${o.name} ${o.thing} ${o.description}`}
      sort={{ column: "status", direction: "ascending" }}
      filters={[{ key: "thing", label: "Thing", of: (o) => o.thing }, { key: "worst", label: "Worst state", of: (o) => worstOf(o.name).state },
        ...ENVS.map((e) => ({ key: e, label: `In ${e}`, of: (o: Operation) => proofOf(o.name, e).state })), { key: "kind", label: "Kind", of: (o) => o.kind }]}
      columns={[
        { key: "op", label: "Operation", rowHeader: true, sort: (o) => o.name, cell: (o) => <><A href={to.op(o.name)}>{o.name}</A><Sub>{o.description}</Sub></> },
        { key: "thing", label: "Thing", sort: (o) => o.thing, hidden: true, cell: (o) => <A href={to.thing(o.thing)}>{o.thing}</A> },
        { key: "who", label: "Who may call", sort: (o) => whoShort(o), cell: (o) => <span className="text-sm">{whoShort(o)}</span> },
        ...ENVS.map((e) => ({ key: e, label: e[0]!.toUpperCase() + e.slice(1), sort: (o: Operation) => RANK[proofOf(o.name, e).state], cell: (o: Operation) => (
          <div className="flex flex-col items-start gap-1"><StateChip p={proofOf(o.name, e)} /><EvalStrip op={o.name} env={e} /></div>) })),
        { key: "status", label: "Needs attention", sort: (o) => RANK[worstOf(o.name).state] * 10 + (EVALS.some(([k]) => ENVS.some((e) => evalOf(o.name, e, k).result === "review")) ? 0 : 5), cell: (o) => {
          const w = worstOf(o.name); const review = ENVS.find((e) => EVALS.some(([k]) => evalOf(o.name, e, k).result === "review"));
          const env = w.state !== "recorded-pass" ? w.environment : review;
          return env ? <Live><span className="text-sm"><b className="font-medium">{env}</b> · {why(o.name, env)}</span></Live> : <Sub>nothing</Sub>; } },
        { key: "kind", label: "Kind", sort: (o) => o.kind, hidden: true, cell: (o) => <span className="text-sm">{o.kind}</span> },
        { key: "actions", label: "", align: "end", cell: (o) => (
          <div className="flex justify-end gap-1">
            <Tooltip delay={200}><Tooltip.Trigger><Button size="sm" isIconOnly variant="ghost" aria-label={`Copy ${commandFor(o.name)}`} onPress={() => navigator.clipboard?.writeText(commandFor(o.name))}>⧉</Button></Tooltip.Trigger><Tooltip.Content>Copy <code>{commandFor(o.name)}</code></Tooltip.Content></Tooltip>
            <Link to={to.op(o.name)} aria-label={`Open ${o.name}`} className="inline-flex size-8 items-center justify-center rounded-full text-sm hover:bg-fd-accent">→</Link>
          </div>) },
      ]} />
  );
}

/** An operation's proof: one panel per environment with the verdict, the nine evals, its speed, and where the verdict came from. */
export function OperationProof({ op }: { op: string }) {
  const budget = M.operations[op]!.budget?.p95Ms;
  return (
    <div className="not-prose my-4 grid gap-3 md:grid-cols-3">
      {ENVS.map((e) => { const p = proofOf(op, e), ms = p95Of(op, e), w = p.state === "recorded-pass" && !EVALS.some(([k]) => evalOf(op, e, k).result === "review") ? null : why(op, e); return (
        <section key={e} className="flex flex-col gap-3 rounded-2xl border border-fd-border bg-fd-card p-4">
          <div className="flex items-center justify-between"><A href={to.env(e)}>{e}</A><StateChip p={p} /></div>
          <div><Sub>Nine evals</Sub><div className="mt-1"><EvalStrip op={op} env={e} /></div></div>
          {w && <Live><p className="m-0 text-sm">{w}</p></Live>}
          <div className="grid grid-cols-2 gap-2 border-t border-fd-border pt-3 text-sm">
            <div><Sub>p95 / budget</Sub><Live><span className={`tabular-nums ${ms && budget && ms > budget ? "font-semibold text-amber-500" : ""}`}>{ms ?? "–"}</span></Live><span className="text-fd-muted-foreground"> / {budget ?? "–"} ms</span></div>
            <div><Sub>From revision</Sub><Live>{p.evidence ? <Code>{p.evidence.revision}</Code> : "none"}</Live></div>
          </div>
          <Live><Sub>{p.changed.length ? p.changed.map((c) => `${c.key}: ${c.was.slice(0, 8)} → ${c.now?.slice(0, 8) ?? "gone"}`).join("; ")
            : p.candidateNotRerun ? `contract unchanged; ${CANDIDATE} not rerun here` : p.evidence?.revision === CANDIDATE ? "the candidate" : ""}</Sub></Live>
        </section>); })}
    </div>
  );
}
