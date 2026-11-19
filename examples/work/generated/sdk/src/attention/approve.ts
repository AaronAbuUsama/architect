// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attention/approve.ts";
import { call, type CallOptions } from "../client.ts";

/** Say yes. For a promote, the promote runs. */
export const approve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.attention.approve({ payload }));
