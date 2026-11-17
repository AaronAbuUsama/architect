// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/fact/record.ts";
import { Work } from "../client.ts";

/** Record a fact (spike only: the logbook's job once L3.01 lands). */
export const record = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.fact.record({ payload }));
