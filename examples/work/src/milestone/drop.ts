// Scaffolded from blueprint/things/milestone/verbs/drop.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/milestone/drop.handler.ts";

const drop: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move("dropped");
    return {};
  });

export default drop;
