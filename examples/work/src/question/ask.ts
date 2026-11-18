// Scaffolded from blueprint/things/question/verbs/ask.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/question/ask.handler.ts";

/** Ask the mission's owner about one gap in the blueprint, with lettered answers. */
const ask: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, asks, about, gap, options.
    // Answer: question.
    // Steps, each its own span: steps.insert(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default ask;
