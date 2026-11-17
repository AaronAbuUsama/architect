import { Blueprint } from "@architect/blueprint";
import { Question } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";
import { MissionNotInIntake } from "../../mission/errors.ts";

export default Blueprint.operation(Question, {
  description: "Ask the mission's owner about one gap in the blueprint, with lettered answers.",
  payload: { mission: Question.fields.mission, asks: Question.fields.asks, about: Question.fields.about, gap: Question.fields.gap, options: Question.fields.options },
  answer: { question: Question.fields.id },
  move: machine.moves.ask,
  errors: [MissionNotInIntake],
  allowed: [owner.of("mission")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
