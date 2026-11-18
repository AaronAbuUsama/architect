import { Blueprint } from "orthograph";
import { Event } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Event, {
  description: "End the event. No tickets are claimed after this.",
  payload: { event: Event.fields.id },
  answer: {},
  move: machine.moves.close,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
