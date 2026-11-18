import { Blueprint } from "orthograph";
import { Event } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Event, {
  states: ["onSale", "soldOut", "over"],
  moves: {
    open: { from: [], to: "onSale", emits: Events.EventOpened },
    claim: { from: ["onSale"], to: ["onSale", "soldOut"], emits: Events.TicketsClaimed }, // the last places sell it out
    close: { from: ["onSale", "soldOut"], to: "over", emits: Events.EventOver },
  },
  notFrom: { exit: 70 }, // generates EventNotOnSale
});
