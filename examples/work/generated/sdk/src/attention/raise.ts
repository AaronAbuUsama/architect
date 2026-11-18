// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/attention/raise.ts";
import { Work } from "../client.ts";

/** Ask the mission's owner for a decision only they can make. */
export const raise = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.attention.raise({ payload }));
