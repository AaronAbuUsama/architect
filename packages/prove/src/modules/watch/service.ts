import { resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@formants/compiler";
import { Journeys } from "#modules/journeys/service.js";
import { WatchFailed, type WatchApi } from "./types.ts";
import { choose } from "./internal/choose.ts";
import { evidenceOf } from "./internal/evidence.ts";
import { judge } from "./internal/report.ts";
import { syncTasks } from "./internal/tasks.ts";

const failed = (message: string) => new WatchFailed({ message });

const span = (ms: number) => (ms % 3_600_000 === 0 ? `${ms / 3_600_000}h` : ms % 60_000 === 0 ? `${ms / 60_000}m` : `${Math.ceil(ms / 1000)}s`);

export const Watch: WatchApi = {
  run: ({ root: given, environment, source, since, env, read, use }) =>
    Effect.gen(function* () {
      const root = resolve(given);
      const model = yield* Compiler.model.pipe(
        Effect.provide(nodeSource(root)),
        Effect.mapError((e) => failed(e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message)),
      );
      const declared = model.environments?.[environment];
      if (!declared) return yield* failed(`no environment "${environment}" in blueprint/environments/ (there is ${Object.keys(model.environments ?? {}).join(", ") || "none"})`);
      const project = yield* Journeys.load(root, model).pipe(Effect.mapError((e) => failed(e.message)));

      const chosen = use ? { reading: use, from: "the given source" } : yield* choose({ root, environment, declared, source, env, ...(read ? { read } : {}) });
      const traces = yield* chosen.reading.window(since).pipe(Effect.mapError((e) => failed(e.message)));
      const seen = evidenceOf(model, traces);
      const header = `watch ${environment}  last ${span(since)}  from ${chosen.from}${seen.left > 0 ? `  (${seen.left} traces from prove runs left out)` : ""}`;
      if (seen.evidence.length === 0) {
        const tasks = yield* syncTasks(root, environment, model, []);
        return { lines: [header, "no calls in the window", "drift none"], drift: [], tasks, passed: true };
      }
      const judged = judge(model, project, seen.evidence);
      const tasks = yield* syncTasks(root, environment, model, judged.drifting);
      const drift = judged.drifting.map((d) => d.operation);
      return {
        lines: [header, ...judged.lines, ...tasks.map((t) => `task ${t}`), `drift ${drift.length === 0 ? "none" : drift.join(" ")}`],
        drift,
        tasks,
        passed: judged.passed,
      };
    }),
};
