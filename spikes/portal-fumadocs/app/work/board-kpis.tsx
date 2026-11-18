// The mission board's six numbers: each says whether it is getting better, from the mission's daily series.
import { ArrowRotateLeft, CircleCheck, CircleDollar, Clock, Target, Wrench } from "@gravity-ui/icons";
import { MetricGroup, type Metric } from "./metric-kpi.tsx";
import { runsOf, tasksOf } from "./fixtures.ts";
import { runStats } from "./thread.tsx";
import type { Mission } from "./types.ts";

const last = (xs: number[]) => xs[xs.length - 1]!, change = (xs: number[]) => last(xs) - xs[xs.length - 2]!;
const percent = (f: string) => `${f}%`;

export function MissionKpis({ m }: { m: Mission }) {
  const d = m.daily, ts = tasksOf(m.id), stats = runsOf(m.id).map(runStats), reopened = ts.filter((t) => t.reopened);
  const closed = ts.filter((t) => t.column === "done" || t.column === "proven").length;
  const tools = stats.reduce((a, s) => a + s.tools, 0), toolFails = stats.reduce((a, s) => a + s.toolFails, 0), spent = last(d.spend);
  const first: Metric[] = [
    { title: "Tasks closed", icon: <CircleCheck />, value: closed, render: (f) => <>{f}<span className="text-sm font-normal text-muted"> of {ts.length}</span></>, delta: { change: change(d.closed) },
      progress: (closed / ts.length) * 100, footer: `scope grew by ${last(d.scope) - d.scope[0]!} (a spike)` },
    { title: "Eval pass rate", icon: <Target />, value: last(d.evalPass), render: percent, delta: { change: change(d.evalPass), unit: " pts" }, spark: d.evalPass, sparkColor: "var(--success)", footer: "across the mission's operations, in test" },
    { title: "Spend today", icon: <CircleDollar />, value: spent, number: { style: "currency", currency: "USD" }, status: spent > 8 ? "warning" : undefined, progress: spent * 10,
      footer: `of the $10 cap · $${d.spend.reduce((a, b) => a + b, 0).toFixed(2)} since ${m.started}` },
  ];
  const second: Metric[] = [
    { title: "Failed tool calls", icon: <Wrench />, value: last(d.toolFail), render: percent, delta: { change: change(d.toolFail), unit: " pts", lowerIsBetter: true }, spark: d.toolFail, sparkColor: "var(--danger)", footer: `${toolFails} of ${tools} in today's threads` },
    { title: "Median time to close", icon: <Clock />, value: last(d.closeMin), render: (f) => `${f}m`, delta: { change: change(d.closeMin), unit: "m", lowerIsBetter: true }, spark: d.closeMin.map((v) => v || null), footer: "claim to closing fact" },
    { title: "Reopened", icon: <ArrowRotateLeft />, value: reopened.length, status: reopened.length ? "danger" : undefined, footer: reopened.map((t) => `${t.subject}: ${t.reopened?.split(":")[0]}`).join(", ") || "none" },
  ];
  return <div className="flex flex-col gap-4"><MetricGroup metrics={first} /><MetricGroup metrics={second} /></div>;
}
