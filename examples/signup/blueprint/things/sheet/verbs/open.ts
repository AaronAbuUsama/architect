import { Blueprint } from "@formants/forman";
import { Sheet } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Sheet, {
  description: "Put up a sheet with a number of places.",
  payload: { title: Sheet.fields.title, places: Sheet.fields.places },
  answer: { sheet: Sheet.fields.id },
  move: machine.moves.open,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request", // sent twice with one request, it puts up one sheet
  budget: { p95: "150 millis" },
});
