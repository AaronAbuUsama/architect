// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/milestone/drop.ts";
import { Work } from "../client.ts";

/** Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step. */
export const drop = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.milestone.drop({ payload }));
