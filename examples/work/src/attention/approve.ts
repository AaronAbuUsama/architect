// Scaffolded from blueprint/things/attention/verbs/approve.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/attention/approve.handler.ts";

/** Say yes. For a promote, the promote runs. */
const approve: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, attention.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default approve;
