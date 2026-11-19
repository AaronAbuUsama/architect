// Every graph the Graphs page draws, laid out once. In the product this runs in the generator beside the model.
import { journeys } from "../../../portal-site/src/journeys.ts";
import { layout } from "../graph/layout.ts";
import type { Laid, Lighting } from "../graph/types.ts";
import { blueprintMap } from "./blueprint-map.ts";
import { liveLighting, machineGraph, machineThings, traceFor, traceLighting } from "./machine.ts";
import { chainSketch, workflowSketch } from "./sketches.ts";
import { worldsGraph } from "./worlds.ts";

export type Machine = { thing: string; graph: Laid; lightings: Lighting[]; start: number };
export type AllGraphs = { map: Laid; machines: Machine[]; worlds: Laid; workflow: Laid; chain: Laid; journeyCount: number };

export const allGraphs = async (): Promise<AllGraphs> => ({
  map: await layout(blueprintMap()),
  machines: await Promise.all(machineThings().map(async (t, i) => ({
    thing: t, graph: await layout(machineGraph(t)), start: i === 0 ? 1 : 2,
    lightings: [{ mode: "structure" } as Lighting, liveLighting(t), traceLighting(t, traceFor(t))],
  }))),
  worlds: await layout(worldsGraph()),
  workflow: await layout(workflowSketch()),
  chain: await layout(chainSketch()),
  journeyCount: journeys.length,
});
