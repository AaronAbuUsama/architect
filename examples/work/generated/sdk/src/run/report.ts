// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/run/report.ts";
import { call, type CallOptions } from "../client.ts";

/** Say how the run is going. It moves no card. */
export const report = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.run.report({ payload }));
