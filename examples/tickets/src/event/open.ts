// Scaffolded from blueprint/things/event/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/event/open.handler.ts";

/** Put an event on sale with a number of places. */
const open: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: title, places.
    // Answer: event.
    // Steps, each its own span: steps.insert(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default open;
