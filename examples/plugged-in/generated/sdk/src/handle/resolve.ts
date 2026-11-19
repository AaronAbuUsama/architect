// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/handle/resolve.ts";
import { PluggedIn } from "../client.ts";

/** Find the handle that holds a claimed name. A released or unclaimed name has none. */
export const resolve = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(PluggedIn, (client) => client.handle.resolve({ payload }));
