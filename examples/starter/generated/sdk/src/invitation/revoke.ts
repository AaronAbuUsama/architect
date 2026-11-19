// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/revoke.ts";
import { call, type CallOptions } from "../client.ts";

/** Withdraw an invitation that hasn't been accepted. */
export const revoke = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.invitation.revoke({ payload }));
