import { Effect } from "effect";
import { Compiler, nodeSource } from "@architect/compiler";
import type { ModelCommandApi } from "./types.ts";
import { summary } from "./internal/summary.ts";

export const ModelCommand: ModelCommandApi = {
  run: ({ root, json }) =>
    Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.map((model) => ({ out: json ? JSON.stringify(model, null, 2) + "\n" : summary(model), err: "", exit: 0 })),
      Effect.catchTags({
        BlueprintInvalid: (e) =>
          Effect.succeed({ out: "", err: `The blueprint is invalid:\n${e.problems.map((p) => `  - ${p}`).join("\n")}\n`, exit: 2 }),
        SourceError: (e) => Effect.succeed({ out: "", err: `${e.message}\n`, exit: 2 }),
      }),
    ),
};
