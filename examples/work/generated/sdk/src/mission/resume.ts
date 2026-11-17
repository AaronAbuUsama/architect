// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/mission/resume.ts";
import { Work } from "../client.ts";

/** Pick a paused mission up again. */
export const resume = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.resume({ payload }));
