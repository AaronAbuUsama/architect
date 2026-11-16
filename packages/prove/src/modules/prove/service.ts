import { resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@architect/compiler";
import { Collectors } from "#modules/telemetry/service.ts";
import { Evals } from "#modules/evals/service.ts";
import { Journeys } from "#modules/journeys/service.ts";
import { stateOf } from "#modules/journeys/internal/world.ts";
import { Worlds } from "#modules/world/service.ts";
import { ProveFailed, type ProveApi } from "./types.ts";
import { evalLines, journeyLines } from "./internal/report.ts";

const failed = (e: { readonly message: string }) => new ProveFailed({ message: e.message });

export const Prove: ProveApi = {
  run: ({ root, port }) =>
    Effect.gen(function* () {
      const model = yield* Compiler.model.pipe(
        Effect.provide(nodeSource(root)),
        Effect.mapError((e) => new ProveFailed({ message: e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message })),
      );
      const project = yield* Journeys.load(root, model).pipe(Effect.mapError(failed));
      if (project.journeys.length === 0) return yield* new ProveFailed({ message: `no journeys in ${resolve(root, "journeys")}` });
      const collector = yield* Collectors.start(resolve(root, ".architect/prove-telemetry")).pipe(Effect.mapError(failed));
      const { url } = yield* Worlds.start({ root, port, name: "prove", otlp: collector.url }).pipe(Effect.mapError(failed));
      const runs = yield* Effect.forEach(project.journeys, (j, i) => Journeys.run(project, url, j, i));
      const calls = runs.flatMap((r) => r.calls);
      const traces = yield* collector.traces(calls.map((c) => ({ trace: c.trace, parent: c.parent })));
      const evidence = yield* Evals.gather(project, calls, traces, (table, id) => stateOf(url, table, id));
      const journeys = journeyLines(runs, traces);
      const evals = evalLines(model, Evals.judge(project, evidence));
      const failures = journeys.failed + evals.failed;
      return {
        lines: [...journeys.lines, ...evals.lines, failures === 0 ? "prove ✔" : `prove ✘ ${failures} failing`],
        passed: failures === 0,
      };
    }),
};
