// Scaffolded from blueprint/things/attention/verbs/decline.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/attention/decline.handler.ts";

const decline: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move("declined");
    return {};
  });

export default decline;
