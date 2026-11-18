// Scaffolded from blueprint/things/event/verbs/close.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/event/close.handler.ts";

/** End the event. No tickets are claimed after this. */
const close: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(move("over"));
    return {};
  });

export default close;
