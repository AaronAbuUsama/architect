import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";
import { Note } from "../../../values/work.ts";

export default Blueprint.operation(Run, {
  description: "The run gave up, saying why.",
  payload: { mission: Run.fields.mission, run: Run.fields.id, why: Note },
  answer: {},
  move: machine.moves.fail,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
