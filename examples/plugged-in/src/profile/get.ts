// Scaffolded from blueprint/things/profile/verbs/get.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/profile/get.handler.ts";

const { ProfileNotFound } = Errors.declared;

/**
 * profile.get: Read a claimed name's public page and its links in display order.
 *
 * Who may call, from blueprint/things/profile/verbs/get.ts:
 *   anyone
 *
 * Payload, from blueprint/things/profile/verbs/get.ts:
 *   handle  handle.name
 *
 * Answer, from blueprint/things/profile/verbs/get.ts:
 *   handle  handle.name
 *   links   schema
 *
 * Refusals:
 *   ProfileNotFound  exit 20  PR-001  yours to refuse below; from blueprint/things/profile/errors.ts
 *
 * Budget, from blueprint/things/profile/verbs/get.ts: p95 150ms.
 *
 * What the runtime does, so this handler doesn't:
 *   each step is its own span: profile.get.load;
 *   the call is the span profile.get, and its commit profile.get.commit.
 */
const get: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    // ProfileNotFound: exit 20, PR-001.
    if (yield* Handlers.blank<boolean>("refuse ProfileNotFound when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ProfileNotFound was refused"));
      return yield* new ProfileNotFound({});
    }

    // Step load: database, span profile.get.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    return {
      handle: yield* Handlers.blank("handle, a handle.name"),
      links: yield* Handlers.blank("links, a schema"),
    };
  });

export default get;
