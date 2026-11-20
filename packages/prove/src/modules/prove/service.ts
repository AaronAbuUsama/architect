import { Names } from "orthograph/server";
import { resolve } from "node:path";
import { Duration, Effect } from "effect";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Collectors, FileMetrics, privateKeys } from "#modules/telemetry/service.js";
import { PortalFeed } from "#modules/portal-feed/service.js";
import { Sinks } from "#modules/sinks/service.js";
import { Journeys } from "#modules/journeys/service.js";
import { Worlds } from "#modules/world/service.js";
import { Impact } from "#modules/impact/service.js";
import { ProveFailed, type ProveApi } from "./types.ts";
import { handlerHashes } from "#modules/verdicts/internal/proof.js";
import { closing, exercise } from "./internal/exercise.ts";
import { deviceHost, needsDevice, standChain } from "./internal/device-host.ts";
import { proveInTest } from "./internal/test-run.ts";
import { emptyWorld } from "./internal/empty-world.ts";
import { proveReport } from "./internal/structured.ts";
import { detail, headline, narrowed } from "./internal/changed-run.ts";

/** The portal reads a world's last half hour: check 21's window, and the portal's own default. */
const PORTAL_WINDOW_MS = 30 * 60_000;

const failed = (e: { readonly message: string }) => new ProveFailed({ message: e.message });

/** The compiled model and the project's journeys, or why prove can't run. */
const load = (root: string, empty = false) =>
  Effect.gen(function* () {
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => new ProveFailed({ message: e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message })),
    );
    const project = yield* Journeys.load(root, model).pipe(Effect.mapError(failed));
    if (project.journeys.length === 0 && !empty) return yield* new ProveFailed({ message: `no journeys in ${resolve(root, "journeys")}` });
    return { model, project };
  });

/** One line per journey skipped for its blanks, so a stub is never silently counted as proved. */
const unfinishedIn = (project: { readonly unfinished?: ReadonlyArray<string> }) =>
  (project.unfinished ?? []).map((file) => `journey ${file} skipped: it still has blanks (ortho check names them)`);

export const Prove: ProveApi = {
  run: ({ root, port, empty = false, only, env, changed = false }) =>
    Effect.gen(function* () {
      const { model, project: loaded } = yield* load(root, empty);
      // `--changed`: what the last proof's record and today's files say to run; with nothing to run or judge, no world is made at all.
      const selection = changed && !empty && only === undefined ? yield* Impact.select(root, model) : undefined;
      const judging = selection !== undefined && selection.fellBack === null ? new Set(selection.judge) : undefined;
      const project = selection !== undefined && judging !== undefined ? narrowed(loaded, selection.rerun) : loaded;
      const said = selection === undefined ? [] : headline(model, selection, project.journeys.length, loaded.journeys.length);
      const report = selection === undefined ? undefined : detail(model, selection, project.journeyFiles ?? []);
      if (selection !== undefined && judging !== undefined && project.journeys.length === 0 && judging.size === 0) {
        yield* Impact.settle(root, model, { journeys: [], operations: [] });
        const lines = [...said, ...unfinishedIn(loaded), "prove ✔"];
        return { lines, passed: true, structured: proveReport([], 0, 0, lines, true, report) };
      }
      const journeys = only === undefined ? project.journeys : project.journeys.filter((journey) => journey.name === only);
      if (journeys.length === 0 && !(empty && only === undefined) && !(judging !== undefined && judging.size > 0)) return yield* new ProveFailed({ message: `no journey named "${only}"` });
      const bodies = handlerHashes(root, model);
      const world = empty ? yield* emptyWorld(root, model) : root;
      const dir = resolve(world, Names.folder, "prove-telemetry");
      const strip = privateKeys(model);
      const collector = yield* Collectors.local(dir, strip).pipe(Effect.mapError(failed));
      const sinks = yield* Sinks.resolve({ sinks: empty ? [{ sink: "local" }] : model.environments?.["local"]?.telemetry ?? [{ sink: "local" }], env: env ?? {} });
      // A plugin that runs operations on the device gets a chain in the world (Anvil as a process, K7 Q7), released after the Worker.
      const stood = yield* standChain(model);
      // The world's portal reads this run's telemetry through a feed this process answers (the Worker cannot open the collector's files).
      const feed = yield* PortalFeed.serve({ source: collector, metrics: FileMetrics.open(dir), environment: "local", windowMs: PORTAL_WINDOW_MS }).pipe(Effect.mapError(failed));
      const { url, chain } = yield* Worlds.start({ root: world, port, name: "prove", otlp: collector.url, portalFeed: feed.url, environment: "local", secretEnv: sinks.secretEnv, ...(stood.chain ? { chain: Effect.succeed(stood.chain) } : {}) }).pipe(Effect.mapError(failed));
      const device = needsDevice(model) ? yield* deviceHost(world, collector.url, chain).pipe(Effect.mapError(failed)) : undefined;
      const [took, done] = yield* Effect.timed(exercise(model, { ...project, journeys }, url, collector, undefined, collector.url, undefined, empty, bodies, device, judging));
      // A run with a failing journey proves nothing: its operations are recorded as judged and not passed (D2 #80).
      if (!empty && only === undefined) {
        yield* Impact.record(root, model, done.judged, judging === undefined ? done.results : done.results.filter((r) => judging.has(r.operation)));
        yield* Impact.settle(root, model, {
          journeys: done.journeys.details.flatMap((d, i) => (project.journeyFiles?.[i] === undefined ? [] : [{ file: project.journeyFiles[i]!, passed: d.verdict === "pass" }])),
          operations: [...new Set(done.judged.flatMap((v) => (v.operation === undefined ? [] : [v.operation])))].map((operation) => ({ operation, passed: done.judged.every((v) => v.operation !== operation || v.failures.length === 0) })),
        });
      }
      const verdict = closing(done);
      const lines = [...said, ...sinks.notes, ...stood.notes, ...unfinishedIn(loaded), ...done.journeys.lines, ...done.evals.lines, verdict.line];
      const seconds = Math.round(Duration.toMillis(took)) / 1000;
      return { lines, passed: verdict.passed, structured: proveReport(done.journeys.details, done.evals.failed, seconds, lines, verdict.passed, report) };
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
      for (const line of [...unfinishedIn(project), ...done.journeys.lines, ...done.evals.lines]) yield* say(line);
      const verdict = closing(done);
      yield* say(verdict.line);
      return { passed: verdict.passed, results: done.results };
    }),
};
