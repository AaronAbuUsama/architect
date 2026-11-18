// Scaffolded from blueprint/things/mission/verbs/pause.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/mission/pause.handler.ts";

/** Pause the mission, saying why. */
const pause: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, why.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default pause;
