// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/question/ask.ts";
import { Work } from "../client.ts";

/** Ask the mission's owner about one gap in the blueprint, with lettered answers. */
export const ask = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.question.ask({ payload }));
