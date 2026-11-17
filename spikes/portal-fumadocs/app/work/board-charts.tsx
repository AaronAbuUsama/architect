// The two widgets beside the board: the burn-down (open tasks against scope, with the ideal line) and the agents on the mission.
import { Link } from "react-router";
import { Widget } from "@heroui-pro/react";
import { LineChart } from "@heroui-pro/react/line-chart";
import { workers } from "./fixtures.ts";
import { AgentDot } from "./status-icon.tsx";
import { TYPE_TONE } from "./shell.tsx";
import type { Mission, Run } from "./types.ts";

/** Open tasks per day against scope; the ideal line runs straight from the first open day down to zero on the last. */
export function BurnDownWidget({ m }: { m: Mission }) {
  const { day, open, scope } = m.daily, from = Math.max(0, open.findIndex((v) => v > 0)), end = day.length - 1;
  const data = day.map((d, i) => ({ day: d, open: open[i]!, scope: scope[i]!, ideal: i < from ? null : Math.round((open[from]! * (end - i)) / (end - from || 1) * 10) / 10 }));
  return (
    <Widget>
      <Widget.Header>
        <div className="flex flex-col"><Widget.Title>Burn-down</Widget.Title><Widget.Description>open tasks per day against scope; the ideal line reaches zero on the last day</Widget.Description></div>
        <Widget.Legend><Widget.LegendItem color="var(--chart-1)">Open</Widget.LegendItem><Widget.LegendItem color="var(--chart-3)">Scope</Widget.LegendItem><Widget.LegendItem color="var(--chart-2)">Ideal</Widget.LegendItem></Widget.Legend>
      </Widget.Header>
      <Widget.Content>
        {/* before the first open day the ideal line has no point: null breaks it (the typing only lists number | string) */}
        <LineChart data={data as Array<Record<string, number | string>>} height={220}>
          <LineChart.Grid vertical={false} />
          <LineChart.XAxis dataKey="day" /><LineChart.YAxis width={28} allowDecimals={false} domain={[0, (max: number) => max + 2]} />
          <LineChart.Tooltip content={<LineChart.TooltipContent />} />
          <LineChart.Line isAnimationActive={false} dataKey="scope" stroke="var(--chart-3)" strokeWidth={1.5} dot={false} type="stepAfter" />
          <LineChart.Line isAnimationActive={false} dataKey="ideal" stroke="var(--chart-2)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
          <LineChart.Line isAnimationActive={false} dataKey="open" stroke="var(--chart-1)" strokeWidth={2.5} dot />
        </LineChart>
      </Widget.Content>
    </Widget>
  );
}

/** Threads by agent type, each linking to that type's settings. */
export function AgentsWidget({ runs }: { runs: Run[] }) {
  return (
    <Widget>
      <Widget.Header><div className="flex flex-col"><Widget.Title>Agents on this mission</Widget.Title><Widget.Description>threads by type</Widget.Description></div></Widget.Header>
      <Widget.Content>
        <ul className="flex flex-col gap-3 text-sm">{workers.filter((w) => runs.some((r) => r.worker === w.id)).map((w) => {
          const mine = runs.filter((r) => r.worker === w.id), ok = mine.filter((r) => r.status === "passed").length;
          return (<li key={w.id}><Link to={`/work/agents/${w.id}`} className="flex items-center gap-2 hover:underline"><AgentDot color={TYPE_TONE[w.id]!} />{w.name}
            <span className="ml-auto text-xs tabular-nums text-muted">{mine.length} threads · {ok} passed · ${mine.reduce((a, r) => a + r.costUsd, 0).toFixed(2)}</span></Link></li>);
        })}</ul>
      </Widget.Content>
    </Widget>
  );
}
