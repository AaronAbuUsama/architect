// "Everything falls out of the blueprint", drawn from the grid: the blueprint, then each output in its tier (source,
// surface, evidence) with its `dependsOn` arrows, and under each output a strip of 13 squares, one per building block
// in hill-climb order, coloured by that card's state. Plain SVG with an aria-label, per the portal-design skill.
import type { LaneView } from "../../data/derive.ts";
import type { Output, OutputId } from "../../data/types.ts";
import { stateWord } from "../shared/vocab.ts";

export interface FalloutDiagramProps {
  readonly lanes: ReadonlyArray<LaneView>;
  readonly outputs: ReadonlyArray<Output>;
  readonly onOutput?: (output: OutputId) => void;
}

const tiers = ["source", "surface", "evidence"] as const;
const W = 168, H = 58, GAP = 14, COL = [0, 200, 420, 640], SQ = 9;

export const FalloutDiagram = ({ lanes, outputs, onOutput }: FalloutDiagramProps) => {
  const byTier = tiers.map((t) => outputs.filter((o) => o.tier === t));
  const rows = Math.max(...byTier.map((t) => t.length));
  const height = rows * (H + GAP);
  const pos = new Map<OutputId, { x: number; y: number }>();
  byTier.forEach((list, ti) => list.forEach((o, i) => {
    const top = (height - list.length * (H + GAP)) / 2;
    pos.set(o.id, { x: COL[ti + 1]!, y: top + i * (H + GAP) });
  }));
  const bp = { x: COL[0]!, y: height / 2 - H / 2 };
  const edge = (from: { x: number; y: number }, to: { x: number; y: number }, key: string, back: boolean) => {
    const x1 = from.x + W, y1 = from.y + H / 2, x2 = to.x, y2 = to.y + H / 2;
    const d = back || x2 <= x1
      ? `M${from.x + W / 2},${from.y + H} C${from.x + W / 2},${from.y + H + 18} ${to.x + W / 2},${to.y - 18} ${to.x + W / 2},${to.y}`
      : `M${x1},${y1} C${x1 + 30},${y1} ${x2 - 30},${y2} ${x2},${y2}`;
    return <path key={key} d={d} className="fd-edge" markerEnd="url(#fd-arrow)" />;
  };
  const source = outputs.filter((o) => o.dependsOn.length === 0);
  const green = (o: Output) => lanes.filter((l) => l.cards.find((c) => c.output.id === o.id)?.state === "green").length;
  return (
    <svg viewBox={`-4 -24 ${COL[3]! + W + 8} ${height + 40}`} className="fallout" role="img"
      aria-label={`The blueprint feeds ${outputs.length} outputs: ${outputs.map((o) => `${o.name}, ${green(o)} of ${lanes.length} green`).join("; ")}`}>
      <defs><marker id="fd-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" className="fd-arrowhead" /></marker></defs>
      {tiers.map((t, i) => <text key={t} x={COL[i + 1]!} y={-10} className="fd-tier">{t}</text>)}
      {source.map((o) => edge(bp, pos.get(o.id)!, `bp-${o.id}`, false))}
      {outputs.flatMap((o) => o.dependsOn.map((d) => {
        const a = pos.get(d), b = pos.get(o.id);
        return a && b ? edge(a, b, `${d}-${o.id}`, a.x === b.x) : null;
      }))}
      <g className="fd-node fd-blueprint">
        <rect x={bp.x} y={bp.y} width={W} height={H} rx={12} />
        <text x={bp.x + 14} y={bp.y + 25} className="fd-name">Blueprint</text>
        <text x={bp.x + 14} y={bp.y + 43} className="fd-sub">{lanes.length} building blocks</text>
      </g>
      {outputs.map((o) => {
        const p = pos.get(o.id)!;
        return (
          <g key={o.id} className="fd-node" role="button" tabIndex={0} aria-label={`${o.name}: ${green(o)} of ${lanes.length} green`}
            onClick={() => onOutput?.(o.id)} onKeyDown={(e) => { if (e.key === "Enter") onOutput?.(o.id); }}>
            <rect x={p.x} y={p.y} width={W} height={H} rx={12} />
            <text x={p.x + 12} y={p.y + 20} className="fd-name">{o.name}</text>
            <text x={p.x + W - 12} y={p.y + 20} className="fd-sub" textAnchor="end">by {o.provedBy}</text>
            {lanes.map((l, i) => {
              const c = l.cards.find((k) => k.output.id === o.id);
              return <rect key={l.block.id} x={p.x + 12 + i * (SQ + 2)} y={p.y + 34} width={SQ} height={SQ} rx={2}
                className={`fd-sq st-${c?.state ?? "not-needed"}${c?.proposedNotNeeded ? " is-proposed" : ""}`}>
                <title>{`${l.block.name}: ${c ? stateWord[c.state] : "none"}`}</title>
              </rect>;
            })}
          </g>
        );
      })}
    </svg>
  );
};
