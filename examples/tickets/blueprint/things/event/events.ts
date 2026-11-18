import { Blueprint } from "orthograph";
import { Event } from "./thing.ts";
import { Count } from "../../values/counts.ts";

export const EventOpened = Blueprint.event({ event: Event.fields.id, places: Count });
export const TicketsClaimed = Blueprint.event({ event: Event.fields.id, seats: Count, left: Count });
export const EventOver = Blueprint.event({ event: Event.fields.id });
