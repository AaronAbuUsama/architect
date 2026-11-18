import { Blueprint } from "orthograph";
import { Ticket } from "./thing.ts";
import * as Events from "./events.ts";

// A ticket starts issued: `event.claim` writes it in that state, in the same commit as the claim.
export const machine = Blueprint.machine(Ticket, {
  states: ["issued", "checkedIn", "cancelled"],
  moves: {
    checkIn: { from: ["issued"], to: "checkedIn", emits: Events.TicketCheckedIn },
    cancel: { from: ["issued"], to: "cancelled", emits: Events.TicketCancelled },
  },
  notFrom: { exit: 72 }, // generates TicketNotIssued
});
