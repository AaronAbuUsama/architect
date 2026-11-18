// Scaffolded from blueprint/things/attention/verbs/decline.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/attention/decline.handler.ts";

/** Say not yet, and why. The task stays where its facts put it. */
const decline: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, attention, why.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default decline;
