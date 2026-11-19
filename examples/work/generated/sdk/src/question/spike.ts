// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/question/spike.ts";
import { call, type CallOptions } from "../client.ts";

/** Not sure yet: turn the question into a spike task on its subject. */
export const spike = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.question.spike({ payload }));
