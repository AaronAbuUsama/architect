// Scaffolded from blueprint/things/profile/verbs/get.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/profile/get.handler.ts";

const { ProfileNotFound } = Errors.declared;

/** Read a claimed name's public page and its links in display order. */
const get: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    yield* steps.load(Handlers.blank("load: the work this step does"));
    if (yield* Handlers.blank<boolean>("refuse ProfileNotFound when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ProfileNotFound was refused"));
      return yield* new ProfileNotFound(yield* Handlers.blank("ProfileNotFound's fields"));
    }
    return yield* Handlers.blank("the answer");
  });

export default get;
