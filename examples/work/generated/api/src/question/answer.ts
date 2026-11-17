// Generated from blueprint/things/question/verbs/answer.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/question/verbs/answer.ts";
import { QuestionNoSuchOption, QuestionNotAsked, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("answer", "/question/answer", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [QuestionNoSuchOption, QuestionNotAsked, NotAllowed],
});
export const steps = ["question.answer.record"] as const;
