// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/mission/finish.ts";
import { Work } from "../client.ts";

/** Close the mission: every task is closed by a fact up to its target. */
export const finish = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.finish({ payload }));
