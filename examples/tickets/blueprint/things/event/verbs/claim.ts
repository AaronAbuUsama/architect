import { Blueprint } from "orthograph";
import { Event } from "../thing.ts";
import { machine } from "../machine.ts";
import { SoldOut } from "../errors.ts";
import { Ticket } from "../../ticket/thing.ts";
import { Count } from "../../../values/counts.ts";

export default Blueprint.operation(Event, {
  description: "Claim a ticket for one or more seats, held under a name.",
  payload: { event: Event.fields.id, holder: Ticket.fields.holder, seats: Count },
  answer: { ticket: Ticket.fields.id, left: Count },
  move: machine.moves.claim,
  errors: [SoldOut],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database(), issue: Blueprint.step.database(), count: Blueprint.step.database() },
  idempotent: "request", // sent twice with one request, it issues one ticket
  budget: { p95: "150 millis" },
});
