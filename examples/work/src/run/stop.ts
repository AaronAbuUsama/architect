// Scaffolded from blueprint/things/run/verbs/stop.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/run/stop.handler.ts";

/** Stop the run. A person's act, or the mission stopping. */
const stop: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, run, why.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default stop;
