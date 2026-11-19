// Scaffolded from blueprint/things/link/verbs/order.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/link/order.handler.ts";

const { LinkAlreadyRemoved } = Errors.declared;

/**
 * link.order: Move a link to a zero-based position. A position past the end puts it last.
 *
 * Who may call, from blueprint/things/link/roles.ts:
 *   the linkOwner of the link: (link, caller) => link.owner === caller.person
 *
 * Payload, from blueprint/things/link/verbs/order.ts:
 *   link      link.id
 *   position  LinkPosition
 *
 * Answer: nothing.
 *
 * Refusals:
 *   LinkAlreadyRemoved  exit 32  LN-002  yours to refuse below; from blueprint/things/link/errors.ts
 *   NotAllowed          exit 3   AR-001  the runtime's, when the caller isn't the linkOwner of the link; from blueprint/things/link/roles.ts
 *
 * Budget, from blueprint/things/link/verbs/order.ts: p95 150ms.
 *
 * The link's machine, from blueprint/things/link/machine.ts (this call makes no move):
 *     from       move    to       emits
 *     (creates)  add     listed   LinkAdded
 *     listed     remove  removed  LinkRemoved
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the linkOwner of the link;
 *   before it runs, it hands in the link it read as subject, so this handler never reads it again;
 *   each step is its own span: link.order.load, link.order.record;
 *   the call is the span link.order, and its commit link.order.commit.
 */
const order: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    // Step load: database, span link.order.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // LinkAlreadyRemoved: exit 32, LN-002.
    if (yield* Handlers.blank<boolean>("refuse LinkAlreadyRemoved when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LinkAlreadyRemoved was refused"));
      return yield* new LinkAlreadyRemoved({});
    }

    // Step record: database, span link.order.record.
    yield* steps.record(Handlers.blank("record: the work this step does"));

    return {};
  });

export default order;
