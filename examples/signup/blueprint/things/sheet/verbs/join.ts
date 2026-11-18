import { Blueprint } from "@formants/forman";
import { Sheet } from "../thing.ts";
import { machine } from "../machine.ts";
import { SheetFull } from "../errors.ts";
import { Count } from "../../../values/counts.ts";

export default Blueprint.operation(Sheet, {
  description: "Take places on a sheet, for yourself and anyone with you.",
  payload: { sheet: Sheet.fields.id, people: Count },
  answer: { left: Count },
  move: machine.moves.join,
  errors: [SheetFull],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request", // sent twice with one request, it takes its places once
  budget: { p95: "150 millis" },
});
