// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as eventClaim from "./event/claim.ts";
import * as eventClose from "./event/close.ts";
import * as eventGet from "./event/get.ts";
import * as eventOpen from "./event/open.ts";
import * as ticketCancel from "./ticket/cancel.ts";
import * as ticketCheckIn from "./ticket/check-in.ts";
import * as ticketGet from "./ticket/get.ts";

export class Event extends HttpApiGroup.make("event").add(eventClaim.endpoint).add(eventClose.endpoint).add(eventGet.endpoint).add(eventOpen.endpoint) {}
export class Ticket extends HttpApiGroup.make("ticket").add(ticketCancel.endpoint).add(ticketCheckIn.endpoint).add(ticketGet.endpoint) {}
export class Api extends HttpApi.make("tickets").add(Event).add(Ticket) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "event.claim": eventClaim, "event.close": eventClose, "event.get": eventGet, "event.open": eventOpen, "ticket.cancel": ticketCancel, "ticket.check-in": ticketCheckIn, "ticket.get": ticketGet } as const;
