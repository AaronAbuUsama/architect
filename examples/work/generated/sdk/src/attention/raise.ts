// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attention/raise.ts";
import { call, type CallOptions } from "../client.ts";

/** Ask the mission's owner for a decision only they can make. */
export const raise = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.attention.raise({ payload }));
