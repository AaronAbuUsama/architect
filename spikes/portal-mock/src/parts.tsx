// Pieces shared by the pages: a thing's lifecycle (drawn from its machine, lit by move counts), and the stat block.
import { KPI } from "@heroui-pro/react/kpi";
import type { Move, Stat } from "./data.ts";

/** States left to right; each move an arrow with its count; a refusal on the arrow it guards. */
export function Lifecycle({ states, moves, compact }: { states: string[]; moves: Move[]; compact?: boolean }) {
  if (states.length === 0) return <p className="text-sm text-muted">No lifecycle declared.</p>;
  const gap = compact ? 175 : 220, r = compact ? 0 : 0, h = compact ? 64 : 118, y = compact ? 30 : 46;
  const x = (i: number) => 40 + i * gap + r;
  const w = x(states.length - 1) + 70;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxWidth: w, height: "auto" }} role="img" aria-label="Lifecycle">
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" /></marker></defs>
      {moves.map((m) => {
        const a = states.indexOf(m.from), b = states.indexOf(m.to);
        const x1 = x(a) + (a === 0 ? 10 : 46), x2 = x(b) - 48, mid = (x1 + x2) / 2;
        return (<g key={m.name}>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--muted)" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x={mid} y={y - 9} textAnchor="middle" fontSize="12" fill="var(--foreground)">
            <tspan fontWeight="600">{m.name}</tspan><tspan dx="6" fill="var(--accent)" fontWeight="600">{m.count.toLocaleString()}</tspan></text>
          {m.refused && !compact && <text x={mid} y={y + 24} textAnchor="middle" fontSize="11" fill="var(--warning)">
            ▲ {m.refused.tag} ×{m.refused.count}</text>}
        </g>);
      })}
      {states.map((st, i) => st === "·"
        ? <circle key={st} cx={x(i)} cy={y} r="6" fill="var(--foreground)" />
        : <g key={st}><rect x={x(i) - 46} y={y - 15} width="92" height="30" rx="15" fill="var(--surface-secondary)" stroke="var(--border)" />
            <text x={x(i)} y={y + 4} textAnchor="middle" fontSize="12" fill="var(--foreground)">{st}</text></g>)}
    </svg>
  );
}

const Tile = ({ title, value, unit, status, spark }: { title: string; value: number; unit?: string; status?: "warning" | "danger" | "success"; spark?: number[] }) => (
  <KPI className="min-w-0">
    <KPI.Header><KPI.Title>{title}</KPI.Title></KPI.Header>
    <KPI.Content><KPI.Value value={value} className={status === "danger" ? "text-danger" : status === "warning" ? "text-warning" : undefined}>
      {(f) => <>{f}{unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}</>}</KPI.Value></KPI.Content>
    {spark && <KPI.Chart data={spark.map((v) => ({ value: v }))} color="var(--accent)" height={36} />}
  </KPI>
);

/** Numbers as data: calls, answered, refused, defects, p95 against its budget. */
export function StatBlock({ stat, spark, columns = 5 }: { stat: Stat; spark?: number[]; columns?: number }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      <Tile title="calls" value={stat.calls} spark={spark} />
      <Tile title="answered" value={stat.answered} />
      <Tile title="refused" value={stat.refused} status={stat.refused ? "warning" : undefined} />
      <Tile title="defects" value={stat.defects} status={stat.defects ? "danger" : undefined} />
      <Tile title={stat.budget ? `p95 of ${stat.budget} ms` : "p95"} value={stat.p95} unit="ms" />
    </div>
  );
}

/** The compact form for a card: one line of numbers. */
export function StatLine({ stat }: { stat: Stat }) {
  const cell = (label: string, v: number | string, cls = "") => (
    <div className="min-w-0"><div className="text-xs text-muted">{label}</div><div className={`text-lg font-semibold tabular-nums ${cls}`}>{v}</div></div>);
  return (
    <div className="grid grid-cols-4 gap-3">
      {cell("calls", stat.calls.toLocaleString())}
      {cell("refused", stat.refused, stat.refused ? "text-warning" : "")}
      {cell("defects", stat.defects, stat.defects ? "text-danger" : "")}
      {cell("p95", `${stat.p95} ms`)}
    </div>
  );
}
