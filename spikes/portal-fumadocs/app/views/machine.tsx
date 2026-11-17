// The machine diagram: states in a row, each move an arc labelled with its event. `hot` picks one move out.
import { M } from "../blueprint/model.ts";

export function MachineDiagram({ thing, hot }: { thing: string; hot?: string }) {
  const m = M.things[thing]?.machine; if (!m) return null;
  const creates = Object.values(m.moves).some((v) => v.from.length === 0);
  const nodes = [...(creates ? ["(new)"] : []), ...m.states]; const W = 165, X0 = 66, Y = 165, x = (n: string) => X0 + nodes.indexOf(n) * W;
  const arcs = Object.entries(m.moves).flatMap(([key, mv]) => (mv.from.length ? mv.from : ["(new)"]).flatMap((f) => mv.to.map((t) => {
    const x1 = x(f), x2 = x(t);
    if (f === t) return { key, emits: mv.emits, d: `M${x1 - 14},${Y + 20} C${x1 - 44},${Y + 86} ${x1 + 44},${Y + 86} ${x1 + 14},${Y + 20}`, lx: x1, ly: Y + 84 };
    const fwd = x2 > x1, hh = 30 + Math.abs(x2 - x1) / 3.5, yc = fwd ? Y - 20 - hh : Y + 20 + hh;
    return { key, emits: mv.emits, d: `M${x1 + (fwd ? 10 : -10)},${fwd ? Y - 20 : Y + 20} Q${(x1 + x2) / 2},${yc} ${x2 + (fwd ? -10 : 10)},${fwd ? Y - 20 : Y + 20}`, lx: (x1 + x2) / 2, ly: fwd ? yc + 16 : yc - 6 };
  })));
  return (
    <figure className="not-prose my-4 rounded-xl border border-fd-border bg-fd-card p-3">
      <svg viewBox={`0 0 ${X0 + (nodes.length - 1) * W + 66} 280`} width="100%" role="img" aria-label={`State machine of ${thing}`} className="text-fd-foreground">
        <defs>{["n", "h"].map((k) => <marker key={k} id={`ar-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" className={k === "h" ? "fill-fd-primary" : "fill-fd-muted-foreground"} /></marker>)}</defs>
        {arcs.map((a, i) => <path key={i} d={a.d} fill="none" strokeWidth={a.key === hot ? 2.2 : 1.4} className={a.key === hot ? "stroke-fd-primary" : "stroke-fd-muted-foreground"} markerEnd={`url(#ar-${a.key === hot ? "h" : "n"})`} />)}
        {nodes.map((n) => <g key={n}><rect x={x(n) - 50} y={Y - 20} width={100} height={40} rx={n === "(new)" ? 20 : 10} strokeDasharray={n === "(new)" ? "4 3" : undefined} className="fill-fd-background stroke-fd-border" strokeWidth={1.5} />
          <text x={x(n)} y={Y + 4} textAnchor="middle" fontWeight={600} fontSize={12} className="fill-current">{n}</text></g>)}
        {arcs.map((a, i) => <text key={i} x={a.lx} y={a.ly} textAnchor="middle" fontSize={12} className="fill-current"><tspan fontWeight={700}>{a.key}</tspan><tspan x={a.lx} dy={13} fontSize={11} className="fill-fd-muted-foreground">{a.emits}</tspan></text>)}
      </svg>
      <figcaption className="px-2 text-xs text-fd-muted-foreground">From any other state the move is refused {m.notFrom.error} (exit {m.notFrom.exit}, {m.notFrom.code}).</figcaption>
    </figure>
  );
}
