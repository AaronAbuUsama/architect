// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/run/list.ts";
import { Work } from "../client.ts";

/** List runs, newest first, 50 to a page, filtered by mission, task, state. */
export const list = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.run.list({ payload }));
