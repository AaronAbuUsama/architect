// The proof page's top: a row of numbers, then two pictures, each saying one thing the table cannot say at a glance —
// how far behind each environment is, and which operations run close to (or over) their speed budget.
import { Button, ButtonGroup } from "@heroui/react";
import { useState, type ReactNode } from "react";
import { ENVS, p95Of, proofOf, type ProofState } from "../blueprint/evidence.ts";
import { operations, things } from "../blueprint/model.ts";
import { A, Live, Sub, to } from "./status.tsx";

const RANK: Record<ProofState, number> = { failed: 0, stale: 1, unproven: 2, unavailable: 3, "recorded-pass": 4 };
export const worstOf = (op: string) => ENVS.map((e) => proofOf(op, e)).sort((a, b) => RANK[a.state] - RANK[b.state])[0]!;
const Panel = ({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) => (
  <section className="rounded-2xl border border-fd-border bg-fd-card p-5">
    <div className="mb-3 flex items-center justify-between gap-2"><h3 className="m-0 text-base font-semibold">{title}</h3>{aside}</div>{children}
  </section>
);

export function StatTiles() {
  const count = (s: ProofState) => operations.filter((o) => worstOf(o.name).state === s).length;
  const tiles: Array<[label: string, value: number, sub: string, tone?: string]> = [
    ["Operations", operations.length, `across ${things.length} things`],
    ["Proved everywhere", count("recorded-pass"), `in all ${ENVS.length} environments`, "text-emerald-500"],
    ["Failing", count("failed"), "a newest verdict is a failure", "text-red-500"],
    ["Stale", count("stale"), "changed since its pass", "text-amber-500"],
    ["Unproven", count("unproven"), "no verdict somewhere"],
  ];
  return (
    <div className="not-prose grid grid-cols-2 gap-3 md:grid-cols-5">
      {tiles.map(([label, value, sub, tone]) => (
        <div key={label} className="rounded-2xl border border-fd-border bg-fd-card p-4">
          <div className="text-sm text-fd-muted-foreground">{label}</div>
          <Live><div className={`mt-1 text-3xl font-semibold tabular-nums ${value && tone ? tone : ""}`}>{value}</div></Live>
          <Sub>{sub}</Sub>
        </div>))}
    </div>
  );
}

const RING = ["#38bdf8", "#0ea5e9", "#0369a1"];
/** Three rings, one per environment, each filled to the share of operations with a recorded pass there. */
function EnvRings() {
  const share = ENVS.map((e) => operations.filter((o) => proofOf(o.name, e).state === "recorded-pass").length);
  return (
    <Panel title="Proved per environment">
      <div className="flex h-full items-center gap-6">
        <div className="flex flex-col gap-3">
          {ENVS.map((e, i) => (
            <div key={e}><div className="flex items-center gap-2 text-sm text-fd-muted-foreground"><span className="size-2 rounded-full" style={{ background: RING[i] }} /><A href={to.env(e)}>{e}</A></div>
              <Live><div className="font-semibold tabular-nums">{share[i]}/{operations.length} <span className="text-sm font-normal text-fd-muted-foreground">recorded pass</span></div></Live></div>))}
        </div>
        <Live>
          <svg viewBox="0 0 200 200" className="mx-auto size-64" role="img" aria-label="Share of operations proved in each environment">
            {ENVS.map((e, i) => { const r = 88 - i * 20, c = 2 * Math.PI * r, f = share[i]! / operations.length; return (
              <g key={e} transform="rotate(-90 100 100)">
                <circle cx="100" cy="100" r={r} fill="none" strokeWidth="12" className="stroke-fd-muted" />
                <circle cx="100" cy="100" r={r} fill="none" strokeWidth="12" strokeLinecap="round" stroke={RING[i]} strokeDasharray={`${c * f} ${c}`} aria-label={`${e}: ${share[i]} of ${operations.length}`} />
              </g>); })}
            <text x="100" y="96" textAnchor="middle" className="fill-fd-muted-foreground text-[11px]">everywhere</text>
            <text x="100" y="116" textAnchor="middle" className="fill-fd-foreground text-[18px] font-semibold">{`${operations.filter((o) => worstOf(o.name).state === "recorded-pass").length}/${operations.length}`}</text>
          </svg>
        </Live>
      </div>
    </Panel>
  );
}

/** One bar per operation: its measured p95 against its budget (the tick). Past 1.5x the budget is a review line. */
function BudgetBars() {
  const [env, setEnv] = useState<string>("test");
  const rows = operations.filter((o) => o.budget).map((o) => ({ o, p: p95Of(o.name, env), b: o.budget!.p95Ms })).sort((x, y) => (y.p ?? 0) / y.b - (x.p ?? 0) / x.b);
  const max = Math.max(...rows.map((r) => Math.max(r.p ?? 0, r.b))) * 1.05;
  return (
    <Panel title="Speed against budget" aside={
      <ButtonGroup size="sm" variant="secondary" aria-label="Environment">{ENVS.map((e) => <Button key={e} variant={env === e ? "primary" : "secondary"} onPress={() => setEnv(e)}>{e}</Button>)}</ButtonGroup>}>
      <div className="flex flex-col gap-1.5 text-sm">
        {rows.map(({ o, p, b }) => { const over = p !== null && p > b; return (
          <div key={o.name} className="grid grid-cols-[9.5rem_1fr_4.5rem] items-center gap-3">
            <A href={to.op(o.name)}><span className="truncate">{o.name}</span></A>
            <Live><div className="relative h-2.5 rounded-full bg-fd-muted" title={`p95 ${p ?? "–"} ms, budget ${b} ms`}>
              {p !== null && <div className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-amber-500" : "bg-sky-500"}`} style={{ width: `${(p / max) * 100}%` }} />}
              <div className="absolute -inset-y-1 w-0.5 rounded bg-fd-foreground/70" style={{ left: `${(b / max) * 100}%` }} />
            </div></Live>
            <Live><span className={`text-end tabular-nums ${over ? "font-semibold text-amber-500" : "text-fd-muted-foreground"}`}>{p === null ? "–" : `${p} ms`}</span></Live>
          </div>); })}
      </div>
      <Sub><span className="mt-3 inline-block">Bar: measured p95. Tick: the declared budget. Over 1.5x is a review line, never a failure.</span></Sub>
    </Panel>
  );
}

export const ProofOverview = () => (
  <div className="not-prose my-4 flex flex-col gap-4">
    <StatTiles />
    <div className="grid gap-4 lg:grid-cols-[2fr_3fr]"><EnvRings /><BudgetBars /></div>
  </div>
);
