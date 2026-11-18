import { Effect } from "effect";
import { ErrorNames, EventNames } from "orthograph/server";
import { BlueprintSource } from "#modules/source/types.js";
import { BlueprintInvalid, type CompilerApi } from "./types.ts";
import { describe } from "./internal/describe.ts";
import { readLayout } from "./internal/layout.ts";
import { Mounts } from "#modules/mounts/service.js";

/** Blueprint sections the model leaves out: `prove` reads starting worlds itself (D2 #24). */
const LATER = ["starting-worlds", "journeys"] as const;

export const Compiler: CompilerApi = {
  model: Effect.gen(function* () {
    const source = yield* BlueprintSource;
    const paths = yield* source.list;
    // The model is the API's shape; starting worlds and journeys are prove's input, read by prove.
    const files = yield* Effect.forEach(paths.filter((p) => !LATER.some((l) => p.startsWith(`${l}/`))), source.load);
    const layout = readLayout(files);
    // Each mount's plugin, folded in: its things beside the project's own, under the names the mount gives them.
    const folded = yield* Mounts.fold(layout);
    for (const [name, t] of folded.things) layout.things.set(name, t);
    layout.problems.push(...folded.problems);
    // Errors take their names from their exports; stamping them here lets the loaded classes be used by name.
    for (const t of layout.things.values()) for (const [name, cls] of t.errors) ErrorNames.name(cls, name);
    for (const t of layout.things.values()) for (const [name, event] of t.events) EventNames.name(event, name);
    const { model, problems } = describe(layout);
    if (problems.length > 0) return yield* new BlueprintInvalid({ problems });
    return Object.keys(folded.mounts).length > 0 ? { ...model, mounts: folded.mounts } : model;
  }),
};

export { canonical } from "./internal/hash.ts";
