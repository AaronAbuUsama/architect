// Scaffolded from blueprint/things/mission/verbs/stop.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/mission/stop.handler.ts";

const stop: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void); // the why is in the event the move emits
    yield* move("stopped");
    return {};
  });

export default stop;
