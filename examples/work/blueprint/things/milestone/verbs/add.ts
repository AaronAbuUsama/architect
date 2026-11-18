import { Blueprint } from "orthograph";
import { Milestone } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";
import { MissionClosed } from "../../mission/errors.ts";

export default Blueprint.operation(Milestone, {
  description: "Add a milestone to a mission. Its tasks appear at once: its kinds over its subject.",
  payload: { mission: Milestone.fields.mission, title: Milestone.fields.title, kinds: Milestone.fields.kinds, of: Milestone.fields.of, until: Milestone.fields.until },
  answer: { milestone: Milestone.fields.id },
  move: machine.moves.add,
  errors: [MissionClosed],
  allowed: [owner.of("mission")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
