import { Blueprint } from "orthograph";
import { Event } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Event, {
  description: "Put an event on sale with a number of places.",
  payload: { title: Event.fields.title, places: Event.fields.places },
  answer: { event: Event.fields.id },
  move: machine.moves.open,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request", // sent twice with one request, it puts one event on sale
  budget: { p95: "150 millis" },
});
