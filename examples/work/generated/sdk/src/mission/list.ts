// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/mission/list.ts";
import { Work } from "../client.ts";

/** List missions, newest first, 20 to a page, filtered by owner, state. */
export const list = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.mission.list({ payload }));
