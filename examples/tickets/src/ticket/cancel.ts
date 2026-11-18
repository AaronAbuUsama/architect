// Scaffolded from blueprint/things/ticket/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/ticket/cancel.handler.ts";

/** Cancel a ticket before the door. Its seats are not sold again. */
const cancel: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(move("cancelled"));
    return {};
  });

export default cancel;
