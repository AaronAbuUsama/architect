// <Graph>: one component for every graph in the portal. It takes a laid graph (positions from elk, made when the model
// is generated) and a lighting, and draws them with React Flow: our nodes, elk's routes, pan and pinch-zoom, and a
// hover that lights a node's neighbours. Read-only: nothing is dragged, connected or deleted.
import { ReactFlow, Controls, BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";
import { useMemo, useState } from "react";
import { nodeTypes, type FlowNode } from "./nodes.tsx";
import type { Laid, Lighting, Route } from "./types.ts";

type EdgeData = Route & { tone: string; badge: string | null; width: number } & Record<string, unknown>;
type FlowEdge = Edge<EdgeData>;

/** An orthogonal path through elk's bend points, with each corner rounded. */
const pathOf = (pts: { x: number; y: number }[], r = 6) => pts.reduce((d, p, i) => {
  if (i === 0) return `M${p.x},${p.y}`;
  const prev = pts[i - 1]!, next = pts[i + 1];
  if (!next) return `${d} L${p.x},${p.y}`;
  const k1 = Math.min(r, Math.hypot(p.x - prev.x, p.y - prev.y) / 2), k2 = Math.min(r, Math.hypot(next.x - p.x, next.y - p.y) / 2);
  const ux = Math.sign(p.x - prev.x), uy = Math.sign(p.y - prev.y), vx = Math.sign(next.x - p.x), vy = Math.sign(next.y - p.y);
  return `${d} L${p.x - ux * k1},${p.y - uy * k1} Q${p.x},${p.y} ${p.x + vx * k2},${p.y + vy * k2}`;
}, "");

const RoutedEdge = ({ id, data, markerEnd }: EdgeProps<FlowEdge>) => {
  const d = data!, at = d.labelAt, lines = [d.label, d.badge ?? d.note ?? (d.planned && `planned · ${d.planned}`)].filter(Boolean) as string[];
  const w = Math.max(...lines.map((l) => l.length * 6.6 + 18), 40), h = lines.length * 16 + 6;
  return (<>
    <BaseEdge id={id} path={pathOf(d.points)} markerEnd={markerEnd} className={`g-edge g-edge--${d.kind} ${d.tone}`} style={{ strokeWidth: d.width }} />
    {at && lines.length > 0 && (
      <foreignObject x={at.x - w / 2} y={at.y - h / 2} width={w} height={h} className="g-edge-label-box">
        <div className={`g-edge-label g-edge-label--${d.kind} ${d.tone}`}><span>{lines[0]}</span>{lines[1] && <small>{lines[1]}</small>}</div>
      </foreignObject>
    )}
  </>);
};
const edgeTypes = { routed: RoutedEdge };

/** What a lighting does to one edge: its tone, its stroke and the badge in place of its note. */
const lit = (e: Route, l: Lighting): Pick<EdgeData, "tone" | "badge" | "width"> => {
  if (l.mode === "live") {
    const n = l.counts[e.id];
    if (n === undefined) return { tone: "", badge: null, width: 1.5 };
    return { tone: n ? "is-live" : "is-idle", badge: `${n.toLocaleString("en-US")} in ${l.window.split("· ")[1]}`, width: n ? 1.5 + Math.log10(n + 1) * 1.6 : 1 };
  }
  if (l.mode === "trace") {
    const steps = l.path.filter((p) => p.edge === e.id);
    if (!steps.length) return { tone: "is-off", badge: null, width: 1.2 };
    const moved = steps.filter((s) => !s.refused).map((s) => s.step), refused = steps.filter((s) => s.refused);
    const codes = [...new Set(refused.map((s) => s.refused!))];
    const parts = [moved.length ? `moved at step ${moved.join(", ")}` : "", ...codes.map((c) => `${c} at ${refused.filter((s) => s.refused === c).map((s) => s.step).join(", ")}`)].filter(Boolean);
    return { tone: moved.length ? "is-path" : "is-refused", badge: parts.join(" · "), width: moved.length ? 2.6 : 1.8 };
  }
  return { tone: "", badge: null, width: 1.5 };
};

const toFlow = (g: Laid, l: Lighting, near: Set<string> | null) => {
  const nodes: FlowNode[] = g.nodes.map((n) => ({
    id: n.id, type: n.kind, position: { x: n.x, y: n.y }, data: n, width: n.w, height: n.h, parentId: n.parent,
    className: near && !near.has(n.id) && n.kind !== "group" ? "is-dim" : "", selectable: false, draggable: false,
    handles: [{ type: "target", position: "left" as never, x: 0, y: n.h / 2, width: 1, height: 1 }, { type: "source", position: "right" as never, x: n.w, y: n.h / 2, width: 1, height: 1 }],
  }));
  const edges: FlowEdge[] = g.edges.map((e) => {
    const t = lit(e, l), dim = near && !(near.has(e.from) && near.has(e.to));
    return { id: e.id, source: e.from, target: e.to, type: "routed", data: { ...e, ...t, tone: `${t.tone}${dim ? " is-dim" : ""}` }, markerEnd: { type: "arrowclosed" as never, width: 14, height: 14, markerUnits: "userSpaceOnUse" } };
  });
  return { nodes, edges };
};

export const Graph = ({ graph, lighting = { mode: "structure" }, height, width = 1100, controls = false, label }: { graph: Laid; lighting?: Lighting; height?: number; width?: number; controls?: boolean; label: string }) => {
  const [hover, setHover] = useState<string | null>(null);
  const near = useMemo(() => hover ? new Set([hover, ...graph.edges.flatMap((e) => e.from === hover ? [e.to] : e.to === hover ? [e.from] : [])]) : null, [hover, graph]);
  const { nodes, edges } = useMemo(() => toFlow(graph, lighting, near), [graph, lighting, near]);
  // The frame is as tall as the graph at the scale that fits its width, so a wide graph leaves no empty band.
  const h = height ?? Math.ceil(graph.height * Math.min(1, (width - 24) / graph.width)) + 20, server = typeof window === "undefined";
  return (
    <div className="g-frame" style={{ height: h }} role="img" aria-label={label}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes as never} edgeTypes={edgeTypes} colorMode="dark"
        {...(server ? { width, height: h } : {})} fitView fitViewOptions={{ padding: 0.04, maxZoom: 1 }} minZoom={0.3} maxZoom={controls ? 1.6 : 1}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} edgesFocusable={false}
        zoomOnScroll={false} preventScrolling={false} panOnDrag zoomOnPinch zoomOnDoubleClick={false}
        onNodeMouseEnter={(_, n) => n.type !== "group" && setHover(n.id)} onNodeMouseLeave={() => setHover(null)}
        onNodeClick={(_, n) => { const href = (n.data as { href?: string }).href; if (href) location.href = href; }}>
        {controls && <Controls showInteractive={false} position="bottom-right" />}
      </ReactFlow>
    </div>
  );
};
