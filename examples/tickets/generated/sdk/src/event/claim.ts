// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/event/claim.ts";
import { Tickets } from "../client.ts";

/** Claim a ticket for one or more seats, held under a name. */
export const claim = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Tickets, (client) => client.event.claim({ payload }));
