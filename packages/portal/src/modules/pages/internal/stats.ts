// What a page counts: a scope's calls, from the window's `ortho.calls`. No window, no numbers (never a made-up zero a reader might trust).
import type { CallStat, WindowView } from "#modules/window/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";

export const none: CallStat = { calls: 0, answered: 0, refused: 0, defects: 0 };

const total = (stats: ReadonlyArray<CallStat>): CallStat =>
  stats.reduce((sum, s) => ({ calls: sum.calls + s.calls, answered: sum.answered + s.answered, refused: sum.refused + s.refused, defects: sum.defects + s.defects }), none);

export const operationsOf = (blueprint: BlueprintWire, thing: string): ReadonlyArray<string> =>
  Object.values(blueprint.model.operations).filter((o) => o.thing === thing).map((o) => o.name);

export const statOf = (view: WindowView | undefined, operations: ReadonlyArray<string>): CallStat =>
  view === undefined ? none : total(operations.map((o) => view.byOperation[o] ?? none));

/** Everything the window counted, including operations the model no longer declares. */
export const statOfAll = (view: WindowView | undefined): CallStat => (view === undefined ? none : total(Object.values(view.byOperation)));

/** A count and its noun, pluralised from the count: "1 defect", "2 defects". */
export const plural = (n: number, one: string, many = `${one}s`): string => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export const minutes = (windowMs: number): string => `${Math.round(windowMs / 60_000)} min`;
