import { resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@architect/compiler";
import { Collectors, privateKeys } from "#modules/telemetry/service.js";
import { Sinks } from "#modules/sinks/service.js";
import { Viewer } from "#modules/viewer/service.js";
import { Journeys } from "#modules/journeys/service.js";
import { Worlds } from "#modules/world/service.js";
import { Impact } from "#modules/impact/service.js";
import { ProveFailed, type ProveApi } from "./types.ts";
import { closing, exercise, resultsOf } from "./internal/exercise.ts";
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
  run: ({ root, port, view, env }) =>
    Effect.gen(function* () {
      const { model, project } = yield* load(root);
      // The viewer first, so the collector started next also exports to it.
      const viewing = view ? yield* Viewer.start().pipe(Effect.mapError(failed)) : undefined;
      const collector = yield* Collectors.start(resolve(root, ".architect/prove-telemetry"), { strip: privateKeys(model) }).pipe(Effect.mapError(failed));
      const sinks = yield* Sinks.resolve({ sinks: model.environments?.["local"]?.telemetry ?? [{ sink: "local" }], env: env ?? {} });
      const { url } = yield* Worlds.start({ root, port, name: "prove", otlp: collector.url, environment: "local", secretEnv: sinks.secretEnv }).pipe(Effect.mapError(failed));
      const done = yield* exercise(model, project, url, collector, undefined, collector.url);
      // A run with a failing journey proves nothing: its operations are recorded as judged and not passed (D2 #80).
      yield* Impact.record(root, model, done.judged);
      const verdict = closing(done);
      const seen = viewing === undefined ? [] : [`viewer ${viewing.url}`, ...done.failedTraces.map((f) => `  ${f.what}: trace ${f.trace}  ${Viewer.link(viewing, f.trace)}`)];
      return { lines: [...sinks.notes, ...done.journeys.lines, ...done.evals.lines, verdict.line, ...seen], passed: verdict.passed };
    }),
  dev: ({ root, port, env }) =>
    Effect.gen(function* () {
      const model = yield* Compiler.model.pipe(Effect.provide(nodeSource(root)), Effect.mapError((e) => failed(e._tag === "BlueprintInvalid" ? { message: `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` } : e)));
      const sinks = yield* Sinks.resolve({ sinks: model.environments?.["local"]?.telemetry ?? [{ sink: "local" }], env: env ?? {} });
      // dev needs no Docker of its own: it gets a collector only while the viewer runs, so what it does can be seen there.
      const viewing = yield* Viewer.running();
      const collector = viewing ? yield* Collectors.start(resolve(root, ".architect/dev-telemetry"), { strip: privateKeys(model) }).pipe(Effect.mapError(failed)) : undefined;
      const { url, log } = yield* Worlds.start({ root, port, name: "dev", environment: "local", secretEnv: sinks.secretEnv, ...(collector ? { otlp: collector.url } : {}) }).pipe(Effect.mapError(failed));
      return { url, log, notes: [...sinks.notes, ...(viewing ? [`traces go to the viewer at ${viewing.url}`] : [])] };
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
      return { passed: verdict.passed, results: resultsOf(model, done) };
    }),
};