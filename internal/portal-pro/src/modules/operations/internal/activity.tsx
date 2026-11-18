import { ComposedChart } from "@heroui-pro/react/composed-chart";
import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { Segment } from "@heroui-pro/react/segment";
import type { Call, CallFilter, Operation } from "../types.ts";
import { budgetTone, Metrics, ms, p95, result, utc } from "./shared.tsx";

const callKey = (call: Call) => `${call.traceId}/${call.id}`;

const callColumns: DataGridColumn<Call>[] = [
  { id: "time", header: "Time (UTC)", isRowHeader: true, width: 100, cell: (call) => utc(call.start) },
  { id: "outcome", header: "Outcome", minWidth: 135, cell: (call) => <span className={`op-outcome-${call.outcome}`}>{result(call)}{call.replayed && <small> · Replayed</small>}</span> },
  { id: "http", header: "HTTP", width: 68, align: "end", cell: (call) => call.http ?? "—" },
  { id: "duration", header: "Operation time", width: 115, align: "end", cell: (call) => call.reached ? ms(call.ms) : "—" },
  { id: "trace", header: "Trace", width: 105, cell: (call) => <code>{call.traceId.slice(0, 8)}</code> },
];

const dataOf = (calls: readonly Call[], from: number, to: number, step: number) => {
  const first = Math.floor(from / step) * step;
  const grouped = Map.groupBy(calls, (call) => Math.floor(call.start / step) * step);
  return Array.from({ length: Math.max(1, Math.ceil((to - first) / step)) }, (_, index) => {
    const date = first + index * step;
    const sample = grouped.get(date) ?? [];
    return {
      time: utc(date).slice(0, step === 1_000 ? 8 : 5),
      Answered: sample.filter((call) => call.outcome === "answered").length,
      Refused: sample.filter((call) => call.outcome === "refused").length,
      Defect: sample.filter((call) => call.outcome === "defect").length,
      Unknown: sample.filter((call) => call.outcome === "unknown").length,
    };
  });
};

export const Activity = ({ calls, operation, from, to, selected, onSelect, loading, filter, onFilter }: {
  calls: readonly Call[] | undefined;
  operation: Operation;
  from: number;
  to: number;
  selected: Call | undefined;
  onSelect: (call: Call) => void;
  loading: boolean;
  filter: CallFilter;
  onFilter: (filter: CallFilter) => void;
}) => {
  if (!calls) return <p className="op-empty">{loading ? "Loading capture…" : "No collector capture for this environment."}</p>;
  const latency = p95(calls);
  const refused = calls.filter((call) => call.outcome === "refused").length;
  const defects = calls.filter((call) => call.outcome === "defect").length;
  const filtered = filter === "all" ? calls : calls.filter((call) => call.outcome === filter);
  const step = to - from <= 90_000 ? 1_000 : 60_000;
  const data = dataOf(calls, from, to, step);
  const split = {
    Answered: "var(--success)", Refused: "var(--warning)", Defect: "var(--danger)",
    ...(calls.some((call) => call.outcome === "unknown") ? { Unknown: "var(--muted)" } : {}),
  };
  return (
    <div className="op-activity">
      <div className="op-section-title op-activity-title"><h2>Observed calls</h2><span>Local proof capture · {utc(from)} to {utc(to)} UTC</span></div>
      <Metrics items={[
        { label: "Calls", value: calls.length, note: `${defects} ${defects === 1 ? "defect" : "defects"}` },
        { label: "Refusals", value: refused, ...(refused > 0 && { tone: "warning" as const }), ...(calls.length ? { note: `${(100 * refused / calls.length).toFixed(0)}% of observed calls` } : {}) },
        ...(latency === undefined ? [] : [{ label: "Observed p95", value: latency, unit: "ms", tone: budgetTone(latency, operation.budget?.p95Ms), ...(operation.budget ? { note: `${operation.budget.p95Ms} ms budget` } : {}) }]),
      ]} />
      <figure className="op-chart">
        <div className="op-section-title"><figcaption>{step === 1_000 ? "Calls per second" : "Calls per minute"}</figcaption>
          <div className="op-legend">{Object.entries(split).map(([name, color]) => <span key={name}><i style={{ background: color }} />{name}</span>)}</div>
        </div>
        <ComposedChart data={data} height={172} aria-label="Observed calls by outcome">
          <ComposedChart.Grid vertical={false} stroke="var(--separator)" />
          <ComposedChart.XAxis dataKey="time" minTickGap={22} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <ComposedChart.YAxis width={25} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <ComposedChart.Tooltip content={<ComposedChart.TooltipContent />} />
          {Object.entries(split).map(([name, color]) => <ComposedChart.Bar key={name} dataKey={name} stackId="calls" fill={color} isAnimationActive={false} />)}
        </ComposedChart>
      </figure>
      <section className="op-calls">
        <div className="op-section-title">
          <h2>Recent calls</h2>
          <Segment aria-label="Call outcome" size="sm" selectedKey={filter} onSelectionChange={(key) => {
            if (key === "all" || key === "refused" || key === "defect") onFilter(key);
          }}>
            <Segment.Item id="all">All {calls.length}</Segment.Item>
            <Segment.Item id="refused">Refusals {refused}</Segment.Item>
            <Segment.Item id="defect">Defects {defects}</Segment.Item>
          </Segment>
        </div>
        <DataGrid
          aria-label="Recent calls"
          className="op-data-grid"
          data={[...filtered]}
          columns={callColumns}
          getRowId={callKey}
          selectionMode="single"
          selectionBehavior="replace"
          selectedKeys={selected ? new Set([callKey(selected)]) : new Set()}
          onSelectionChange={(keys) => {
            const key = keys === "all" ? undefined : [...keys][0];
            const call = filtered.find((entry) => callKey(entry) === key);
            if (call) onSelect(call);
          }}
          onRowAction={(key) => {
            const call = filtered.find((entry) => callKey(entry) === key);
            if (call) onSelect(call);
          }}
        />
        {filtered.length === 0 && <p className="op-empty">No {filter === "defect" ? "defects" : filter === "refused" ? "refusals" : "calls"} in this capture window.</p>}
      </section>
    </div>
  );
};
