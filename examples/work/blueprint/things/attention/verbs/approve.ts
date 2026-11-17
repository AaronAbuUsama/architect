import { Blueprint } from "@architect/blueprint";
import { Attention } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";

export default Blueprint.operation(Attention, {
  description: "Say yes. For a promote, the promote runs.",
  payload: { mission: Attention.fields.mission, attention: Attention.fields.id },
  answer: {},
  move: machine.moves.approve,
  // F4 8.10 wants the owner in person, never an agent signed in for them. A Principal cannot tell the two apart yet,
  // and a blank is not allowed here, so this is the owner either way until it can (F5 §4).
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
