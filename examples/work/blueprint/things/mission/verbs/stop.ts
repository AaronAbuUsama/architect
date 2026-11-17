import { Blueprint } from "@architect/blueprint";
import { Mission } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../roles.ts";
import { Note } from "../../../values/work.ts";

export default Blueprint.operation(Mission, {
  description: "Stop the mission for good. Its runs are stopped with it.",
  payload: { mission: Mission.fields.id, why: Note },
  answer: {},
  move: machine.moves.stop,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
