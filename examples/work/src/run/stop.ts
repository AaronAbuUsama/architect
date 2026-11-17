// Scaffolded from blueprint/things/run/verbs/stop.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/run/stop.handler.ts";

const stop: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move("stopped");
    return {};
  });

export default stop;
