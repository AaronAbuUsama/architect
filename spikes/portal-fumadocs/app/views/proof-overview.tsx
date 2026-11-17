// Proof at a glance: a row of numbers over the matrix, and the small speed bar the matrix and the operation panels share.
import { Link } from "react-router";
import { ENVS, p95Of, proofOf, type ProofState } from "../blueprint/evidence.ts";
import { M, operations, things } from "../blueprint/model.ts";
import { Live, Sub } from "./status.tsx";

const RANK: Record<ProofState, number> = { failed: 0, stale: 1, unproven: 2, unavailable: 3, "recorded-pass": 4 };
export const worstOf = (op: string) => ENVS.map((e) => proofOf(op, e)).sort((a, b) => RANK[a.state] - RANK[b.state])[0]!;

export function StatTiles() {
  const count = (s: ProofState) => operations.filter((o) => worstOf(o.name).state === s).length;
  const tiles: Array<[label: string, value: number, sub: string, tone?: string, href?: string]> = [
    ["Operations", operations.length, `across ${things.length} things`],
    ["Proved everywhere", count("recorded-pass"), `in all ${ENVS.length} environments`, "text-emerald-500"],
    ["Failing", count("failed"), "a newest verdict is a failure", "text-red-500", "/proof/attention"],
    ["Stale", count("stale"), "changed since its pass", "text-amber-500", "/proof/attention"],
    ["Unproven", count("unproven"), "no verdict somewhere", undefined, "/proof/attention"],
  ];
  return (
    <div className="not-prose my-4 grid grid-cols-2 gap-3 md:grid-cols-5">
      {tiles.map(([label, value, sub, tone, href]) => { const body = <>
        <div className="text-sm text-fd-muted-foreground">{label}</div>
        <Live><div className={`mt-1 text-3xl font-semibold tabular-nums ${value && tone ? tone : ""}`}>{value}</div></Live>
        <Sub>{sub}</Sub></>;
        const cls = "rounded-2xl border border-fd-border bg-fd-card p-4";
        return href && value ? <Link key={label} to={href} className={`${cls} hover:bg-fd-accent`}>{body}</Link> : <div key={label} className={cls}>{body}</div>; })}
    </div>
  );
}

/** The slowest measured p95 across the environments, against the budget: a bar, a tick at the budget, the 1.5x review zone shaded. */
export function SpeedBar({ op, env, wide }: { op: string; env?: string; wide?: boolean }) {
  const budget = M.operations[op]!.budget?.p95Ms; if (!budget) return <Sub>no budget</Sub>;
  const ms = env ? p95Of(op, env) : Math.max(0, ...ENVS.map((e) => p95Of(op, e) ?? 0)) || null;
  const max = budget * 2, pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const tone = ms === null ? "" : ms > budget * 1.5 ? "bg-red-500" : ms > budget ? "bg-amber-500" : "bg-sky-500";
  return (
    <div className={`flex flex-col gap-1 ${wide ? "w-full" : "w-32"}`} title={`p95 ${ms ?? "–"} ms against a ${budget} ms budget`}>
      <Live><div className="relative h-2 rounded-full bg-fd-muted">
        <div className="absolute inset-y-0 rounded-r-full bg-amber-500/15" style={{ left: pct(budget), width: `${(budget * 0.5 / max) * 100}%` }} />
        {ms !== null && <div className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: pct(ms) }} />}
        <div className="absolute -inset-y-1 w-0.5 rounded bg-fd-foreground/70" style={{ left: pct(budget) }} />
      </div></Live>
      <span className="text-xs tabular-nums text-fd-muted-foreground"><Live><span className={ms && ms > budget ? "font-semibold text-amber-500" : "text-fd-foreground"}>{ms ?? "–"}</span></Live> / {budget} ms</span>
    </div>
  );
}
