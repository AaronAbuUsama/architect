// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/allowance/spend.ts";
import { Acme } from "../client.ts";

/** Spend from what is left of this month's allowance. */
export const spend = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.allowance.spend({ payload }));
