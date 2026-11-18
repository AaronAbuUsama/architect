// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/mission/stop.ts";
import { Work } from "../client.ts";

/** Stop the mission for good. Its runs are stopped with it. */
export const stop = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.stop({ payload }));
