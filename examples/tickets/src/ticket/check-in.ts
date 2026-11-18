// Scaffolded from blueprint/things/ticket/verbs/check-in.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/ticket/check-in.handler.ts";

/** Let the holder in at the door. A ticket gets in once. */
const checkIn: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: ticket.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default checkIn;
