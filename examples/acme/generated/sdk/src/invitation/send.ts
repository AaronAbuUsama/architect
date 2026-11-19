// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/send.ts";
import { call, type CallOptions } from "../client.ts";

/** Invite someone to an organisation by email. */
export const send = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.invitation.send({ payload }));
