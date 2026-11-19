// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/allowance/get.ts";
import { call, type CallOptions } from "../client.ts";

/** Read one allowance by its id: organization, member, limit, spent, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.allowance.get({ payload }));
