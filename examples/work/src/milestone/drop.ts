// Scaffolded from blueprint/things/milestone/verbs/drop.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@formants/language-effect";
import type { Handler } from "../../generated/api/src/milestone/drop.handler.ts";

/** Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step. */
const drop: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, milestone.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default drop;
