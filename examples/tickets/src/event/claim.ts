// Scaffolded from blueprint/things/event/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/event/claim.handler.ts";

/** Claim a ticket for one or more seats, held under a name. */
const claim: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: event, holder, seats.
    // Answer: ticket, left.
    // Steps, each its own span: steps.load(...), steps.issue(...), steps.count(...).
    // May refuse with SoldOut.
    return yield* Handlers.blank("this handler is not written yet");
  });

export default claim;
