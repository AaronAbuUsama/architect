// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/mission/get.ts";
import { Work } from "../client.ts";

/** Read one mission by its id: owner, title, target, blueprint, state. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.get({ payload }));
