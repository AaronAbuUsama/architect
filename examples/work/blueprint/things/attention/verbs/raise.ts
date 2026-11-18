import { Blueprint } from "@architect/blueprint";
import { Attention } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";
import { MissionNotRunning } from "../../mission/errors.ts";

export default Blueprint.operation(Attention, {
  description: "Ask the mission's owner for a decision only they can make.",
  payload: { mission: Attention.fields.mission, kind: Attention.fields.kind, title: Attention.fields.title, why: Attention.fields.why, task: Attention.fields.task },
  answer: { attention: Attention.fields.id },
  move: machine.moves.raise,
  errors: [MissionNotRunning],
  allowed: [owner.of("mission")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
