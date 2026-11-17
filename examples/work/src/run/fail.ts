// Scaffolded from blueprint/things/run/verbs/fail.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/run/fail.handler.ts";

/** The run gave up, saying why. */
const fail: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, run, why.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default fail;
