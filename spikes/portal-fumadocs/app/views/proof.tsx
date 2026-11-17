// Proof and its evals as one thing: a verdict is the nine evals' sum. The matrix shows every verdict with its nine squares;
// an operation's table shows the verdict row, then the nine evals, then where the verdict came from and what changed.
import { Button, ButtonGroup, Chip, Tooltip } from "@heroui/react";
import { useState } from "react";
import { Link } from "react-router";
import { ENVS, EVALS, evalOf, proofOf, CANDIDATE, type ProofState } from "../blueprint/evidence.ts";
import { operations, type Operation } from "../blueprint/model.ts";
import { DataTable } from "./data-table.tsx";
import { A, Code, EvalChip, Live, StateChip, Sub, to } from "./status.tsx";

const RANK: Record<ProofState, number> = { failed: 0, stale: 1, unproven: 2, unavailable: 3, "recorded-pass": 4 };
const worst = (op: string) => ENVS.map((e) => proofOf(op, e)).sort((a, b) => RANK[a.state] - RANK[b.state])[0]!;

/** Who may call, in a few words: the role names, or the audience. */
const whoShort = (o: Operation) => o.allowed.map((a) => a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "signed in" : a.path ? `${a.role!.split(".")[1]} of ${a.path.split(".").at(-1)}` : a.role!.split(".")[1]).join(", ");
const commandFor = (op: string) => { const w = worst(op); return `architect prove --env ${w.state === "recorded-pass" ? "test" : w.environment}`; };
const sameEvals = (op: string) => EVALS.map(([k]) => ENVS.map((e) => evalOf(op, e, k).result));

export function ProofMatrix({ ops = operations, label = "Operations" }: { ops?: Operation[]; label?: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [by, setBy] = useState<"operation" | "eval">("operation");
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const groupBy = (
    <ButtonGroup size="sm" variant="secondary" aria-label="Group by">
      {(["operation", "eval"] as const).map((g) => <Button key={g} variant={by === g ? "primary" : "secondary"} onPress={() => setBy(g)}>By {g}</Button>)}
    </ButtonGroup>
  );
  if (by === "eval") return <EvalMatrix ops={ops} toolbar={groupBy} />;
  return (
    <DataTable label={label} rows={ops} rowKey={(o) => o.name} search={(o) => `${o.name} ${o.thing} ${o.description} ${worst(o.name).reason ?? ""}`}
      sort={{ column: "status", direction: "ascending" }} toolbar={groupBy} expanded={open}
      filters={[{ key: "thing", label: "Thing", of: (o) => o.thing }, { key: "worst", label: "Worst state", of: (o) => worst(o.name).state },
        ...ENVS.map((e) => ({ key: e, label: `In ${e}`, of: (o: Operation) => proofOf(o.name, e).state })), { key: "kind", label: "Kind", of: (o) => o.kind }]}
      subRows={(o) => EVALS.map(([k, label, what]) => ({ key: k, cells: {
        op: <div className="pl-6"><span className="font-medium">{label}</span><Sub>{what}</Sub></div>,
        ...Object.fromEntries(ENVS.map((e) => [e, <EvalChip op={o.name} env={e} k={k} />])) } }))}
      columns={[
        { key: "op", label: "Operation", rowHeader: true, sort: (o) => o.name, cell: (o) => (
          <div className="flex items-start gap-2">
            <button aria-label={`${open.has(o.name) ? "Hide" : "Show"} the nine evals of ${o.name}`} onClick={() => toggle(o.name)} className="mt-0.5 w-4 text-fd-muted-foreground hover:text-fd-foreground">{open.has(o.name) ? "▾" : "▸"}</button>
            <div><A href={to.op(o.name)}>{o.name}</A><Sub>{o.description}</Sub></div>
          </div>) },
        { key: "thing", label: "Thing", sort: (o) => o.thing, cell: (o) => <A href={to.thing(o.thing)}>{o.thing}</A> },
        { key: "kind", label: "Kind", sort: (o) => o.kind, cell: (o) => <span className="text-sm">{o.kind}</span>, hidden: true },
        { key: "who", label: "Who may call", sort: (o) => whoShort(o), cell: (o) => <span className="text-sm">{whoShort(o)}</span> },
        { key: "budget", label: "p95 budget", align: "end", sort: (o) => o.budget?.p95Ms ?? 0, cell: (o) => (o.budget ? <span className="whitespace-nowrap text-sm tabular-nums">{o.budget.p95Ms} ms</span> : "") },
        ...ENVS.map((e) => ({ key: e, label: e[0]!.toUpperCase() + e.slice(1), sort: (o: Operation) => RANK[proofOf(o.name, e).state], cell: (o: Operation) => <StateChip p={proofOf(o.name, e)} /> })),
        { key: "status", label: "Status", sort: (o) => RANK[worst(o.name).state], cell: (o) => { const w = worst(o.name);
          return w.state === "recorded-pass" ? <Sub>all proved</Sub> : <Live><span className="text-sm">{w.environment}: {w.state === "stale" ? `${w.changed.map((c) => c.key.split(":")[0]).join(", ")} changed` : w.reason}</span></Live>; } },
        { key: "proved", label: "Last proved", sort: (o) => proofOf(o.name, "test").evidence?.seq ?? 0, hidden: true, cell: (o) => { const p = proofOf(o.name, "test"); return <Live>{p.evidence ? <><Code>{p.evidence.revision}</Code><Sub>in test, seq {p.evidence.seq}</Sub></> : <Sub>never</Sub>}</Live>; } },
        { key: "actions", label: "Actions", align: "end", cell: (o) => (
          <div className="flex justify-end gap-1">
            <Tooltip delay={200}><Tooltip.Trigger><Button size="sm" isIconOnly variant="secondary" aria-label={`Show the nine evals of ${o.name}`} onPress={() => toggle(o.name)}>{sameEvals(o.name).flat().some((r) => r !== "pass" && r !== "n/a") ? "⚠" : "≡"}</Button></Tooltip.Trigger><Tooltip.Content>Evals</Tooltip.Content></Tooltip>
            <Tooltip delay={200}><Tooltip.Trigger><Button size="sm" isIconOnly variant="secondary" aria-label={`Copy ${commandFor(o.name)}`} onPress={() => navigator.clipboard?.writeText(commandFor(o.name))}>⧉</Button></Tooltip.Trigger><Tooltip.Content>Copy <code>{commandFor(o.name)}</code></Tooltip.Content></Tooltip>
            <Tooltip delay={200}><Tooltip.Trigger><Link to={to.op(o.name)} aria-label={`Open ${o.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-fd-secondary text-sm hover:bg-fd-accent">→</Link></Tooltip.Trigger><Tooltip.Content>Open</Tooltip.Content></Tooltip>
          </div>) },
      ]} />
  );
}

/** Pivot: the nine evals as rows; each environment's cell counts how the operations did on that eval. */
function EvalMatrix({ ops, toolbar }: { ops: Operation[]; toolbar: React.ReactNode }) {
  const count = (k: string, e: string) => { const c: Record<string, number> = {}; for (const o of ops) { const r = evalOf(o.name, e, k).result; c[r] = (c[r] ?? 0) + 1; } return c; };
  const Counts = ({ c }: { c: Record<string, number> }) => (
    <Live><span className="inline-flex flex-wrap gap-1">{(["fail", "review", "pass", "not run", "n/a"] as const).filter((r) => c[r]).map((r) =>
      <Chip key={r} size="sm" variant="soft" color={r === "pass" ? "success" : r === "review" ? "warning" : r === "fail" ? "danger" : "default"}>{c[r]} {r}</Chip>)}</span></Live>
  );
  const rows = EVALS.map(([key, label, what]) => ({ key, label, what }));
  return (
    <DataTable label="Evals" rows={rows} rowKey={(r) => r.key} search={(r) => `${r.label} ${r.what}`} toolbar={toolbar}
      columns={[
        { key: "eval", label: "Eval", rowHeader: true, sort: (r) => r.label, cell: (r) => <><span className="font-medium">{r.label}</span><Sub>{r.what}</Sub></> },
        ...ENVS.map((e) => ({ key: e, label: e[0]!.toUpperCase() + e.slice(1), sort: (r: (typeof rows)[number]) => -(count(r.key, e)["fail"] ?? 0) * 100 - (count(r.key, e)["review"] ?? 0), cell: (r: (typeof rows)[number]) => <Counts c={count(r.key, e)} /> })),
        { key: "where", label: "Not passing", cell: (r) => { const bad = ops.flatMap((o) => ENVS.map((e) => ({ o, e, r: evalOf(o.name, e, r.key) }))).filter((x) => x.r.result === "fail" || x.r.result === "review");
          return bad.length ? <Live><div className="flex flex-col">{bad.map((b) => <span key={b.o.name + b.e} className="text-sm"><A href={to.op(b.o.name)}>{b.o.name}</A> in {b.e}<Sub>{b.r.note}</Sub></span>)}</div></Live> : <Sub>none</Sub>; } },
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
