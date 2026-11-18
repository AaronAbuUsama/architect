// Scaffolded from blueprint/things/run/verbs/finish.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/run/finish.handler.ts";

/** The run pushed its branch. CI proves it; the run cannot close its own task. */
const finish: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, run, branch.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default finish;
