// Scaffolded from blueprint/things/allowance/verbs/revoke.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/allowance/revoke.handler.ts";

/** Stop an allowance. Nothing more can be spent from it. The role check and the machine's check already passed. */
const revoke: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.update(move("revoked"));
    return {};
  });

export default revoke;
