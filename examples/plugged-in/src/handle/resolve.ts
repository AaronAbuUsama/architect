// Scaffolded from blueprint/things/handle/verbs/resolve.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/handle/resolve.handler.ts";

const { HandleNotFound } = Errors.declared;

/** Find the handle that holds a claimed name. A released or unclaimed name has none. */
const resolve: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    yield* steps.load(Handlers.blank("load: the work this step does"));
    if (yield* Handlers.blank<boolean>("refuse HandleNotFound when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleNotFound was refused"));
      return yield* new HandleNotFound(yield* Handlers.blank("HandleNotFound's fields"));
    }
    return yield* Handlers.blank("the answer");
  });

export default resolve;
