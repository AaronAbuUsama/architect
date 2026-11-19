// Scaffolded from blueprint/things/link/verbs/order.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/link/order.handler.ts";

const { LinkAlreadyRemoved } = Errors.declared;

/** Move a link to a zero-based position. A position past the end puts it last. */
const order: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    yield* steps.load(Handlers.blank("load: the work this step does"));
    yield* steps.record(Handlers.blank("record: the work this step does"));
    if (yield* Handlers.blank<boolean>("refuse LinkAlreadyRemoved when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LinkAlreadyRemoved was refused"));
      return yield* new LinkAlreadyRemoved(yield* Handlers.blank("LinkAlreadyRemoved's fields"));
    }
    return yield* Handlers.blank("the answer");
  });

export default order;
