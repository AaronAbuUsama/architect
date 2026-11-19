// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attention/decline.ts";
import { call, type CallOptions } from "../client.ts";

/** Say not yet, and why. The task stays where its facts put it. */
export const decline = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.attention.decline({ payload }));
