// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/accept.ts";
import { call, type CallOptions } from "../client.ts";

/** Accept an invitation and become a member of its organisation. */
export const accept = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.invitation.accept({ payload }));
