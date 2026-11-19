// A thing's lifecycle drawn from its machine: states left to right, each move an arrow with its count in the window, lit when the
// window holds an answered move. The refusal an arrow guards is written under it. No populations: how many are in each state is stored data.
import type { ReactElement } from "react";
import type { WindowView } from "#modules/window/types.js";
import type { ThingWire } from "#modules/wire/types.js";

export interface LifecycleProps {
  readonly thing: ThingWire;
  readonly view: WindowView | undefined;
  readonly compact?: boolean;
  /** Per move key: the refusal it guards, as text ("HandleTaken ×31"). */
  readonly guards?: Readonly<Record<string, string>>;
}

export const Lifecycle = ({ thing, view, compact = false, guards = {} }: LifecycleProps): ReactElement => {
  const machine = thing.machine;
  if (machine === null) return <p className="muted small">No lifecycle declared: {thing.name} has no machine.</p>;
  const states = ["·", ...machine.states];
  const gap = compact ? 150 : 210;
  const y = compact ? 34 : 44;
  const height = compact ? 64 : 104;
  const x = (i: number): number => 24 + i * gap;
  const width = x(states.length - 1) + 64;
  return (
    <div data-portal="lifecycle" data-thing={thing.name} data-states={machine.states.join(",")}>
      <svg viewBox={`0 0 ${width} ${height}`} className="lifecycle" style={{ maxWidth: width }} role="img"
        aria-label={`${thing.name} lifecycle: ${Object.entries(machine.moves).map(([key, m]) => `${key} to ${m.to.join(" or ")}`).join(", ")}`}>
        <defs><marker id={`ah-${thing.name}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" /></marker></defs>
        {Object.entries(machine.moves).map(([key, m]) => {
          const from = m.from.length > 0 ? states.indexOf(m.from[0] ?? "") : 0;
          const to = states.indexOf(m.to[0] ?? "");
          const x1 = x(from) + (from === 0 ? 10 : 46);
          const x2 = x(to) - 48;
          const count = view?.moves[`${thing.name}.${key}`] ?? 0;
          const guard = guards[key];
          return (
            <g key={key} data-portal="move" data-move={key} data-lit={String(count > 0)} data-count={String(count)} className={count > 0 ? "lc-lit" : undefined}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--muted)" strokeWidth="1.5" markerEnd={`url(#ah-${thing.name})`} />
              <text x={(x1 + x2) / 2} y={y - 10} textAnchor="middle" className="lc-move">{key}{view !== undefined && <tspan dx="6" className="lc-count">{count.toLocaleString("en-US")}</tspan>}</text>
              {!compact && guard !== undefined && guard !== "" && <text x={(x1 + x2) / 2} y={y + 26} textAnchor="middle" className="lc-guard">▲ {guard}</text>}
            </g>
          );
        })}
        {states.map((state, i) => state === "·"
          ? <circle key="start" cx={x(i)} cy={y} r="6" fill="var(--foreground)" />
          : <g key={state}><rect x={x(i) - 46} y={y - 15} width="92" height="30" rx="15" fill="var(--surface-secondary)" stroke="var(--border)" /><text x={x(i)} y={y + 4} textAnchor="middle" className="lc-state">{state}</text></g>)}
      </svg>
    </div>
  );
};
