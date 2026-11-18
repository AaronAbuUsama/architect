// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/invitation/revoke.ts";
import { Links } from "../client.ts";

/** Withdraw an invitation that hasn't been accepted. */
export const revoke = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.invitation.revoke({ payload }));
