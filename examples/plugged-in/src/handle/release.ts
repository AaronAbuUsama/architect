// Scaffolded from blueprint/things/handle/verbs/release.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/release.handler.ts";

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
const release: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Handlers.blank("record: the work this step does"));
    yield* move();
    return yield* Handlers.blank("the answer");
  });

export default release;
