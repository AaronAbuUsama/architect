// Scaffolded from blueprint/things/handle/verbs/resolve.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/handle/resolve.handler.ts";

const { HandleNotFound } = Errors.declared;

/**
 * handle.resolve: Find the handle that holds a claimed name. A released or unclaimed name has none.
 *
 * Who may call, from blueprint/things/handle/verbs/resolve.ts:
 *   anyone
 *
 * Payload, from blueprint/things/handle/verbs/resolve.ts:
 *   name  handle.name
 *
 * Answer, from blueprint/things/handle/verbs/resolve.ts:
 *   handle  handle.id
 *
 * Refusals:
 *   HandleNotFound  exit 13  HN-003  yours to refuse below; from blueprint/things/handle/errors.ts
 *
 * Budget, from blueprint/things/handle/verbs/resolve.ts: p95 150ms.
 *
 * The handle's machine, from blueprint/things/handle/machine.ts (this call makes no move):
 *     from       move     to        emits
 *     (creates)  claim    claimed   HandleClaimed
 *     claimed    release  released  HandleReleased
 *
 * What the runtime does, so this handler doesn't:
 *   each step is its own span: handle.resolve.load;
 *   the call is the span handle.resolve, and its commit handle.resolve.commit.
 */
const resolve: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    // HandleNotFound: exit 13, HN-003.
    if (yield* Handlers.blank<boolean>("refuse HandleNotFound when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleNotFound was refused"));
      return yield* new HandleNotFound({});
    }

    // Step load: database, span handle.resolve.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    return {
      handle: yield* Handlers.blank("handle, a handle.id"),
    };
  });

export default resolve;
