// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as eventClaim } from "../../api/src/event/claim.ts";
import { declaration as eventClose } from "../../api/src/event/close.ts";
import { declaration as eventGet } from "../../api/src/event/get.ts";
import { declaration as eventOpen } from "../../api/src/event/open.ts";
import { declaration as ticketCancel } from "../../api/src/ticket/cancel.ts";
import { declaration as ticketCheckIn } from "../../api/src/ticket/check-in.ts";
import { declaration as ticketGet } from "../../api/src/ticket/get.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "event.claim": { description: "Claim a ticket for one or more seats, held under a name.", operation: eventClaim },
  "event.close": { description: "End the event. No tickets are claimed after this.", operation: eventClose },
  "event.get": { description: "Read one event by its id: title, places, claimed, state.", operation: eventGet },
  "event.open": { description: "Put an event on sale with a number of places.", operation: eventOpen },
  "ticket.cancel": { description: "Cancel a ticket before the door. Its seats are not sold again.", operation: ticketCancel },
  "ticket.check-in": { description: "Let the holder in at the door. A ticket gets in once.", operation: ticketCheckIn },
  "ticket.get": { description: "Read one ticket by its id: event, holder, seats, state.", operation: ticketGet },
} as const satisfies { readonly [name: string]: McpEntry };
