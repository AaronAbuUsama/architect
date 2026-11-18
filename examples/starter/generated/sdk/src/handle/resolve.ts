// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/handle/resolve.ts";
import { Starter } from "../client.ts";

/** Find the handle for a claimed name. */
export const resolve = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.handle.resolve({ payload }));
