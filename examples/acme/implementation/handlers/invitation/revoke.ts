// Scaffolded from blueprint/things/invitation/verbs/revoke.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/invitation/revoke.handler.ts";

/** Withdraw an invitation that hasn't been accepted: the move is the whole change. */
const revoke: Handler = (_payload, { steps, move }) => steps.update(move("revoked")).pipe(Effect.as({}));

export default revoke;
