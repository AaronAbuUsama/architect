// Scaffolded from blueprint/things/ticket/verbs/check-in.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/ticket/check-in.handler.ts";

/** Let the holder in at the door. A ticket gets in once. */
const checkIn: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(move("checkedIn"));
    return {};
  });

export default checkIn;
