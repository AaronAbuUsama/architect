// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/question/answer.ts";
import { Work } from "../client.ts";

/** Answer a question with one of its letters. */
export const answer = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.question.answer({ payload }));
