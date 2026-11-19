// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/question/answer.ts";
import { call, type CallOptions } from "../client.ts";

/** Answer a question with one of its letters. */
export const answer = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.question.answer({ payload }));
