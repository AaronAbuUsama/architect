import { Effect } from "effect";
import { ErrorNames } from "@architect/blueprint/server";
import { BlueprintSource } from "#modules/source/types.ts";
import { BlueprintInvalid, type CompilerApi } from "./types.ts";
import { describe } from "./internal/describe.ts";
import { readLayout } from "./internal/layout.ts";

export const Compiler: CompilerApi = {
  model: Effect.gen(function* () {
    const source = yield* BlueprintSource;
    const paths = yield* source.list;
    const files = yield* Effect.forEach(paths, source.load);
    const layout = readLayout(files);
    // Errors take their names from their exports; stamping them here lets the loaded classes be used by name.
    for (const t of layout.things.values()) for (const [name, cls] of t.errors) ErrorNames.name(cls, name);
    const { model, problems } = describe(layout);
    if (problems.length > 0) return yield* new BlueprintInvalid({ problems });
    return model;
  }),
};

export { canonical } from "./internal/hash.ts";
