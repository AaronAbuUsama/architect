// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/allowance/spend.ts";
import { call, type CallOptions } from "../client.ts";

/** Spend from what is left of this month's allowance. */
export const spend = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.allowance.spend({ payload }));
