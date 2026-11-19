// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/run/fail.ts";
import { call, type CallOptions } from "../client.ts";

/** The run gave up, saying why. */
export const fail = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.run.fail({ payload }));
