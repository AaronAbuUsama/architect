import { Blueprint } from "@formants/forman";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";
import { Branch } from "../../../values/work.ts";

export default Blueprint.operation(Run, {
  description: "The run pushed its branch. CI proves it; the run cannot close its own task.",
  payload: { mission: Run.fields.mission, run: Run.fields.id, branch: Branch },
  answer: {},
  move: machine.moves.finish,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
