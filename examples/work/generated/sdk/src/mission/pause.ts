// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/mission/pause.ts";
import { Work } from "../client.ts";

/** Pause the mission, saying why. */
export const pause = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.pause({ payload }));
