// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/mission/open.ts";
import { Work } from "../client.ts";

/** Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps. */
export const open = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.open({ payload }));
