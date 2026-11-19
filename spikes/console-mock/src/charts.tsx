// Small static SVG charts. In the product these are Pro BarChart / LineChart (recharts),
// which render nothing under SSR, so the mockup draws the same marks by hand.

export const Spark = ({ values, tone = "accent", label }: { values: number[]; tone?: "accent" | "danger" | "warning"; label: string }) => {
  const w = 96, h = 28, max = Math.max(...values), min = Math.min(...values);
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label}>
      <path d={d} fill="none" stroke={`var(--${tone})`} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.5} fill={`var(--${tone})`} />
    </svg>
  );
};

// Horizontal bars: calls per tool, with the failed share drawn in the danger color.
export const ToolBars = ({ rows }: { rows: { tool: string; calls: number; failed: number }[] }) => {
  const max = Math.max(...rows.map((r) => r.calls));
  return (
    <div className="toolbars">
      {rows.map((r) => {
        const rate = (r.failed / r.calls) * 100;
        return (
          <div className="toolbar-row" key={r.tool}>
            <span className="mono toolbar-name">{r.tool}</span>
            <span className="toolbar-track" aria-hidden="true">
              <span className="toolbar-ok" style={{ width: `${((r.calls - r.failed) / max) * 100}%` }} />
              <span className="toolbar-bad" style={{ width: `${(r.failed / max) * 100}%` }} />
            </span>
            <span className="mono toolbar-num">{r.calls.toLocaleString("en-US")}</span>
            <span className={`mono toolbar-rate${rate >= 5 ? " is-bad" : ""}`}>{rate.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
};

// Vertical bars: minutes per work item, a typical line, the running item striped.
export const ItemBars = ({ items, typical, label }: { items: { name: string; min: number; running?: boolean }[]; typical: number; label: string }) => {
  const w = 560, h = 160, pad = 22, max = Math.max(typical * 1.4, ...items.map((i) => i.min));
  const bw = (w - pad) / items.length;
  const y = (v: number) => h - pad - (v / max) * (h - pad - 8);
  return (
    <svg className="itembars" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <defs>
        <pattern id="run" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--warning)" fillOpacity="0.35" /><rect width="3" height="6" fill="var(--warning)" />
        </pattern>
      </defs>
      <line x1={pad} x2={w} y1={y(typical)} y2={y(typical)} className="typical-line" />
      <text x={w - 4} y={y(typical) - 6} textAnchor="end" className="chart-label">typical {typical} min</text>
      {items.map((it, i) => (
        <g key={it.name}>
          <rect x={pad + i * bw + 6} y={y(it.min)} width={bw - 12} height={h - pad - y(it.min)} rx={4}
            fill={it.running ? "url(#run)" : it.min > typical * 1.5 ? "var(--danger)" : "var(--accent)"} fillOpacity={it.running ? 1 : 0.85} />
          <text x={pad + i * bw + bw / 2} y={h - 6} textAnchor="middle" className="chart-label">{it.name}</text>
          <text x={pad + i * bw + bw / 2} y={y(it.min) - 5} textAnchor="middle" className="chart-value">{it.min}m</text>
        </g>
      ))}
    </svg>
  );
};

// Burn-up: scope (grey step), done (accent), and the dashed projection to the finish.
export const Burnup = ({ label }: { label: string }) => {
  const w = 300, h = 120, pad = 18, max = 50;
  const x = (day: number) => pad + (day / 4) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const scope = [[0, 35], [2.55, 35], [2.55, 45], [4, 45]];
  const done = [[0, 0], [1, 8], [1.8, 16], [2.3, 22], [2.6, 28]];
  const path = (pts: number[][]) => pts.map(([d, v], i) => `${i ? "L" : "M"}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="burnup" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <path d={path(scope)} fill="none" stroke="var(--muted)" strokeWidth={1.5} />
      <path d={`${path(done)} L${x(2.6)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="var(--accent)" opacity={0.14} />
      <path d={path(done)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      <path d={path([[2.6, 28], [3.67, 45]])} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 4" />
      <line x1={x(2.6)} x2={x(2.6)} y1={pad - 6} y2={h - pad} stroke="var(--separator)" />
      <circle cx={x(3.67)} cy={y(45)} r={3} fill="var(--accent)" />
      {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => <text key={d} x={x(i)} y={h - 3} textAnchor="middle" className="chart-label">{d}</text>)}
      <text x={x(2.6) + 4} y={pad - 2} className="chart-label">now</text>
    </svg>
  );
};
