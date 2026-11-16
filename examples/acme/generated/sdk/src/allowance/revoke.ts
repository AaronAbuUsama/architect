// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/allowance/revoke.ts";
import { Acme } from "../client.ts";

/** Stop an allowance. Nothing more can be spent from it. */
export const revoke = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.allowance.revoke({ payload }));
