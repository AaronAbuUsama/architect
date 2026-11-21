// The judge of check 37's browser half: reads a served portal's pages in headless Chromium (as checks 21 and 28 do) and says what is wrong with the graphs
// it draws. The hooks a builder owes (`data-portal="<part>"`, data in `data-*`, only what a person can see counts):
//   graph       data-graph "map" | "worlds" | "machine:<thing>", data-mode "structure" | "live" | "trace", data-width, data-height (the laid graph's own size)
//   graph-node  data-node (the laid node's id), data-kind, data-parent ("" at the root), data-x, data-y, data-w, data-h (the laid numbers, as the data has them);
//               the node's own text carries its label, and a state's text carries nothing else (no count, ever)
//   graph-edge  data-edge (the laid edge's id), data-kind, data-from, data-to (node ids), data-lit "true"|"false", data-count (a number on a live move, else ""),
//               a move edge sits inside the `move` check 21 reads (`data-portal="move"`, data-move the move's key, data-lit and data-count the edge's own), so the strip's hooks stay
//               data-moved ("8,10": the trace's steps the move was made at, else ""), data-refused ("10:link.notFrom": step and refusal, else "")
// Routes and lighting: `/portal/map`, `/portal/worlds`, and `/portal/things/<thing>` whose `lifecycle` holds the thing's machine graph (so checks 21 and 28
// keep reading `lifecycle`); `?lighting=structure|live|trace` picks the lighting (default: live when the portal has `live`, else structure) and
// `&journey=<journey file name, no folder or .ts>` names the trace's journey.
import type { Laid } from "./graph-expect.ts";
import type { ServedPortal } from "../served-portal/types.ts";

const SCAN = `(() => {
  const vis = (e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }) && !e.closest('[hidden],[aria-hidden="true"]');
  const q = (s, from = document) => [...from.querySelectorAll(s)].filter(vis);
  const a = (e, n) => e.getAttribute(n);
  const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; };
  const graph = (g) => ({
    graph: a(g, "data-graph"), mode: a(g, "data-mode"), width: a(g, "data-width"), height: a(g, "data-height"),
    defaultBoxes: g.querySelectorAll('[class*="react-flow__node-default"],[class*="react-flow__node-input"],[class*="react-flow__node-output"]').length,
    nodes: q('[data-portal="graph-node"]', g).map((e) => ({ node: a(e, "data-node"), kind: a(e, "data-kind"), parent: a(e, "data-parent"), x: a(e, "data-x"), y: a(e, "data-y"), w: a(e, "data-w"), h: a(e, "data-h"), count: a(e, "data-count"), text: e.innerText.trim(), rect: r(e) })),
    edges: q('[data-portal="graph-edge"]', g).map((e) => ({ edge: a(e, "data-edge"), kind: a(e, "data-kind"), from: a(e, "data-from"), to: a(e, "data-to"), lit: a(e, "data-lit"), count: a(e, "data-count"), moved: a(e, "data-moved"), refused: a(e, "data-refused"), move: (() => { const w = e.closest('[data-portal="move"]'); return w === null ? null : { move: a(w, "data-move"), lit: a(w, "data-lit"), count: a(w, "data-count") }; })() })),
  });
  return {
    graphs: q('[data-portal="graph"]').map((g) => ({ ...graph(g), inLifecycle: g.closest('[data-portal="lifecycle"]') !== null })),
    lifecycles: q('[data-portal="lifecycle"]').length,
    status: a(document.querySelector('[data-portal="page"]') ?? document.body, "data-status"),
  };
})()`;

export interface SeenNode { node: string | null; kind: string | null; parent: string | null; x: string | null; y: string | null; w: string | null; h: string | null; count: string | null; text: string; rect: { l: number; t: number; w: number; h: number } }
export interface SeenEdge { edge: string | null; kind: string | null; from: string | null; to: string | null; lit: string | null; count: string | null; moved: string | null; refused: string | null; move: { move: string | null; lit: string | null; count: string | null } | null }
export interface SeenGraph { graph: string | null; mode: string | null; width: string | null; height: string | null; defaultBoxes: number; nodes: Array<SeenNode>; edges: Array<SeenEdge>; inLifecycle: boolean }
export interface Seen { graphs: Array<SeenGraph>; lifecycles: number; status: string | null }

export const scan = (portal: ServedPortal, route: string) => portal.evaluate<Seen>(route, SCAN);

const abs = (n: { x: number; y: number; parent?: string; id: string }, by: Map<string, { x: number; y: number; parent?: string; id: string }>) => {
  let x = n.x, y = n.y;
  for (let p = n.parent === undefined ? undefined : by.get(n.parent), g = 0; p !== undefined && g < 50; p = p.parent === undefined ? undefined : by.get(p.parent), g++) { x += p.x; y += p.y; }
  return { x, y };
};

/**
 * The page's graph against the laid graph the portal was given: drawn once, every node and edge of it and nothing else, each with the laid numbers
 * and ids, no default React Flow box, and on the screen where the data puts it (one scale for the whole graph, every node at its offset times that scale:
 * a client that laid the graph out itself, or moved a node, is told).
 */
export const drawnProblems = (what: string, seen: SeenGraph | undefined, laid: Laid | undefined): ReadonlyArray<string> => {
  if (seen === undefined) return [`${what}: the page draws no \`graph\` for it`];
  if (laid === undefined) return [`${what}: the portal's data has no such graph to draw`];
  const out: Array<string> = [];
  if (seen.defaultBoxes > 0) out.push(`${what}: ${String(seen.defaultBoxes)} nodes are React Flow's default boxes, not our components`);
  if (seen.width !== String(laid.width) || seen.height !== String(laid.height)) out.push(`${what}: the graph says ${String(seen.width)} by ${String(seen.height)}, the data ${String(laid.width)} by ${String(laid.height)}`);
  const have = new Map<string, Array<SeenNode>>();
  for (const n of seen.nodes) have.set(n.node ?? "", [...(have.get(n.node ?? "") ?? []), n]);
  for (const n of laid.nodes) {
    const drawn = have.get(n.id) ?? [];
    if (drawn.length !== 1) { out.push(`${what}: node "${n.id}" is drawn ${String(drawn.length)} times`); continue; }
    const d = drawn[0]!;
    if (d.kind !== n.kind || (d.parent ?? "") !== (n.parent ?? "")) out.push(`${what}: node "${n.id}" is drawn as ${String(d.kind)} in "${String(d.parent)}", the data says ${n.kind} in "${n.parent ?? ""}"`);
    if ([d.x, d.y, d.w, d.h].join() !== [n.x, n.y, n.w, n.h].map(String).join()) out.push(`${what}: node "${n.id}" carries ${[d.x, d.y, d.w, d.h].join(",")}, the data has ${[n.x, n.y, n.w, n.h].join(",")}`);
    if (!d.text.includes(n.label)) out.push(`${what}: node "${n.id}" does not say "${n.label}"`);
    if (n.kind === "state" && d.text.replace(n.label, "").trim() !== "") out.push(`${what}: state "${n.label}" shows "${d.text.replace(n.label, "").trim()}" besides its name: a state shows no count`);
    if (n.kind === "state" && d.count !== null && d.count !== "") out.push(`${what}: state "${n.label}" carries a count (${d.count})`);
  }
  for (const id of have.keys()) if (!laid.nodes.some((n) => n.id === id)) out.push(`${what}: the page draws node "${id}", the data has none`);
  const eh = new Map<string, Array<SeenEdge>>();
  for (const e of seen.edges) eh.set(e.edge ?? "", [...(eh.get(e.edge ?? "") ?? []), e]);
  for (const e of laid.edges) {
    const drawn = eh.get(e.id) ?? [];
    if (drawn.length !== 1) { out.push(`${what}: edge "${e.id}" is drawn ${String(drawn.length)} times`); continue; }
    const d = drawn[0]!;
    if (e.kind === "move" && (d.move === null || d.move.move !== e.label || d.move.lit !== d.lit || (d.move.count ?? "") !== (d.count ?? ""))) out.push(`${what}: edge "${e.id}" is not inside the \`move\` of its label "${e.label ?? ""}" (data-move, data-lit, data-count as the edge's own): check 21 reads the arrows there`);
    if (d.kind !== e.kind || d.from !== e.from || d.to !== e.to) out.push(`${what}: edge "${e.id}" is drawn ${String(d.kind)} ${String(d.from)} to ${String(d.to)}, the data says ${e.kind} ${e.from} to ${e.to}`);
  }
  for (const id of eh.keys()) if (!laid.edges.some((e) => e.id === id)) out.push(`${what}: the page draws edge "${id}", the data has none`);
  // Where they sit: one scale, every node at its laid offset from the first, to a pixel and a half.
  const by = new Map(laid.nodes.map((n) => [n.id, n]));
  const drawnNodes = laid.nodes.flatMap((n) => { const d = have.get(n.id)?.[0]; return d === undefined || have.get(n.id)!.length !== 1 ? [] : [{ n, d, at: abs(n, by) }]; });
  const first = drawnNodes[0];
  if (first !== undefined && first.d.rect.w > 0 && first.n.w > 0) {
    const s = first.d.rect.w / first.n.w;
    for (const { n, d, at } of drawnNodes) {
      const ds = d.rect.w / n.w;
      if (Math.abs(ds - s) > 0.01 * s) out.push(`${what}: node "${n.id}" is drawn at ${ds.toFixed(3)} of its size and the first at ${s.toFixed(3)}: the graph is not one picture`);
      const dx = d.rect.l - first.d.rect.l - (at.x - first.at.x) * s, dy = d.rect.t - first.d.rect.t - (at.y - first.at.y) * s;
      if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) out.push(`${what}: node "${n.id}" is on the screen ${dx.toFixed(1)} by ${dy.toFixed(1)} px away from where the data puts it`);
    }
  }
  return out;
};
