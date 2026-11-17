import { Blueprint } from "@formants/forman";
import { Milestone } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";

export default Blueprint.operation(Milestone, {
  description: "Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step.",
  payload: { mission: Milestone.fields.mission, milestone: Milestone.fields.id },
  answer: {},
  move: machine.moves.drop,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
