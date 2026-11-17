// The machine diagram: states in a row; forward moves arc above, backward moves and self-loops below. Each arc gets its
// own lane, so arcs and labels never sit on each other. `hot` picks one move out and fades the rest.
import { M } from "../blueprint/model.ts";
import { A, to } from "./status.tsx";

const W = 170, X0 = 70, LANE = 46;

export function MachineDiagram({ thing, hot }: { thing: string; hot?: string }) {
  const m = M.things[thing]?.machine; if (!m) return null;
  const creates = Object.values(m.moves).some((v) => v.from.length === 0);
  const nodes = [...(creates ? ["(new)"] : []), ...m.states], x = (n: string) => X0 + nodes.indexOf(n) * W;
  const edges = Object.entries(m.moves).flatMap(([key, mv]) => (mv.from.length ? mv.from : ["(new)"]).flatMap((f) => mv.to.map((t) => ({ key, emits: mv.emits, f, t }))));
  const up = edges.filter((e) => x(e.t) > x(e.f)).sort((a, b) => x(a.t) - x(a.f) - (x(b.t) - x(b.f)) || x(a.f) - x(b.f));
  const down = edges.filter((e) => x(e.t) <= x(e.f)).sort((a, b) => x(a.f) - x(a.t) - (x(b.f) - x(b.t)));
  const H = (up.length + 1) * LANE, Y = H + 20, B = (down.length + 1) * LANE;
  const arcs = [
    ...up.map((e, i) => { const x1 = x(e.f) + 18, x2 = x(e.t) - 18, top = Y - 20 - (i + 1) * LANE;
      return { ...e, d: `M${x1},${Y - 20} C${x1},${top} ${x2},${top} ${x2},${Y - 20}`, lx: (x1 + x2) / 2, ly: Y - 20 - (i + 1) * LANE * 0.75 - 8 }; }),
    ...down.map((e, i) => { const self = e.f === e.t, x1 = x(e.f) + (self ? 18 : -18), x2 = x(e.t) + (self ? -18 : 18), bot = Y + 20 + (i + 1) * LANE;
      return { ...e, d: `M${x1},${Y + 20} C${x1},${bot} ${x2},${bot} ${x2},${Y + 20}`, lx: (x1 + x2) / 2, ly: Y + 20 + (i + 1) * LANE * 0.75 + 4 }; }),
  ];
  const on = (k: string) => !hot || k === hot;
  return (
    <figure className="not-prose my-4 rounded-xl border border-fd-border bg-fd-card p-3">
      <svg viewBox={`0 0 ${X0 * 2 + (nodes.length - 1) * W} ${Y + B + 30}`} width="100%" role="img" aria-label={`State machine of ${thing}`} className="text-fd-foreground">
        <defs>{["n", "h"].map((k) => <marker key={k} id={`ar-${thing}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" className={k === "h" ? "fill-fd-primary" : "fill-fd-muted-foreground"} /></marker>)}</defs>
        {arcs.map((a, i) => <path key={i} d={a.d} fill="none" opacity={on(a.key) ? 1 : 0.2} strokeWidth={a.key === hot ? 2.4 : 1.4} className={a.key === hot ? "stroke-fd-primary" : "stroke-fd-muted-foreground"} markerEnd={`url(#ar-${thing}-${a.key === hot ? "h" : "n"})`} />)}
        {nodes.map((n) => { const lit = !hot || arcs.some((a) => a.key === hot && (a.f === n || a.t === n)); return (
          <g key={n} opacity={lit ? 1 : 0.35}><rect x={x(n) - 52} y={Y - 20} width={104} height={40} rx={n === "(new)" ? 20 : 10} strokeDasharray={n === "(new)" ? "4 3" : undefined} className={`fill-fd-background ${lit && hot ? "stroke-fd-primary" : "stroke-fd-border"}`} strokeWidth={1.5} />
            <text x={x(n)} y={Y + 4} textAnchor="middle" fontWeight={600} fontSize={12} className="fill-current">{n}</text></g>); })}
        {arcs.map((a, i) => (
          <text key={i} x={a.lx} y={a.ly} textAnchor="middle" fontSize={12} opacity={on(a.key) ? 1 : 0.25} paintOrder="stroke" strokeWidth={5} className="fill-current stroke-fd-card">
            <tspan fontWeight={700}>{a.key}</tspan><tspan dx={6} fontSize={11} className={a.key === hot ? "fill-fd-primary" : "fill-fd-muted-foreground"}>{a.emits}</tspan>
          </text>))}
      </svg>
      <figcaption className="px-2 text-xs text-fd-muted-foreground">From any other state the move is refused {m.notFrom.error} (exit {m.notFrom.exit}, {m.notFrom.code}).</figcaption>
    </figure>
  );
}

const State = ({ s }: { s: string }) => <span className="rounded-lg border border-fd-border bg-fd-background px-2.5 py-1 text-sm font-semibold">{s}</span>;
/** One move as a sentence-shaped strip: from states → the operation → to states, and the event it journals. */
export function MoveStrip({ op }: { op: string }) {
  const o = M.operations[op]!, mv = o.move!; return (
    <div className="not-prose my-3 flex flex-wrap items-center gap-2 rounded-xl border border-fd-border bg-fd-card p-4">
      <span className="flex gap-1">{mv.from.length ? mv.from.map((s) => <State key={s} s={s} />) : <State s="(new)" />}</span>
      <span className="text-fd-muted-foreground">→</span>
      <span className="flex flex-col items-center rounded-lg bg-fd-primary/10 px-3 py-1"><A href={to.op(op)}>{op}</A><span className="text-xs text-fd-muted-foreground">move {mv.key}</span></span>
      <span className="text-fd-muted-foreground">→</span>
      <span className="flex gap-1">{mv.to.map((s) => <State key={s} s={s} />)}</span>
      <span className="ml-auto rounded-full bg-fd-primary px-3 py-1 text-sm font-semibold text-fd-primary-foreground">journals {mv.emits}</span>
    </div>
  );
}
