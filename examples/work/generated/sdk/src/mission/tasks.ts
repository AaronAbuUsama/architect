// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/mission/tasks.ts";
import { Work } from "../client.ts";

/** The mission's tasks, each in the column its facts put it in. */
export const tasks = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.tasks({ payload }));
