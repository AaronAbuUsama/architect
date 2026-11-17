import { Blueprint } from "@architect/blueprint";
import { Attention } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";
import { Note } from "../../../values/work.ts";

export default Blueprint.operation(Attention, {
  description: "Say not yet, and why. The task stays where its facts put it.",
  payload: { mission: Attention.fields.mission, attention: Attention.fields.id, why: Note },
  answer: {},
  move: machine.moves.decline,
  // F4 8.10 wants the owner in person, never an agent signed in for them. A Principal cannot tell the two apart yet,
  // and a blank is not allowed here, so this is the owner either way until it can (F5 #5).
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
