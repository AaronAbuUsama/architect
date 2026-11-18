// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/link/add.ts";
import { Links } from "../client.ts";

/** Append a link to your public profile. */
export const add = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.link.add({ payload }));
