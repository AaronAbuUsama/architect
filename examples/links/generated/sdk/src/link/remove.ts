// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/link/remove.ts";
import { Links } from "../client.ts";

/** Remove one of your links from your public profile. */
export const remove = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.link.remove({ payload }));
