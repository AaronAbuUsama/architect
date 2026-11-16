// What every prove does once it has a world to talk to: run each journey, read back what the collector heard, judge.
import { Effect } from "effect";
import type { Model } from "@architect/compiler";
import { Evals } from "#modules/evals/service.js";
import type { Verdict } from "#modules/evals/types.js";
import { Journeys } from "#modules/journeys/service.js";
import type { Project } from "#modules/journeys/types.js";
import type { Collector } from "#modules/telemetry/types.js";
import { evalLines, journeyLines } from "./report.ts";

export interface Exercised {
  readonly journeys: ReturnType<typeof journeyLines>;
  readonly evals: ReturnType<typeof evalLines>;
  readonly verdicts: ReadonlyArray<Verdict>;
  /** A run with a failing journey proves nothing: its operations are judged and not passed (D2 #80). */
  readonly judged: ReadonlyArray<Verdict>;
}

export const exercise = (model: Model, project: Project, url: string, collector: Pick<Collector, "traces">, people?: "world" | "sign-up"): Effect.Effect<Exercised> =>
  Effect.gen(function* () {
    const runs = yield* Effect.forEach(project.journeys, (j, i) => Journeys.run(project, url, j, i, people));
    const calls = runs.flatMap((r) => r.calls);
    const traces = yield* collector.traces(calls.map((c) => ({ trace: c.trace, parent: c.parent })));
    const evidence = Evals.gather(calls, traces);
    const journeys = journeyLines(runs, traces);
    const verdicts = Evals.judge(project, evidence);
    const judged = journeys.failed === 0 ? verdicts : verdicts.map((v) => ({ ...v, failures: [...v.failures, "a journey failed"] }));
    return { journeys, evals: evalLines(model, verdicts), verdicts, judged };
  });

/** The last line: every journey and every eval passed, or how many did not. */
export const closing = (x: Exercised) => {
  const failures = x.journeys.failed + x.evals.failed;
  return { line: failures === 0 ? "prove ✔" : `prove ✘ ${failures} failing`, passed: failures === 0 };
};

/** One verdict per operation: `pass` only when every one of its evals passed and no journey failed (D2 #80). */
export const resultsOf = (model: Model, done: Exercised) =>
  Object.keys(model.operations).map((operation) => ({
    operation,
    verdict: done.judged.filter((v) => v.operation === operation).every((v) => v.failures.length === 0) ? ("pass" as const) : ("fail" as const),
  }));
