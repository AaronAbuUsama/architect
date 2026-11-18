// Scaffolded from blueprint/things/ticket/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/ticket/cancel.handler.ts";

/** Cancel a ticket before the door. Its seats are not sold again. */
const cancel: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: ticket.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default cancel;
