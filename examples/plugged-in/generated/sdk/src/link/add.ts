// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/link/add.ts";
import { PluggedIn } from "../client.ts";

/** Append a link to the public page of a claimed name. */
export const add = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(PluggedIn, (client) => client.link.add({ payload }));
