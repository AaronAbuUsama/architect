// Scaffolded from blueprint/things/mission/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/mission/open.handler.ts";

/** Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps. */
const open: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: title, target, blueprint.
    // Answer: mission.
    // Steps, each its own span: steps.insert(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default open;
