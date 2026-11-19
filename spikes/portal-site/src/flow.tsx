// Journeys and worlds drawn as pictures (round 3 Q4, Aaron: "we need to have them and show them graphically"):
// a journey is a sequence across its cast, one lane per actor, with each environment's verdict under every step;
// worlds are a tree from the empty world, with the journeys that start from each. Every node opens its page or trace.
import { journeys, worlds, type Journey } from "./journeys.ts";
import type { ReactNode } from "react";
import { environments, page } from "./model.ts";

type V = "pass" | "fail" | "stale" | "unproven" | "skip";
/** One environment's verdict for one step: a journey that failed in an environment failed at its first `ok: false` step. */
export const stepVerdict = (j: Journey, env: string, i: number): V => {
  const v = j.verdicts[env]!;
  if (v !== "fail") return v;
  const at = j.steps.findIndex((s) => !s.ok);
  return i < at ? "pass" : i === at ? "fail" : "skip";
};
const tone: Record<V, string> = { pass: "var(--success)", fail: "var(--danger)", stale: "var(--warning)", unproven: "var(--muted)", skip: "var(--muted)" };
const verb = (op: string) => op.split(".")[1]!;

export type StepWrap = (p: { j: Journey; i: number; children: ReactNode }) => ReactNode;
const Plain: StepWrap = ({ children }) => children;

/**
 * A journey as a sequence diagram: lanes are the cast, columns are the steps, and one verdict row per environment sits
 * underneath. The lanes and connectors are SVG; the steps are HTML on top, so the browser build can wrap each one in
 * Pro's HoverCard (`Wrap`) and show the step's preview on hover.
 */
export const Sequence = ({ j, Wrap = Plain }: { j: Journey; Wrap?: StepWrap }) => {
  const actors = Object.keys(j.cast), n = j.steps.length, lane = 54, top = 30, nh = 38, lanesH = top + actors.length * lane, h = lanesH + 22 + environments.length * 24 + 6;
  // x is a percentage of the steps area, so the drawing fits any width; y is in pixels.
  const cx = (i: number) => ((i + 0.5) / n) * 100, nw = 82 / n, y = (a: string) => top + actors.indexOf(a) * lane + (lane - nh) / 2;
  const worst = (i: number) => environments.some((e) => stepVerdict(j, e.name, i) === "fail") ? "fail" : "pass";
  return (
    <div className="seq-wrap">
      <div className="seq" style={{ height: h }}>
        <div className="seq__labels">
          {actors.map((a, r) => <div key={a} className={`seq__lane-label${r % 2 ? "" : " is-band"}`} style={{ top: top + r * lane, height: lane }}><b>{a}</b><span>{j.cast[a]}</span></div>)}
          {environments.map((e, r) => <div key={e.name} className="seq__env-label" style={{ top: lanesH + 22 + r * 24 - 9 }}>{e.name}</div>)}
        </div>
        <div className="seq__area">
          {actors.map((a, r) => <div key={a} className={`seq__band${r % 2 ? "" : " is-band"}`} style={{ top: top + r * lane, height: lane }} />)}
          <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" width="100%" height={h} aria-hidden="true">
            {j.steps.slice(1).map((s, k) => {
              const p = j.steps[k]!, x1 = cx(k) + nw / 2, y1 = y(p.actor) + nh / 2, x2 = cx(k + 1) - nw / 2, y2 = y(s.actor) + nh / 2, mx = (x1 + x2) / 2;
              return <path key={k} d={`M${x1},${y1} H${mx} V${y2} H${x2}`} fill="none" stroke="var(--border)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
          {j.steps.map((_, i) => <span key={i} className="seq__n" style={{ left: `${cx(i)}%` }}>{i + 1}</span>)}
          {environments.map((e, r) => j.steps.map((_, i) => { const v = stepVerdict(j, e.name, i);
            return <span key={e.name + i} className={`seq__dot k k--${v === "unproven" ? "none" : v}`} style={{ left: `${cx(i)}%`, top: lanesH + 22 + r * 24 }} title={`${e.name}: ${v === "skip" ? "not reached" : v}`} />; }))}
          {j.steps.map((s, i) => {
            const bad = worst(i) === "fail";
            return (
              <div key={i} className="seq-node-at" style={{ left: `${cx(i) - nw / 2}%`, top: y(s.actor), width: `${nw}%`, height: nh }}>
                <Wrap j={j} i={i}>
                  <a className={`seq-node${bad ? " is-fail" : ""}`} href={page.op(s.op, bad ? "spans" : "contract")} aria-label={`Step ${i + 1}: ${s.title}`}>
                    <span className="seq-node__verb">{verb(s.op)}</span><span className="seq-node__thing">{s.op.split(".")[0]}</span>
                  </a>
                </Wrap>
              </div>);
          })}
        </div>
      </div>
      <div className="seq-key small muted"><span><i className="k k--pass" />pass</span><span><i className="k k--fail" />failed here</span><span><i className="k k--skip" />not reached</span><span><i className="k k--none" />unproven</span><span>Hover a step for its preview; click to open its operation.</span></div>
    </div>
  );
};

/** The starting worlds as a tree from the empty world, with each journey hanging off the world it starts from. */
export const WorldTree = ({ here }: { here?: string }) => {
  const roots = [{ slug: null as string | null, label: "an empty world", gives: [] as string[] }, ...worlds.map((w) => ({ slug: w.slug as string | null, label: w.slug, gives: w.gives }))];
  const byWorld = roots.map((r) => ({ ...r, js: journeys.filter((j) => j.starts === r.slug) }));
  const rowH = 46, colW = [0, 220, 470], nodeW = 190, h = byWorld.reduce((a, r) => a + Math.max(1, r.js.length), 0) * rowH + 20, w = colW[2]! + 230;
  let row = 0;
  const placed = byWorld.map((r) => { const n = Math.max(1, r.js.length), y0 = 10 + row * rowH; row += n; return { ...r, y: y0 + (n * rowH) / 2 - rowH / 2, js: r.js.map((j, k) => ({ j, y: y0 + k * rowH })) }; });
  const empty = { ...placed[0]!, y: (h - 20) / 2 - 8 + 10 };
  placed[0] = { ...placed[0]!, y: empty.y };
  return (
    <div className="seq-wrap">
      <svg className="worlds" viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, minWidth: Math.min(w, 600), height: "auto" }} role="img" aria-label="Starting worlds and the journeys that start from each">
        {placed.slice(1).map((p) => <path key={p.slug} d={`M${nodeW},${empty.y + 18} C${nodeW + 20},${empty.y + 18} ${colW[1]! - 20},${p.y + 18} ${colW[1]},${p.y + 18}`} fill="none" stroke="var(--border)" strokeWidth={1.5} />)}
        {placed.flatMap((p) => p.js.map(({ j, y }) => { const fromX = p.slug === null ? nodeW : colW[1]! + nodeW;
          return <path key={j.slug} d={`M${fromX},${p.y + 18} C${fromX + 30},${p.y + 18} ${colW[2]! - 30},${y + 18} ${colW[2]},${y + 18}`} fill="none" stroke="var(--border)" strokeWidth={1.5} />; }))}
        {placed.map((p) => { const x0 = p.slug === null ? 0 : colW[1]!, on = here === p.slug;
          return (
            <a key={p.label} href={p.slug ? `world-${p.slug}.html` : "journeys.html"}>
              <rect x={x0} y={p.y} width={nodeW} height={36} rx={9} fill={on ? "color-mix(in oklab, var(--accent) 22%, var(--surface))" : "var(--surface)"} stroke={on ? "var(--accent)" : "var(--border)"} />
              <text x={x0 + 12} y={p.y + 15} className="seq-op">{p.label}</text>
              <text x={x0 + 12} y={p.y + 28} className="seq-thing">{p.gives.length ? `gives ${p.gives.join(", ")}` : "nothing made yet"}</text>
            </a>); })}
        {placed.flatMap((p) => p.js.map(({ j, y }) => { const bad = Object.values(j.verdicts).includes("fail");
          return (
            <a key={j.slug} href={`journey-${j.slug}.html`}>
              <rect x={colW[2]} y={y} width={220} height={36} rx={18} fill={bad ? "color-mix(in oklab, var(--danger) 18%, var(--surface))" : "var(--surface)"} stroke={bad ? "var(--danger)" : "var(--border)"} />
              <text x={colW[2]! + 14} y={y + 15} className="seq-op">{j.name}</text>
              <text x={colW[2]! + 14} y={y + 28} className="seq-thing">{bad ? `${j.steps.length} steps, fails in ${environments.filter((e) => j.verdicts[e.name] === "fail").map((e) => e.name).join(", ")}` : `${j.steps.length} steps, passes where proven`}</text>
            </a>); }))}
      </svg>
    </div>
  );
};

/** A row of dots, one per step, for the worst environment: a journey's shape at a glance in a table. */
export const Dots = ({ j }: { j: Journey }) => (
  <span className="dots" aria-label={`${j.steps.length} steps`}>{j.steps.map((_, i) => {
    const v: V = environments.map((e) => stepVerdict(j, e.name, i)).includes("fail") ? "fail" : "pass";
    return <i key={i} className={`k k--${v}`} />; })}</span>
);
