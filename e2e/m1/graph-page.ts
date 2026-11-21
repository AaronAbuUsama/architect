// The judge of check 40's browser half: reads a served portal's pages in headless Chromium (as checks 21 and 28 do) and says what is wrong with the graphs
// it draws. The hooks a builder owes (`data-portal="<part>"`, data in `data-*`, only what a person can see counts: not hidden, not near-transparent):
//   graph       data-graph "map" | "worlds" | "machine:<thing>", data-mode "structure" | "live" | "trace", data-width, data-height (the laid graph's own size)
//   graph-node  data-node (the laid node's id), data-kind, data-parent ("" at the root), data-x, data-y, data-w, data-h (the laid numbers, as the data has them);
//               the node's own text carries its label; a state shows nothing but its name (no count in its text, no `::before`/`::after` content, no
//               data-count, data-lit, data-moved or data-refused: lighting is on edges, never on a state), and no number shows in a machine's graph outside a move
//   graph-edge  data-edge (the laid edge's id), data-kind, data-from, data-to (node ids), data-lit "true"|"false", data-count (a number on a live move, else ""),
//               data-moved ("8,10": the trace's steps the move was made at, else ""), data-refused ("10:link.notFrom": step and refusal, else ""); its text carries its
//               label (a move's key). A move edge sits inside the `move` check 21 reads (`data-portal="move"`, data-move the move's key, data-lit and data-count the
//               edge's own), so the strip's hooks stay
// Routes and lighting: `/portal/map`, `/portal/worlds`, and `/portal/things/<thing>` whose `lifecycle` holds the thing's machine graph (so checks 21 and 28
// keep reading `lifecycle`); `?lighting=structure|live|trace` picks the lighting (default: live when the portal has `live`, else structure) and
// `&journey=<journey file name, no folder or .ts>` names the trace's journey. The map and the worlds are always structure.
import type { Laid } from "./graph-expect.ts";
import type { ServedPortal } from "../served-portal/types.ts";

const SCAN = `(() => {
  const vis = (e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }) && !e.closest('[hidden],[aria-hidden="true"]');
  const q = (s, from = document) => [...from.querySelectorAll(s)].filter(vis);
  const a = (e, n) => e.getAttribute(n);
  const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; };
  const opacity = (e) => { let o = 1; for (let x = e; x && x !== document.documentElement; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return o; };
  const content = (e) => [getComputedStyle(e, "::before").content, getComputedStyle(e, "::after").content].filter((c) => c !== "none" && c !== "normal" && c !== '""');
  const graph = (g) => ({
    graph: a(g, "data-graph"), mode: a(g, "data-mode"), width: a(g, "data-width"), height: a(g, "data-height"), rect: r(g),
    defaultBoxes: g.querySelectorAll('[class*="react-flow__node-default"],[class*="react-flow__node-input"],[class*="react-flow__node-output"]').length,
    nodes: q('[data-portal="graph-node"]', g).map((e) => ({ node: a(e, "data-node"), kind: a(e, "data-kind"), parent: a(e, "data-parent"), x: a(e, "data-x"), y: a(e, "data-y"), w: a(e, "data-w"), h: a(e, "data-h"), count: a(e, "data-count"), lit: a(e, "data-lit"), moved: a(e, "data-moved"), refused: a(e, "data-refused"), pseudo: content(e), opacity: opacity(e), text: e.innerText.trim(), rect: r(e) })),
    edges: q('[data-portal="graph-edge"]', g).map((e) => ({ edge: a(e, "data-edge"), kind: a(e, "data-kind"), from: a(e, "data-from"), to: a(e, "data-to"), lit: a(e, "data-lit"), count: a(e, "data-count"), moved: a(e, "data-moved"), refused: a(e, "data-refused"), text: e.innerText.trim(), opacity: opacity(e), move: (() => { const w = e.closest('[data-portal="move"]'); return w === null ? null : { move: a(w, "data-move"), lit: a(w, "data-lit"), count: a(w, "data-count") }; })() })),
    numbers: q("*", g).filter((e) => e.children.length === 0 && /^[0-9]+$/.test(e.innerText.trim()) && !e.closest('[data-portal="graph-edge"],[data-portal="move"]')).map((e) => e.innerText.trim()),
  });
  return {
    graphs: q('[data-portal="graph"]').map((g) => ({ ...graph(g), inLifecycle: g.closest('[data-portal="lifecycle"]') !== null })),
    lifecycles: q('[data-portal="lifecycle"]').length,
    status: a(document.querySelector('[data-portal="page"]') ?? document.body, "data-status"),
  };
})()`;

interface Rect { l: number; t: number; w: number; h: number }
export interface SeenNode { node: string | null; kind: string | null; parent: string | null; x: string | null; y: string | null; w: string | null; h: string | null; count: string | null; lit: string | null; moved: string | null; refused: string | null; pseudo: Array<string>; opacity: number; text: string; rect: Rect }
export interface SeenEdge { edge: string | null; kind: string | null; from: string | null; to: string | null; lit: string | null; count: string | null; moved: string | null; refused: string | null; text: string; opacity: number; move: { move: string | null; lit: string | null; count: string | null } | null }
export interface SeenGraph { graph: string | null; mode: string | null; width: string | null; height: string | null; rect: Rect; defaultBoxes: number; nodes: Array<SeenNode>; edges: Array<SeenEdge>; numbers: Array<string>; inLifecycle: boolean }
export interface Seen { graphs: Array<SeenGraph>; lifecycles: number; status: string | null }

export const scan = (portal: ServedPortal, route: string) => portal.evaluate<Seen>(route, SCAN);

const abs = (n: { x: number; y: number; parent?: string; id: string }, by: Map<string, { x: number; y: number; parent?: string; id: string }>) => {
  let x = n.x, y = n.y;
  for (let p = n.parent === undefined ? undefined : by.get(n.parent), g = 0; p !== undefined && g < 50; p = p.parent === undefined ? undefined : by.get(p.parent), g++) { x += p.x; y += p.y; }
  return { x, y };
};
const MIN_SCALE = 0.3, MIN_OPACITY = 0.5;
const meets = (a: Rect, b: Rect) => a.l < b.l + b.w && b.l < a.l + a.w && a.t < b.t + b.h && b.t < a.t + a.h;

/** What a state must not show, in any lighting: a count, a lit mark, a trace mark, generated content. */
const stateProblems = (what: string, label: string, d: SeenNode): ReadonlyArray<string> => [
  ...(d.text.replace(label, "").trim() === "" ? [] : [`${what}: state "${label}" shows "${d.text.replace(label, "").trim()}" besides its name: a state shows no count`]),
  ...(d.count === null || d.count === "" ? [] : [`${what}: state "${label}" carries a count (${d.count})`]),
  ...(d.lit === null || d.lit === "false" ? [] : [`${what}: state "${label}" is lit (data-lit ${d.lit}): lighting is on moves`]),
  ...((d.moved ?? "") === "" && (d.refused ?? "") === "" ? [] : [`${what}: state "${label}" carries a trace mark: lighting is on moves`]),
  ...(d.pseudo.length === 0 ? [] : [`${what}: state "${label}" has generated content (${d.pseudo.join(" ")}) besides its name`]),
];

/**
 * The page's graph against the laid graph the portal was given: drawn once, every node and edge of it and nothing else, each with the laid numbers
 * and ids, no default React Flow box, nothing faded or clipped away, and on the screen where the data puts it (one scale for the whole graph, every node at its
 * laid offset times that scale: a client that laid the graph out itself, or moved a node, is told).
 */
export const drawnProblems = (what: string, seen: SeenGraph | undefined, laid: Laid | undefined): ReadonlyArray<string> => {
  if (seen === undefined) return [`${what}: the page draws no \`graph\` for it`];
  if (laid === undefined) return [`${what}: the portal's data has no such graph to draw`];
  const out: Array<string> = [];
  if (seen.defaultBoxes > 0) out.push(`${what}: ${String(seen.defaultBoxes)} nodes are React Flow's default boxes, not our components`);
  if (seen.width !== String(laid.width) || seen.height !== String(laid.height)) out.push(`${what}: the graph says ${String(seen.width)} by ${String(seen.height)}, the data ${String(laid.width)} by ${String(laid.height)}`);
  if (seen.rect.w <= 0 || seen.rect.h <= 0) out.push(`${what}: the graph has no size on the screen`);
  const have = new Map<string, Array<SeenNode>>();
  for (const n of seen.nodes) have.set(n.node ?? "", [...(have.get(n.node ?? "") ?? []), n]);
  for (const n of laid.nodes) {
    const drawn = have.get(n.id) ?? [];
    if (drawn.length !== 1) { out.push(`${what}: node "${n.id}" is drawn ${String(drawn.length)} times`); continue; }
    const d = drawn[0]!;
    if (d.kind !== n.kind || (d.parent ?? "") !== (n.parent ?? "")) out.push(`${what}: node "${n.id}" is drawn as ${String(d.kind)} in "${String(d.parent)}", the data says ${n.kind} in "${n.parent ?? ""}"`);
    if ([d.x, d.y, d.w, d.h].join() !== [n.x, n.y, n.w, n.h].map(String).join()) out.push(`${what}: node "${n.id}" carries ${[d.x, d.y, d.w, d.h].join(",")}, the data has ${[n.x, n.y, n.w, n.h].join(",")}`);
    if (!d.text.includes(n.label)) out.push(`${what}: node "${n.id}" does not say "${n.label}"`);
    if (d.rect.w <= 0 || d.rect.h <= 0) out.push(`${what}: node "${n.id}" has no size on the screen`);
    if (d.opacity < MIN_OPACITY) out.push(`${what}: node "${n.id}" is faded to ${d.opacity.toFixed(2)}`);
    else if (d.rect.w > 0 && d.rect.h > 0 && !meets(d.rect, seen.rect)) out.push(`${what}: node "${n.id}" is outside the graph's own box on the screen`);
    if (n.kind === "state") out.push(...stateProblems(what, n.label, d));
  }
  for (const id of have.keys()) if (!laid.nodes.some((n) => n.id === id)) out.push(`${what}: the page draws node "${id}", the data has none`);
  if (seen.graph?.startsWith("machine:") === true && seen.numbers.length > 0) out.push(`${what}: ${seen.numbers.length} numbers (${seen.numbers.join(", ")}) show in the graph outside a move: counts are on moves only`);
  const eh = new Map<string, Array<SeenEdge>>();
  for (const e of seen.edges) eh.set(e.edge ?? "", [...(eh.get(e.edge ?? "") ?? []), e]);
  for (const e of laid.edges) {
    const drawn = eh.get(e.id) ?? [];
    if (drawn.length !== 1) { out.push(`${what}: edge "${e.id}" is drawn ${String(drawn.length)} times`); continue; }
    const d = drawn[0]!;
    if (e.kind === "move" && (d.move === null || d.move.move !== e.label || d.move.lit !== d.lit || (d.move.count ?? "") !== (d.count ?? ""))) out.push(`${what}: edge "${e.id}" is not inside the \`move\` of its label "${e.label ?? ""}" (data-move, data-lit, data-count as the edge's own): check 21 reads the arrows there`);
    if (d.kind !== e.kind || d.from !== e.from || d.to !== e.to) out.push(`${what}: edge "${e.id}" is drawn ${String(d.kind)} ${String(d.from)} to ${String(d.to)}, the data says ${e.kind} ${e.from} to ${e.to}`);
    if (e.label !== undefined && !d.text.includes(e.label)) out.push(`${what}: edge "${e.id}" does not say its label "${e.label}"`);
    if (d.opacity < MIN_OPACITY) out.push(`${what}: edge "${e.id}" is faded to ${d.opacity.toFixed(2)}`);
  }
  for (const id of eh.keys()) if (!laid.edges.some((e) => e.id === id)) out.push(`${what}: the page draws edge "${id}", the data has none`);
  // Where they sit: one scale, every node at its laid offset from the first, to a pixel and a half.
  const by = new Map(laid.nodes.map((n) => [n.id, n]));
  const drawnNodes = laid.nodes.flatMap((n) => { const d = have.get(n.id)?.[0]; return d === undefined || have.get(n.id)!.length !== 1 || d.rect.w <= 0 || d.rect.h <= 0 || n.w <= 0 || n.h <= 0 ? [] : [{ n, d, at: abs(n, by) }]; });
  const first = drawnNodes[0];
  if (first !== undefined) {
    const s = first.d.rect.w / first.n.w;
    if (s < MIN_SCALE) out.push(`${what}: the graph is drawn at ${s.toFixed(3)} of its size: under ${String(MIN_SCALE)} nobody can read it`);
    for (const { n, d, at } of drawnNodes) {
      const ds = d.rect.w / n.w, dh = d.rect.h / n.h;
      if (Math.abs(ds - s) > 0.01 * s || Math.abs(dh - s) > 0.01 * s) out.push(`${what}: node "${n.id}" is drawn at ${ds.toFixed(3)} by ${dh.toFixed(3)} of its size and the first at ${s.toFixed(3)}: the graph is not one picture`);
      const dx = d.rect.l - first.d.rect.l - (at.x - first.at.x) * s, dy = d.rect.t - first.d.rect.t - (at.y - first.at.y) * s;
      if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) out.push(`${what}: node "${n.id}" is on the screen ${dx.toFixed(1)} by ${dy.toFixed(1)} px away from where the data puts it`);
    }
  }
  return out;
};
