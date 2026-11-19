// Scaffolded from blueprint/things/link/verbs/remove.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/link/remove.handler.ts";

/** Remove a link from a public page. */
const remove: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Handlers.blank("record: the work this step does"));
    yield* move();
    return yield* Handlers.blank("the answer");
  });

export default remove;
