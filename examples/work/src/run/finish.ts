// Scaffolded from blueprint/things/run/verbs/finish.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/run/finish.handler.ts";

const finish: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move("finished");
    return {};
  });

export default finish;
