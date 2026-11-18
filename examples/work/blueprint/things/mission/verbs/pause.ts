import { Blueprint } from "orthograph";
import { Mission } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../roles.ts";
import { Note } from "../../../values/work.ts";

export default Blueprint.operation(Mission, {
  description: "Pause the mission, saying why.",
  payload: { mission: Mission.fields.id, why: Note },
  answer: {},
  move: machine.moves.pause,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
