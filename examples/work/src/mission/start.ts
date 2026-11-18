// Scaffolded from blueprint/things/mission/verbs/start.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/mission/start.handler.ts";

/** Start the mission once intake is done. From here the manager only orchestrates. */
const start: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    // May refuse with MissionHasOpenQuestions.
    return yield* Handlers.blank("this handler is not written yet");
  });

export default start;
