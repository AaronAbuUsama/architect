// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/handle/claim.ts";
import { Starter } from "../client.ts";

/** Claim a free name and make it the address of your public profile. */
export const claim = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.handle.claim({ payload }));
