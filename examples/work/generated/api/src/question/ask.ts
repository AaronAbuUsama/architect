// Generated from blueprint/things/question/verbs/ask.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/question/verbs/ask.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("ask", "/question/ask", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [NotAllowed],
});
export const steps = ["question.ask.insert"] as const;
