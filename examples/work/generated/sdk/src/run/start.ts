// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/run/start.ts";
import { call, type CallOptions } from "../client.ts";

/** Start an agent on one task. The run claims the task until it ends. */
export const start = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.run.start({ payload }));
