import { Blueprint } from "@formants/forman";
import { Question } from "../thing.ts";
import { machine } from "../machine.ts";
import { QuestionNoSuchOption } from "../errors.ts";
import { owner } from "../../mission/roles.ts";
import { Letter } from "../../../values/work.ts";

export default Blueprint.operation(Question, {
  description: "Answer a question with one of its letters.",
  payload: { mission: Question.fields.mission, question: Question.fields.id, picked: Letter },
  answer: {},
  move: machine.moves.answer,
  errors: [QuestionNoSuchOption],
  allowed: [owner.of("mission")],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
