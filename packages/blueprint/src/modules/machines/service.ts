import type { Machine, MachinesApi, Move, MoveSpec } from "./types.ts";
import { checkMoves } from "./internal/check.ts";

export const Machines: MachinesApi = {
  machine: (thing, spec) => {
    checkMoves(spec.states, spec.moves as Record<string, MoveSpec<string>>);
    const moves: Record<string, Move> = {};
    const machine = { kind: "machine", thing, states: spec.states, moves, notFrom: undefined } as unknown as Machine;
    for (const [key, m] of Object.entries(spec.moves as Record<string, MoveSpec<string>>)) {
      moves[key] = Object.freeze({
        kind: "move", machine, key, from: m.from, to: typeof m.to === "string" ? [m.to] : m.to, emits: m.emits,
      });
    }
    (machine as { notFrom: unknown }).notFrom = Object.freeze({ kind: "not-from", machine, exit: spec.notFrom.exit });
    return Object.freeze(machine) as never;
  },
};
