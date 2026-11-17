// Scaffolded from blueprint/things/run/verbs/report.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/run/report.handler.ts";

/** Say how the run is going. It moves no card. */
const report: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, run, report, note.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default report;
