import { Blueprint } from "@architect/blueprint";
import { Mission } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../roles.ts";

export default Blueprint.operation(Mission, {
  description: "Close the mission: every task is closed by a fact up to its target.",
  payload: { mission: Mission.fields.id },
  answer: {},
  move: machine.moves.finish,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
