// Scaffolded from blueprint/things/event/verbs/close.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/event/close.handler.ts";

/** End the event. No tickets are claimed after this. */
const close: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: event.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default close;
