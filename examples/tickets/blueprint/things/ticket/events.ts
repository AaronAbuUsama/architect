import { Blueprint } from "orthograph";
import { Ticket } from "./thing.ts";

export const TicketCheckedIn = Blueprint.event({ ticket: Ticket.fields.id });
export const TicketCancelled = Blueprint.event({ ticket: Ticket.fields.id });
