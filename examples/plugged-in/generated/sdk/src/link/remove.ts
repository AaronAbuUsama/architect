// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/link/remove.ts";
import { PluggedIn } from "../client.ts";

/** Remove a link from a public page. */
export const remove = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(PluggedIn, (client) => client.link.remove({ payload }));
