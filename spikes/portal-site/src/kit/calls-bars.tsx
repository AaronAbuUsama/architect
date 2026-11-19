// CallsBars: calls per minute as stacked bars of answered, refused and defects (Aaron: "a bar chart or stacked bars,
// not a line"). The browser draws it with Pro's BarChart (client.tsx); the server draws the same bars in SVG, so the
// page reads before any script runs.
import type { MinuteCalls } from "../live.ts";
import { Island } from "./island.tsx";

export const callsBarKeys = [
  { key: "answered", label: "answered", color: "var(--success)" },
  { key: "refused", label: "refused", color: "var(--warning)" },
  { key: "defects", label: "defects", color: "var(--danger)" },
] as const;

export const CallsBarsLegend = () => (
  <div className="bars-legend">{callsBarKeys.map((k) => <span key={k.key}><i style={{ background: k.color }} />{k.label}</span>)}</div>
);

/** The server's drawing: the same stacked columns, no axes, no tooltip. */
export const CallsColumns = ({ series, height }: { series: MinuteCalls[]; height: number }) => {
  const max = Math.max(...series.map((s) => s.answered + s.refused + s.defects), 1), w = series.length * 10;
  return (
    <svg className="calls-cols" viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      {series.map((s, i) => {
        let y = height;
        return callsBarKeys.map((k) => { const v = s[k.key], hh = (v / max) * (height - 4); y -= hh;
          return v > 0 && <rect key={k.key} x={i * 10 + 1.5} y={y} width={7} height={hh} fill={k.color} />; });
      })}
    </svg>
  );
};

export const CallsBars = ({ series, height = 120, label }: { series: MinuteCalls[]; height?: number; label: string }) => (
  <figure className="calls-bars" aria-label={label}>
    <Island name="CallsBars" props={{ series, height }}><CallsColumns series={series} height={height} /></Island>
    <CallsBarsLegend />
  </figure>
);
