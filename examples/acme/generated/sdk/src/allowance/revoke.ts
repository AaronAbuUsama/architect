// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/allowance/revoke.ts";
import { call, type CallOptions } from "../client.ts";

/** Stop an allowance. Nothing more can be spent from it. */
export const revoke = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.allowance.revoke({ payload }));
