import { resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@architect/compiler";
import { Collectors } from "#modules/telemetry/service.js";
import { Journeys } from "#modules/journeys/service.js";
import { Worlds } from "#modules/world/service.js";
import { Impact } from "#modules/impact/service.js";
import { ProveFailed, type ProveApi } from "./types.ts";
import { closing, exercise } from "./internal/exercise.ts";
import { proveInTest } from "./internal/test-run.ts";

const failed = (e: { readonly message: string }) => new ProveFailed({ message: e.message });

/** The compiled model and the project's journeys, or why prove can't run. */
const load = (root: string) =>
  Effect.gen(function* () {
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => new ProveFailed({ message: e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message })),
    );
    const project = yield* Journeys.load(root, model).pipe(Effect.mapError(failed));
    if (project.journeys.length === 0) return yield* new ProveFailed({ message: `no journeys in ${resolve(root, "journeys")}` });
    return { model, project };
  });

export const Prove: ProveApi = {
  run: ({ root, port }) =>
    Effect.gen(function* () {
      const { model, project } = yield* load(root);
      const collector = yield* Collectors.start(resolve(root, ".architect/prove-telemetry")).pipe(Effect.mapError(failed));
      const { url } = yield* Worlds.start({ root, port, name: "prove", otlp: collector.url }).pipe(Effect.mapError(failed));
      const done = yield* exercise(model, project, url, collector);
      // A run with a failing journey proves nothing: its operations are recorded as judged and not passed (D2 #80).
      yield* Impact.record(root, model, done.judged);
      const verdict = closing(done);
      return { lines: [...done.journeys.lines, ...done.evals.lines, verdict.line], passed: verdict.passed };
    }),
  test: (options) =>
    load(options.root).pipe(Effect.flatMap(({ model, project }) => proveInTest(model, project, options))),
};
