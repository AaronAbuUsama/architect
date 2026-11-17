// Proof at a glance: a row of numbers over the matrix, and the small speed bar the matrix and the operation panels share.
import { ArrowRight, CircleCheck, CircleQuestion, CircleXmark, TriangleExclamation } from "@gravity-ui/icons";
import { Link } from "@heroui/react";
import { KPIGroup } from "@heroui-pro/react";
import { KPI } from "@heroui-pro/react/kpi";
import type { ReactNode } from "react";
import { ENVS, p95Of, proofOf, type ProofState } from "../blueprint/evidence.ts";
import { M, operations, things } from "../blueprint/model.ts";
import { Live, Sub } from "./status.tsx";

const RANK: Record<ProofState, number> = { failed: 0, stale: 1, unproven: 2, unavailable: 3, "recorded-pass": 4 };
export const worstOf = (op: string) => ENVS.map((e) => proofOf(op, e)).sort((a, b) => RANK[a.state] - RANK[b.state])[0]!;

export function StatTiles() {
  const count = (s: ProofState) => operations.filter((o) => worstOf(o.name).state === s).length;
  const tiles: Array<[label: string, value: number, sub: string, icon: ReactNode, status?: "success" | "warning" | "danger", href?: string]> = [
    ["Operations", operations.length, `across ${things.length} things`, <CircleQuestion />],
    ["Proved everywhere", count("recorded-pass"), `in all ${ENVS.length} environments`, <CircleCheck />, "success"],
    ["Failing", count("failed"), "a newest verdict is a failure", <CircleXmark />, "danger", "/proof/attention"],
    ["Stale", count("stale"), "changed since its pass", <TriangleExclamation />, "warning", "/proof/attention"],
    ["Unproven", count("unproven"), "no verdict somewhere", <CircleQuestion />, undefined, "/proof/attention"],
  ];
  return (
    <KPIGroup className="my-4 flex-wrap">
      {tiles.flatMap(([label, value, sub, icon, status, href], i) => [
        ...(i ? [<KPIGroup.Separator key={`s${label}`} />] : []),
        <KPI key={label} className="min-w-40 flex-1">
          <KPI.Header><KPI.Icon status={value ? status : undefined}>{icon}</KPI.Icon><KPI.Title>{label}</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={value} data-live="" /></KPI.Content>
          <KPI.Footer><span className="text-xs text-muted">{sub}</span>
            {href && value > 0 && <Link href={href} className="ml-2 text-xs">See why<ArrowRight className="ml-0.5 size-3" /></Link>}</KPI.Footer>
        </KPI>,
      ])}
    </KPIGroup>
  );
}

/** The slowest measured p95 across the environments, against the budget: a bar, a tick at the budget, the 1.5x review zone shaded. */
export function SpeedBar({ op, env, wide }: { op: string; env?: string; wide?: boolean }) {
  const budget = M.operations[op]!.budget?.p95Ms; if (!budget) return <Sub>no budget</Sub>;
  const ms = env ? p95Of(op, env) : Math.max(0, ...ENVS.map((e) => p95Of(op, e) ?? 0)) || null;
  const max = budget * 2, pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const tone = ms === null ? "" : ms > budget * 1.5 ? "bg-danger" : ms > budget ? "bg-warning" : "bg-accent";
  return (
    <div className={`flex flex-col gap-1 ${wide ? "w-full" : "w-32"}`} title={`p95 ${ms ?? "–"} ms against a ${budget} ms budget`}>
      <Live><div className="relative h-2 rounded-full bg-default">
        <div className="absolute inset-y-0 rounded-r-full bg-warning/15" style={{ left: pct(budget), width: `${(budget * 0.5 / max) * 100}%` }} />
        {ms !== null && <div className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: pct(ms) }} />}
        <div className="absolute -inset-y-1 w-0.5 rounded bg-foreground/70" style={{ left: pct(budget) }} />
      </div></Live>
      <span className="text-xs tabular-nums text-muted"><Live><span className={ms && ms > budget ? "font-semibold text-warning" : "text-foreground"}>{ms ?? "–"}</span></Live> / {budget} ms</span>
    </div>
  );
}
