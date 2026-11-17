// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/question/spike.ts";
import { Work } from "../client.ts";

/** Not sure yet: turn the question into a spike task on its subject. */
export const spike = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.question.spike({ payload }));
