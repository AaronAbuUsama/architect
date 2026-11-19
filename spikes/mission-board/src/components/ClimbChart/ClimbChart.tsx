// Green and built across the whole grid at each recorded point: a step chart in plain SVG (the portal-design skill:
// charts are hand-drawn, with an aria-label that says what they show).
import type { LaneClimb } from "../../data/derive.ts";

export interface ClimbChartProps {
  readonly climb: ReadonlyArray<LaneClimb>;
}

export const ClimbChart = ({ climb }: ClimbChartProps) => {
  const n = climb[0]?.points.length ?? 0;
  if (n === 0) return <p className="muted">No points recorded.</p>;
  const total = (i: number, k: "green" | "built") => climb.reduce((a, l) => a + l.points[i]!.score[k], 0);
  const max = climb.reduce((a, l) => a + l.points[0]!.score.needed, 0);
  const W = 640, H = 150, x = (i: number) => (n < 2 ? W / 2 : (i / (n - 1)) * W), y = (v: number) => H - (v / max) * H;
  const path = (k: "green" | "built") => Array.from({ length: n }, (_, i) => `${i ? "L" : "M"}${x(i)},${y(total(i, k))}`).join(" ");
  const last = n - 1;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));
  return (
    <svg viewBox={`-36 -10 ${W + 80} ${H + 20}`} className="climb" role="img"
      aria-label={`Green ${total(0, "green")} to ${total(last, "green")}, built ${total(0, "built")} to ${total(last, "built")}, of ${max}, over ${n} points`}>
      {ticks.map((t) => (
        <g key={t}><line x1={0} x2={W} y1={y(t)} y2={y(t)} className="grid" /><text x={-8} y={y(t) + 4} className="tick" textAnchor="end">{t}</text></g>
      ))}
      {n === 1 && [<circle key="b" cx={x(0)} cy={y(total(0, "built"))} r={4} className="dot-built" />, <circle key="g" cx={x(0)} cy={y(total(0, "green"))} r={4} className="dot-green" />]}
      <path d={path("built")} className="line-built" />
      <path d={path("green")} className="line-green" />
      <text x={W + 6} y={y(total(last, "built")) + 4} className="end-label">{total(last, "built")}</text>
      <text x={W + 6} y={y(total(last, "green")) + 4} className="end-label">{total(last, "green")}</text>
    </svg>
  );
};
