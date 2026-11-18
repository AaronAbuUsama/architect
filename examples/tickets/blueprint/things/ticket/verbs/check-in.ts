import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Ticket, {
  description: "Let the holder in at the door. A ticket gets in once.",
  payload: { ticket: Ticket.fields.id },
  answer: {},
  move: machine.moves.checkIn,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
