import { Blueprint } from "orthograph";
import { Mission } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Mission, {
  description: "Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps.",
  payload: { title: Mission.fields.title, target: Mission.fields.target, blueprint: Mission.fields.blueprint },
  answer: { mission: Mission.fields.id },
  move: machine.moves.open,
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
