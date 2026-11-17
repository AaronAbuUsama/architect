// Scaffolded from blueprint/things/attention/verbs/approve.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/attention/approve.handler.ts";

const approve: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move("approved");
    return {};
  });

export default approve;
