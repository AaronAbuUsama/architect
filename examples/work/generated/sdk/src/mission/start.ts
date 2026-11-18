// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/mission/start.ts";
import { Work } from "../client.ts";

/** Start the mission once intake is done. From here the manager only orchestrates. */
export const start = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.start({ payload }));
