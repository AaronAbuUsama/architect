// Scaffolded from blueprint/things/mission/verbs/stop.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@formants/language-effect";
import type { Handler } from "../../generated/api/src/mission/stop.handler.ts";

/** Stop the mission for good. Its runs are stopped with it. */
const stop: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, why.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default stop;
