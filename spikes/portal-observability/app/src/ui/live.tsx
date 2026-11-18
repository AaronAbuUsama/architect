// The live half of an operation page: the numbers against the budget, the minute chart, the recent calls.
import { KPI } from "@heroui-pro/react/kpi";
import { ComposedChart } from "@heroui-pro/react/composed-chart";
import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { ReferenceLine } from "recharts";
import type { Call, OperationPage } from "../page/types.ts";
import { ago, colorOf, href, Mono, ms, OutcomeChip, Section } from "./index.ts";

export const Numbers = ({ page }: { page: OperationPage }) => {
  const { live, budgetMs } = page;
  const over = budgetMs !== undefined && live.p95 !== undefined && live.p95 > budgetMs;
  const pct = (n: number) => (live.total === 0 ? "0%" : `${Math.round((100 * n) / live.total)}%`);
  const card = (title: string, value: string, sub: string, color?: string) => (
    <KPI key={title} className="min-w-0">
      <KPI.Header>
        <KPI.Title className="text-[11px] uppercase tracking-wider">{title}</KPI.Title>
      </KPI.Header>
      <KPI.Content>
        <span className="mono whitespace-nowrap text-2xl font-semibold" style={color ? { color } : undefined}>{value}</span>
        <span className="mono text-xs text-muted">{sub}</span>
      </KPI.Content>
    </KPI>
  );
  return (
    <div className="grid grid-cols-5 gap-2">
      {card("calls", String(live.total), `last ${Math.round(live.since / 60_000)} min`)}
      {card("answered", String(live.answered), pct(live.answered), "var(--ok)")}
      {card("refused", String(live.refused), `${pct(live.refused)} · ends OK`, "var(--refusal)")}
      {card("defects", String(live.defects), live.defects === 0 ? "none" : pct(live.defects), live.defects ? "var(--defect)" : undefined)}
      {card("p95", ms(live.p95), budgetMs === undefined ? "no budget" : `budget ${budgetMs} ms · ${over ? "OVER" : "within"}`, over ? "var(--defect)" : "var(--ok)")}
    </div>
  );
};

export const Minutes = ({ page }: { page: OperationPage }) => {
  const data = page.live.series.map((b) => ({ ...b, label: new Date(b.t).toISOString().slice(11, 16) })) as unknown as Array<Record<string, string | number>>;
  return (
    <Section
      title="calls per minute · p95"
      right={<span className="mono text-[11px] text-muted">bars: <span style={{ color: "var(--ok)" }}>answered</span> · <span style={{ color: "var(--refusal)" }}>refused</span> · <span style={{ color: "var(--defect)" }}>defect</span> — line: p95 · dashed: budget</span>}
    >
      <ComposedChart data={data} height={150}>
        <ComposedChart.Grid vertical={false} />
        <ComposedChart.XAxis dataKey="label" tickMargin={6} interval={4} tick={{ fontSize: 10 }} />
        <ComposedChart.YAxis yAxisId="calls" width={28} allowDecimals={false} tick={{ fontSize: 10 }} />
        <ComposedChart.YAxis yAxisId="ms" orientation="right" width={44} tick={{ fontSize: 10 }} unit=" ms" domain={[0, (max: number) => Math.max(max, (page.budgetMs ?? 0) * 1.2)]} />
        <ComposedChart.Bar yAxisId="calls" dataKey="answered" stackId="c" fill="var(--ok)" isAnimationActive={false} />
        <ComposedChart.Bar yAxisId="calls" dataKey="refused" stackId="c" fill="var(--refusal)" isAnimationActive={false} />
        <ComposedChart.Bar yAxisId="calls" dataKey="defects" stackId="c" fill="var(--defect)" isAnimationActive={false} />
        <ComposedChart.Line yAxisId="ms" dataKey="p95" stroke="var(--step)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        {page.budgetMs !== undefined ? <ReferenceLine yAxisId="ms" y={page.budgetMs} stroke="var(--defect)" strokeDasharray="4 3" /> : null}
        <ComposedChart.Tooltip />
      </ComposedChart>
    </Section>
  );
};

export const Calls = ({ page, selected }: { page: OperationPage; selected: string | undefined }) => {
  const now = page.live.now;
  const columns: Array<DataGridColumn<Call>> = [
    { id: "when", header: "when", cell: (c) => <Mono className="whitespace-nowrap text-muted">{ago(c.start, now)}</Mono>, width: 84 },
    { id: "outcome", header: "outcome", cell: (c) => <OutcomeChip outcome={c.outcome} tag={c.tag} />, width: 170 },
    { id: "http", header: "http", cell: (c) => <Mono className="text-muted">{c.http ?? ""}</Mono>, width: 52 },
    {
      id: "ms", header: "ms", align: "end", width: 76, allowsSorting: true, sortFn: (a, b) => a.ms - b.ms,
      cell: (c) => <Mono className={`whitespace-nowrap ${c.overBudget ? "text-danger" : ""}`}>{ms(c.ms)}</Mono>,
    },
    {
      id: "payload", header: "payload (public fields)",
      cell: (c) => <Mono className="block max-w-[200px] truncate text-xs text-muted">{Object.entries(c.payload).filter(([k]) => k !== "allowance").map(([k, v]) => `${k}=${v}`).join(" ")}{c.replayed ? " · replayed" : ""}</Mono>,
    },
    { id: "why", header: "refusal.log / defect", cell: (c) => <Mono className="block max-w-[260px] truncate text-xs">{c.defect ? <span style={{ color: "var(--defect)" }}>{c.defect}</span> : c.log ?? (c.tag === "NotAllowed" ? "refused at the door: no operation span" : "")}</Mono> },
    { id: "trace", header: "trace", width: 96, cell: (c) => <a className="mono text-xs text-accent" href={href(`operations/${page.name}`, { trace: c.trace })}>{c.trace.slice(0, 8)}</a> },
  ];
  return (
    <Section title={`recent calls · ${page.live.calls.length}`} right={<span className="mono text-[11px] text-muted">source: {page.live.source}</span>}>
      <DataGrid
        aria-label="recent calls"
        data={page.live.calls.slice(0, 40)}
        columns={columns}
        getRowId={(c) => c.trace}
        selectionMode="single"
        selectedKeys={selected ? new Set([selected]) : new Set()}
        onSelectionChange={(keys) => {
          const k = keys === "all" ? undefined : [...keys][0];
          if (k !== undefined) window.location.hash = href(`operations/${page.name}`, { trace: String(k) });
        }}
        scrollContainerClassName="max-h-[320px] overflow-y-auto"
        renderEmptyState={() => <span className="text-muted">No calls in this window. Run some traffic: node traffic.ts</span>}
      />
    </Section>
  );
};

export const dotFor = (c: Call) => colorOf[c.outcome];
