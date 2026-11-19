// A thing's machine: its states as nodes and its moves as edges, from `Thing.machine`. The lighting is separate, so
// live numbers and a trace never move a node: counts go on edges (moves answered in the window), never on states.
import { journeys, type Journey } from "../../../portal-site/src/journeys.ts";
import { moveCounts } from "../../../portal-site/src/live.ts";
import { model } from "../../../portal-site/src/model.ts";
import type { GEdge, GNode, GraphSpec, Lighting } from "../graph/types.ts";

const START = "·";
const moveEdge = (thing: string, key: string, from: string) => `${thing}:${key}:${from}`;

export const machineGraph = (thing: string): GraphSpec => {
  const m = model.things[thing]!.machine!;
  const nodes: GNode[] = [
    { id: `${thing}:${START}`, kind: "start", label: "created" },
    ...m.states.map((s): GNode => ({ id: `${thing}:${s}`, kind: "state", label: s, data: { end: !Object.values(m.moves).some((mv) => mv.from.includes(s)) } })),
  ];
  const edges = Object.entries(m.moves).flatMap(([k, mv]) => (mv.from.length ? mv.from : [START]).flatMap((f) => mv.to.map((t): GEdge => ({
    id: moveEdge(thing, k, f), kind: "move", from: `${thing}:${f}`, to: `${thing}:${t}`, label: k, note: `emits ${mv.emits}`,
  }))));
  return { id: `machine-${thing}`, direction: "RIGHT", nodes, edges };
};

/** Live: each move's edge carries the moves answered in the window (`ortho.calls` with `move.name`, M1.20). */
export const liveLighting = (thing: string): Lighting => {
  const m = model.things[thing]!.machine!, counts: Record<string, number> = {};
  for (const [k, mv] of Object.entries(m.moves)) for (const f of mv.from.length ? mv.from : [START]) counts[moveEdge(thing, k, f)] = moveCounts[`${thing}.${k}`] ?? 0;
  return { mode: "live", window: "local · last 30 min", counts };
};

/**
 * A trace: one journey's run, step by step, on this thing's machine, read from each step's checks. A step that
 * `emits` an event made its move; one that `refuses` tried it and was turned back; an answer with no event (a
 * replayed request) made no move. Steps on other things are skipped.
 */
export const traceLighting = (thing: string, j: Journey): Lighting => {
  const m = model.things[thing]!.machine!;
  const path = j.steps.flatMap((s, i) => {
    const op = model.operations[s.op]!;
    if (op.thing !== thing || !op.move) return [];
    const mv = m.moves[op.move.key]!, refused = s.checks.find((c) => c.startsWith("refuses"))?.split(" ")[1];
    if (!refused && !s.checks.some((c) => c.startsWith("emits"))) return [];
    return [{ edge: moveEdge(thing, op.move.key, mv.from[0] ?? START), step: i + 1, refused }];
  });
  return { mode: "trace", name: j.name, path };
};

export const machineThings = () => Object.values(model.things).filter((t) => t.machine).map((t) => t.name);
/** The journey that moves this thing most: the trace the page opens on. */
export const traceFor = (thing: string) => [...journeys].sort((a, b) => moves(b, thing) - moves(a, thing))[0]!;
const moves = (j: Journey, thing: string) => j.steps.filter((s) => model.operations[s.op]!.thing === thing && model.operations[s.op]!.move).length;
