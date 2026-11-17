// Scaffolded from blueprint/things/run/verbs/report.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/run/report.handler.ts";

/** A report moves no card: only the run's own state (running or waiting). */
const report: Handler = ({ report }, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move(report === "waiting" ? "waiting" : "running");
    return {};
  });

export default report;
