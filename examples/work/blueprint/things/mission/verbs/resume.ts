import { Blueprint } from "orthograph";
import { Mission } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../roles.ts";

export default Blueprint.operation(Mission, {
  description: "Pick a paused mission up again.",
  payload: { mission: Mission.fields.id },
  answer: {},
  move: machine.moves.resume,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
