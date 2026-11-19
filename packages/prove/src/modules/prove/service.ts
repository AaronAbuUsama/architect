import { Names } from "orthograph/server";
import { resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Collectors, privateKeys } from "#modules/telemetry/service.js";
import { Sinks } from "#modules/sinks/service.js";
import { Journeys } from "#modules/journeys/service.js";
import { Worlds } from "#modules/world/service.js";
import { Impact } from "#modules/impact/service.js";
import { ProveFailed, type ProveApi } from "./types.ts";
import { handlerHashes } from "#modules/verdicts/internal/proof.js";
import { closing, exercise } from "./internal/exercise.ts";
import { proveInTest } from "./internal/test-run.ts";
import { emptyWorld } from "./internal/empty-world.ts";

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
  run: ({ root, port, empty = false, only, env }) =>
    Effect.gen(function* () {
      const { model, project } = yield* load(root);
      const journeys = only === undefined ? project.journeys : project.journeys.filter((journey) => journey.name === only);
      if (journeys.length === 0) return yield* new ProveFailed({ message: `no journey named "${only}"` });
      const bodies = handlerHashes(root, model);
      const world = empty ? yield* emptyWorld(root, model) : root;
      const dir = resolve(world, Names.folder, "prove-telemetry");
      const strip = privateKeys(model);
      const collector = yield* Collectors.local(dir, strip).pipe(Effect.mapError(failed));
      const sinks = yield* Sinks.resolve({ sinks: empty ? [{ sink: "local" }] : model.environments?.["local"]?.telemetry ?? [{ sink: "local" }], env: env ?? {} });
      const { url } = yield* Worlds.start({ root: world, port, name: "prove", otlp: collector.url, environment: "local", secretEnv: sinks.secretEnv }).pipe(Effect.mapError(failed));
      const done = yield* exercise(model, { ...project, journeys }, url, collector, undefined, collector.url, undefined, empty, bodies);
      // A run with a failing journey proves nothing: its operations are recorded as judged and not passed (D2 #80).
      if (!empty && only === undefined) yield* Impact.record(root, model, done.judged, done.results);
      const verdict = closing(done);
      return { lines: [...sinks.notes, ...done.journeys.lines, ...done.evals.lines, verdict.line], passed: verdict.passed };
    }),
  dev: ({ root, port, env }) =>
    Effect.gen(function* () {
      const model = yield* Compiler.model.pipe(Effect.provide(nodeSource(root)), Effect.mapError((e) => failed(e._tag === "BlueprintInvalid" ? { message: `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` } : e)));
      const sinks = yield* Sinks.resolve({ sinks: model.environments?.["local"]?.telemetry ?? [{ sink: "local" }], env: env ?? {} });
      const { url, log } = yield* Worlds.start({ root, port, name: "dev", environment: "local", secretEnv: sinks.secretEnv }).pipe(Effect.mapError(failed));
      return { url, log, notes: sinks.notes };
    }),
  test: (options) =>
    load(options.root).pipe(Effect.flatMap(({ model, project }) => proveInTest(model, project, options))),
  against: ({ root, url, telemetry, state, say }) =>
    Effect.gen(function* () {
      const { model, project } = yield* load(root);
      const done = yield* exercise(model, project, url, Collectors.read(telemetry), "sign-up", undefined, state === undefined ? undefined : Journeys.databaseFacts(state));
      for (const line of [...done.journeys.lines, ...done.evals.lines]) yield* say(line);
      const verdict = closing(done);
      yield* say(verdict.line);
      return { passed: verdict.passed, results: done.results };
    }),
};
