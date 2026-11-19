// Scaffolded from blueprint/things/link/verbs/add.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/link/add.handler.ts";

const { LinkNeedsHandle } = Errors.declared;

/** Append a link to the public page of a claimed name. */
const add: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.load(Handlers.blank("load: the work this step does"));
    yield* steps.record(Handlers.blank("record: the work this step does"));
    if (yield* Handlers.blank<boolean>("refuse LinkNeedsHandle when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LinkNeedsHandle was refused"));
      return yield* new LinkNeedsHandle(yield* Handlers.blank("LinkNeedsHandle's fields"));
    }
    yield* move();
    return yield* Handlers.blank("the answer");
  });

export default add;
