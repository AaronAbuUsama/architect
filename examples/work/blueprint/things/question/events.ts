import { Blueprint } from "orthograph";
import { Question } from "./thing.ts";
import { Letter } from "../../values/work.ts";

export const QuestionAsked = Blueprint.event({ question: Question.fields.id, mission: Question.fields.mission, asks: Question.fields.asks, about: Question.fields.about, options: Question.fields.options });
export const QuestionAnswered = Blueprint.event({ question: Question.fields.id, picked: Letter });
/** "Not sure yet": a spike task on the question's subject, closed when its README lands on main (F4 8.7). */
export const QuestionSpiked = Blueprint.event({ question: Question.fields.id, about: Question.fields.about });
