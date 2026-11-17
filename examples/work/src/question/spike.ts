// Scaffolded from blueprint/things/question/verbs/spike.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@formants/language-effect";
import type { Handler } from "../../generated/api/src/question/spike.handler.ts";

/** Not sure yet: turn the question into a spike task on its subject. */
const spike: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, question.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default spike;
