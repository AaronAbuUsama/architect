// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";

const { HandleTaken } = Errors.declared;

/** Claim a free name and make it the address of a public page, with its profile. */
const claim: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.load(Handlers.blank("load: the work this step does"));
    yield* steps.record(Handlers.blank("record: the work this step does"));
    if (yield* Handlers.blank<boolean>("refuse HandleTaken when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleTaken was refused"));
      return yield* new HandleTaken(yield* Handlers.blank("HandleTaken's fields"));
    }
    yield* move();
    return yield* Handlers.blank("the answer");
  });

export default claim;
