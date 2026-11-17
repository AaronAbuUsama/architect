// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/milestone/add.ts";
import { Work } from "../client.ts";

/** Add a milestone to a mission. Its tasks appear at once: its kinds over its subject. */
export const add = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.milestone.add({ payload }));
