// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/question/list.ts";
import { call, type CallOptions } from "../client.ts";

/** List questions, oldest first, 50 to a page, filtered by mission, state. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.question.list({ payload }));
