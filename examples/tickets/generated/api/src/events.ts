// Generated from the blueprint. Do not edit.
import { EventNames } from "orthograph/server";
import * as Event from "../../../blueprint/things/event/events.ts";
import * as Ticket from "../../../blueprint/things/ticket/events.ts";

EventNames.name(Event.EventOpened, "EventOpened");
EventNames.name(Event.EventOver, "EventOver");
EventNames.name(Event.TicketsClaimed, "TicketsClaimed");
EventNames.name(Ticket.TicketCancelled, "TicketCancelled");
EventNames.name(Ticket.TicketCheckedIn, "TicketCheckedIn");

export const names = ["EventOpened", "EventOver", "TicketsClaimed", "TicketCancelled", "TicketCheckedIn"] as const;
