// The top of a task: the fact that closes it with progress, its attempts in aggregate (KPIs), and its runs as a Pro DataGrid.
import { ArrowsRotateRight, CircleDollar, Clock, Wrench } from "@gravity-ui/icons";
import { Card, Chip, ProgressBar } from "@heroui/react";
import { DataGrid, type DataGridColumn } from "@heroui-pro/react";
import { useNavigate } from "react-router";
import { EvalStrip } from "../views/status.tsx";
import { workerOf } from "./fixtures.ts";
import { MetricGroup } from "./metric-kpi.tsx";
import { TYPE_TONE } from "./shell.tsx";
import { AgentDot, RunStatusIcon } from "./status-icon.tsx";
import { runStats } from "./thread.tsx";
import type { Run, Task } from "./types.ts";

export function ClosesWhen({ t, isOp }: { t: Task; isOp: boolean }) {
  return (
    <Card variant={t.reopened ? "secondary" : "default"}>
      <Card.Content className="flex-row flex-wrap items-center gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-muted">Closes when</span><span className="font-medium">{t.closesWhen}</span>
          {t.reopened ? <Chip size="sm" color="danger" variant="soft" className="self-start">Reopened by a fact: {t.reopened}</Chip> : t.note && <span className="text-sm text-muted">{t.note}</span>}
        </div>
        {t.progress && (
          <ProgressBar aria-label="Progress to the closing fact" className="w-48" value={(t.progress[0] / t.progress[1]) * 100} color={t.reopened ? "danger" : "accent"}>
            <div className="flex justify-between text-xs text-muted"><span>progress</span><span className="tabular-nums">{t.progress[0]} of {t.progress[1]}</span></div>
            <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
          </ProgressBar>)}
        {isOp && t.kind === "prove" && <div className="flex flex-col gap-1"><span className="text-xs text-muted">Nine evals in test</span><EvalStrip op={t.subject} env="test" /></div>}
      </Card.Content>
    </Card>
  );
}

export function TaskKpis({ runs }: { runs: Run[] }) {
  const stats = runs.map(runStats), secs = runs.reduce((a, r) => a + r.seconds, 0), cost = runs.reduce((a, r) => a + r.costUsd, 0);
  const tools = stats.reduce((a, s) => a + s.tools, 0), fails = stats.reduce((a, s) => a + s.toolFails, 0);
  return <MetricGroup metrics={[
    { title: "Attempts", icon: <ArrowsRotateRight />, value: runs.length, footer: runs.length ? `${runs.filter((r) => r.status === "failed").length} failed · models: ${[...new Set(runs.map((r) => r.model))].join(", ")}` : "no thread yet" },
    { title: "Time spent", icon: <Clock />, value: Math.round(secs / 60), render: (f) => `${f}m`, footer: "across every attempt" },
    { title: "Cost", icon: <CircleDollar />, value: cost, number: { style: "currency", currency: "USD" }, footer: runs.length ? `$${(cost / runs.length).toFixed(2)} an attempt` : "no thread yet" },
    { title: "Failed tool calls", icon: <Wrench />, value: fails, render: (f) => <>{f}<span className="text-sm font-normal text-muted"> of {tools}</span></>, status: fails ? "danger" : undefined, footer: "refused by a grant or a schema" },
  ]} />;
}

export function RunsGrid({ runs }: { runs: Run[] }) {
  const navigate = useNavigate();
  const columns: DataGridColumn<Run>[] = [
    { id: "thread", header: "Thread", isRowHeader: true, cell: (r) => <span className="flex items-center gap-2"><RunStatusIcon s={r.status} />{r.id}</span> },
    { id: "agent", header: "Agent", cell: (r) => <span className="flex items-center gap-1.5"><AgentDot color={TYPE_TONE[r.worker]!} />{workerOf(r.worker).name}</span> },
    { id: "model", header: "Model", cell: (r) => <span className="font-mono text-xs">{r.model}</span> },
    { id: "time", header: "Time", align: "end", cell: (r) => <span className="tabular-nums">{Math.round(r.seconds / 60)}m</span> },
    { id: "cost", header: "Cost", align: "end", cell: (r) => <span className="tabular-nums">${r.costUsd.toFixed(2)}</span> },
    { id: "fails", header: "Failed tool calls", align: "end", cell: (r) => { const s = runStats(r); return <span className="tabular-nums">{s.toolFails} of {s.tools}</span>; } },
  ];
  return <DataGrid aria-label="This task's runs; a row opens the thread" columns={columns} data={runs} getRowId={(r) => r.id} onRowAction={(id) => navigate(`/work/r/${id}`)} />;
}
