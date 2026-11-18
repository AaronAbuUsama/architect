// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/ticket/get.ts";
import { Tickets } from "../client.ts";

/** Read one ticket by its id: event, holder, seats, state. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Tickets, (client) => client.ticket.get({ payload }));
