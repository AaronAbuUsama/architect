// Generated from blueprint/things/question/verbs/answer.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/question/verbs/answer.ts";
import { QuestionNoSuchOption, QuestionNotAsked, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("answer", "/question/answer", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [QuestionNoSuchOption, QuestionNotAsked, NotAllowed],
});
export const steps = ["question.answer.record"] as const;
