import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Ticket, {
  description: "Cancel a ticket before the door. Its seats are not sold again.",
  payload: { ticket: Ticket.fields.id },
  answer: {},
  move: machine.moves.cancel,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
