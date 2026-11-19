// bun src/ssr-check.tsx: does <Graph> render on the server (the static fallback before the island mounts)?
import { renderToStaticMarkup } from "react-dom/server";
import { Graph } from "./graph/graph.tsx";
import { layout } from "./graph/layout.ts";
import { machineGraph, liveLighting } from "./views/machine.ts";
import { blueprintMap } from "./views/blueprint-map.ts";

const m = await layout(machineGraph("handle"));
const html = renderToStaticMarkup(<Graph graph={m} lighting={liveLighting("handle")} label="handle" />);
console.log(html.length, "chars;", (html.match(/react-flow__node /g) ?? []).length, "nodes;", (html.match(/react-flow__edge /g) ?? []).length, "edges;", /g-edge-label/.test(html) ? "labels" : "no labels");
const b = await layout(blueprintMap());
const h2 = renderToStaticMarkup(<Graph graph={b} label="map" />);
console.log("map:", (h2.match(/react-flow__node /g) ?? []).length, "nodes;", (h2.match(/react-flow__edge /g) ?? []).length, "edges");
process.exit(0);
