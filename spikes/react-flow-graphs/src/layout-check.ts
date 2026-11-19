// bun src/layout-check.ts: lays out every view and prints sizes, so a layout change shows up as text.
import { layout } from "./graph/layout.ts";
import { blueprintMap } from "./views/blueprint-map.ts";
import { machineGraph, machineThings } from "./views/machine.ts";
import { chainSketch, workflowSketch } from "./views/sketches.ts";
import { worldsGraph } from "./views/worlds.ts";

for (const spec of [blueprintMap(), ...machineThings().map(machineGraph), worldsGraph(), workflowSketch(), chainSketch()]) {
  const l = await layout(spec);
  console.log(l.id, `${l.width}×${l.height}`, `${l.nodes.length} nodes`, `${l.edges.length} edges`, l.edges.filter((e) => !e.points.length).map((e) => e.id).join(" ") || "all routed");
  if (spec.id === "blueprint-map") console.log(JSON.stringify(l.edges.slice(0, 2).map((e) => [e.id, e.points, e.labelAt])), JSON.stringify(l.nodes.slice(0, 4).map((n) => [n.id, n.x, n.y, n.w, n.h])));
}
process.exit(0); // elk keeps a worker alive
