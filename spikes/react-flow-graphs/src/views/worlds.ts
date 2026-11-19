// Worlds and journeys: the `from` chain of starting worlds, rooted at the empty world, with each journey hung from the
// world it starts on. From `Model.startingWorlds` and `Model.journeys`. A journey's own steps stay a sequence diagram.
import { journeys, worlds } from "../../../portal-site/src/journeys.ts";
import type { GEdge, GNode, GraphSpec } from "../graph/types.ts";

const EMPTY = "world:empty";

export const worldsGraph = (): GraphSpec => {
  const nodes: GNode[] = [
    { id: EMPTY, kind: "start", label: "empty world", data: { world: true } },
    ...worlds.map((w): GNode => ({ id: `world:${w.slug}`, kind: "world", label: w.slug, sub: w.file, href: `world-${w.slug}.html`, data: { gives: w.gives, makes: w.makes.length } })),
    ...journeys.map((j): GNode => ({ id: `journey:${j.slug}`, kind: "journey", label: j.name, sub: j.file, href: `journey-${j.slug}.html`, data: { verdicts: j.verdicts, steps: j.steps.length } })),
  ];
  const edges: GEdge[] = [
    ...worlds.map((w): GEdge => ({ id: `from:${w.slug}`, kind: "from", from: w.from ? `world:${w.from}` : EMPTY, to: `world:${w.slug}`, label: `${w.makes.length} call${w.makes.length === 1 ? "" : "s"}` })),
    ...journeys.map((j): GEdge => ({ id: `starts:${j.slug}`, kind: "starts", from: j.starts ? `world:${j.starts}` : EMPTY, to: `journey:${j.slug}`, label: "starts" })),
  ];
  return { id: "worlds", direction: "RIGHT", nodes, edges };
};
