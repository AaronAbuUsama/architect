import { Blueprint } from "@formants/forman";
import { Sheet } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Sheet, {
  description: "Take a sheet down. Nobody can join it after this.",
  payload: { sheet: Sheet.fields.id },
  answer: {},
  move: machine.moves.close,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
