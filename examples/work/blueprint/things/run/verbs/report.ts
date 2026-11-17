import { Blueprint } from "@architect/blueprint";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";
import { Note, Report } from "../../../values/work.ts";

export default Blueprint.operation(Run, {
  description: "Say how the run is going. It moves no card.",
  payload: { mission: Run.fields.mission, run: Run.fields.id, report: Report, note: Note },
  answer: {},
  move: machine.moves.report,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "100 millis" },
});
