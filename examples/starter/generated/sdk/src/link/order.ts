// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/link/order.ts";
import { Starter } from "../client.ts";

/** Move a link to a zero-based position. A position past the end puts it last. */
export const order = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.link.order({ payload }));
