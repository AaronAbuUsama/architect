// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/attention/decline.ts";
import { Work } from "../client.ts";

/** Say not yet, and why. The task stays where its facts put it. */
export const decline = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.attention.decline({ payload }));
