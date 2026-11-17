// Scaffolded from blueprint/things/run/verbs/fail.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/run/fail.handler.ts";

const fail: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move("failed");
    return {};
  });

export default fail;
