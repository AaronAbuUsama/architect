// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/event/get.ts";
import { Tickets } from "../client.ts";

/** Read one event by its id: title, places, claimed, state. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Tickets, (client) => client.event.get({ payload }));
