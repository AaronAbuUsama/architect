// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/event/open.ts";
import { Tickets } from "../client.ts";

/** Put an event on sale with a number of places. */
export const open = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Tickets, (client) => client.event.open({ payload }));
