// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/ticket/check-in.ts";
import { Tickets } from "../client.ts";

/** Let the holder in at the door. A ticket gets in once. */
export const checkIn = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Tickets, (client) => client.ticket["check-in"]({ payload }));
