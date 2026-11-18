import { Blueprint } from "@formants/forman";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";
import { Note } from "../../../values/work.ts";

export default Blueprint.operation(Run, {
  description: "Stop the run. A person's act, or the mission stopping.",
  payload: { mission: Run.fields.mission, run: Run.fields.id, why: Note },
  answer: {},
  move: machine.moves.stop,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
