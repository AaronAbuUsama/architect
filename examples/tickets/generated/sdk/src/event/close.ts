// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/event/close.ts";
import { Tickets } from "../client.ts";

/** End the event. No tickets are claimed after this. */
export const close = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Tickets, (client) => client.event.close({ payload }));
