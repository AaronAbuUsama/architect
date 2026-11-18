// Scaffolded from blueprint/things/attention/verbs/raise.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/attention/raise.handler.ts";

/** Ask the mission's owner for a decision only they can make. */
const raise: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, kind, title, why, task.
    // Answer: attention.
    // Steps, each its own span: steps.insert(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default raise;
