// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/ticket/cancel.ts";
import { Tickets } from "../client.ts";

/** Cancel a ticket before the door. Its seats are not sold again. */
export const cancel = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Tickets, (client) => client.ticket.cancel({ payload }));
