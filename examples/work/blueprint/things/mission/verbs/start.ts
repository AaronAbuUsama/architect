import { Blueprint } from "orthograph";
import { Mission } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../roles.ts";
import { MissionHasOpenQuestions } from "../errors.ts";
export default Blueprint.operation(Mission, {
  description: "Start the mission once intake is done. From here the manager only orchestrates.",
  payload: { mission: Mission.fields.id },
  answer: {},
  move: machine.moves.start,
  errors: [MissionHasOpenQuestions],
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
