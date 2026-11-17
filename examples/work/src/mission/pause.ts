// Scaffolded from blueprint/things/mission/verbs/pause.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/mission/pause.handler.ts";

const pause: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void); // the why is in the event the move emits
    yield* move("paused");
    return {};
  });

export default pause;
