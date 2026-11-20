// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/handle/claim.ts";
import { PluggedIn } from "../client.ts";

/** Claim a free name and make it the address of your public page, with its profile. */
export const claim = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(PluggedIn, (client) => client.handle.claim({ payload }));
