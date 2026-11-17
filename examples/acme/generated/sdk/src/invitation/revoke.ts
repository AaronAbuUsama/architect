// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/invitation/revoke.ts";
import { Acme } from "../client.ts";

/** Withdraw an invitation that hasn't been accepted. */
export const revoke = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.invitation.revoke({ payload }));
