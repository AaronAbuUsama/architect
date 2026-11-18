// Generated from blueprint/things/question/verbs/spike.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/question/verbs/spike.ts";
import { QuestionNotAsked, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("spike", "/question/spike", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [QuestionNotAsked, NotAllowed],
});
export const steps = ["question.spike.record"] as const;
