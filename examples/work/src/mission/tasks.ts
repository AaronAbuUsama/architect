// Scaffolded from blueprint/things/mission/verbs/tasks.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@formants/language-effect";
import type { Handler } from "../../generated/api/src/mission/tasks.handler.ts";

/** The mission's tasks, each in the column its facts put it in. */
const tasks: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission.
    // Answer: tasks.
    // Steps, each its own span: steps.plan(...), steps.facts(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default tasks;
