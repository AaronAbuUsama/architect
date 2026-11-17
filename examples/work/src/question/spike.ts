// Scaffolded from blueprint/things/question/verbs/spike.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/question/spike.handler.ts";

const spike: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move("spiked");
    return {};
  });

export default spike;
