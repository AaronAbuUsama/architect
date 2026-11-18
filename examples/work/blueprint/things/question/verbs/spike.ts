import { Blueprint } from "orthograph";
import { Question } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../mission/roles.ts";

export default Blueprint.operation(Question, {
  description: "Not sure yet: turn the question into a spike task on its subject.",
  payload: { mission: Question.fields.mission, question: Question.fields.id },
  answer: {},
  move: machine.moves.spike,
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
