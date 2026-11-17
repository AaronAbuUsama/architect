// Scaffolded from blueprint/things/mission/verbs/finish.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/mission/finish.handler.ts";

/** Close the mission: every task is closed by a fact up to its target. */
const finish: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default finish;
