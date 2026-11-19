// Places a GraphSpec with elk's layered algorithm. Runs once, where the model is generated (generators never run in
// production), so elk never reaches the browser and two runs give the same picture.
import ELK, { type ElkExtendedEdge, type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { GEdge, GNode, GraphSpec, Laid, NodeKind, Placed, Route } from "./types.ts";

/** Every node of a kind has one size, so the layout depends only on the model. */
export const sizeOf: Record<NodeKind, [number, number]> = {
  thing: [248, 112], group: [0, 0], event: [164, 32], start: [20, 20], state: [128, 42], world: [250, 80],
  journey: [350, 92], activity: [196, 56], wait: [196, 48], op: [196, 56],
};
const startWorld: [number, number] = [132, 40];
const textWidth = (s: string, px = 6.4) => Math.ceil(s.length * px) + 16;

const elkNode = (n: GNode): ElkNode => {
  const [w, h] = n.kind === "start" && n.data?.world ? startWorld : sizeOf[n.kind];
  return n.kind === "group"
    ? { id: n.id, children: [], layoutOptions: { "elk.padding": "[top=44,left=20,bottom=20,right=20]" } }
    : { id: n.id, width: w, height: h };
};

const elkEdge = (e: GEdge): ElkExtendedEdge => {
  const lines = [e.label, e.note ?? e.planned].filter(Boolean) as string[];
  const w = Math.max(0, ...lines.map((l) => textWidth(l)));
  return { id: e.id, sources: [e.from], targets: [e.to], labels: lines.length ? [{ id: `${e.id}:label`, text: lines.join("\n"), width: w, height: 16 * lines.length + 6 }] : [] };
};

const options = (direction: GraphSpec["direction"]) => ({
  "elk.algorithm": "layered",
  "elk.direction": direction,
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.json.edgeCoords": "ROOT",
  "elk.layered.spacing.nodeNodeBetweenLayers": "56",
  "elk.spacing.nodeNode": "36",
  "elk.spacing.edgeLabel": "6",
  "elk.layered.spacing.edgeNodeBetweenLayers": "24",
  "elk.edgeLabels.placement": "CENTER",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.padding": "[top=16,left=16,bottom=16,right=16]",
});

/** Builds elk's tree: groups hold their children; every edge sits at the root and elk routes it across groups. */
const tree = (spec: GraphSpec): ElkNode => {
  const byId = new Map(spec.nodes.map((n) => [n.id, elkNode(n)]));
  const root: ElkNode = { id: spec.id, layoutOptions: options(spec.direction), children: [], edges: spec.edges.map(elkEdge) };
  for (const n of spec.nodes) (n.parent ? byId.get(n.parent)!.children! : root.children!).push(byId.get(n.id)!);
  return root;
};

const flatten = (spec: GraphSpec, root: ElkNode): Placed[] => {
  const placed = new Map<string, { x: number; y: number; w: number; h: number }>();
  const walk = (n: ElkNode) => { for (const c of n.children ?? []) { placed.set(c.id, { x: c.x ?? 0, y: c.y ?? 0, w: c.width ?? 0, h: c.height ?? 0 }); walk(c); } };
  walk(root);
  // React Flow wants a parent before its children.
  const depth = (n: GNode): number => (n.parent ? 1 + depth(spec.nodes.find((p) => p.id === n.parent)!) : 0);
  return [...spec.nodes].sort((a, b) => depth(a) - depth(b)).map((n) => ({ ...n, ...placed.get(n.id)! }));
};

const routes = (spec: GraphSpec, root: ElkNode): Route[] => {
  const out = new Map((root.edges ?? []).map((e) => [e.id, e as ElkExtendedEdge]));
  return spec.edges.map((e) => {
    const r = out.get(e.id)!, s = r.sections?.[0];
    const points = s ? [s.startPoint, ...(s.bendPoints ?? []), s.endPoint] : [];
    const l = r.labels?.[0];
    return { ...e, points, labelAt: l ? { x: (l.x ?? 0) + (l.width ?? 0) / 2, y: (l.y ?? 0) + (l.height ?? 0) / 2 } : null };
  });
};

export const layout = async (spec: GraphSpec): Promise<Laid> => {
  const root = await new ELK().layout(tree(spec));
  return { id: spec.id, width: Math.ceil(root.width ?? 0), height: Math.ceil(root.height ?? 0), nodes: flatten(spec, root), edges: routes(spec, root) };
};
