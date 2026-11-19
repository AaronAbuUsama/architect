// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/question/ask.ts";
import { call, type CallOptions } from "../client.ts";

/** Ask the mission's owner about one gap in the blueprint, with lettered answers. */
export const ask = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.question.ask({ payload }));
