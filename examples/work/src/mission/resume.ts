// Scaffolded from blueprint/things/mission/verbs/resume.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@formants/language-effect";
import type { Handler } from "../../generated/api/src/mission/resume.handler.ts";

/** Pick a paused mission up again. */
const resume: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default resume;
