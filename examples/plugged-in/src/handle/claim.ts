// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";

const { HandleTaken, HandleAlreadyOwned } = Errors.declared;

/**
 * handle.claim: Claim a free name and make it the address of your public page, with its profile.
 *
 * Who may call, from blueprint/things/handle/verbs/claim.ts:
 *   anyone signed in
 *
 * Payload, from blueprint/things/handle/verbs/claim.ts:
 *   name  handle.name
 *
 * Answer, from blueprint/things/handle/verbs/claim.ts:
 *   handle  handle.id
 *
 * Refusals:
 *   HandleTaken         exit 10  HN-001  yours to refuse below; from blueprint/things/handle/errors.ts
 *   HandleAlreadyOwned  exit 12  HN-002  yours to refuse below; from blueprint/things/handle/errors.ts
 *   NotAllowed          exit 3   AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/handle/verbs/claim.ts
 *
 * Idempotent by request, from blueprint/things/handle/verbs/claim.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/handle/verbs/claim.ts: p95 150ms.
 *
 * The handle's machine, from blueprint/things/handle/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *   ▶ (creates)  claim    claimed   HandleClaimed
 *     claimed    release  released  HandleReleased
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it mints the handle's new id and hands it in as id;
 *   each step is its own span: handle.claim.load, handle.claim.record;
 *   once it answers, it sets the handle's state to claimed;
 *   once it answers, it writes HandleClaimed: handle from the answer, name from the payload;
 *   the call is the span handle.claim, and its commit handle.claim.commit.
 */
const claim: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span handle.claim.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // HandleTaken: exit 10, HN-001.
    if (yield* Handlers.blank<boolean>("refuse HandleTaken when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleTaken was refused"));
      return yield* new HandleTaken({});
    }

    // HandleAlreadyOwned: exit 12, HN-002.
    if (yield* Handlers.blank<boolean>("refuse HandleAlreadyOwned when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleAlreadyOwned was refused"));
      return yield* new HandleAlreadyOwned({});
    }

    // Step record: database, span handle.claim.record.
    yield* steps.record(Handlers.blank("record: the work this step does"));

    // The move claim, to claimed.
    yield* move();

    return {
      // HandleClaimed needs handle, and only the answer can give it.
      handle: id,
    };
  });

export default claim;
